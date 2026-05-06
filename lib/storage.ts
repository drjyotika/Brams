// Storage layer — Vercel Blob in production, local JSON file in dev.
//
// Vercel's serverless filesystem is read-only (only /tmp is writable, but
// that's ephemeral per-instance). We therefore use Vercel Blob as the
// durable store whenever BLOB_READ_WRITE_TOKEN is present (i.e. in
// production). In local dev the token won't be set, so we fall through to
// the same atomic file-write logic we've always used.

import { defaultContent, type SiteContent } from "./content";

// ─── Shared helpers ──────────────────────────────────────────────────────────

// Shallow merge of top-level keys — lets the API accept partial payloads.
export function mergeContent(
  base: SiteContent,
  override: Partial<SiteContent>
): SiteContent {
  return {
    nav: { ...base.nav, ...override.nav },
    hero: { ...base.hero, ...override.hero },
    support: { ...base.support, ...override.support },
    howItWorks: { ...base.howItWorks, ...override.howItWorks },
    pricing: { ...base.pricing, ...override.pricing },
    newsletter: { ...base.newsletter, ...override.newsletter },
    footer: { ...base.footer, ...override.footer },
  };
}

// ─── Blob storage (production) ───────────────────────────────────────────────

const BLOB_PATHNAME = "brams-content.json";

async function blobRead(): Promise<SiteContent> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_PATHNAME });
  const found = blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!found) return defaultContent;

  const res = await fetch(found.url, { next: { revalidate: 0 } } as RequestInit);
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

// ─── Local-file storage (dev) ─────────────────────────────────────────────────

async function fileRead(): Promise<SiteContent> {
  const { promises: fs } = await import("node:fs");
  const path = await import("node:path");
  const STORE_PATH = path.join(process.cwd(), "data", "content.json");

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
  const { promises: fs } = await import("node:fs");
  const path = await import("node:path");
  const STORE_PATH = path.join(process.cwd(), "data", "content.json");

  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });

  // Atomic: write to .tmp then rename so a crash never corrupts the file.
  const tmpPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(next, null, 2);
  try {
    await fs.writeFile(tmpPath, payload, "utf8");
    await fs.rename(tmpPath, STORE_PATH);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function readContent(): Promise<SiteContent> {
  return USE_BLOB ? blobRead() : fileRead();
}

export async function writeContent(next: SiteContent): Promise<void> {
  return USE_BLOB ? blobWrite(next) : fileWrite(next);
}
