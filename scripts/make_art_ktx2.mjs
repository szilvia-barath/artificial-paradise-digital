// Switch "ktx2art" (src/fx/switches.js, off; docs/design/rendering-proposal.md, option 4):
// the paintings' and prints' in-room images as KTX2 UASTC, which the GPU keeps compressed
// (ASTC, BC7 or ETC2 by device: about a quarter of the memory of the decoded WebP).
//
//   node scripts/make_art_ktx2.mjs                    from the site's own WebP derivatives (for measuring only)
//   node scripts/make_art_ktx2.mjs --from <folder>   from lossless masters named <name>.png or <name>.tif
//
// It writes public/img/ktx2/<name>.ktx2 for each <name>-tex.webp (1024 px, in the room) and
// <name>.webp (1600 px, the detail image) in public/img, and public/img/ktx2/report.json with
// the source of each and the sizes. public/img/ktx2/ is git-ignored: the reproductions are
// In Copyright and this is a lossy re-encode, so nothing is committed before the
// reconstructor's yes, and then only from the masters (--from), never from the WebP.
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';

const IMG = 'public/img';
const OUT = join(IMG, 'ktx2');
const fromArg = process.argv.indexOf('--from');
const FROM = fromArg > 0 ? process.argv[fromArg + 1] : null;

// UASTC blocks are 4 x 4 texels: each side is rounded to a multiple of 4. Flipped, because a
// compressed texture cannot be flipped on upload and the UVs expect the WebP's orientation.
const decode = (w, h) => async (buf) => {
  const data = await sharp(buf).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).flip().ensureAlpha().raw().toBuffer();
  return { width: w, height: h, data: new Uint8Array(data) };
};

await mkdir(OUT, { recursive: true });
const files = (await readdir(IMG)).filter((f) => f.endsWith('-tex.webp'));
const names = [];
for (const f of files) {
  const base = f.replace(/-tex\.webp$/, '');
  names.push(`${base}-tex`);
  if (existsSync(join(IMG, `${base}.webp`))) names.push(base);
}
const report = [];
for (const name of names) {
  const webp = join(IMG, `${name}.webp`);
  const { width, height } = await sharp(webp).metadata();
  const master = FROM && ['png', 'tif', 'tiff'].map((x) => join(FROM, `${name.replace(/-tex$/, '')}.${x}`)).find((p) => existsSync(p));
  const src = master || webp;
  const w = Math.max(4, Math.round(width / 4) * 4);
  const h = Math.max(4, Math.round(height / 4) * 4);
  const out = await encodeToKTX2(new Uint8Array(await readFile(src)), {
    imageDecoder: decode(w, h),
    generateMipmap: true,
    isUASTC: true,
    uastcLDRQualityLevel: 2,
    enableRDO: false,
    needSupercompression: true,
    isPerceptual: true,
    isSetKTX2SRGBTransferFunc: true,
  });
  await writeFile(join(OUT, `${name}.ktx2`), out);
  const webpBytes = (await stat(webp)).size;
  report.push({ name, source: master ? 'master' : 'webp derivative (second generation)', width: w, height: h, webpBytes, ktx2Bytes: out.length, gpuBytesDecoded: Math.round(w * h * 4 * 4 / 3), gpuBytesCompressed: Math.round(w * h * 4 / 3) });
  console.log(`${name}.ktx2  ${(webpBytes / 1024).toFixed(0)} KB webp -> ${(out.length / 1024).toFixed(0)} KB, GPU ${(w * h * 4 * 4 / 3 / 1048576).toFixed(1)} -> ${(w * h * 4 / 3 / 1048576).toFixed(1)} MB${master ? '' : '  (from the WebP)'}`);
}
await writeFile(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const sum = (k) => report.reduce((s, r) => s + r[k], 0);
console.log(`total: webp ${(sum('webpBytes') / 1048576).toFixed(1)} MB, ktx2 ${(sum('ktx2Bytes') / 1048576).toFixed(1)} MB on disk; GPU ${(sum('gpuBytesDecoded') / 1048576).toFixed(0)} -> ${(sum('gpuBytesCompressed') / 1048576).toFixed(0)} MB if every image were loaded`);
