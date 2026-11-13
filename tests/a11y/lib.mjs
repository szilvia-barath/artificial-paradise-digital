// Shared by the accessibility checks: start a browser that can run the 3D view without a
// graphics card (software WebGL) and open the walk, collecting console errors.
import { chromium } from 'playwright';

export const BASE = process.env.AP_URL || 'http://localhost:4173/';

export const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// Opens the title screen and waits until the Enter button is ready.
export async function openWalk(browser, { lang = 'en', query = '', viewport = { width: 1366, height: 768 }, reducedMotion = 'no-preference', ...context } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion, ...context });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { window.__apNoAdapt = true; });
  await page.goto(`${BASE}?lang=${lang}${query}`);
  await page.waitForFunction(() => document.body.dataset.state === 'ready', null, { timeout: 90000 });
  return { ctx, page, errors };
}

// What has focus, in words a log can carry.
export const focusName = (page) => page.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return 'body';
  const label = a.getAttribute('aria-label') || a.textContent.trim().replace(/\s+/g, ' ').slice(0, 60);
  return `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}${a.dataset.nav ? `[data-nav=${a.dataset.nav}]` : ''}${a.dataset.action ? `[data-action=${a.dataset.action}]` : ''} "${label}"`;
});
