// P13: app icons from one design (same look as the site's .logo-mark: brand gradient, white "W", tilted -6°).
//   node scripts/make-icons.js     → writes public/icons/*.svg|png and public/favicon.ico
// The "W" is a drawn shape (not a font), so the icons look the same on every computer.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/icons");
fs.mkdirSync(OUT, { recursive: true });

const BRAND = "#2563eb", BRAND_2 = "#ff8a3d";
const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${BRAND}"/><stop offset="1" stop-color="${BRAND_2}"/></linearGradient></defs>`;
// a bold "W" centred on (256,256); scale < 1 makes it smaller
const W = (scale = 1, width = 46) => `<g transform="translate(256 262) scale(${scale}) translate(-256 -262)">
  <polyline points="148,178 206,346 256,232 306,346 364,178" fill="none" stroke="#fff"
            stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/></g>`;

const svgs = {
  // normal icon: tilted rounded tile on a transparent background (like .logo-mark)
  "logo.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${gradient}
  <g transform="rotate(-6 256 256)"><rect x="56" y="56" width="400" height="400" rx="104" fill="url(#g)"/>${W(0.82, 50)}</g></svg>`,
  // maskable / Apple: the whole square is colour (the phone cuts its own shape), W inside the safe zone
  "logo-maskable.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${gradient}
  <rect width="512" height="512" fill="url(#g)"/>${W(0.8, 52)}</svg>`,
  // favicon: upright (a tilt looks blurry at 16 px), thicker W
  "favicon.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${gradient}
  <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#g)"/>${W(1.05, 64)}</svg>`,
};
for (const [name, svg] of Object.entries(svgs)) fs.writeFileSync(path.join(OUT, name), svg + "\n");

const png = (svgName, size) => sharp(Buffer.from(svgs[svgName]), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
const files = [
  ["icon-192.png", "logo.svg", 192],
  ["icon-512.png", "logo.svg", 512],
  ["icon-maskable-512.png", "logo-maskable.svg", 512],
  ["apple-touch-icon.png", "logo-maskable.svg", 180],
  ["favicon-32.png", "favicon.svg", 32],
  ["favicon-16.png", "favicon.svg", 16],
];
for (const [name, svg, size] of files) {
  fs.writeFileSync(path.join(OUT, name), await png(svg, size));
  console.log(`public/icons/${name}  ${size}×${size}`);
}

// favicon.ico = a small header + PNG images inside (16, 32, 48) — every browser understands it
const sizes = [16, 32, 48], imgs = await Promise.all(sizes.map(s => png("favicon.svg", s)));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(imgs[i].length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += imgs[i].length;
});
fs.writeFileSync(path.join(ROOT, "public/favicon.ico"), Buffer.concat([head, ...imgs]));
console.log("public/favicon.ico  16+32+48");
