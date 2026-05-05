import { readContent } from "./storage";
import type { SiteContent } from "./content";

// Server-side accessor used by the home page. Reads the persisted JSON store
// (admin edits) and falls back to default content when the store is empty.
export async function getSiteContent(): Promise<SiteContent> {
  return readContent();
}
