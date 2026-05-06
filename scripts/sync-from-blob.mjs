// Pulls the current production content from bramsmindcare.com and writes it to
// data/content.json so local dev always shows the same content as production.
//
// Runs automatically on `npm run dev`. Can also be run manually: npm run sync
// Never fails — if prod is unreachable, local falls back to data/content.json.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, "..");
const OUT_PATH  = path.join(root, "data", "content.json");
const PROD_API  = "https://bramsmindcare.com/api/content";

console.log("⬇️   Syncing content from production…");

try {
  const res = await fetch(PROD_API, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const content = await res.json();
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(content, null, 2), "utf8");
  console.log("✅  Production content synced to data/content.json");
} catch (err) {
  console.warn(`⚠️   Sync skipped (${err.message}) — using existing local content.`);
}
