// What the controls over the 3D view show and say: the floor plan's key (A4); on a touch
// screen, the sound question's hint and the hint inside (D11), the stick held and the turning
// keys (D2); the viewer side by side on a short screen on its side (D8); the compact control layer in a very small window (E2); the tour caption's first line
// (F3); the line before entering, the first-use card and Help (F1); Next work on the toolbar
// (F2). Each step
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
    under: Math.round(r.top - m.bottom), leftOf: Math.round(m.left - r.right), topLevel: Math.round(r.top - m.top), rightEdge: Math.round(m.right - r.right), inWindow: r.left >= 0 && r.right <= innerWidth,
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
  // the key's marks have the map's own colours and edge: those minimap.js draws with, read from
  // it, against the key's colours as the page shows them (fails if the key is missing or drifts)
  const src = readFileSync('src/ui/minimap.js', 'utf8');
  const fill = src.match(/video \? '(#[0-9a-f]{6})' : '(#[0-9a-f]{6})'/i);
  const edge = src.match(/\[3\.5, '(rgba\([^']+\))'\]/);
  const rgb = (h) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`;
  const flat = (c) => (c || '').replace(/\s/g, '');
  const same = !!fill && !!edge && !k.missing && k.video.bg === rgb(fill[1]) && k.other.bg === rgb(fill[2]) && [k.video, k.other].every((x) => flat(x.edge) === flat(edge[1]));
  step('A4.2 The key\'s marks have the map\'s own colours and edge, as minimap.js draws them (videos, the other works, the dark edge)', same, `minimap.js: ${fill ? `${fill[1]}, ${fill[2]}` : '(not found)'}, edge ${edge ? edge[1] : '(not found)'}; the key: video ${k.video.bg}, other ${k.other.bg}, edges ${k.video.edge} / ${k.other.edge}`);
  await switchTo(p, 'hu');
  const kh = await keyInfo(p);
  step(`A4.3 Switched to Hungarian: "${UI.hu.hud.mapKey.videos}", "${UI.hu.hud.mapKey.other}", still one line`, kh.text.join('|') === `${UI.hu.hud.mapKey.videos}|${UI.hu.hud.mapKey.other}` && kh.lines === 1 && kh.inWindow, `${JSON.stringify(kh.text)}, ${kh.lines} line`);
  const b = await boxes(p, ['#map-key', '#minimap', '#room-label', '#click-to-look', '#prompt', '#zoom-level']);
  step('A4.4 Desktop, Hungarian: the key lies over none of the map, the room label and the hint in the middle', !meets(b['#map-key'], b['#minimap']) && !meets(b['#map-key'], b['#room-label']) && !meets(b['#map-key'], b['#click-to-look']), Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; '));
  errors.push(...w.errors);
  await w.ctx.close();
}
// The map is not hidden on a phone (150 × 102 px), so neither is its key.
for (const [name, opts, lang, beside] of [['phone 375 × 667, English', PHONE, 'en'], ['phone 375 × 667, Hungarian', PHONE, 'hu'], ['phone 320 × 640, Hungarian', { ...PHONE, viewport: { width: 320, height: 640 } }, 'hu'], ['phone on its side 667 × 375, Hungarian', PHONE_SIDE, 'hu'], ['laptop at 200% (683 × 384 at 2×), Hungarian', { viewport: { width: 683, height: 384 }, deviceScaleFactor: 2 }, 'hu'], ['small phone on its side 568 × 320, Hungarian (the key at the left of the map, level with its top)', { ...PHONE, viewport: { width: 568, height: 320 } }, 'hu', true], ['small phone on its side 568 × 320, English (the key at the left of the map)', { ...PHONE, viewport: { width: 568, height: 320 } }, 'en', true]]) {
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
  step(`A4.5 ${name}: the key shows, one line ${beside ? 'at the left of the map, level with its top' : 'under the map'}, inside the window, over none of the other controls, and the hint in the middle not over the map (zoomed in, so the zoom readout shows too)`, !!b['#map-key'] && k.lines === 1 && k.inWindow && (beside ? k.leftOf >= 0 && k.leftOf <= 8 && Math.abs(k.topLevel) <= 2 : k.under >= 0 && k.under <= 8) && k.font >= 11 && clear, `${JSON.stringify(k.text)}, ${k.lines} line, ${beside ? `${k.leftOf} px left of the map, top ${k.topLevel} px from its top` : `${k.under} px under the map`}; ${Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; ')}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- D11: the touch words in the sound question, and the touch hint inside
// Touches are sent through the DevTools protocol, as a finger's would be.
const finger = async (p) => {
  const c = await p.context().newCDPSession(p);
  return (type, x, y) => c.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
};
const hintState = (p) => p.evaluate(() => {
  const h = document.getElementById('click-to-look');
  const cs = getComputedStyle(h);
  return { text: h.textContent, hidden: h.getAttribute('aria-hidden'), opacity: cs.opacity, visibility: cs.visibility, focusable: h.tabIndex >= 0 || !!h.querySelector('a, button, [tabindex]') };
});
const askHint = (p) => p.evaluate(() => document.getElementById('sound-ask-hint').textContent);
// the sound question opened (not answered yet), with its hint read
async function asked(lang, opts) {
  const w = await openWalk(browser, { lang, ...opts });
  await w.page.evaluate(() => document.getElementById('enter').click());
  await w.page.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  return w;
}
{
  const want = { en: UI.en.soundAsk.hintTouch, hu: UI.hu.soundAsk.hintTouch };
  const got = {};
  for (const l of ['en', 'hu']) {
    const w = await asked(l, PHONE);
    got[l] = await askHint(w.page);
    if (l === 'en') {
      // the button the words name: at the bottom, named "Sound"
      const b = await w.page.evaluate(() => { const s = document.querySelector('[data-action="sound"]'); const r = s.getBoundingClientRect(); return { label: s.querySelector('.lbl').textContent, bottom: r.bottom > innerHeight * 0.8 }; });
      got.button = b;
      await switchTo(w.page, 'hu');
      got.switched = await askHint(w.page);
    }
    errors.push(...w.errors);
    await w.ctx.close();
  }
  const d = await asked('en', { viewport: { width: 1366, height: 768 } });
  const desk = await askHint(d.page);
  errors.push(...d.errors);
  await d.ctx.close();
  step(`D11.1 Sound question on a phone: "${want.en}" (in Hungarian "${want.hu}", also after a switch while it shows); the Sound button is at the bottom; on a computer the words with M stay`, got.en === want.en && got.hu === want.hu && got.switched === want.hu && got.button.label === UI.en.hud.sound && got.button.bottom && desk === UI.en.soundAsk.hint, `phone EN "${got.en}"; HU "${got.hu}"; switched "${got.switched}"; button ${JSON.stringify(got.button)}; computer "${desk}"`);
}
for (const [name, opts, lang] of [['375 × 667, English', PHONE, 'en'], ['375 × 667, Hungarian', PHONE, 'hu'], ['320 × 640, Hungarian', { ...PHONE, viewport: { width: 320, height: 640 } }, 'hu'], ['on its side 667 × 375, Hungarian', PHONE_SIDE, 'hu'], ['on its side 640 × 360, Hungarian', { ...PHONE, viewport: { width: 640, height: 360 } }, 'hu'], ['small, on its side 568 × 320, Hungarian', { ...PHONE, viewport: { width: 568, height: 320 } }, 'hu']]) {
  const w = await inside(lang, opts);
  const p = w.page;
  const h = await hintState(p);
  const focus = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  // zoomed in, so the zoom readout shows as well
  await p.evaluate(() => window.__ap.controls.zoomBy(2));
  await p.waitForFunction(() => !document.getElementById('zoom-level').hidden, null, { timeout: 30000 }).catch(() => {});
  const b = await boxes(p, ['#click-to-look', '#joystick', '#toolbar', '#zoompad', '#zoom-level', '#minimap', '#map-key', '#room-label']);
  const clear = ['#joystick', '#toolbar', '#zoompad', '#zoom-level', '#minimap', '#map-key', '#room-label'].every((s) => !meets(b['#click-to-look'], b[s]));
  step(`D11.2 Phone ${name}, inside: the touch hint shows ("${UI[lang].hud.touchHint}"), hidden from screen readers, takes no focus (focus stays on the 3D view), over none of the stick, the toolbar, the zoom keys, the zoom readout, the map, its key and the room label`, h.text === UI[lang].hud.touchHint && h.hidden === 'true' && h.visibility === 'visible' && !h.focusable && focus === 'scene' && clear && !!b['#click-to-look'], `${JSON.stringify(h)}; focus on ${focus}; ${Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; ')}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  // what the hint says is what works now: a drag looks round; the stick walks when pushed, and
  // since D2 also when only pressed and held off its middle; a tap on a work opens it
  const w = await inside('en', PHONE);
  const p = w.page;
  const touch = await finger(p);
  const hint0 = await hintState(p);
  const yaw0 = await p.evaluate(() => window.__ap.controls.yaw);
  await touch('touchStart', 190, 420);
  const gone = await p.waitForFunction(() => getComputedStyle(document.getElementById('click-to-look')).visibility === 'hidden', null, { timeout: 30000 }).then(() => true, () => false);
  await touch('touchMove', 240, 420);
  await touch('touchMove', 290, 420);
  await touch('touchEnd');
  const looked = await p.waitForFunction((y) => Math.abs(window.__ap.controls.yaw - y) > 0.1, yaw0, { timeout: 30000 }).then(() => true, () => false);
  const j = await p.evaluate(() => { const r = document.getElementById('joystick').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const at = () => p.evaluate(() => ({ x: window.__ap.controls.pos.x, z: window.__ap.controls.pos.y }));
  const moved = (from) => p.waitForFunction((f) => Math.hypot(window.__ap.controls.pos.x - f.x, window.__ap.controls.pos.y - f.z) > 0.05, from, { timeout: 4000 }).then(() => true, () => false);
  let from = await at();
  await touch('touchStart', j.x, j.y - 30);
  const held = await moved(from); // pressed and held above its middle, not pushed: up to 4 s
  from = await at();
  await touch('touchMove', j.x, j.y - 40);
  const pushed = await moved(from);
  await touch('touchEnd');
  // a tap on the work in the middle of the view: the viewer opens and stays open (the
  // browser's mouse click after the tap must not land on it and close it again; at this
  // point it lands beside the picture of no. 5)
  await p.evaluate(() => { window.__clicks = 0; addEventListener('click', () => window.__clicks++, true); window.__ap.gotoWork(window.__ap.data.works.find((k) => k.id === 'w05-human-as-error-i')); });
  await p.touchscreen.tap(187, 333);
  await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 }).catch(() => {});
  // the click, if the browser sends one, comes within a few frames: wait for it, up to 3 s
  const click = await p.waitForFunction(() => window.__clicks > 0, null, { timeout: 3000 }).then(() => true, () => false);
  const opened = await p.evaluate(() => (document.getElementById('viewer').hidden ? '(nothing)' : document.getElementById('viewer-title').textContent));
  step('D11.3 Phone: the first touch on the 3D view takes the hint away; what it says works now: a drag looks round, the stick walks when pushed, a tap opens the work in the middle and it stays open. Since D2, pressing and holding the stick above its middle walks too, without a drag (so the hint says "hold")', hint0.visibility === 'visible' && gone && looked && held && pushed && opened === 'Human as Error I', `hint shown first: ${hint0.visibility}; gone at the touch: ${gone}; drag turned the view: ${looked}; stick held still walked: ${held}; stick pushed walked: ${pushed}; tap opened: ${opened} (the browser's click after the tap sent: ${click})`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  // left alone it goes by itself after about 8 seconds; and the language switched while it shows
  const w = await inside('en', PHONE);
  const p = w.page;
  await p.evaluate(() => { window.__t0 = performance.now(); new MutationObserver(() => { if (document.body.classList.contains('looked') && !window.__t1) window.__t1 = performance.now(); }).observe(document.body, { attributes: true }); });
  await switchTo(p, 'hu');
  const hu = await hintState(p);
  await p.waitForFunction(() => !!window.__t1 && getComputedStyle(document.getElementById('click-to-look')).visibility === 'hidden', null, { timeout: 30000 }).catch(() => {});
  const secs = await p.evaluate(() => (window.__t1 ? (window.__t1 - window.__t0) / 1000 : null));
  const after = await hintState(p);
  step('D11.4 Phone: switched to Hungarian while the hint shows, it says the Hungarian words; untouched, it goes by itself some seconds after the sound question', hu.text === UI.hu.hud.touchHint && hu.visibility === 'visible' && secs !== null && secs > 3 && secs < 15 && after.visibility === 'hidden', `"${hu.text}"; gone after ${secs?.toFixed(1)} s (8 s from the answer); then ${after.visibility}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  // reduced motion: it goes at once, with no fade
  const w = await inside('en', { ...PHONE, reducedMotion: 'reduce' });
  const p = w.page;
  const touch = await finger(p);
  const before = await hintState(p);
  await touch('touchStart', 190, 420);
  await p.waitForFunction(() => document.body.classList.contains('looked'), null, { timeout: 30000 }).catch(() => {});
  const now = await p.evaluate(() => { const cs = getComputedStyle(document.getElementById('click-to-look')); return { opacity: cs.opacity, visibility: cs.visibility, transition: cs.transitionDuration }; });
  await touch('touchMove', 260, 420);
  await touch('touchEnd');
  step('D11.5 Phone with reduced motion: the hint goes at once at the first touch, no fade', before.visibility === 'visible' && now.opacity === '0' && now.visibility === 'hidden' && /^0s(, 0s)*$/.test(now.transition), `before: ${before.visibility}; just after the touch: ${JSON.stringify(now)}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  // on a computer the hint stays as it was: the mouse words, read by screen readers
  const w = await inside('en');
  const h = await hintState(w.page);
  step('D11.6 Computer: the hint in the middle is unchanged ("Drag the mouse to look around the room.", not hidden from screen readers)', h.text === UI.en.hud.clickToLook && h.hidden === null, JSON.stringify(h));
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- D2: on a touch screen the stick walks when pressed and held, and two
// turning keys (44 px) show; nothing else of the keypad
for (const [name, opts, lang] of [['375 × 667, English', PHONE, 'en'], ['320 × 640, Hungarian', { ...PHONE, viewport: { width: 320, height: 640 } }, 'hu'], ['on its side 667 × 375, Hungarian', PHONE_SIDE, 'hu'], ['on its side 740 × 360, English', { ...PHONE, viewport: { width: 740, height: 360 } }, 'en'], ['small, on its side 568 × 320, Hungarian', { ...PHONE, viewport: { width: 568, height: 320 } }, 'hu']]) {
  const w = await inside(lang, opts);
  const p = w.page;
  await p.evaluate(() => { window.__ap.controls.zoomBy(2); document.body.classList.remove('looked'); });
  await p.waitForFunction(() => !document.getElementById('zoom-level').hidden, null, { timeout: 30000 }).catch(() => {});
  const caps = await p.evaluate(() => [...document.querySelectorAll('#keypad .cap')].filter((c) => c.getClientRects().length && getComputedStyle(c).visibility !== 'hidden').map((c) => { const r = c.getBoundingClientRect(); return { title: c.title, w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; }));
  const others = ['#joystick', '#toolbar', '#zoompad', '#zoom-level', '#minimap', '#map-key', '#room-label', '#click-to-look'];
  const b = await boxes(p, ['#keypad .k-a', '#keypad .k-d', ...others]);
  const clear = ['#keypad .k-a', '#keypad .k-d'].every((k) => others.every((s) => !meets(b[k], b[s])));
  const want = [UI[lang].hud.keys.left, UI[lang].hud.keys.right];
  step(`D2.1 Phone ${name}: only the two turning keys show ("${want.join('", "')}"), each at least 44 × 44 px, inside the window, over none of the stick, the toolbar, the zoom keys, the zoom readout, the map, its key, the room label and the touch hint`, caps.length === 2 && caps.map((c) => c.title).join('|') === want.join('|') && caps.every((c) => c.w >= 44 && c.h >= 44 && c.inside) && clear, `${JSON.stringify(caps)}; ${Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; ')}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  // the stick pressed and held off its middle walks that way at once; released, it stops. The
  // turning keys turn while held, by a finger
  const w = await inside('en', PHONE);
  const p = w.page;
  const touch = await finger(p);
  const j = await p.evaluate(() => { const r = document.getElementById('joystick').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const at = () => p.evaluate(() => ({ x: window.__ap.controls.pos.x, z: window.__ap.controls.pos.y, yaw: window.__ap.controls.yaw }));
  const a = await at();
  await touch('touchStart', j.x, j.y - 35); // forward, no move of the finger after
  const fwd = await p.waitForFunction((f) => Math.hypot(window.__ap.controls.pos.x - f.x, window.__ap.controls.pos.y - f.z) > 0.3, a, { timeout: 20000 }).then(() => true, () => false);
  const joy = await p.evaluate(() => ({ x: window.__ap.controls.joy.x, y: window.__ap.controls.joy.y }));
  await touch('touchEnd');
  await p.waitForFunction(() => window.__ap.controls.joy.x === 0 && window.__ap.controls.joy.y === 0, null, { timeout: 10000 }).catch(() => {});
  // it glides to a stop: from one frame to the next it no longer moves (held, it would go on)
  const stopped = await p.waitForFunction(() => { const c = window.__ap.controls; const l = window.__lastPos; window.__lastPos = { x: c.pos.x, z: c.pos.y }; return !!l && Math.hypot(c.pos.x - l.x, c.pos.y - l.z) < 1e-4; }, null, { timeout: 15000, polling: 'raf' }).then(() => true, () => false);
  const k = await p.evaluate(() => { const r = document.querySelector('#keypad .k-a').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const y0 = (await at()).yaw;
  await touch('touchStart', k.x, k.y);
  const turned = await p.waitForFunction((y) => window.__ap.controls.yaw - y > 0.1, y0, { timeout: 20000 }).then(() => true, () => false);
  await touch('touchEnd');
  const released = await p.waitForFunction(() => !window.__ap.controls.isDown('ArrowLeft'), null, { timeout: 10000 }).then(() => true, () => false);
  step('D2.2 Phone 375 × 667: the stick pressed and held above its middle walks forward at once, without a drag; released, it stops; the turn-left key held by a finger turns left, and lets go when the finger lifts', fwd && joy.y < -0.5 && stopped && turned && released, `walked: ${fwd} (stick at ${joy.x.toFixed(2)}, ${joy.y.toFixed(2)}); stopped after: ${stopped}; turn-left held turned: ${turned}; let go: ${released}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- D8: on a short screen on its side the viewer shows the work and its text side
// by side, so the work is far larger than the 167 × 146 px it had under the old stacked layout
for (const [name, opts, minW, minH] of [['phone on its side 667 × 375', PHONE_SIDE, 340, 300], ['phone on its side 740 × 360', { ...PHONE, viewport: { width: 740, height: 360 } }, 330, 290], ['phone on its side 844 × 390', { ...PHONE, viewport: { width: 844, height: 390 } }, 360, 320], ['small phone on its side 568 × 320', { ...PHONE, viewport: { width: 568, height: 320 } }, 280, 250], ['phone upright 375 × 667 (stacked, as before)', PHONE, 340, 290]]) {
  const w = await openWalk(browser, { lang: 'hu', ...opts });
  const p = w.page;
  await p.evaluate(() => window.__ap.viewer.open(window.__ap.data.works.find((k) => k.id === 'w01-dresden')));
  await p.waitForFunction(() => { const i = document.getElementById('viewer-img'); return i.complete && i.naturalWidth > 0 && i.classList.contains('ready'); }, null, { timeout: 30000 }).catch(() => {});
  const v = await p.evaluate(() => {
    const b = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    return { img: b('#viewer-img'), info: b('.viewer-info'), title: b('#viewer-title'), close: b('#viewer .close'), scrollW: document.documentElement.scrollWidth, vw: innerWidth };
  });
  const upright = opts.viewport.width < opts.viewport.height;
  // upright: stacked as before (the work there already reaches 24 px under the top of the text panel)
  const side = upright ? v.info.y > v.img.y + v.img.h / 2 && v.info.x === 0 : v.info.x >= v.img.x + v.img.w && v.info.y === 0 && v.info.h === opts.viewport.height;
  // upright the layout is as before, and Close there already reaches 8 px over the top of the work
  const clear = upright || !meets(v.close, v.img) && !meets(v.close, v.title) && v.title.x >= v.info.x && v.title.x + v.title.w <= v.info.x + v.info.w;
  step(`D8.1 Viewer, ${name}: the work at least ${minW} × ${minH} px, ${upright ? 'its text under it' : 'its text in a column beside it, the full height'}${upright ? '' : '; Close over neither the work nor the title'}; no sideways scroll`, v.img.w >= minW && v.img.h >= minH && side && clear && v.scrollW <= v.vw, `work ${show(v.img)}; text ${show(v.info)}; title ${show(v.title)}; Close ${show(v.close)}; page ${v.scrollW} px wide in ${v.vw}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- F3: the tour caption's first line says how far along the tour is
const fill = (str, vars) => String(str ?? '(no such string)').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
// The tour's own clock is moved on (0.1 s a step) until the caption of that stop is up: the
// 3D view renders at 1 to 2 frames a second here.
const toStop = (p, id) => p.evaluate((x) => {
  const { tour } = window.__ap;
  for (let i = 0; i < 5000 && tour.active && !(tour.work === x && tour.shown); i++) tour.update(0.1);
  return tour.work === x && tour.shown;
}, id);
const caption = (p) => p.evaluate(() => { const c = document.getElementById('tour-caption'); const t = c.querySelector('.t'); return { first: t?.textContent ?? null, html: t?.innerHTML ?? null, meta: c.querySelector('.m')?.textContent ?? null }; });
{
  const w = await inside('en');
  const p = w.page;
  await p.evaluate(() => { window.__said = []; const el = document.getElementById('announcer'); new MutationObserver(() => window.__said.push(el.textContent.trim())).observe(el, { childList: true, characterData: true, subtree: true }); });
  await p.click('[data-action="tour"]');
  const got = [];
  for (const [id, at, no, title] of [['w01-dresden', 1, 1, 'Wrong Data Landscape Dresden'], ['w03-paradise-factory', 3, 3, 'Paradise Factory'], ['w03-screen', 3, 3, 'Paradise Factory'], ['w04-human-as-error-iii', 4, 4, 'Human as Error III'], ['w17-natural-life', 17, 17, 'Natural Life']]) {
    const up = await toStop(p, id);
    const c = await caption(p);
    got.push({ id, up, ...c, ok: up && c.first === fill(UI.en.hud.tourAt, { at, total: 17, no, title }) && !c.html.includes('lang=') });
    // the first caption is let through the live region (it says one message a second at
    // most, and a newer caption takes the place of one not said yet)
    if (id === 'w01-dresden') await p.waitForFunction(() => window.__said.join(' | ').includes('No. 1, '), null, { timeout: 30000 }).catch(() => {});
  }
  step(`F3.1 The tour caption's first line: "${fill(UI.en.hud.tourAt, { at: 1, total: 17, no: 1, title: 'Wrong Data Landscape Dresden' })}", "3 / 17 · No. 3 · Paradise Factory" (and the same at no. 3's small screen, a stop of its own), "4 / 17 …", "17 / 17 …"; the medium, size and year on their own line under it`, got.every((x) => x.ok) && got[0].meta === 'Acrylic on canvas, 140 × 160 cm, 2023', got.map((x) => `${x.id}: "${x.first}"${x.ok ? '' : ' (wrong)'}`).join('; ') + `; under the first: "${got[0].meta}"`);
  // what the live region says for a caption: the old short sentence, no "1 / 17"
  const heard = await p.evaluate(() => window.__said.join(' | '));
  step('F3.2 The live region says each caption as before, short: "No. 1, Wrong Data Landscape Dresden. Acrylic on canvas, 140 × 160 cm, 2023." and the caption, without the "1 / 17" (the tour goes in catalogue order, so the number already says how far along it is)', heard.includes('No. 1, Wrong Data Landscape Dresden. Acrylic on canvas, 140 × 160 cm, 2023.') && !heard.includes(' / 17'), heard.slice(0, 300));
  // switched to Hungarian while a caption shows: the line follows, the title in lang="en"
  await p.evaluate(() => window.__ap.tour.stop());
  await p.click('[data-action="tour"]');
  await toStop(p, 'w02-human-as-error-vi');
  await switchTo(p, 'hu');
  const hu = await caption(p);
  await switchTo(p, 'en');
  const en = await caption(p);
  step(`F3.3 Switched to Hungarian while no. 2's caption shows: "${fill(UI.hu.hud.tourAt, { at: 2, total: 17, no: 2, title: 'Human as Error VI' })}", the title in a <span lang="en">; back in English: no lang mark`, hu.first === fill(UI.hu.hud.tourAt, { at: 2, total: 17, no: 2, title: 'Human as Error VI' }) && hu.html.includes('<span lang="en">Human as Error VI</span>') && en.first === fill(UI.en.hud.tourAt, { at: 2, total: 17, no: 2, title: 'Human as Error VI' }) && !en.html.includes('lang='), `HU "${hu.first}" (${hu.html}); EN "${en.first}"`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  // a tour started on the Hungarian page
  const w = await inside('hu');
  const p = w.page;
  await p.click('[data-action="tour"]');
  await toStop(p, 'w16-let-it-flow');
  const c = await caption(p);
  step(`F3.4 Hungarian page: no. 16's caption reads "${fill(UI.hu.hud.tourAt, { at: 16, total: 17, no: 16, title: 'Let it Flow' })}", the title in a <span lang="en">`, c.first === fill(UI.hu.hud.tourAt, { at: 16, total: 17, no: 16, title: 'Let it Flow' }) && c.html.includes('<span lang="en">Let it Flow</span>'), `"${c.first}" (${c.html})`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- F1: the line before entering, the first-use card, Help
const axName = async (p, sel) => {
  const cdp = await p.context().newCDPSession(p);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  await cdp.detach();
  return nodes[0]?.name?.value ?? null;
};
const axTree = async (p) => {
  const cdp = await p.context().newCDPSession(p);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes.filter((n) => !n.ignored).map((n) => `${n.role?.value}:${n.name?.value ?? ''}`);
};
// A block of steps that stops with an error (a control it needs is not there) fails its steps
// and the run goes on.
const guard = async (names, fn) => {
  try { await fn(); } catch (e) { for (const n of names) step(`${n} (stopped)`, false, String(e).split('\n')[0]); }
};
const guideInfo = (p) => p.evaluate(() => {
  const g = document.getElementById('guide');
  if (!g) return { shown: false, text: [], missing: true };
  const shown = !g.hidden && getComputedStyle(g).visibility === 'visible' && g.getClientRects().length > 0;
  const r = g.getBoundingClientRect();
  const under = shown ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
  // 'none' where the compact control layer of a very small window leaves the hint out (E2)
  const hint = getComputedStyle(document.getElementById('click-to-look')).display === 'none' ? 'none' : getComputedStyle(document.getElementById('click-to-look')).visibility;
  return { shown, text: g.innerText.trim().split('\n').filter(Boolean), hidden: g.getAttribute('aria-hidden'), focusables: g.querySelectorAll('a, button, input, [tabindex]').length, under: under ? (under.id || under.tagName) : null, focus: document.activeElement?.id || document.activeElement?.tagName, hint };
});
// the walk entered by keyboard (Enter, then Esc on the sound question), so no mouse press is sent
async function insideByKeys(lang, opts = {}) {
  const w = await openWalk(browser, { lang, viewport: { width: 1366, height: 768 }, ...opts });
  const p = w.page;
  await p.focus('#enter');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); }, null, { timeout: 30000 });
  w.during = await guideInfo(p);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  return w;
}
{
  // the line on the title screen, and what it says is so
  const w = await openWalk(browser, { lang: 'en', viewport: { width: 1366, height: 768 } });
  const p = w.page;
  const line = await p.textContent('.howto .desk');
  await switchTo(p, 'hu');
  const lineHu = await p.textContent('.howto .desk');
  await switchTo(p, 'en');
  await p.focus('#enter');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.activeElement === document.getElementById('scene'), null, { timeout: 30000 });
  const pose = () => p.evaluate(() => ({ x: window.__ap.controls.pos.x, z: window.__ap.controls.pos.y, yaw: window.__ap.controls.yaw }));
  const changed = (from, what) => p.waitForFunction(([f, k]) => { const c = window.__ap.controls; return k === 'yaw' ? Math.abs(c.yaw - f.yaw) > 0.05 : Math.hypot(c.pos.x - f.x, c.pos.y - f.z) > 0.05; }, [from, what], { timeout: 30000 }).then(() => true, () => false);
  const hold = async (key, what) => { const f = await pose(); await p.keyboard.down(key); const ok = await changed(f, what); await p.keyboard.up(key); return ok; };
  // Page Down first: from where you come in it goes to no. 1 (later it counts from the work in front)
  await p.keyboard.press('PageDown');
  const front = await p.waitForFunction(() => document.getElementById('prompt').textContent.includes('Wrong Data Landscape Dresden'), null, { timeout: 30000 }).then(() => true, () => false);
  await p.keyboard.press('Enter');
  const opened = await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 }).then(() => p.textContent('#viewer-title'), () => '(nothing)');
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('viewer').hidden && document.activeElement === document.getElementById('scene'), null, { timeout: 30000 }).catch(() => {});
  const up = await hold('ArrowUp', 'pos');
  const down = await hold('ArrowDown', 'pos');
  const left = await hold('ArrowLeft', 'yaw');
  const right = await hold('ArrowRight', 'yaw');
  const f = await pose();
  await p.mouse.move(683, 300);
  await p.mouse.down();
  await p.mouse.move(760, 300, { steps: 4 });
  await p.mouse.up();
  const dragged = await changed(f, 'yaw');
  step(`F1.1 Title screen on a computer: "${UI.en.loader.howtoDesk}" (HU "${UI.hu.loader.howtoDesk}"), naming ↑↓, ←→, Page Down, Enter and the drag, Page Down before the drag; and each key it names does that: ↑ ↓ walk, ← → turn, Page Down goes to no. 1, Enter opens it, a drag looks round`, line === UI.en.loader.howtoDesk && lineHu === UI.hu.loader.howtoDesk && ['↑↓', '←→', 'Page Down', 'Enter', 'drag'].every((x) => line.includes(x)) && line.indexOf('Page Down') < line.indexOf('drag') && up && down && left && right && front && opened === 'Wrong Data Landscape Dresden' && dragged, `"${line}" / "${lineHu}"; ↑ ${up}, ↓ ${down}, ← ${left}, → ${right}, Page Down named no. 1 ${front}, Enter opened "${opened}", drag ${dragged}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
for (const [name, opts, lang] of [['1366 × 768, English', {}, 'en'], ['1280 × 800, Hungarian', { viewport: { width: 1280, height: 800 } }, 'hu'], ['800 × 600, Hungarian', { viewport: { width: 800, height: 600 } }, 'hu'], ['683 × 384 at 2× (200%), Hungarian', { viewport: { width: 683, height: 384 }, deviceScaleFactor: 2 }, 'hu']]) {
  const w = await insideByKeys(lang, opts);
  const p = w.page;
  const g = await guideInfo(p);
  const tree = await axTree(p);
  const inTree = tree.some((n) => n.includes(UI[lang].hud.guide?.open ?? '(no such string)'));
  const b = await boxes(p, ['#guide', '#keypad', '#zoompad', '#toolbar', '#room-label', '#minimap', '#map-key']);
  const clear = ['#keypad', '#zoompad', '#toolbar', '#room-label', '#minimap', '#map-key'].every((s) => !meets(b['#guide'], b[s]));
  const want = lang === 'en' ? [UI.en.hud.guide?.title, UI.en.hud.guide?.walk] : [UI.hu.hud.guide?.walk];
  step(`F1.2 Computer ${name}: not shown while the sound question is open; after Esc answered it, the first-use card shows by the keys, over none of the keys, the zoom keys, the toolbar, the room label, the map and its key; hidden from screen readers, nothing in it takes focus or a click (a click there reaches the 3D view), focus on the 3D view; the hint in the middle does not show with it`, !w.during.shown && g.shown && want.every((x) => g.text.includes(x)) && g.hidden === 'true' && !inTree && g.focusables === 0 && g.under === 'scene' && g.focus === 'scene' && g.hint === 'hidden' && clear, `during the question: ${w.during.shown}; ${JSON.stringify(g)}; read from the tree: ${inTree}; ${Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; ')}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
// A narrow or short computer window: the card shows only where it fits, inside the window and
// clear of the map, its key and the room label; where it does not, the hint in the middle shows
// as it did before the card. 480 × 700 has room for it.
for (const [name, opts, lang, mustShow] of [['320 × 568, English', { viewport: { width: 320, height: 568 } }, 'en', false], ['320 × 568, Hungarian', { viewport: { width: 320, height: 568 } }, 'hu', false], ['320 × 256 (1280 × 1024 at 400%), Hungarian', { viewport: { width: 320, height: 256 } }, 'hu', false], ['480 × 700, Hungarian', { viewport: { width: 480, height: 700 } }, 'hu', true]]) {
  const w = await insideByKeys(lang, opts);
  const p = w.page;
  const g = await guideInfo(p);
  const b = await boxes(p, ['#guide', '#minimap', '#map-key', '#room-label']);
  const vw = opts.viewport;
  const inWindow = !!b['#guide'] && b['#guide'].x >= 0 && b['#guide'].y >= 0 && b['#guide'].x + b['#guide'].w <= vw.width && b['#guide'].y + b['#guide'].h <= vw.height;
  const clear = ['#minimap', '#map-key', '#room-label'].every((x) => !meets(b['#guide'], b[x]));
  // since E2, a window up to 480 × 400 px has the compact control layer: neither the card nor the hint
  const compact = vw.width <= 480 && vw.height <= 400;
  const ok = g.shown ? inWindow && clear && g.hidden === 'true' : !mustShow && g.hint === (compact ? 'none' : 'visible');
  step(`F1.8 Computer ${name}: the first-use card shows only inside the window and clear of the map, its key and the room label; else it is not shown and the hint in the middle shows${mustShow ? ' (here it fits and shows)' : ''}${compact ? ' (here, since E2, the compact control layer leaves out the hint as well)' : ''}`, ok, `card shown: ${g.shown}, hint: ${g.hint}; ${Object.entries(b).map(([x, v]) => `${x} ${show(v)}`).join('; ')}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  // the English words index.html holds until the language file has loaded are the language
  // file's own (for the line before entering, F1, as for every other string)
  const html = readFileSync('index.html', 'utf8');
  const unesc = (x) => x.replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const get = (k) => k.split('.').reduce((o, x) => (o && typeof o === 'object' ? o[x] : undefined), UI.en);
  const off = [...html.matchAll(/data-i18n="([^"]+)"[^>]*>([^<]*)</g)].filter(([, k, x]) => typeof get(k) === 'string' && unesc(x).trim() !== get(k).trim()).map(([, k]) => k);
  const line = html.match(/data-i18n="loader\.howtoDesk">([^<]*)</)?.[1];
  step(`F1.9 index.html's English stand-in text matches en.json, the line before entering included ("${UI.en.loader.howtoDesk}")`, off.length === 0 && line === UI.en.loader.howtoDesk, off.length ? `differs: ${off.join(', ')}` : `all match; the line: "${line}"`);
}
await guard(['F1.3'], async () => {
  // it goes at the first key, and that key works (walking is not blocked); a mouse press; the wheel
  const w = await insideByKeys('en');
  const p = w.page;
  const x0 = await p.evaluate(() => window.__ap.controls.pos.x);
  await p.keyboard.down('ArrowUp');
  const walked = await p.waitForFunction((x) => Math.abs(window.__ap.controls.pos.x - x) > 0.05, x0, { timeout: 30000 }).then(() => true, () => false);
  await p.keyboard.up('ArrowUp');
  const byKey = await guideInfo(p);
  await w.ctx.close();
  const m = await insideByKeys('en');
  await m.page.mouse.click(683, 250);
  const byClick = await guideInfo(m.page);
  await m.ctx.close();
  const r = await insideByKeys('en');
  await r.page.mouse.move(683, 300);
  await r.page.mouse.wheel(0, -100);
  const byWheel = await guideInfo(r.page);
  // a new visit (the page loaded again): it shows again; nothing is stored but the language
  await r.page.reload();
  await r.page.waitForFunction(() => document.body.dataset.state === 'ready', null, { timeout: 90000 });
  await r.page.focus('#enter');
  await r.page.keyboard.press('Enter');
  await r.page.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await r.page.keyboard.press('Escape');
  await r.page.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  const again = await guideInfo(r.page);
  const stored = await r.page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage).length, cookies: document.cookie }));
  step('F1.3 The card goes at the first key (↑, and walking starts at once), at a mouse press on the view, at a turn of the wheel; loaded again, it shows again; nothing stored but the language', walked && !byKey.shown && !byClick.shown && !byWheel.shown && again.shown && stored.local.every((k) => k === 'ap-lang') && !stored.session && !stored.cookies, `↑: walked ${walked}, card ${byKey.shown}; click: ${byClick.shown}; wheel: ${byWheel.shown}; after a reload: ${again.shown}; storage ${JSON.stringify(stored)}`);
  errors.push(...w.errors, ...m.errors, ...r.errors);
  await r.ctx.close();
});
await guard(['F1.4', 'F1.5', 'F1.6'], async () => {
  // Help by keyboard, through the dialog path; it brings the card back
  const w = await insideByKeys('en');
  const p = w.page;
  const on = (sel) => p.evaluate((x) => document.activeElement === document.querySelector(x), sel);
  let tabs = 0;
  for (let i = 1; i <= 12; i++) { await p.keyboard.press('Tab'); if (await on('[data-action="help"]')) { tabs = i; break; } }
  const helpName = await axName(p, '[data-action="help"]'); // as the browser gives it: in capitals, as shown
  const cardAfterTab = (await guideInfo(p)).shown;
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  const open = await p.evaluate(() => ({ title: document.getElementById('panel-title')?.textContent, close: document.activeElement === document.querySelector('#panel [data-close]'), inert: document.getElementById('stage').inert, paras: [...document.querySelectorAll('#panel-body p')].map((x) => x.textContent) }));
  const cycle = [];
  for (let i = 0; i < 4; i++) { await p.keyboard.press('Tab'); cycle.push(await p.evaluate(() => document.getElementById('panel').contains(document.activeElement))); }
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  const back = await on('[data-action="help"]');
  const inertAfter = await p.evaluate(() => document.getElementById('stage').inert);
  step(`F1.4 Help by keyboard: the guide card gone at the first Tab; Tab from the 3D view reaches the Help button (${tabs} presses); Enter opens the panel "${UI.en.nav.help}" with focus on Close, the page behind inert, the controls for a computer first, then for touch, both naming the ${UI.en.hud.next} button; Tab stays inside; Esc closes it and focus is back on Help`, tabs > 0 && !cardAfterTab && helpName.toLowerCase() === UI.en.hud.help.toLowerCase() && open.title === UI.en.nav.help && open.close && open.inert && open.paras[1] === UI.en.panels.controlsDesk && open.paras[2] === UI.en.panels.controlsTouch && open.paras.slice(1, 3).every((x) => x.includes(UI.en.hud.next)) && cycle.every(Boolean) && back && !inertAfter, `card after the Tabs: ${cardAfterTab}; ${tabs} Tabs to "${helpName}"; ${JSON.stringify({ ...open, paras: open.paras.map((x) => x.slice(0, 40)) })}; Tab stayed inside: ${cycle.join(',')}; focus back on Help: ${back}; stage inert after: ${inertAfter}`);
  // again, then "Show the short guide again"
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  let reached = false;
  for (let i = 0; i < 6 && !reached; i++) { await p.keyboard.press('Tab'); reached = await on('#panel-body [data-guide]'); }
  const label = await p.evaluate(() => document.querySelector('#panel-body [data-guide]')?.textContent);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  const g = await guideInfo(p);
  const onHelp = await on('[data-action="help"]');
  await p.keyboard.press('Tab');
  const gone = await guideInfo(p);
  step(`F1.5 Help, "${UI.en.panels.helpGuide}" by keyboard: the panel closes, focus is back on Help, the card shows again, and goes at the next key`, reached && label === UI.en.panels.helpGuide && g.shown && onHelp && !gone.shown, `reached ${reached} ("${label}"); card shown ${g.shown}, focus on Help ${onHelp}; after Tab: ${gone.shown}`);
  // by mouse: Close clicked, focus to the 3D view; the language switched while it is open
  await p.click('[data-action="help"]');
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  await switchTo(p, 'hu');
  const hu = await p.evaluate(() => ({ title: document.getElementById('panel-title')?.textContent, guide: document.querySelector('#panel-body [data-guide]')?.textContent, close: document.getElementById('panel').contains(document.activeElement), paras: [...document.querySelectorAll('#panel-body p')].slice(1, 3).map((x) => x.textContent) }));
  await switchTo(p, 'en');
  await p.click('#panel [data-close]');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  const view = await p.evaluate(() => document.activeElement === document.getElementById('scene'));
  step('F1.6 Help by mouse: switched to Hungarian while open, it reads "Súgó", its button in Hungarian and both controls texts name "Következő mű", focus stays in the panel; Close clicked: focus on the 3D view', hu.title === UI.hu.nav.help && hu.guide === UI.hu.panels.helpGuide && hu.close && hu.paras.length === 2 && hu.paras.every((x) => x.includes(UI.hu.hud.next)) && view, `${JSON.stringify(hu)}; focus on the view after Close: ${view}`);
  errors.push(...w.errors);
  await w.ctx.close();
});
await guard(['F1.7'], async () => {
  // a phone: Help is in the folded menu, not on the toolbar; closing it puts focus on Menu (C7);
  // its button brings the touch hint back
  const w = await inside('en', PHONE);
  const p = w.page;
  const onBar = await p.evaluate(() => document.querySelector('[data-action="help"]').getClientRects().length > 0);
  await p.tap('.nav-toggle');
  await p.waitForFunction(() => document.getElementById('site-nav').classList.contains('open'), null, { timeout: 30000 }).catch(() => {});
  const inMenu = await p.evaluate(() => document.querySelector('#nav-links [data-nav="help"]').getClientRects().length > 0);
  await p.tap('#nav-links [data-nav="help"]');
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  const first = await p.evaluate(() => document.querySelectorAll('#panel-body p')[1]?.textContent);
  await p.tap('#panel [data-close]');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  const onMenu = await p.evaluate(() => document.activeElement === document.querySelector('.nav-toggle'));
  // the hint had gone (a touch on the view); Help's button brings it back
  const touch = await finger(p);
  await touch('touchStart', 190, 420);
  await touch('touchMove', 240, 420);
  await touch('touchEnd');
  await p.waitForFunction(() => getComputedStyle(document.getElementById('click-to-look')).visibility === 'hidden', null, { timeout: 30000 }).catch(() => {});
  await p.tap('.nav-toggle');
  await p.tap('#nav-links [data-nav="help"]');
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  await p.tap('#panel-body [data-guide]');
  const back = await p.waitForFunction(() => document.getElementById('panel').hidden && getComputedStyle(document.getElementById('click-to-look')).visibility === 'visible', null, { timeout: 30000 }).then(() => true, () => false);
  const card = await guideInfo(p);
  step('F1.7 Phone 375 × 667: Help is not on the toolbar but in the folded menu; it opens with the touch controls first, which name the Next work button; closed with a tap, focus is on Menu; its button brings the touch hint back (the card is for a computer and does not show)', !onBar && inMenu && first === UI.en.panels.controlsTouch && (first || '').includes(UI.en.hud.next) && onMenu && back && !card.shown, `on the toolbar: ${onBar}; in the menu: ${inMenu}; first paragraph "${(first || '').slice(0, 50)}…"; focus on Menu after Close: ${onMenu}; hint back: ${back}; card: ${card.shown}`);
  errors.push(...w.errors);
  await w.ctx.close();
});

// ---------------- E2: a very small computer window (400% zoom) has a compact control layer
const E2SIZES = [['320 × 256 (1280 × 1024 at 400%), Hungarian', { viewport: { width: 320, height: 256 } }, 'hu'], ['320 × 192, Hungarian', { viewport: { width: 320, height: 192 } }, 'hu'], ['341 × 192 (1366 × 768 at 400%), English', { viewport: { width: 341, height: 192 } }, 'en']];
for (const [name, opts, lang] of E2SIZES) {
  const w = await insideByKeys(lang, opts);
  const p = w.page;
  await p.evaluate(() => window.__ap.controls.zoomBy(2));
  await p.waitForFunction(() => !document.getElementById('zoom-level').hidden, null, { timeout: 30000 }).catch(() => {});
  const gone = ['#site-foot', '#keypad', '#zoompad', '#minimap', '#map-key', '#click-to-look', '#guide'];
  const kept = ['#site-nav', '#room-label', '#toolbar', '#zoom-level'];
  const b = await boxes(p, [...gone, ...kept]);
  const vw = opts.viewport;
  const inside = kept.every((s) => b[s] && b[s].x >= 0 && b[s].y >= 0 && b[s].x + b[s].w <= vw.width + 0.5 && b[s].y + b[s].h <= vw.height + 0.5);
  const pairs = [];
  for (let i = 0; i < kept.length; i++) for (let j = i + 1; j < kept.length; j++) if (meets(b[kept[i]], b[kept[j]])) pairs.push(`${kept[i]}/${kept[j]}`);
  step(`E2.1 Computer ${name}, zoomed in: no footer, keys, zoom keys, map, map key, hint or first-use card; the navbar, the room label, the toolbar and the zoom readout inside the window, none over another`, gone.every((s) => !b[s]) && inside && pairs.length === 0, `${Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; ')}${pairs.length ? `; over each other: ${pairs.join(', ')}` : ''}`);
  if (name.startsWith('320 × 256')) {
    // Tab from the 3D view: every stop shows and lies inside the window; the toolbar comes first
    const stops = [];
    for (let i = 0; i < 12; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { name: a.dataset.action || a.id || a.className || a.tagName, ok: r.width > 0 && r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5 }; });
      stops.push(f);
      if (f.name === 'scene') break;
    }
    const order = stops.map((x) => x.name);
    const bar = ['tour', 'rooms', 'sound', 'next'].map((a) => order.indexOf(a));
    // the footer's four links, in the folded menu (D3)
    await p.evaluate(() => document.querySelector('#site-nav .nav-toggle').click());
    await p.waitForFunction(() => document.querySelector('#site-nav .nav-more')?.getClientRects().length > 0, null, { timeout: 30000 }).catch(() => {});
    const more = await p.evaluate(() => [...document.querySelectorAll('#site-nav .nav-more a, #site-nav .nav-more button')].filter((x) => x.getClientRects().length).length);
    step('E2.2 Computer 320 × 256: Tab from the 3D view goes through Tour, Rooms, Sound and Next work first, in that order, and every stop shows inside the window; the folded menu holds the footer\'s four links', bar.every((x, i) => x >= 0 && (i === 0 || x > bar[i - 1])) && bar[0] === 0 && stops.every((x) => x.ok) && more === 4, `${stops.map((x) => `${x.name}${x.ok ? '' : ' (off screen)'}`).join(' → ')}; links in the menu: ${more}`);
  }
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- F2: Next work on the toolbar, on every device
const listen = (p) => p.evaluate(() => { window.__said = []; const el = document.getElementById('announcer'); new MutationObserver(() => window.__said.push(el.textContent.trim())).observe(el, { childList: true, characterData: true, subtree: true }); });
const hear = async (p, parts) => {
  await p.waitForFunction((x) => { const all = window.__said.join(' | '); return x.every((t) => all.includes(t)); }, parts, { timeout: 30000, polling: 100 }).catch(() => {});
  return p.evaluate(() => window.__said.splice(0).join(' | '));
};
// the work whose viewing point the visitor stands at
const standingAt = (p) => p.evaluate(() => { const { controls, visit } = window.__ap; const w = visit.find((k) => Math.hypot(k._focus.x - controls.pos.x, k._focus.z - controls.pos.y) < 0.02); return w ? w.no : null; });
const atWork = (p, no) => p.waitForFunction((n) => { const { controls, visit } = window.__ap; const w = visit[n - 1]; return Math.hypot(w._focus.x - controls.pos.x, w._focus.z - controls.pos.y) < 0.02; }, no, { timeout: 30000 }).then(() => true, () => false);
const said = (l, no, title) => fill(UI[l].announce.work, { no, title });
// from the button by keyboard, or tapped: no "Press Enter to open", since Enter there does not open the work
const saidNext = (l, no, title) => fill(UI[l].announce.workNext, { no, title });
const enterWords = (l) => UI[l].announce.work.split('. ').pop().replace(/\.$/, ''); // "Press Enter to open", "Megnyitás: Enter"
for (const [name, opts, lang] of [['1366 × 768, English', {}, 'en'], ['1280 × 800, Hungarian', { viewport: { width: 1280, height: 800 } }, 'hu'], ['900 × 700, Hungarian', { viewport: { width: 900, height: 700 } }, 'hu'], ['800 × 600, Hungarian', { viewport: { width: 800, height: 600 } }, 'hu'], ['683 × 384 at 2×, Hungarian', { viewport: { width: 683, height: 384 }, deviceScaleFactor: 2 }, 'hu'], ['phone 375 × 667, English', PHONE, 'en'], ['phone 375 × 667, Hungarian', PHONE, 'hu'], ['phone 320 × 640, Hungarian', { ...PHONE, viewport: { width: 320, height: 640 } }, 'hu'], ['phone on its side 667 × 375, Hungarian', PHONE_SIDE, 'hu']]) {
  const w = await insideByKeys(lang, opts);
  const p = w.page;
  const touch = !!opts.hasTouch;
  const info = await p.evaluate(() => {
    const b = document.querySelector('[data-action="next"]');
    const bar = document.getElementById('toolbar').getBoundingClientRect();
    const btns = [...document.querySelectorAll('#toolbar > button, #toolbar .rooms-wrap > button')].filter((x) => x.getClientRects().length).map((x) => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); });
    return { label: b?.querySelector('.lbl')?.textContent ?? null, title: b?.title ?? null, shown: !!b && b.getClientRects().length > 0, inside: bar.left >= 0 && bar.right <= innerWidth && bar.bottom <= innerHeight, smallest: Math.round(Math.min(...btns)) };
  });
  const b = await boxes(p, ['#toolbar', '#keypad', '#zoompad', '#joystick', '#minimap', '#map-key', '#room-label', '#guide']);
  const clear = ['#keypad', '#zoompad', '#joystick', '#minimap', '#map-key', '#room-label', '#guide'].every((x) => !meets(b['#toolbar'], b[x]));
  step(`F2.1 ${name}: "${UI[lang].hud.next}" is on the toolbar; the toolbar is inside the window and over none of the keys, the zoom keys, the stick, the map, its key, the room label and the first-use card${touch ? '; every button at least 44 × 44 px' : ''}`, info.shown && info.label === UI[lang].hud.next && info.title === UI[lang].hud.nextTitle && info.inside && clear && (!touch || info.smallest >= 44), `${JSON.stringify(info)}; ${Object.entries(b).map(([x, v]) => `${x} ${show(v)}`).join('; ')}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
await guard(['F2.2'], async () => {
  // by mouse: the same jump and the same words as Page Down; focus to the 3D view, so Enter opens the work
  const w = await insideByKeys('en');
  const p = w.page;
  await listen(p);
  await p.click('[data-action="next"]');
  const one = await atWork(p, 1);
  // (the room is said only when it changes, as for Page Down: Room 1 was said on coming in)
  const h1 = await hear(p, [said('en', 1, 'Wrong Data Landscape Dresden')]);
  const view = await p.evaluate(() => document.activeElement === document.getElementById('scene'));
  await p.click('[data-action="next"]');
  const two = await atWork(p, 2);
  const h2 = await hear(p, [said('en', 2, 'Human as Error VI')]);
  await p.keyboard.press('Enter');
  const opened = await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 }).then(() => p.textContent('#viewer-title'), () => '(nothing)');
  step('F2.2 Next work clicked: to no. 1, "No. 1, Wrong Data Landscape Dresden. Press Enter to open." said, as Page Down says it, focus on the 3D view; clicked again: no. 2, said; Enter opens no. 2', one && h1.includes(said('en', 1, 'Wrong Data Landscape Dresden')) && view && two && h2.includes(said('en', 2, 'Human as Error VI')) && opened === 'Human as Error VI', `at no. 1: ${one}, said "${h1}", focus on the view: ${view}; at no. 2: ${two}, said "${h2}"; Enter opened "${opened}"`);
  errors.push(...w.errors);
  await w.ctx.close();
});
await guard(['F2.3'], async () => {
  // by keyboard: focus stays on the button; one jump per press, also when Enter is held
  const w = await insideByKeys('hu');
  const p = w.page;
  await listen(p);
  const on = () => p.evaluate(() => document.activeElement === document.querySelector('[data-action="next"]'));
  let tabs = 0;
  for (let i = 1; i <= 12; i++) { await p.keyboard.press('Tab'); if (await on()) { tabs = i; break; } }
  await p.keyboard.press('Enter');
  const one = await atWork(p, 1);
  const h1 = await hear(p, [saidNext('hu', 1, 'Wrong Data Landscape Dresden')]);
  const stays = await on();
  await p.keyboard.press('Enter');
  const two = await atWork(p, 2);
  // Enter held: one keydown and then repeats
  await p.keyboard.down('Enter');
  for (let i = 0; i < 4; i++) await p.keyboard.down('Enter');
  await p.keyboard.up('Enter');
  const three = await atWork(p, 3);
  const after = await standingAt(p);
  const viewer = await p.evaluate(() => !document.getElementById('viewer').hidden);
  step('F2.3 Hungarian page, by keyboard: Tab from the 3D view to Next work, Enter: to no. 1, "1. mű, Wrong Data Landscape Dresden." said, without "Megnyitás: Enter." (Enter here goes on to the next work), focus stays on the button; Enter again: no. 2; Enter held (four repeats): one jump only, to no. 3; nothing opens', tabs > 0 && one && h1.includes(saidNext('hu', 1, 'Wrong Data Landscape Dresden')) && !h1.includes(enterWords('hu')) && stays && two && three && after === 3 && !viewer, `${tabs} Tabs; no. 1 ${one}, said "${h1}", focus on the button ${stays}; no. 2 ${two}; after the held Enter at no. ${after}; viewer open ${viewer}`);
  errors.push(...w.errors);
  await w.ctx.close();
});
await guard(['F2.4'], async () => {
  // a phone: a tap, one jump, said; the first-use words name it
  const w = await inside('en', PHONE);
  const p = w.page;
  await listen(p);
  const hint = await p.textContent('#click-to-look');
  await p.tap('[data-action="next"]');
  const one = await atWork(p, 1);
  const h1 = await hear(p, [saidNext('en', 1, 'Wrong Data Landscape Dresden')]);
  await p.tap('[data-action="next"]');
  const two = await atWork(p, 2);
  const viewer = await p.evaluate(() => !document.getElementById('viewer').hidden);
  step('F2.4 Phone 375 × 667: Next work tapped: to no. 1, said as "No. 1, Wrong Data Landscape Dresden." without "Press Enter to open" (a phone has no Enter key); tapped again: no. 2; nothing opens; the touch hint names Next work', one && h1.includes(saidNext('en', 1, 'Wrong Data Landscape Dresden')) && !h1.includes(enterWords('en')) && two && !viewer && hint === UI.en.hud.touchHint && hint.includes(UI.en.hud.next), `no. 1 ${one}, said "${h1}"; no. 2 ${two}; viewer ${viewer}; hint "${hint}"`);
  errors.push(...w.errors);
  await w.ctx.close();
});
await guard(['F2.5'], async () => {
  const w = await insideByKeys('en');
  const en = (await guideInfo(w.page)).text;
  await switchTo(w.page, 'hu');
  const hu = (await guideInfo(w.page)).text;
  step(`F2.5 The first-use card names Page Down and Next work: "${UI.en.hud.guide.next}" / "${UI.hu.hud.guide.next}"`, en.includes(UI.en.hud.guide.next) && UI.en.hud.guide.next.includes('Page Down') && UI.en.hud.guide.next.includes(UI.en.hud.next) && hu.includes(UI.hu.hud.guide.next) && UI.hu.hud.guide.next.includes(UI.hu.hud.next), `EN ${JSON.stringify(en)}; HU ${JSON.stringify(hu)}`);
  errors.push(...w.errors);
  await w.ctx.close();
});

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
