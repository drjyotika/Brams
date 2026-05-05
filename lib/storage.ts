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

export async function writeContent(next: SiteContent): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
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
