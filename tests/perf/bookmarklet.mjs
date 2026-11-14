// Prints tests/perf/fps-overlay.js as a bookmarklet (a javascript: address to save as a
// bookmark). Usage: node tests/perf/bookmarklet.mjs
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./fps-overlay.js', import.meta.url), 'utf8')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
  .replace(/\s+/g, ' ').trim();
console.log(`javascript:${encodeURIComponent(src)}`);
