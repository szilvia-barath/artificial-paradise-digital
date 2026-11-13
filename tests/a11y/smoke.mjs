// The built site: the walk loads, all four rooms show, no console errors, no failed
// requests, and nothing is stored but the language choice.
// Usage: npm run build && npm run preview &   then   node tests/a11y/smoke.mjs
import { launch, openWalk } from './lib.mjs';

const browser = await launch();
let failed = 0;
for (const [name, viewport, extra] of [['desktop 1366 × 768', { width: 1366, height: 768 }, {}], ['phone 375 × 667', { width: 375, height: 667 }, { hasTouch: true, isMobile: true }]]) {
  const { page, errors, ctx } = await openWalk(browser, { viewport, ...extra });
  const bad = [];
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  page.on('requestfailed', (r) => { if (!/ERR_ABORTED/.test(r.failure()?.errorText || '')) bad.push(`failed ${new URL(r.url()).pathname}`); });
  await page.evaluate(() => document.getElementById('enter').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-sound="off"]').click());
  const rooms = [];
  for (const id of ['r1', 'r2', 'r3', 'r4']) {
    await page.evaluate((r) => window.__ap.jumpToRoom(r), id);
    await page.waitForTimeout(3500);
    rooms.push(await page.textContent('#room-label .room-name'));
  }
  const info = await page.evaluate(() => ({ storage: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie, mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, scroll: document.documentElement.scrollWidth <= window.innerWidth }));
  const ok = rooms.join() === 'Room 1,Room 2,Room 3,Room 4' && errors.length === 0 && bad.length === 0 && info.storage.every((k) => k === 'ap-lang') && info.session.length === 0 && !info.cookies;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: rooms ${rooms.join(', ')}; console errors: ${errors.length ? errors.join(' | ') : 'none'}; failed requests: ${bad.length ? bad.join(', ') : 'none'}; localStorage: ${JSON.stringify(info.storage)}; sessionStorage: ${JSON.stringify(info.session)}; cookies: "${info.cookies}"; JS heap ${info.mem} MB; no sideways scroll: ${info.scroll}`);
  if (!ok) failed++;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
