// Generate a 1200x630 Open Graph / social share image (public/og.png).
// Link previews (WhatsApp, Facebook, X, LinkedIn) expect 1.91:1 landscape;
// a portrait image gets cropped. This composites the wordmark logo on a soft
// brand background with a tagline.
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const W = 1200, H = 630;
const LOGO = fileURLToPath(new URL("../public/logo.png", import.meta.url));
const OUT  = fileURLToPath(new URL("../public/og.png", import.meta.url));

// Background + tagline (SVG). Soft lavender gradient, brand-colored tagline.
const bg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#f3ecf4"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="0" y="0" width="${W}" height="10" fill="#745475"/>
  <text x="${W / 2}" y="430" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="600"
        fill="#553757">Confidential online psychiatric care across India</text>
  <text x="${W / 2}" y="478" text-anchor="middle"
        font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="400"
        fill="#8a7d8c">Anxiety · Depression · ADHD · Trauma · by video, from anywhere</text>
</svg>`);

// Logo scaled to 720px wide, centered in the upper half.
const logoW = 720;
const logo = await sharp(LOGO).resize({ width: logoW }).toBuffer();
const logoMeta = await sharp(logo).metadata();
const left = Math.round((W - logoW) / 2);
const top  = Math.round(150 - logoMeta.height / 2 + 60);

await sharp(bg)
  .composite([{ input: logo, left, top }])
  .png()
  .toFile(OUT);

console.log(`Wrote public/og.png (${W}x${H}); logo ${logoW}x${logoMeta.height} at (${left},${top})`);
