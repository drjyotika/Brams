// Storage layer — three-tier fallback:
//
//  1. Vercel Blob  (persistent)  — when BLOB_READ_WRITE_TOKEN is set
//  2. /tmp         (ephemeral)   — when project-root filesystem is read-only
//                                  (Vercel serverless; resets on cold start)
//  3. Local file   (persistent)  — local dev at data/content.json
//
// Tiers 2 and 3 are detected automatically by attempting the write and
// catching read-only filesystem errors — no env-var probing needed.

import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultContent, type SiteContent } from "./content";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function mergeContent(
  base: SiteContent,
  override: Partial<SiteContent>
): SiteContent {
  return {
    nav:        { ...base.nav,        ...override.nav        },
    hero:       { ...base.hero,       ...override.hero       },
    support:    { ...base.support,    ...override.support    },
    howItWorks: { ...base.howItWorks, ...override.howItWorks },
    pricing:    { ...base.pricing,    ...override.pricing    },
    newsletter: { ...base.newsletter, ...override.newsletter },
    footer:     { ...base.footer,     ...override.footer     },
  };
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const PRIMARY_PATH  = path.join(process.cwd(), "data", "content.json");
const FALLBACK_PATH = "/tmp/brams-content.json";

// ─── Tier 1 — Vercel Blob (persistent) ───────────────────────────────────────

const BLOB_PATHNAME = "brams-content.json";
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

async function blobRead(): Promise<SiteContent> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_PATHNAME });
  const found = blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!found) return defaultContent;
  const res = await fetch(found.url, { cache: "no-store" });
  if (!res.ok) return defaultContent;
  return mergeContent(defaultContent, (await res.json()) as Partial<SiteContent>);
}

async function blobWrite(next: SiteContent): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, JSON.stringify(next, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

// ─── Tiers 2 & 3 — File system ───────────────────────────────────────────────

// Read: try project root first (dev), then /tmp (Vercel).
async function fileRead(): Promise<SiteContent> {
  for (const p of [PRIMARY_PATH, FALLBACK_PATH]) {
    try {
      const raw = await fs.readFile(p, "utf8");
      return mergeContent(defaultContent, JSON.parse(raw) as Partial<SiteContent>);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`[storage] read error at ${p}`, err);
      }
      // ENOENT → try next path
    }
  }
  return defaultContent;
}

// These codes mean the filesystem itself is read-only — not a transient error.
const READ_ONLY_CODES = new Set(["EROFS", "EACCES", "EPERM"]);

// Write: try project root; if read-only (Vercel production) fall back to /tmp.
async function fileWrite(next: SiteContent): Promise<void> {
  const payload = JSON.stringify(next, null, 2);

  try {
    await fs.mkdir(path.dirname(PRIMARY_PATH), { recursive: true });
    await fs.writeFile(PRIMARY_PATH, payload, "utf8");
    return; // success — local dev path
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "";
    if (!READ_ONLY_CODES.has(code)) throw err; // unexpected error — re-throw
    console.warn(`[storage] project root is read-only (${code}), writing to /tmp`);
  }

  // /tmp is always writable on Vercel serverless.
  await fs.writeFile(FALLBACK_PATH, payload, "utf8");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function readContent(): Promise<SiteContent> {
  return USE_BLOB ? blobRead() : fileRead();
}

export async function writeContent(next: SiteContent): Promise<void> {
  return USE_BLOB ? blobWrite(next) : fileWrite(next);
}
