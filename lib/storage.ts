// Storage layer — three-tier strategy:
//
//  1. Vercel Blob  — persistent, when BLOB_READ_WRITE_TOKEN is set
//  2. /tmp         — ephemeral, always writable (Vercel + local dev)
//  3. project-root data/ — persistent only in local dev (Vercel fs is read-only)
//
// Write path:  always succeeds on /tmp; also tries project root (silently ignored if read-only).
// Read path:   prefers project root (local dev), then /tmp, then hard-coded defaults.

import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultContent, type SiteContent } from "./content";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const TMP_PATH     = "/tmp/brams-content.json";
const PROJECT_PATH = path.join(process.cwd(), "data", "content.json");

// ─── Tier 1 — Vercel Blob ─────────────────────────────────────────────────────

const BLOB_PATHNAME = "brams-content.json";
// Only use Blob when actually running on Vercel (VERCEL=1 is set by the
// platform at runtime). In local dev we always use the filesystem so page
// renders don't make slow cross-network blob API calls on every request.
const USE_BLOB = process.env.VERCEL === "1" && !!process.env.BLOB_READ_WRITE_TOKEN;

async function blobRead(): Promise<SiteContent> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_PATHNAME });
  const found = blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!found) return defaultContent;

  // For private blobs, use `downloadUrl` — a pre-signed URL that doesn't
  // need an Authorization header (unlike `url`, which hangs on direct fetch).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(found.downloadUrl, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return defaultContent;
    return mergeContent(defaultContent, (await res.json()) as Partial<SiteContent>);
  } catch {
    console.warn("[storage] blobRead timed out or failed, using defaults");
    return defaultContent;
  } finally {
    clearTimeout(timer);
  }
}

async function blobWrite(next: SiteContent): Promise<void> {
  const { put } = await import("@vercel/blob");
  // Use "private" to match the store's access policy.
  await put(BLOB_PATHNAME, JSON.stringify(next, null, 2), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// ─── Tiers 2 & 3 — File system ───────────────────────────────────────────────

async function fileRead(): Promise<SiteContent> {
  // Try project root first (persists across local dev restarts),
  // then /tmp (survives within the same Vercel function instance).
  for (const p of [PROJECT_PATH, TMP_PATH]) {
    try {
      const raw = await fs.readFile(p, "utf8");
      return mergeContent(defaultContent, JSON.parse(raw) as Partial<SiteContent>);
    } catch {
      // ENOENT or any other read error → try next path
    }
  }
  return defaultContent;
}

async function fileWrite(next: SiteContent): Promise<void> {
  const payload = JSON.stringify(next, null, 2);

  // /tmp is always writable — write here first so the save always succeeds.
  await fs.writeFile(TMP_PATH, payload, "utf8");

  // Also try to persist to the project root (only works in local dev).
  // Silently ignore any error here — /tmp already has the data.
  try {
    await fs.mkdir(path.dirname(PROJECT_PATH), { recursive: true });
    await fs.writeFile(PROJECT_PATH, payload, "utf8");
  } catch {
    // Read-only on Vercel — expected, not an error.
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function readContent(): Promise<SiteContent> {
  return USE_BLOB ? blobRead() : fileRead();
}

export async function writeContent(next: SiteContent): Promise<void> {
  return USE_BLOB ? blobWrite(next) : fileWrite(next);
}
