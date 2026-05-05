import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultContent, type SiteContent } from "./content";

const STORE_PATH = path.join(process.cwd(), "data", "content.json");

export async function readContent(): Promise<SiteContent> {
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

// Atomic rewrite: write to a sibling .tmp file first, then rename it over the
// real file. fs.rename is atomic on the same filesystem, so a crash mid-write
// can never leave content.json half-flushed or corrupt.
export async function writeContent(next: SiteContent): Promise<void> {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(next, null, 2);
  try {
    await fs.writeFile(tmpPath, payload, "utf8");
    await fs.rename(tmpPath, STORE_PATH);
  } catch (err) {
    // Best-effort cleanup of the orphaned tmp file.
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  }
}

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
