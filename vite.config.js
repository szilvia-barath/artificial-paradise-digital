import { defineConfig } from 'vite';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { textEdition } from './scripts/text-edition.mjs';

// Netlify sends a .glb as application/octet-stream and does not compress it, though the
// meshopt data in it gzips to less than half. So the build also writes each model gzipped
// (models/<name>.glb.gz), and src/world/paradiseFactory.js loads that one and unzips it in
// the browser. The plain .glb stays beside it as the fallback. Lossless.
function gzipModels() {
  let outDir = 'dist';
  return {
    name: 'gzip-models',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const dir = join(outDir, 'models');
      if (!existsSync(dir)) return;
      for (const f of readdirSync(dir)) {
        if (f.endsWith('.glb')) writeFileSync(join(dir, `${f}.gz`), gzipSync(readFileSync(join(dir, f)), { level: 9 }));
      }
    },
  };
}

// Relative base so the build works on Netlify (where it is hosted), in a subfolder
// or on any other static host without changes.
export default defineConfig({
  base: './',
  // Only serve/build the app; the original DSC_*.JPG photos stay out of the bundle.
  publicDir: 'public',
  // The text edition (text/ and text/hu/) is written from the same data as the walk.
  plugins: [textEdition(), gzipModels()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
  server: { host: true },
});
