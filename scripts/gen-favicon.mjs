// One-off: build a multi-size favicon.ico from app/icon.png using sharp.
// ICO supports PNG-encoded entries ("PNG-in-ICO"), supported by all modern
// browsers and Google's favicon crawler. Sizes 16/32/48 cover browser tabs and
// Google's "multiple of 48px" recommendation.
import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../app/icon.png", import.meta.url));
const OUT = fileURLToPath(new URL("../public/favicon.ico", import.meta.url));
const SIZES = [16, 32, 48];

const pngs = await Promise.all(
  SIZES.map((s) =>
    sharp(SRC)
      .resize(s, s, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()
  )
);

// ICONDIR header (6 bytes) + N * ICONDIRENTRY (16 bytes) + image data
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = 1 (icon)
header.writeUInt16LE(SIZES.length, 4); // image count

const entries = [];
let offset = 6 + SIZES.length * 16;
for (let i = 0; i < SIZES.length; i++) {
  const s = SIZES[i];
  const data = pngs[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(s >= 256 ? 0 : s, 0); // width
  entry.writeUInt8(s >= 256 ? 0 : s, 1); // height
  entry.writeUInt8(0, 2); // color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(data.length, 8); // image size
  entry.writeUInt32LE(offset, 12); // image offset
  entries.push(entry);
  offset += data.length;
}

const ico = Buffer.concat([header, ...entries, ...pngs]);
await writeFile(OUT, ico);
console.log(`Wrote app/favicon.ico (${ico.length} bytes, sizes ${SIZES.join("/")})`);
