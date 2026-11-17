// Shared by the accessibility checks: start a browser that can run the 3D view without a
// graphics card (software WebGL) and open the walk, collecting console errors.
import { chromium } from 'playwright';

export const BASE = process.env.AP_URL || 'http://localhost:4173/';

export const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// A laptop with a touch screen and a mouse or trackpad (D10). Headless Chromium cannot be one
// by itself: with touch on it reports one coarse pointer and nothing else, like a phone. So
// the page is told what Chrome on such a laptop answers: the first pointer is fine and can
// hover (the mouse), a coarse one is there as well, and the window has touch events. Only
// what scripts ask through matchMedia is answered so; the style sheet's own media queries
// still see headless Chromium's coarse pointer (the 44 px sizes of touch targets).
export const TOUCH_LAPTOP = { viewport: { width: 1366, height: 768 }, hasTouch: true, touchLaptop: true };
const asTouchLaptop = () => {
  const answers = { '(pointer: fine)': true, '(pointer: coarse)': false, '(hover: hover)': true, '(hover: none)': false, '(any-pointer: fine)': true, '(any-pointer: coarse)': true, '(any-hover: hover)': true, '(any-hover: none)': false };
  const real = window.matchMedia.bind(window);
  window.matchMedia = (q) => {
    const m = real(q);
    const key = String(q).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!(key in answers)) return m;
    return new Proxy(m, { get: (t, k) => (k === 'matches' ? answers[key] : typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
  };
  if (!('ontouchstart' in window)) window.ontouchstart = null;
};

// Opens the title screen and waits until the Enter button is ready.
export async function openWalk(browser, { lang = 'en', query = '', viewport = { width: 1366, height: 768 }, reducedMotion = 'no-preference', touchLaptop = false, ...context } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion, ...context });
  const page = await ctx.newPage();
  if (touchLaptop) await page.addInitScript(asTouchLaptop);
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
