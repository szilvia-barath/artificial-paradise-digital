// What the controls over the 3D view show and say: the floor plan's key (A4); on a touch
// screen, the sound question's hint and the hint inside (D11); the tour caption's first line
// (F3). Each step
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
for (const [name, opts, lang] of [['375 × 667, English', PHONE, 'en'], ['375 × 667, Hungarian', PHONE, 'hu'], ['320 × 640, Hungarian', { ...PHONE, viewport: { width: 320, height: 640 } }, 'hu'], ['on its side 667 × 375, Hungarian', PHONE_SIDE, 'hu']]) {
  const w = await inside(lang, opts);
  const p = w.page;
  const h = await hintState(p);
  const focus = await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  const b = await boxes(p, ['#click-to-look', '#joystick', '#toolbar', '#zoompad', '#minimap', '#map-key', '#room-label']);
  const clear = ['#joystick', '#toolbar', '#zoompad', '#minimap', '#map-key', '#room-label'].every((s) => !meets(b['#click-to-look'], b[s]));
  step(`D11.2 Phone ${name}, inside: the touch hint shows ("${UI[lang].hud.touchHint}"), hidden from screen readers, takes no focus (focus stays on the 3D view), over none of the stick, the toolbar, the zoom keys, the map, its key and the room label`, h.text === UI[lang].hud.touchHint && h.hidden === 'true' && h.visibility === 'visible' && !h.focusable && focus === 'scene' && clear && !!b['#click-to-look'], `${JSON.stringify(h)}; focus on ${focus}; ${Object.entries(b).map(([s, x]) => `${s} ${show(x)}`).join('; ')}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  // what the hint says is what works now: a drag looks round; the stick walks when pushed, not
  // when only pressed and held (D2, not built yet); a tap on a work opens it
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
  await touch('touchStart', j.x, j.y);
  const held = await moved(from); // pressed and held, not pushed: up to 4 s
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
  step('D11.3 Phone: the first touch on the 3D view takes the hint away; what it says works now: a drag looks round, the stick walks when pushed, a tap opens the work in the middle and it stays open. Only pressing and holding the stick does not walk (so the hint says "push")', hint0.visibility === 'visible' && gone && looked && !held && pushed && opened === 'Human as Error I', `hint shown first: ${hint0.visibility}; gone at the touch: ${gone}; drag turned the view: ${looked}; stick held still walked: ${held}; stick pushed walked: ${pushed}; tap opened: ${opened} (the browser's click after the tap sent: ${click})`);
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

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
