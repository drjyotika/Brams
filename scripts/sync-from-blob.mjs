// Pulls the current production content from bramsmindcare.com and writes it to
// data/content.json so local dev shows the same content as production.
//
// Usage:  npm run sync

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const OUT_PATH = path.join(root, "data", "content.json");
const PROD_API = "https://bramsmindcare.com/api/content";

console.log("⬇️   Fetching content from", PROD_API);

let content;
try {
  const res = await fetch(PROD_API);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  content = await res.json();
} catch (err) {
  console.error("❌  Fetch failed:", err.message);
  process.exit(1);
}

await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
await fs.writeFile(OUT_PATH, JSON.stringify(content, null, 2), "utf8");

console.log("✅  Synced → data/content.json");
console.log("    Restart your dev server (npm run dev) to see the changes.");
