// One-off: regenerates PNG icons from public/icons/icon.svg. Run: npm -w web run icons
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const dir = new URL('../public/icons/', import.meta.url);
const svg = await readFile(new URL('icon.svg', dir));
const out = (name) => new URL(name, dir).pathname;

for (const size of [192, 512]) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out(`icon-${size}.png`));
}
await sharp(svg, { density: 384 }).resize(180, 180).png().toFile(out('apple-touch-icon.png'));

// Maskable: full-bleed brand background, artwork inside the 80% safe zone.
const size = 512;
const inner = Math.round(size * 0.62);
const art = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
await sharp({ create: { width: size, height: size, channels: 4, background: '#ff6b3d' } })
  .composite([{ input: art, gravity: 'center' }])
  .png()
  .toFile(out('icon-maskable-512.png'));
