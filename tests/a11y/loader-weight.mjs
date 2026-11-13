// Weighs what the loading screen itself downloads, and checks that it does not move.
// Usage: npm run build && npm run preview &   then   node tests/a11y/loader-weight.mjs [url]
// The 3D engine (the main chunk) is blocked, so only the title screen's own files load and
// its progress line stays still: any pixel that changes between two screenshots is motion.
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch();
const results = {};
for (const [name, viewport] of [['desktop 1366x768', { width: 1366, height: 768 }], ['phone 375x667', { width: 375, height: 667 }]]) {
  const page = await browser.newPage({ viewport, reducedMotion: 'no-preference' });
  const files = [];
  await page.route(/assets\/main-.*\.js$/, (r) => r.abort());
  page.on('response', async (res) => {
    try {
      const body = await res.body();
      files.push({ file: new URL(res.url()).pathname, bytes: body.length });
    } catch { /* aborted */ }
  });
  await page.goto(url + '?lang=en', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // past any entrance animation
  const a = await page.screenshot();
  await page.waitForTimeout(1300);
  const b = await page.screenshot();
  const running = await page.evaluate(() => document.getAnimations().filter((x) => x.effect?.target?.closest?.('#loader')).length);
  results[name] = { files, totalKB: +(files.reduce((s, f) => s + f.bytes, 0) / 1024).toFixed(1), stillFrames: a.equals(b), runningAnimationsInLoader: running };
  await page.close();
}
await browser.close();
for (const [name, r] of Object.entries(results)) {
  console.log(`\n${name}`);
  for (const f of r.files) console.log(`  ${(f.bytes / 1024).toFixed(1).padStart(7)} KB  ${f.file}`);
  console.log(`  ${String(r.totalKB).padStart(7)} KB  total (uncompressed file sizes)`);
  console.log(`  two screenshots 1.3 s apart identical: ${r.stillFrames}; CSS animations running in the loader: ${r.runningAnimationsInLoader}`);
}
