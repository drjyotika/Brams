// Storage layer — three-tier strategy:
//
//  1. Vercel Blob  (persistent)  — when BLOB_READ_WRITE_TOKEN is set
//  2. /tmp         (ephemeral)   — when running on Vercel without a Blob token
//                                  (/tmp is writable; resets on cold start)
//  3. Local file   (persistent)  — local dev, process.cwd()/data/content.json
//
// Tiers 2 → 3 require no setup — they work out of the box.
// Tier 1 can be enabled later by connecting a Vercel Blob store.

import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultContent, type SiteContent } from "./content";

// ─── Routing flags ───────────────────────────────────────────────────────────

const ON_VERCEL = !!process.env.VERCEL;
const USE_BLOB  = !!process.env.BLOB_READ_WRITE_TOKEN;

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function mergeContent(
  base: SiteContent,
  override: Partial<SiteContent>
): SiteContent {
  return {
    nav:         { ...base.nav,         ...override.nav         },
    hero:        { ...base.hero,        ...override.hero        },
    support:     { ...base.support,     ...override.support     },
    howItWorks:  { ...base.howItWorks,  ...override.howItWorks  },
    pricing:     { ...base.pricing,     ...override.pricing     },
    newsletter:  { ...base.newsletter,  ...override.newsletter  },
    footer:      { ...base.footer,      ...override.footer      },
  };
}

// ─── Tier 1 — Vercel Blob (persistent) ───────────────────────────────────────

const BLOB_PATHNAME = "brams-content.json";

async function blobRead(): Promise<SiteContent> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_PATHNAME });
  const found = blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!found) return defaultContent;

  const res = await fetch(found.url, { cache: "no-store" });
  if (!res.ok) return defaultContent;
  const parsed = (await res.json()) as Partial<SiteContent>;
  return mergeContent(defaultContent, parsed);
}

async function blobWrite(next: SiteContent): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATHNAME, JSON.stringify(next, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

// ─── Tier 2 & 3 — File system ─────────────────────────────────────────────────
//
// On Vercel:  /tmp is writable (ephemeral — cleared on cold start).
// Local dev:  project root data/ folder (atomic write, persistent).

const STORE_PATH = ON_VERCEL
  ? "/tmp/brams-content.json"
  : path.join(process.cwd(), "data", "content.json");

async function fileRead(): Promise<SiteContent> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteContent>;
    return mergeContent(defaultContent, parsed);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return defaultContent;
    console.warn("[storage] read failed, using defaults", err);
    return defaultContent;
  }
}

async function fileWrite(next: SiteContent): Promise<void> {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });

  if (ON_VERCEL) {
    // /tmp doesn't support cross-device rename, so write directly.
    await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
  } else {
    // Local dev: atomic rename so a crash never corrupts the file.
    const tmpPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(tmpPath, JSON.stringify(next, null, 2), "utf8");
      await fs.rename(tmpPath, STORE_PATH);
    } catch (err) {
      await fs.unlink(tmpPath).catch(() => {});
      throw err;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function readContent(): Promise<SiteContent> {
  return USE_BLOB ? blobRead() : fileRead();
}

export async function writeContent(next: SiteContent): Promise<void> {
  return USE_BLOB ? blobWrite(next) : fileWrite(next);
}
