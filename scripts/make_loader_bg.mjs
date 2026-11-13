// Lighter copies of the loading screen's background (the exhibition's key visual): AVIF
// beside the WebP files, which stay as the fallback for browsers without AVIF. The picture
// is the same; only the encoding changes.
// Usage: node scripts/make_loader_bg.mjs
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

for (const name of ['key-visual', 'key-visual-portrait']) {
  const src = `public/brand/${name}.webp`;
  const out = `public/brand/${name}.avif`;
  await sharp(src).avif({ quality: 45, effort: 7 }).toFile(out);
  const [a, b] = await Promise.all([stat(src), stat(out)]);
  console.log(`${name}: ${(a.size / 1024).toFixed(0)} KB WebP -> ${(b.size / 1024).toFixed(0)} KB AVIF`);
}
