// What the controls over the 3D view show and say: the floor plan's key (A4). Each step
// waits for what it checks (the 3D view renders in software here, at 1 to 2 frames a
// second). Sizes and colours are read from the page (no screenshot is taken); contrast is
// worked out for the worst case, the glass over pure white, and over black.
// Usage: npm run build && npm run preview &   then   node tests/a11y/hud.mjs
import { readFileSync } from 'node:fs';
import { launch, openWalk } from './lib.mjs';

const UI = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')).ui, hu: JSON.parse(readFileSync('src/i18n/hu.json', 'utf8')).ui };

const browser = await launch();
let failed = 0;
const errors = [];
const step = (name, ok, got) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got: ${got}`);
  if (!ok) failed++;
};
const PHONE = { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true };
const PHONE_SIDE = { viewport: { width: 667, height: 375 }, hasTouch: true, isMobile: true };

// The walk, entered without sound.
async function inside(lang, opts = {}) {
  const w = await openWalk(browser, { lang, viewport: { width: 1366, height: 768 }, ...opts });
  await w.ctx.route(/google|gstatic|ggpht|googleusercontent/, (r) => r.abort());
  const p = w.page;
  await p.evaluate(() => document.getElementById('enter').click());
  await p.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.evaluate(() => document.querySelector('[data-sound="off"]').click());
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  return w;
}
const switchTo = async (p, l) => {
  await p.evaluate((x) => document.querySelector(`#site-nav [data-lang="${x}"]`).click(), l);
  await p.waitForFunction((x) => document.documentElement.lang === x, l, { timeout: 30000 });
};

// colour arithmetic (WCAG 2): relative luminance, ratio, a translucent colour laid over another
const rgba = (s) => { const v = s.match(/[\d.]+/g).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; };
const over = ([r, g, b, a], [R, G, B]) => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// the worst contrast of a text colour on a glass colour, over pure white and over black
const worst = (text, glass) => Math.min(...[[255, 255, 255], [0, 0, 0]].map((under) => { const bg = over(rgba(glass), under); return ratio(over(rgba(text), bg), bg); }));
// boxes: do two rectangles share any area?
const meets = (a, b) => !!a && !!b && a.w > 0 && b.w > 0 && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const boxes = (p, sels) => p.evaluate((list) => Object.fromEntries(list.map((s) => {
  const e = document.querySelector(s);
  const shown = e && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none' && e.getClientRects().length;
  if (!shown) return [s, null];
  const r = e.getBoundingClientRect();
  return [s, { x: r.x, y: r.y, w: r.width, h: r.height }];
})), sels);
const show = (b) => (b ? `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}` : 'not shown');

// ---------------- A4: the floor plan's key, one line under the map
const keyInfo = (p) => p.evaluate(() => {
  const k = document.getElementById('map-key');
  if (!k) return { text: [], other: {}, video: {}, color: 'rgb(0,0,0)', glass: 'rgb(0,0,0)', missing: true };
  const cs = getComputedStyle(k);
  const r = k.getBoundingClientRect();
  const m = document.getElementById('minimap').getBoundingClientRect();
  const mark = (sel) => { const e = k.querySelector(sel); const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return { bg: s.backgroundColor, edge: s.borderTopColor, edgeW: s.borderTopWidth, round: s.borderTopLeftRadius === '50%', w: b.width, h: b.height }; };
  return {
    text: [...k.querySelectorAll('[data-i18n]')].map((e) => e.textContent),
    hidden: k.getAttribute('aria-hidden'),
    font: parseFloat(cs.fontSize), color: cs.color, glass: cs.backgroundColor,
    lines: Math.round((r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth)) / parseFloat(cs.lineHeight)),
    under: Math.round(r.top - m.bottom), rightEdge: Math.round(m.right - r.right), inWindow: r.left >= 0 && r.right <= innerWidth,
    other: mark('.mk-other'), video: mark('.mk-video'),
  };
});
{
  const w = await inside('en');
  const p = w.page;
  await p.waitForFunction(() => document.getElementById('map-key')?.getClientRects().length > 0, null, { timeout: 30000 }).catch(() => {});
  const k = await keyInfo(p);
  const c = worst(k.color, k.glass);
  const marks = k.other.round && !k.video.round && k.other.bg === 'rgb(255, 79, 163)' && k.video.bg === 'rgb(95, 231, 255)' && [k.other, k.video].every((x) => x.edgeW === '1px' && x.edge === 'rgba(11, 12, 14, 0.9)' && Math.round(x.w) === 7 && Math.round(x.h) === 7);
  step(`A4.1 Desktop: the key is one line just under the map, "${UI.en.hud.mapKey.videos}" and "${UI.en.hud.mapKey.other}", at least 11 px, 4.5:1 at worst; its marks are drawn as on the map (7 px with a dark edge, square cyan for videos, round magenta for the other works)`, k.text.join('|') === `${UI.en.hud.mapKey.videos}|${UI.en.hud.mapKey.other}` && k.lines === 1 && k.font >= 11 && c >= 4.5 && k.under >= 0 && k.under <= 8 && Math.abs(k.rightEdge) <= 1 && k.inWindow && marks && k.hidden === 'true', `${JSON.stringify(k.text)}, ${k.lines} line, ${k.font} px, ${k.color} on ${k.glass}: ${c.toFixed(2)}:1 at worst; ${k.under} px under the map, right edges ${k.rightEdge} px apart; marks ${JSON.stringify({ other: k.other, video: k.video })}; aria-hidden ${k.hidden}`);
  // the map's marks are those colours: the map draws them from minimap.js's own values
  const src = readFileSync('src/ui/minimap.js', 'utf8');
  step('A4.2 The key\'s colours and edge are the map\'s own (minimap.js draws #ff4fa3, #5fe7ff and rgba(11,12,14,0.9))', src.includes("'#5fe7ff' : '#ff4fa3'") && src.includes("'rgba(11,12,14,0.9)'"), 'read from src/ui/minimap.js');
  await switchTo(p, 'hu');
  const kh = await keyInfo(p);
  step(`A4.3 Switched to Hungarian: "${UI.hu.hud.mapKey.videos}", "${UI.hu.hud.mapKey.other}", still one line`, kh.text.join('|') === `${UI.hu.hud.mapKey.videos}|${UI.hu.hud.mapKey.other}` && kh.lines === 1 && kh.inWindow, `${JSON.stringify(kh.text)}, ${kh.lines} line`);
  const b = await boxes(p, ['#map-key', '#minimap', '#room-label', '#click-to-look', '#prompt', '#zoom-level']);
  step('A4.4 Desktop, Hungarian: the key lies over none of the map, the room label and the hint in the middle', !meets(b['#map-key'], b['#minimap']) && !meets(b['#map-key'], b['#room-label']) && !meets(b['#map-key'], b['#click-to-look']), Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; '));
  errors.push(...w.errors);
  await w.ctx.close();
}
// The map is not hidden on a phone (150 × 102 px), so neither is its key.
for (const [name, opts, lang] of [['phone 375 × 667, English', PHONE, 'en'], ['phone 375 × 667, Hungarian', PHONE, 'hu'], ['phone 320 × 640, Hungarian', { ...PHONE, viewport: { width: 320, height: 640 } }, 'hu'], ['phone on its side 667 × 375, Hungarian', PHONE_SIDE, 'hu'], ['laptop at 200% (683 × 384 at 2×), Hungarian', { viewport: { width: 683, height: 384 }, deviceScaleFactor: 2 }, 'hu']]) {
  const w = await inside(lang, opts);
  const p = w.page;
  await p.waitForFunction(() => document.getElementById('map-key')?.getClientRects().length > 0, null, { timeout: 30000 }).catch(() => {});
  const k = await keyInfo(p);
  // zoomed in, so the zoom readout shows as well; and the hint in the middle brought back,
  // wherever this device shows it (it goes by itself after some seconds)
  await p.evaluate(() => { window.__ap.controls.zoomBy(2); document.body.classList.remove('looked'); });
  await p.waitForFunction(() => !document.getElementById('zoom-level').hidden, null, { timeout: 30000 }).catch(() => {});
  const b = await boxes(p, ['#map-key', '#minimap', '#room-label', '#joystick', '#zoompad', '#zoom-level', '#toolbar', '#click-to-look']);
  const clear = ['#minimap', '#room-label', '#joystick', '#zoompad', '#zoom-level', '#toolbar', '#click-to-look'].every((s) => !meets(b['#map-key'], b[s])) && !meets(b['#click-to-look'], b['#minimap']);
  step(`A4.5 ${name}: the key shows, one line under the map, inside the window, over none of the other controls, and the hint in the middle not over the map (zoomed in, so the zoom readout shows too)`, !!b['#map-key'] && k.lines === 1 && k.inWindow && k.under >= 0 && k.under <= 8 && k.font >= 11 && clear, `${JSON.stringify(k.text)}, ${k.lines} line, ${k.under} px under the map; ${Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; ')}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
