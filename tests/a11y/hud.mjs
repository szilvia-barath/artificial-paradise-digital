// What the controls over the 3D view show and say: the floor plan's key (A4); on a touch
// screen, the sound question's hint and the hint inside, and the taps of the tour (D11), the stick held and the turning
// keys (D2); a laptop with a touch screen as a computer, by mouse and by touch (D10); the viewer side by side on a short screen on its side (D8); the compact control layer in a very small window (E2); the tour caption's first line
// (F3); the line before entering, the first-use card and Help (F1); Next work on the toolbar
// (F2); the look: its accent and states not told by colour alone (H1.1), the paper panels (H1.2),
// the glass chips and their focus ring (H1.3), the buttons (H1.4); the size, case and letter
// spacing of the interface type (A7). Each step
// waits for what it checks (the 3D view renders in software here, at 1 to 2 frames a
// second). Sizes and colours are read from the page (no screenshot is taken); contrast is
// worked out for the worst case, the glass over pure white, and over black.
// Usage: npm run build && npm run preview &   then   node tests/a11y/hud.mjs
import { readFileSync } from 'node:fs';
import { launch, openWalk, TOUCH_LAPTOP } from './lib.mjs';

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
  await w.ctx.route(/google|gstatic|ggpht|googleusercontent|youtube|ytimg/, (r) => r.abort());
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

// ---------------- D10: a laptop with a touch screen is a computer, and touch works on it too
// TOUCH_LAPTOP (lib.mjs) tells the page what Chrome on such a laptop answers about its
// pointers. The mouse is Playwright's, the fingers are sent through the DevTools protocol.
const face = (p) => p.evaluate(() => {
  const shown = (s) => { const e = document.querySelector(s); return !!e && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getClientRects().length > 0; };
  const hint = document.getElementById('click-to-look');
  return {
    touch: document.body.classList.contains('touch'),
    caps: [...document.querySelectorAll('#keypad .cap')].filter((c) => c.getClientRects().length && getComputedStyle(c).visibility !== 'hidden').length,
    foot: shown('#site-foot'), stick: shown('#joystick'), card: shown('#guide'),
    hint: hint.textContent, hintHidden: hint.getAttribute('aria-hidden'), ask: document.getElementById('sound-ask-hint').textContent,
  };
});
let d10 = 0; // steps of the laptop reported so far
try {
  const w = await inside('en', TOUCH_LAPTOP);
  const p = w.page;
  const NO5 = 'w05-human-as-error-i';
  const [cx, cy] = [683, 384]; // the middle of the view
  const yaw = () => p.evaluate(() => window.__ap.controls.yaw);
  const turnedFrom = (y) => p.waitForFunction((v) => Math.abs(window.__ap.controls.yaw - v) > 0.1, y, { timeout: 30000 }).then(() => true, () => false);
  const aim = (on) => p.waitForFunction((want) => document.getElementById('prompt').classList.contains('show') === want, on, { timeout: 30000 }).then(() => true, () => false);
  const toNo5 = () => p.evaluate((id) => window.__ap.gotoWork(window.__ap.data.works.find((k) => k.id === id)), NO5);
  const openTitle = () => p.evaluate(() => (document.getElementById('viewer').hidden ? '(nothing)' : document.getElementById('viewer-title').textContent));
  const closeViewer = async () => { await p.keyboard.press('Escape'); await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 }).catch(() => {}); };

  // D10.1 what shows and what it says
  const f = await face(p);
  await p.evaluate(() => window.__ap.ui.show('help'));
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  const helpFirst = await p.evaluate(() => document.querySelectorAll('#panel-body p')[1]?.textContent);
  await p.evaluate(() => window.__ap.ui.close());
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  d10++;
  step(`D10.1 Laptop with a touch screen and a mouse, 1366 × 768: the computer's interface, not the phone's: the five keycaps (walk, turn, run) and the footer show, the first-use card shows, there is no stick; the hint in the middle and the sound question say the computer's words ("${UI.en.hud.clickToLook}", "${UI.en.soundAsk.hint}"), the hint is not hidden from screen readers, and Help has the computer's controls first`, !f.touch && f.caps === 5 && f.foot && f.card && !f.stick && f.hint === UI.en.hud.clickToLook && f.hintHidden === null && f.ask === UI.en.soundAsk.hint && helpFirst === UI.en.panels.controlsDesk, `${JSON.stringify(f)}; Help's first paragraph "${(helpFirst || '').slice(0, 40)}…"`);

  // D10.2 the mouse: a drag looks round, the work under it is named, a click opens it
  const y0 = await yaw();
  await p.mouse.move(600, 300);
  await p.mouse.down();
  await p.mouse.move(700, 300, { steps: 5 });
  await p.mouse.up();
  const mouseLooked = await turnedFrom(y0);
  await toNo5();
  await p.mouse.move(cx - 4, cy);
  await p.mouse.move(cx, cy);
  const aimed = await aim(true);
  const prompt = await p.evaluate(() => document.getElementById('prompt').textContent);
  await p.mouse.click(cx, cy);
  await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const byMouse = await openTitle();
  await closeViewer();
  d10++;
  step('D10.2 The same laptop, with the mouse: a drag on the 3D view looks round; with the mouse over the work in the middle the view names it ("Click to view · 5 Human as Error I"); a click opens it and it stays open', mouseLooked && aimed && prompt.includes('Human as Error I') && byMouse === 'Human as Error I', `drag turned the view: ${mouseLooked}; named under the mouse: ${aimed} ("${prompt}"); click opened: ${byMouse}`);

  // D10.3 fingers on the same screen, then the mouse again
  const touch = await finger(p);
  const cdp = await p.context().newCDPSession(p);
  const two = (type, d) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: cx - d, y: 300, id: 1 }, { x: cx + d, y: 300, id: 2 }] });
  await p.mouse.move(cx - 4, cy);
  await p.mouse.move(cx, cy);
  const aimedAgain = await aim(true); // the mouse rests on no. 5 again
  const y1 = await yaw();
  await touch('touchStart', 600, 300);
  await touch('touchMove', 650, 300);
  await touch('touchMove', 700, 300);
  await touch('touchEnd');
  const touchLooked = await turnedFrom(y1);
  const aimGone = await aim(false); // a finger leaves no cursor: the name under the mouse goes
  await two('touchStart', 40);
  for (const d of [60, 90, 120]) await two('touchMove', d);
  await two('touchEnd');
  const zoom = await p.evaluate(() => window.__ap.controls.zoomTarget);
  await p.evaluate(() => window.__ap.controls.resetZoom(true));
  // no stick here: by touch the keycaps walk. Back, away from the wall
  const k = await p.evaluate(() => { const e = document.querySelector('#keypad .k-s'); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, shown: e.getClientRects().length > 0 }; });
  const from = await p.evaluate(() => ({ x: window.__ap.controls.pos.x, z: window.__ap.controls.pos.y }));
  if (k.shown) await touch('touchStart', k.x, k.y);
  const walked = k.shown && await p.waitForFunction((a) => Math.hypot(window.__ap.controls.pos.x - a.x, window.__ap.controls.pos.y - a.z) > 0.2, from, { timeout: 20000 }).then(() => true, () => false);
  if (k.shown) await touch('touchEnd');
  const letGo = await p.waitForFunction(() => !window.__ap.controls.isDown('ArrowDown'), null, { timeout: 10000 }).then(() => true, () => false);
  // a tap on the work in the middle: it opens and stays open, and the browser sends no mouse
  // click after the tap (D11: the tap cancels its touchend). A click that came would land on
  // the viewer that had just opened; it must not count as a mouse press on the view either.
  await p.evaluate(() => { window.__clicks = 0; addEventListener('click', () => window.__clicks++, true); });
  await toNo5();
  await p.touchscreen.tap(cx, cy);
  await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 }).catch(() => {});
  const click = await p.waitForFunction(() => window.__clicks > 0, null, { timeout: 3000 }).then(() => true, () => false);
  const byTap = await openTitle();
  await closeViewer();
  // and the mouse straight after the finger
  const y2 = await yaw();
  await p.mouse.move(600, 300);
  await p.mouse.down();
  await p.mouse.move(700, 300, { steps: 5 });
  await p.mouse.up();
  const mouseAgain = await turnedFrom(y2);
  d10++;
  step('D10.3 The same laptop, by touch: a finger dragged on the 3D view looks round, and the name under the resting mouse goes; two fingers pinch to zoom; the Back keycap held with a finger walks (there is no stick here) and lets go when the finger lifts; a tap on the work in the middle opens it and it stays open, and no mouse click follows the tap; the mouse dragged straight after looks round again', aimedAgain && touchLooked && aimGone && zoom > 1.5 && walked && letGo && byTap === 'Human as Error I' && !click && mouseAgain, `named under the mouse first: ${aimedAgain}; finger drag turned the view: ${touchLooked}; the name gone at the touch: ${aimGone}; pinch zoomed to ${zoom.toFixed(2)}×; Back keycap shown: ${k.shown}, walked: ${walked}, let go: ${letGo}; tap opened: ${byTap} (the browser's click after the tap sent: ${click}); mouse drag after touch turned the view: ${mouseAgain}`);
  errors.push(...w.errors);
  await w.ctx.close();
} catch (e) {
  for (const n of ['D10.1', 'D10.2', 'D10.3'].slice(d10)) step(`${n} (stopped)`, false, String(e).split('\n')[0]);
}
{
  // a phone has no mouse: it is as it was (this step is a guard; it passed before D10 as well)
  const w = await inside('en', PHONE);
  const f = await face(w.page);
  step(`D10.4 Phone 375 × 667 (touch, no mouse): unchanged: the stick shows, of the keycaps only the two turning keys, no footer inside, no first-use card; the touch hint ("${UI.en.hud.touchHint}"), hidden from screen readers, and the sound question's touch words`, f.touch && f.stick && f.caps === 2 && !f.foot && !f.card && f.hint === UI.en.hud.touchHint && f.hintHidden === 'true' && f.ask === UI.en.soundAsk.hintTouch, JSON.stringify(f));
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
  // the zoom readout, moved for the two keys, over none of the map, its key, the room label, the toolbar or the zoom keys
  const readout = !!b['#zoom-level'] && ['#minimap', '#map-key', '#room-label', '#toolbar', '#zoompad', '#joystick', '#click-to-look'].every((s) => !meets(b['#zoom-level'], b[s]));
  const want = [UI[lang].hud.keys.left, UI[lang].hud.keys.right];
  step(`D2.1 Phone ${name}: only the two turning keys show ("${want.join('", "')}"), each at least 44 × 44 px, inside the window, over none of the stick, the toolbar, the zoom keys, the zoom readout, the map, its key, the room label and the touch hint; the zoom readout over none of the map, its key, the room label, the toolbar, the zoom keys, the stick and the hint`, caps.length === 2 && caps.map((c) => c.title).join('|') === want.join('|') && caps.every((c) => c.w >= 44 && c.h >= 44 && c.inside) && clear && readout, `readout clear ${readout}; ${JSON.stringify(caps)}; ${Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; ')}`);
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
for (const [name, opts, minW, minH] of [['phone on its side 667 × 375', PHONE_SIDE, 340, 300], ['phone on its side 740 × 360', { ...PHONE, viewport: { width: 740, height: 360 } }, 330, 290], ['phone on its side 844 × 390', { ...PHONE, viewport: { width: 844, height: 390 } }, 360, 320], ['small phone on its side 568 × 320', { ...PHONE, viewport: { width: 568, height: 320 } }, 280, 250], ['phone upright 375 × 667 (stacked, as before)', PHONE, 340, 290], ['computer window 320 × 256 (1280 × 1024 at 400%), mouse: the work at least as large as stacked before D8 (92 × 81)', { viewport: { width: 320, height: 256 } }, 92, 81], ['computer window 341 × 192 (1366 × 768 at 400%), mouse: at least as large as before D8 (52 × 46)', { viewport: { width: 341, height: 192 } }, 52, 46]]) {
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

// ---------------- D11.7: on a phone, the taps of the tour hold
// During the tour a tap on the view opens the work at that stop. The caption lets a tap
// through to the view. The browser's mouse click after the tap must not follow: it landed
// on the viewer that had just opened under the finger: on "View in situ" (no. 5), on the
// artist's link, which opens a new tab (no. 16), or beside the picture, which closes the
// viewer again (no. 1). The same taps on a laptop with a touch screen (D10): there touch
// works beside the mouse, and the tap goes the same way.
for (const [name, opts, view] of [['Phone', PHONE, [187, 280]], ['Laptop with a touch screen and a mouse, 1366 × 768', TOUCH_LAPTOP, [683, 300]]]) {
  let w = null;
  try {
    w = await inside('en', opts);
    const p = w.page;
    await p.evaluate(() => { window.__clicks = []; addEventListener('click', (e) => window.__clicks.push(e.target.id || e.target.className || e.target.tagName), true); });
    const tapOn = async (sel) => { const c = await p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); await p.touchscreen.tap(c.x, c.y); };
    const touring = () => p.evaluate(() => window.__ap.tour.active);
    const settled = () => p.waitForTimeout(2500); // a click, if the browser sends one, comes within a few frames
    const got = [];
    for (const [id, title, where] of [['w05-human-as-error-i', 'Human as Error I', '#tour-caption'], ['w16-let-it-flow', 'Let it Flow', '#tour-caption'], ['w01-dresden', 'Wrong Data Landscape Dresden', null]]) {
      await p.evaluate(() => { window.__ap.viewer.close(); window.__ap.tour.stop(); window.__clicks.length = 0; });
      await tapOn('[data-action="tour"]');
      await settled();
      const started = await touring();
      const at = await toStop(p, id);
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // the view drawn at the stop
      await p.evaluate(() => { window.__clicks.length = 0; });
      if (where) await tapOn(where);
      else await p.touchscreen.tap(...view);
      const opened = await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 }).then(() => true, () => false);
      await settled();
      const s = await p.evaluate(() => ({ viewer: document.getElementById('viewer').hidden ? '(closed)' : document.getElementById('viewer-title').textContent, clicks: window.__clicks.slice(), tour: window.__ap.tour.active }));
      got.push({ id, where: where || 'the view', started, at, opened, ...s, tabs: w.ctx.pages().length, ok: started && at && opened && s.viewer === title && s.clicks.length === 0 && !s.tour && w.ctx.pages().length === 1 });
    }
    // the Tour button: a tap starts the tour and it stays on; a second tap stops it and it stays off
    await p.evaluate(() => { window.__ap.viewer.close(); window.__ap.tour.stop(); });
    await tapOn('[data-action="tour"]');
    await settled();
    const on = await touring();
    await tapOn('[data-action="tour"]');
    await settled();
    const off = !(await touring());
    step(`D11.7 ${name}, during the tour: a tap on the caption (no. 5, no. 16) or on the view (no. 1) opens the work at that stop, it stays open, and no mouse click follows the tap onto the viewer (no button or link in it pressed, no new tab); a tap on Tour starts the tour and it stays on, a second tap stops it`, got.every((x) => x.ok) && on && off, got.map((x) => `${x.id}, tap on ${x.where}: tour started ${x.started}, at the stop ${x.at}, opened ${x.opened}, then "${x.viewer}", clicks after the tap: ${x.clicks.length ? x.clicks.join(', ') : 'none'}, tabs ${x.tabs}`).join('; ') + `; Tour tapped: on ${on}, tapped again: off ${off}`);
    errors.push(...w.errors);
  } catch (e) {
    step(`D11.7 ${name} (stopped)`, false, String(e).split('\n')[0]);
  }
  if (w) await w.ctx.close().catch(() => {});
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
// and the run goes on. The pages it left open are closed: an open page goes on drawing the 3D
// view and slows every step after it.
const guard = async (names, fn) => {
  try { await fn(); } catch (e) {
    for (const n of names) step(`${n} (stopped)`, false, String(e).split('\n')[0]);
    for (const c of browser.contexts()) await c.close().catch(() => {});
  }
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
  // right after entry, before any key: is the first-use card marked as shown? (E2.3)
  const card = await p.evaluate(() => ({ guiding: document.body.classList.contains('guiding'), hidden: document.getElementById('guide').hidden }));
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
    // with no card and no hint in this layer, Help offers no "Show the short guide again" that
    // would close the panel and show nothing; nor was the body marked as showing the card
    await p.evaluate(() => document.querySelector('[data-action="help"]').click());
    await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
    const help = await p.evaluate(() => { const b = document.querySelector('#panel-body [data-guide]'); return { open: !document.getElementById('panel').hidden, button: !!b && b.getClientRects().length > 0 }; });
    step('E2.3 Computer 320 × 256: right after entry the first-use card is not marked as shown (no "guiding", the card hidden), and Help opens without "Show the short guide again", which would show nothing here', !card.guiding && card.hidden && help.open && !help.button, `guiding ${card.guiding}, card hidden ${card.hidden}; Help open ${help.open}, the button shown ${help.button}`);
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

// ---------------- H1: the look. The accent is the reconstructor's blue #8fa8ff (the green
// #9dff6a is gone everywhere), it reads on the glass over a white wall and over black, and no
// state is told by its colour alone: a pressed toolbar button has a bar along its foot, the
// room the visitor is in is bold in the rooms menu, a pressed keycap keeps a light letter.
await guard(['H1.1'], async () => {
  const w = await inside('en');
  const p = w.page;
  const r = await p.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const green = [];
    for (const e of document.querySelectorAll('*')) {
      const c = getComputedStyle(e);
      for (const k of ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor', 'boxShadow', 'outlineColor']) if (/157,\s*255,\s*106/.test(c[k])) green.push(`${e.id || e.className || e.tagName} ${k}`);
    }
    const style = (e) => getComputedStyle(e);
    const tour = document.querySelector('#toolbar [data-action="tour"]');
    const was = tour.getAttribute('aria-pressed');
    tour.setAttribute('aria-pressed', 'true');
    const pressedShadow = style(tour).boxShadow;
    tour.setAttribute('aria-pressed', was);
    const offShadow = style(tour).boxShadow;
    const here = document.querySelector('#rooms-menu button[aria-current]');
    const cap = document.querySelector('.cap.k-w');
    cap.style.transition = 'none'; // the colours it ends on, not a step of the 0.12 s change
    cap.classList.add('pressed');
    const capText = style(cap.querySelector('i')).color;
    const capBg = style(cap).backgroundColor;
    const capTint = (style(cap).backgroundImage.match(/rgba?\([^)]*\)/) || ['rgba(0, 0, 0, 0)'])[0];
    cap.classList.remove('pressed');
    cap.style.transition = '';
    return {
      accent: css.getPropertyValue('--accent').trim(), glass: css.getPropertyValue('--glass').trim(), green,
      pressedShadow, offShadow, hereWeight: here ? Number(style(here).fontWeight) : 0, hereBar: here ? style(here.closest('.room-row')).borderLeftColor : '',
      capText, capBg, capTint, zoomVal: style(document.querySelector('#zoom-level .val')).color, zoomBg: style(document.getElementById('zoom-level')).backgroundColor,
    };
  });
  const onGlass = worst(r.zoomVal, r.zoomBg);
  // the pressed keycap, over a white wall and over black: its own background (the glass), the
  // accent tint on that, then the letter
  const capWorst = Math.min(...[[255, 255, 255], [0, 0, 0]].map((under) => { const bg = over(rgba(r.capTint), over(rgba(r.capBg), under)); return ratio(over(rgba(r.capText), bg), bg); }));
  step('H1.1 The accent is #8fa8ff and no green is left; accent text on glass ≥ 4.5 over white and black; a pressed toolbar button has a bar in the accent along its foot (none when not pressed); the current room in the rooms menu is bold with a bar in the accent; a pressed keycap letter ≥ 4.5',
    r.accent === '#8fa8ff' && r.green.length === 0 && onGlass >= 4.5 && /inset/.test(r.pressedShadow) && /143,\s*168,\s*255/.test(r.pressedShadow) && !/143,\s*168,\s*255/.test(r.offShadow) && r.hereWeight >= 600 && /143,\s*168,\s*255/.test(r.hereBar) && capWorst >= 4.5,
    `accent ${r.accent}; green on ${r.green.length ? r.green.join(', ') : 'nothing'}; zoom value ${onGlass.toFixed(2)}; pressed "${r.pressedShadow}", not pressed "${r.offShadow}"; current room weight ${r.hereWeight} bar ${r.hereBar}; pressed keycap letter ${capWorst.toFixed(2)} ("${r.capText}" on "${r.capTint}" on "${r.capBg}")`);
  errors.push(...w.errors);
  await w.ctx.close();
});

// ---------------- H1.2: the panels are paper ("paper for words"). A panel is a paper card
// with ink text; nothing in it is in the accent #8fa8ff (2.20:1 on paper); every text in it
// reads at 4.5:1 or more on the paper; the focus ring in it is the blue #072fcc (white would
// not show on paper), 2 px, at 3:1 or more. Over a panel opened from the title screen the
// navbar keeps a steady dark band, so its text reads when the card passes under it.
const PAPER = [251, 251, 249];
const paperInfo = async (p, name) => {
  await p.evaluate((n) => window.__ap.ui.show(n), name);
  // the navbar's colours change over 0.4 s: read them when its transitions have ended (a fast
  // run read them half way, light blue on grey, 1.68:1)
  await p.waitForTimeout(700);
  await p.waitForFunction(() => document.getElementById('site-nav').getAnimations({ subtree: true }).length === 0, null, { timeout: 10000 }).catch(() => {});
  return p.evaluate((n) => {
  const panel = document.getElementById('panel');
  const card = panel.querySelector('.panel-card');
  const style = (e) => getComputedStyle(e);
  const tag = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''}`;
  for (const d of panel.querySelectorAll('details')) d.open = true;
  const texts = [];
  const accent = [];
  for (const e of panel.querySelectorAll('*')) {
    if (!e.getClientRects().length) continue;
    const c = style(e);
    for (const k of ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor', 'boxShadow']) if (/143,\s*168,\s*255/.test(c[k])) accent.push(`${tag(e)} ${k}`);
    if ([...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim())) texts.push({ el: tag(e), color: c.color });
  }
  const rings = [];
  for (const sel of ['#panel [data-close]', '#panel-body a[href]', '#panel-body .link', '#panel-body .works-list button', '#panel-body summary']) {
    const e = document.querySelector(sel);
    if (!e) continue;
    e.focus({ preventScroll: true });
    const c = style(e);
    rings.push({ sel, visible: e.matches(':focus-visible'), color: c.outlineColor, width: c.outlineWidth, line: c.outlineStyle });
  }
  const nav = style(document.getElementById('site-nav'));
  const navBtn = style(document.querySelector('#site-nav [data-lang]'));
  const out = { name: n, card: !!card, bg: style(card || panel).backgroundColor, texts, accent, rings, nav: { color: nav.color, bg: nav.backgroundColor, image: nav.backgroundImage, opacity: Number(navBtn.opacity) } };
  window.__ap.ui.close();
  return out;
  }, name);
};
await guard(['H1.2'], async () => {
  const w = await insideByKeys('en'); // by keys, so the focus ring shows when focus is moved
  const seen = [];
  for (const name of ['about', 'works', 'contact', 'help', 'accessibility']) seen.push(await paperInfo(w.page, name));
  errors.push(...w.errors);
  await w.ctx.close();
  const t = await openWalk(browser, { lang: 'en' }); // the title screen, not entered
  await t.page.keyboard.press('Tab');
  seen.push({ ...(await paperInfo(t.page, 'about')), name: 'about (title screen)' });
  errors.push(...t.errors);
  await t.ctx.close();
  const bad = [];
  let lowText = 99; let lowRing = 99; let lowNav = 99; let rings = 0;
  for (const s of seen) {
    if (!s.card || s.bg !== 'rgb(251, 251, 249)') bad.push(`${s.name}: no paper card (${s.bg})`);
    if (s.accent.length) bad.push(`${s.name}: accent on ${s.accent.slice(0, 3).join(', ')}`);
    for (const x of s.texts) { const c = ratio(over(rgba(x.color), PAPER), PAPER); lowText = Math.min(lowText, c); if (c < 4.5) bad.push(`${s.name}: ${x.el} ${x.color} ${c.toFixed(2)}`); }
    for (const x of s.rings) { rings++; const c = ratio(over(rgba(x.color), PAPER), PAPER); lowRing = Math.min(lowRing, c); if (!x.visible || x.color !== 'rgb(7, 47, 204)' || x.width !== '2px' || x.line !== 'solid' || c < 3) bad.push(`${s.name}: ring on ${x.sel} ${x.line} ${x.width} ${x.color} shown ${x.visible}`); }
    // the navbar's text on its band, the band over the paper card
    const band = rgba(s.nav.bg);
    const under = over(band, PAPER);
    const c = s.nav.image === 'none' && band[3] >= 0.8 ? ratio(over(rgba(s.nav.color), under), under) * (s.nav.opacity === 1 ? 1 : 0) : 0;
    lowNav = Math.min(lowNav, c);
    if (c < 4.5) bad.push(`${s.name}: navbar ${s.nav.color} on ${s.nav.bg} (${s.nav.image.slice(0, 24)}), buttons at ${s.nav.opacity}`);
  }
  step('H1.2 Panels (About, Works, Contact, Help, Accessibility inside, About from the title screen): a paper card #fbfbf9; every text in it ≥ 4.5 on paper; nothing in the accent #8fa8ff; the focus ring on Close, a link, a button, a row of the works list and the opening speech is the blue #072fcc, 2 px, ≥ 3 on paper; the navbar over the panel is on a steady band, its text ≥ 4.5 with the paper under it',
    bad.length === 0 && rings >= 8 && lowText >= 4.5 && lowRing >= 3 && lowNav >= 4.5,
    `${seen.length} panels; lowest text ${lowText.toFixed(2)}; ${rings} focus rings, lowest ${lowRing.toFixed(2)}; navbar over paper ${lowNav.toFixed(2)}; ${bad.length ? bad.slice(0, 8).join(' | ') : 'nothing wrong'}`);
});

// ---------------- H1.3: the glass chips. Every chip over the 3D view (room label, floor plan
// and its key, toolbar, rooms menu, keycaps, wheel line, zoom readout, the hints, the first-use
// card, the tour caption) is the glass with a light edge (white at 45%) and rounded corners;
// the edge reads at 3:1 or more against the glass over a white wall and over black, and the
// text on the chips at 4.5:1. The focus ring on glass is white, 2 px, at 3:1 or more against
// the glass; where it reaches past its chip (a toolbar button, a keycap) it has a dark halo
// round it, so it shows on a white wall; in the rooms menu it stays inside the row.
await guard(['H1.3'], async () => {
  const w = await insideByKeys('en'); // by keys, so the focus ring shows when focus is moved
  const p = w.page;
  const r = await p.evaluate(() => {
    const style = (e, ps) => getComputedStyle(e, ps);
    const chips = ['#room-label', '#minimap', '#map-key', '#toolbar', '#rooms-menu', '#tour-caption', '#click-to-look', '#guide', '#prompt', '#zoom-level', '.cap.k-w', '.cap.k-zin', '#keypad .wheel'].map((sel) => {
      const e = document.querySelector(sel);
      const c = style(e);
      return { sel, bg: c.backgroundColor, edge: c.borderTopColor, edgeW: c.borderTopWidth, radius: parseFloat(c.borderTopLeftRadius) || 0 };
    });
    const texts = ['#room-label .room-name', '#room-label .room-sub', '#map-key', '#keypad .wheel', '.cap.k-w i', '#toolbar [data-action="tour"] .lbl', '#rooms-menu button', '#rooms-menu small', '#click-to-look', '#guide', '#guide .g-note'].map((sel) => {
      const e = document.querySelector(sel);
      return { sel, color: style(e).color };
    });
    const ring = (e, ps) => { const c = style(e, ps); return { color: c.outlineColor, width: c.outlineWidth, line: c.outlineStyle, offset: c.outlineOffset, shadow: style(e).boxShadow, shown: e.matches(':focus-visible') }; };
    const tour = document.querySelector('#toolbar [data-action="tour"]');
    tour.focus();
    const onTour = ring(tour);
    tour.setAttribute('aria-pressed', 'true');
    const onTourPressed = ring(tour);
    tour.setAttribute('aria-pressed', 'false');
    const cap = document.querySelector('.cap.k-w');
    cap.style.transition = 'none';
    cap.focus();
    const onCap = ring(cap);
    cap.style.transition = '';
    document.querySelector('#toolbar [data-action="rooms"]').click();
    const row = document.querySelector('#rooms-menu button');
    row.focus();
    const onRow = ring(row, '::after');
    const rowHover = 'rgba(255, 255, 255, 0.1)'; // #rooms-menu .room-row:hover, as in style.css
    document.querySelector('#toolbar [data-action="rooms"]').click();
    // the glass as the toolbar has it (the built stylesheet may write the token as a hex colour)
    return { glass: getComputedStyle(document.getElementById('toolbar')).backgroundColor, chips, texts, onTour, onTourPressed, onCap, onRow, rowHover };
  });
  const bad = [];
  let lowEdge = 99; let lowText = 99;
  for (const c of r.chips) {
    const e = worst(c.edge, c.bg);
    lowEdge = Math.min(lowEdge, e);
    if (rgba(c.bg)[3] < 0.85 || c.edgeW !== '1px' || rgba(c.edge)[3] < 0.45 || e < 3 || c.radius < 6) bad.push(`${c.sel}: glass ${c.bg}, edge ${c.edgeW} ${c.edge} (${e.toFixed(2)}), radius ${c.radius}`);
  }
  for (const x of r.texts) { const c = worst(x.color, r.glass); lowText = Math.min(lowText, c); if (c < 4.5) bad.push(`${x.sel}: ${x.color} ${c.toFixed(2)}`); }
  // the works named in the rooms menu, on a row under the mouse: the row's tint on the glass
  const hoverLow = Math.min(...[[255, 255, 255], [0, 0, 0]].map((under) => { const bg = over(rgba(r.rowHover), over(rgba(r.glass), under)); return ratio(over(rgba(r.texts.find((x) => x.sel === '#rooms-menu small').color), bg), bg); }));
  if (hoverLow < 4.5) bad.push(`rooms menu, works on a row under the mouse: ${hoverLow.toFixed(2)}`);
  const white = (x) => x.shown && x.line === 'solid' && x.width === '2px' && x.color === 'rgb(255, 255, 255)';
  const halo = (x) => /rgb\(11, 12, 14\) 0px 0px 0px 5px/.test(x.shadow);
  const ringOnGlass = worst('rgb(255, 255, 255)', r.glass);
  const haloOnWall = ratio([11, 12, 14], [255, 255, 255]);
  const ringOnHalo = ratio([255, 255, 255], [11, 12, 14]);
  if (!white(r.onTour) || !halo(r.onTour)) bad.push(`Tour focused: ${JSON.stringify(r.onTour)}`);
  if (!white(r.onTourPressed) || !halo(r.onTourPressed) || !/inset/.test(r.onTourPressed.shadow)) bad.push(`Tour pressed and focused: ${JSON.stringify(r.onTourPressed)}`);
  if (!white(r.onCap) || !halo(r.onCap)) bad.push(`keycap focused: ${JSON.stringify(r.onCap)}`);
  if (!(r.onRow.line === 'solid' && r.onRow.width === '2px' && r.onRow.color === 'rgb(255, 255, 255)' && parseFloat(r.onRow.offset) < 0)) bad.push(`rooms menu row focused: ${JSON.stringify(r.onRow)}`);
  step('H1.3 Glass chips: each is the glass (0.85) with a 1 px edge of white at 45% (≥ 3 against the glass over white and black) and rounded corners; text on them ≥ 4.5, also the works on a rooms-menu row under the mouse; the focus ring on a toolbar button (pressed or not) and a keycap is white, 2 px, with a dark halo of 5 px round it; in the rooms menu it is white and inside the row; ring on glass ≥ 3, halo on a white wall ≥ 3',
    bad.length === 0 && lowEdge >= 3 && lowText >= 4.5 && ringOnGlass >= 3 && haloOnWall >= 3 && ringOnHalo >= 3,
    `${r.chips.length} chips, lowest edge ${lowEdge.toFixed(2)}; lowest text ${lowText.toFixed(2)}; works on a hovered row ${hoverLow.toFixed(2)}; ring on glass ${ringOnGlass.toFixed(2)}, halo on a white wall ${haloOnWall.toFixed(2)}, ring on its halo ${ringOnHalo.toFixed(2)}; ${bad.length ? bad.slice(0, 8).join(' | ') : 'nothing wrong'}`);
  errors.push(...w.errors);
  await w.ctx.close();
});

// ---------------- H1.4: the buttons. Toolbar buttons are words in the sans, semibold, in
// sentence case, with rounded corners; none of their states is told by colour alone: a pressed
// one has an edge all round and a bar along its foot (none when not pressed), Sound changes
// its sign, the current room is bold with a bar, a pressed keycap sinks by 1 px and gets an
// edge, the open panel's button in the navbar and the chosen language are underlined. Close
// says its word in a panel and in the viewer. Buttons on paper are in the blue #072fcc with a
// blue edge (≥ 4.5 and ≥ 3 on paper) and turn to paper on blue under the mouse (≥ 4.5);
// buttons in the dark viewer have the light edge (≥ 3 over white and black).
await guard(['H1.4'], async () => {
  const w = await insideByKeys('en');
  const p = w.page;
  const bar = await p.evaluate(() => {
    const style = (e) => getComputedStyle(e);
    const look = (e) => { const c = style(e); return { family: c.fontFamily.split(',')[0].replace(/"/g, ''), weight: Number(c.fontWeight), size: parseFloat(c.fontSize), upper: c.textTransform, radius: parseFloat(c.borderTopLeftRadius) || 0, edge: c.borderTopColor, edgeW: c.borderTopWidth, shadow: c.boxShadow, bg: c.backgroundColor, color: c.color, h: e.getBoundingClientRect().height }; };
    const buttons = [...document.querySelectorAll('#toolbar > button, #toolbar .rooms-wrap > button')].map((b) => ({ action: b.dataset.action, ...look(b) }));
    const tour = document.querySelector('#toolbar [data-action="tour"]');
    tour.setAttribute('aria-pressed', 'true');
    const pressed = look(tour);
    tour.setAttribute('aria-pressed', 'false');
    const off = look(tour);
    const sound = document.querySelector('#toolbar [data-action="sound"]');
    const signs = () => [style(sound.querySelector('.snd-on')).display, style(sound.querySelector('.snd-off')).display].join('/');
    const was = sound.getAttribute('aria-pressed');
    sound.setAttribute('aria-pressed', 'true');
    const signOn = signs();
    sound.setAttribute('aria-pressed', 'false');
    const signOff = signs();
    sound.setAttribute('aria-pressed', was);
    const rows = [...document.querySelectorAll('#rooms-menu button')].map((b) => ({ here: b.hasAttribute('aria-current'), weight: Number(style(b).fontWeight), bar: style(b.closest('.room-row')).borderLeftColor }));
    const cap = document.querySelector('.cap.k-w');
    cap.style.transition = 'none';
    const capOff = { edge: style(cap).borderTopColor, move: style(cap).transform };
    cap.classList.add('pressed');
    const capOn = { edge: style(cap).borderTopColor, move: style(cap).transform };
    cap.classList.remove('pressed');
    cap.style.transition = '';
    const lang = [...document.querySelectorAll('#site-nav [data-lang]')].map((b) => ({ pressed: b.getAttribute('aria-pressed'), line: style(b).textDecorationLine }));
    return { buttons, pressed, off, signOn, signOff, rows, capOff, capOn, lang, glass: style(document.getElementById('toolbar')).backgroundColor };
  });
  // a panel: Close and a button in it, and the navbar's mark for the open panel
  await p.evaluate(() => window.__ap.ui.show('contact'));
  await p.waitForTimeout(700);
  const paperButtons = async () => {
    const out = [];
    for (const sel of ['#panel [data-close]', '#panel-body .link']) {
      const read = () => p.evaluate((x) => { const e = document.querySelector(x); const c = getComputedStyle(e); return { text: e.textContent.trim(), color: c.color, bg: c.backgroundColor, edge: c.borderTopColor, edgeW: c.borderTopWidth, radius: parseFloat(c.borderTopLeftRadius) || 0, family: c.fontFamily.split(',')[0].replace(/"/g, ''), upper: c.textTransform }; }, sel);
      const rest = await read();
      await p.hover(sel);
      const hover = await read();
      await p.mouse.move(2, 400);
      out.push({ sel, rest, hover });
    }
    return out;
  };
  const onPaper = await paperButtons();
  const navMark = await p.evaluate(() => [...document.querySelectorAll('#site-nav .nav-links > [data-nav]')].filter((b) => b.getClientRects().length).map((b) => ({ nav: b.dataset.nav, current: b.getAttribute('aria-current'), line: getComputedStyle(b).textDecorationLine })));
  await p.evaluate(() => window.__ap.ui.close());
  // the viewer
  await p.evaluate(() => window.__ap.viewer.open(window.__ap.data.works[0]));
  await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 });
  await p.waitForTimeout(700);
  const dark = await p.evaluate(() => ({
    ground: getComputedStyle(document.getElementById('viewer')).backgroundColor,
    buttons: ['#viewer [data-close]', '#viewer-prev', '#viewer-next', '#viewer-goto'].map((sel) => { const e = document.querySelector(sel); const c = getComputedStyle(e); return { sel, text: e.textContent.trim(), color: c.color, bg: c.backgroundColor, edge: c.borderTopColor, edgeW: c.borderTopWidth, radius: parseFloat(c.borderTopLeftRadius) || 0, family: c.fontFamily.split(',')[0].replace(/"/g, ''), upper: c.textTransform }; }),
  }));
  errors.push(...w.errors);
  await w.ctx.close();
  // the same mark on the title screen, where the navbar is not on its dark band
  const t = await openWalk(browser, { lang: 'en' });
  await t.page.evaluate(() => window.__ap.ui.show('about'));
  await t.page.waitForTimeout(700);
  const navTitle = await t.page.evaluate(() => [...document.querySelectorAll('#site-nav .nav-links > [data-nav]')].filter((b) => b.getClientRects().length).map((b) => ({ nav: b.dataset.nav, current: b.getAttribute('aria-current'), line: getComputedStyle(b).textDecorationLine })));
  errors.push(...t.errors);
  await t.ctx.close();
  const bad = [];
  const sans = (f) => !/mono|menlo|consolas/i.test(f);
  for (const b of bar.buttons) if (!sans(b.family) || b.weight < 600 || b.size < 13 || b.upper !== 'none' || b.radius < 6 || b.h < 32 || rgba(b.edge)[3] !== 0) bad.push(`toolbar ${b.action}: ${b.family} ${b.weight} ${b.size}px ${b.upper}, radius ${b.radius}, ${Math.round(b.h)} px high, edge ${b.edge}`);
  const acc = /143,\s*168,\s*255/;
  // a pressed toolbar button: the tint on the glass, over a white wall and over black
  const tintOn = (under) => over(rgba(bar.pressed.bg), over(rgba(bar.glass), under));
  const pressedText = Math.min(...[[255, 255, 255], [0, 0, 0]].map((u) => ratio(over(rgba(bar.pressed.color), tintOn(u)), tintOn(u))));
  const pressedEdge = Math.min(...[[255, 255, 255], [0, 0, 0]].map((u) => ratio([143, 168, 255], tintOn(u))));
  if (!(acc.test(bar.pressed.edge) && rgba(bar.pressed.edge)[3] === 1 && bar.pressed.edgeW === '1px' && /inset/.test(bar.pressed.shadow) && acc.test(bar.pressed.shadow) && acc.test(bar.pressed.bg))) bad.push(`pressed toolbar button: edge ${bar.pressed.edgeW} ${bar.pressed.edge}, shadow ${bar.pressed.shadow}, ground ${bar.pressed.bg}`);
  if (acc.test(bar.off.edge) || acc.test(bar.off.shadow) || acc.test(bar.off.bg)) bad.push(`toolbar button not pressed: ${JSON.stringify(bar.off)}`);
  if (pressedText < 4.5 || pressedEdge < 3) bad.push(`pressed toolbar button: text ${pressedText.toFixed(2)}, edge ${pressedEdge.toFixed(2)}`);
  if (bar.signOn === bar.signOff) bad.push(`Sound keeps one sign: ${bar.signOn}`);
  if (!bar.rows.some((x) => x.here) || !bar.rows.every((x) => (x.here ? x.weight >= 700 && acc.test(x.bar) : x.weight <= 400 && !acc.test(x.bar)))) bad.push(`rooms menu: ${JSON.stringify(bar.rows)}`);
  if (!(acc.test(bar.capOn.edge) && !acc.test(bar.capOff.edge) && bar.capOn.move !== bar.capOff.move)) bad.push(`keycap: ${JSON.stringify([bar.capOff, bar.capOn])}`);
  if (!bar.lang.every((x) => (x.pressed === 'true') === /underline/.test(x.line))) bad.push(`languages: ${JSON.stringify(bar.lang)}`);
  for (const [where, marks, name] of [['inside', navMark, 'contact'], ['title screen', navTitle, 'about']]) if (!marks.length || !marks.every((x) => (x.nav === name) === (x.current === 'true') && (x.current === 'true') === /underline/.test(x.line))) bad.push(`navbar (${where}): ${JSON.stringify(marks)}`);
  let lowPaper = 99;
  for (const b of onPaper) {
    const text = ratio(over(rgba(b.rest.color), PAPER), PAPER);
    const edge = ratio(over(rgba(b.rest.edge), PAPER), PAPER);
    const hover = ratio(over(rgba(b.hover.color), over(rgba(b.hover.bg), PAPER)), over(rgba(b.hover.bg), PAPER));
    lowPaper = Math.min(lowPaper, text, hover);
    if (b.rest.color !== 'rgb(7, 47, 204)' || b.rest.edge !== 'rgb(7, 47, 204)' || b.rest.edgeW !== '1px' || b.rest.radius < 6 || !sans(b.rest.family) || b.rest.upper !== 'none' || text < 4.5 || edge < 3 || b.hover.bg !== 'rgb(7, 47, 204)' || hover < 4.5) bad.push(`${b.sel}: ${JSON.stringify(b)}`);
  }
  if (onPaper[0]?.rest.text !== UI.en.viewer.close) bad.push(`Close in a panel reads "${onPaper[0]?.rest.text}"`);
  let lowDark = 99;
  for (const b of dark.buttons) {
    const ground = rgba(b.bg)[3] > 0 ? b.bg : dark.ground;
    const edge = worst(b.edge, ground);
    const text = worst(b.color, ground);
    lowDark = Math.min(lowDark, edge);
    if (b.edgeW !== '1px' || edge < 3 || text < 4.5 || b.radius < 6 || !sans(b.family) || b.upper !== 'none') bad.push(`${b.sel}: ${JSON.stringify(b)} edge ${edge.toFixed(2)} text ${text.toFixed(2)}`);
  }
  if (dark.buttons[0].text !== UI.en.viewer.close) bad.push(`Close in the viewer reads "${dark.buttons[0].text}"`);
  step('H1.4 Buttons: the toolbar in the sans, semibold, 13 px or more, sentence case, rounded, 32 px high or more; pressed: an edge all round and a bar along the foot in the accent on its tint (text ≥ 4.5, edge ≥ 3; none of them when not pressed); Sound changes its sign; the current room bold with a bar, the others regular; a pressed keycap gets an edge and sinks; the chosen language and the open panel in the navbar (inside and on the title screen) underlined; Close says "Close" in a panel and in the viewer; on paper Close and a button are blue with a blue edge (≥ 4.5, ≥ 3), paper on blue under the mouse (≥ 4.5); in the viewer the buttons have the light edge (≥ 3 over white and black)',
    bad.length === 0,
    `${bar.buttons.length} toolbar buttons (${bar.buttons.map((b) => `${b.action} ${b.size}px/${b.weight}/${Math.round(b.h)}h`).join(', ')}); pressed: text ${pressedText.toFixed(2)}, edge ${pressedEdge.toFixed(2)}; Sound signs ${bar.signOn} and ${bar.signOff}; on paper lowest ${lowPaper.toFixed(2)}; viewer edges lowest ${lowDark.toFixed(2)}; ${bad.length ? bad.slice(0, 8).join(' | ') : 'nothing wrong'}`);
});

// ---------------- A7.1: interface type. No text in the interface is under 12 px, in capitals by
// CSS, or with its letters more than 0.06em apart: the title screen, the sound question, the
// navbar and footer, every control over the 3D view (also those not on screen at the moment:
// the hints, the prompt, the tour caption, the zoom readout), the eight panels and the viewer.
// In English and Hungarian at 1366 × 768, and in English on a phone (375 × 667). What is
// drawn on the floor plan's canvas cannot be read from the page and is not checked here.
const typeInfo = (p, root) => p.evaluate((sel) => {
  const bad = [];
  let n = 0; let low = 99; let wide = 0;
  const tag = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''}`;
  const always = ['#prompt', '#tour-caption', '#zoom-level .val', '#viewer-count', '.viewer-loading', '#progress-label', '#room-label .room-name', '#room-label .room-sub'];
  const scope = document.querySelector(sel);
  if (!scope) return { n: 0, low: 0, wide: 9, bad: [`${sel} is not there`] };
  for (const e of scope.querySelectorAll('*')) {
    if (e.closest('.sr-only, #announcer, script, style, noscript, svg')) continue;
    const own = [...e.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim());
    if (!own && !always.some((a) => e.matches(a))) continue;
    const c = getComputedStyle(e);
    const size = parseFloat(c.fontSize);
    const gap = c.letterSpacing === 'normal' ? 0 : parseFloat(c.letterSpacing) / size;
    n++;
    low = Math.min(low, size);
    wide = Math.max(wide, gap);
    if (size < 12 || gap > 0.0601 || c.textTransform === 'uppercase') bad.push(`${tag(e)} ${size}px ${gap.toFixed(3)}em ${c.textTransform}`);
  }
  return { n, low, wide, bad };
}, root);
await guard(['A7.1'], async () => {
  const seen = [];
  const all = [];
  for (const [lang, opts, where] of [['en', {}, 'EN 1366 × 768'], ['hu', {}, 'HU 1366 × 768'], ['en', PHONE, 'EN phone']]) {
    const w = await inside(lang, opts);
    const p = w.page;
    // the tour caption's two lines, as tour.js writes them
    await p.evaluate(() => { document.getElementById('tour-caption').innerHTML = '<span class="t">1 / 17</span><span class="m">x</span>x'; });
    await p.evaluate(() => document.querySelector('#toolbar [data-action="rooms"]').click());
    const got = [['page', await typeInfo(p, 'body')]];
    await p.evaluate(() => { document.getElementById('tour-caption').innerHTML = ''; });
    for (const name of ['about', 'works', 'bts', 'contact', 'help', 'accessibility', 'legal', 'privacy']) {
      await p.evaluate((x) => { window.__ap.ui.show(x); for (const d of document.querySelectorAll('#panel details')) d.open = true; }, name);
      got.push([`panel ${name}`, await typeInfo(p, '#panel')]);
    }
    await p.evaluate(() => window.__ap.ui.close());
    for (const i of [0, 2]) {
      await p.evaluate((x) => { window.__ap.viewer.open(window.__ap.data.works[x]); for (const d of document.querySelectorAll('#viewer details')) d.open = true; }, i);
      got.push([`viewer work ${i + 1}`, await typeInfo(p, '#viewer')]);
    }
    for (const [what, g] of got) { all.push(g); for (const b of g.bad) seen.push(`${where}, ${what}: ${b}`); }
    errors.push(...w.errors);
    await w.ctx.close();
  }
  const n = all.reduce((a, g) => a + g.n, 0);
  const low = Math.min(...all.map((g) => g.low));
  const wide = Math.max(...all.map((g) => g.wide));
  step('A7.1 Interface type: no text under 12 px, none in capitals by CSS, no letters more than 0.06em apart, on the title screen, the sound question, the navbar and footer, the controls over the 3D view, the eight panels and the viewer; English and Hungarian at 1366 × 768, English on a phone',
    seen.length === 0 && n > 300 && low >= 12 && wide <= 0.0601,
    `${n} texts read; smallest ${low} px; widest letter spacing ${wide.toFixed(3)}em; ${seen.length ? `${seen.length} wrong: ${seen.slice(0, 10).join(' | ')}` : 'nothing wrong'}`);
});

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
