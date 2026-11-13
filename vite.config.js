import { defineConfig } from 'vite';
import { textEdition } from './scripts/text-edition.mjs';

// Relative base so the build works on Netlify (where it is hosted), in a subfolder
// or on any other static host without changes.
export default defineConfig({
  base: './',
  // Only serve/build the app; the original DSC_*.JPG photos stay out of the bundle.
  publicDir: 'public',
  // The text edition (text/ and text/hu/) is written from the same data as the walk.
  plugins: [textEdition()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
  server: { host: true },
});
