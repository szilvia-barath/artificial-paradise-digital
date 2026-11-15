// Mouse and focus: the paths where a mouse click could leave the 3D view without focus
// (and so its letter keys dead, since they work only while the view has focus), or where
// focus could go somewhere unexpected. Each step says what should happen.
// Usage: npm run build && npm run preview &   then   node tests/a11y/focus-mouse.mjs
import { launch, openWalk, focusName } from './lib.mjs';

const browser = await launch();
let failed = 0;
const step = (name, ok, got) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got: ${got}`);
  if (!ok) failed++;
};
const { page, ctx, errors } = await openWalk(browser, { viewport: { width: 1280, height: 800 } });
const onView = () => page.evaluate(() => document.activeElement === document.getElementById('scene'));
const ringOnView = () => page.evaluate(() => document.getElementById('scene').matches(':focus-visible'));
const isOn = (sel) => page.evaluate((s) => document.activeElement === document.querySelector(s), sel);

// ---------------- title screen
await page.click('#site-nav [data-nav="about"]');
await page.waitForTimeout(300);
await page.click('#panel [data-close]');
await page.waitForTimeout(300);
step('1 Title screen: About opened and closed with the mouse', await isOn('#site-nav [data-nav="about"]'), `focus on ${await focusName(page)} (expected: the About button, not Enter)`);

// "Walk to this work" from the title screen enters the walk and opens the sound question
await page.evaluate(() => window.__ap.viewer.open(window.__ap.data.works[0]));
await page.waitForTimeout(800);
await page.click('#viewer-goto');
await page.waitForTimeout(800);
step('2 "Walk to this work" from the title screen: the sound question keeps focus', await page.evaluate(() => document.getElementById('sound-ask').contains(document.activeElement)), `focus on ${await focusName(page)}`);
await page.keyboard.press('PageDown');
await page.waitForTimeout(400);
const jumped = await page.evaluate(() => window.__ap.controls.pos.x);
step('3 Page Down under the sound question does nothing', await page.evaluate(() => document.getElementById('sound-ask').contains(document.activeElement)), `focus on ${await focusName(page)}; x ${jumped.toFixed(2)}`);

// the sound question lies over the navbar: what a mouse would hit at About and HU is the question
const asking = () => page.evaluate(() => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); });
const hit = (sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}`; }, sel);
const hitAbout = await hit('#site-nav [data-nav="about"]');
const hitLang = await hit('#site-nav [data-lang="hu"]');
step('3a The sound question covers the navbar: a mouse at About or HU hits the question', hitAbout === 'div#sound-ask' && hitLang === 'div#sound-ask', `at About: ${hitAbout}; at HU: ${hitLang} (expected: div#sound-ask)`);
// a click that reaches the navbar anyway, as a screen reader's can
// (the handler runs during the click, so the panel would be open as soon as it returns)
await page.evaluate(() => document.querySelector('#site-nav [data-nav="about"]').click());
step('3b A click on About that reaches the navbar while the question is open opens nothing', (await page.evaluate(() => document.getElementById('panel').hidden)) && (await asking()), `panel open: ${await page.evaluate(() => !document.getElementById('panel').hidden)}; question open with focus: ${await asking()}`);
const tabbed = [];
for (const k of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
  await page.keyboard.press(k);
  tabbed.push(await page.evaluate(() => (document.getElementById('sound-ask').contains(document.activeElement) ? 'in' : 'OUT')));
}
step('3c Tab and Shift+Tab stay inside the question (the navbar is not reached)', tabbed.every((x) => x === 'in'), `${tabbed.join(' ')}; focus on ${await focusName(page)}`);
// a panel opened and closed under the question anyway (now only the page's own code can)
await page.evaluate(() => window.__ap.ui.show('about'));
await page.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 });
await page.evaluate(() => window.__ap.ui.close());
await page.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });
const moving = await page.evaluate(() => ({ walk: window.__ap.controls.enabled, zoom: window.__ap.controls.zoomEnabled }));
step('3d A panel closed while the question is open: walking stays locked, the question stays open with focus', !moving.walk && !moving.zoom && (await asking()), `walking enabled: ${moving.walk}, zoom enabled: ${moving.zoom}; question open with focus: ${await asking()}; focus on ${await focusName(page)}`);
await page.click('[data-sound="off"]');
await page.waitForTimeout(800);
step('4 Sound question answered with the mouse: focus on the 3D view', await onView(), await focusName(page));
step('4a "Without sound" clicked with the mouse: no keyboard frame on the view', (await onView()) && !(await ringOnView()), `focus on view ${await onView()}, frame ${await ringOnView()}`);

// ---------------- inside
// a keyboard focus on the view, then a mouse press on it: no keyboard frame
await page.keyboard.press('Shift+Tab');
await page.keyboard.press('Tab');
const ringByKey = await ringOnView();
await page.mouse.move(640, 420);
await page.mouse.down();
await page.mouse.move(660, 420, { steps: 3 });
await page.mouse.up();
await page.waitForTimeout(200);
step('5 Focus by Tab shows the frame; a mouse press on the view keeps focus and drops the frame', ringByKey && (await onView()) && !(await ringOnView()), `frame after Tab: ${ringByKey}; after the mouse: focus on view ${await onView()}, frame ${await ringOnView()}`);

const box = await page.locator('#minimap').boundingBox();
await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.5); // Room 3 on the map
// the room label follows on the next drawn frame (slow here: the 3D view renders in software)
const jumpedTo3 = await page.waitForFunction(() => document.querySelector('#room-label .room-name').textContent === 'Room 3', null, { timeout: 30000 }).then(() => true, () => false);
step('6 Click Room 3 on the map: jump there, and focus back on the view', jumpedTo3 && (await onView()), `room ${await page.textContent('#room-label .room-name')}; focus on ${await focusName(page)}`);

await page.click('[data-action="rooms"]');
const opened = await page.getAttribute('[data-action="rooms"]', 'aria-expanded');
await page.click('[data-action="rooms"]');
await page.waitForTimeout(200);
step('7 Rooms menu opened and closed with the mouse: focus back on the view', opened === 'true' && (await onView()), `opened: ${opened}; focus on ${await focusName(page)}`);

await page.click('[data-action="rooms"]');
await page.click('#rooms-menu [data-room="r2"]');
await page.waitForTimeout(800);
step('8 A room chosen in the menu with the mouse: focus on the view', await onView(), await focusName(page));

await page.click('[data-lang="hu"]');
await page.waitForTimeout(300);
const huOk = (await page.getAttribute('html', 'lang')) === 'hu' && (await onView());
await page.click('[data-lang="en"]');
await page.waitForTimeout(300);
step('9 EN / HU clicked with the mouse: language switched, focus back on the view', huOk && (await onView()), `focus on ${await focusName(page)}`);

// EN / HU clicked with the mouse while a dialog is open: focus stays in the dialog
const langIs = (l) => page.waitForFunction((x) => document.documentElement.lang === x, l, { timeout: 30000 }).then(() => true, () => false);
await page.click('#site-nav [data-nav="about"]');
await page.waitForFunction(() => !document.getElementById('panel').hidden && document.getElementById('panel').contains(document.activeElement), null, { timeout: 30000 });
const before9a = await focusName(page);
await page.click('[data-lang="hu"]');
const hu9a = await langIs('hu');
const close9a = await isOn('#panel [data-close]');
const at9a = await focusName(page);
await page.click('[data-lang="en"]');
const en9a = await langIs('en');
step('9a About open, HU then EN clicked with the mouse: focus stays on the panel\'s Close button (not the view)', hu9a && en9a && close9a && (await isOn('#panel [data-close]')), `before: ${before9a}; after HU: ${at9a}; after EN: ${await focusName(page)}`);

// focus on a control in the panel's text, which the language switch rebuilds
const inBody = await page.evaluate(() => { const c = document.querySelector('#panel-body a[href], #panel-body button, #panel-body summary'); c?.focus(); return !!c && document.activeElement === c; });
const before9b = await focusName(page);
await page.click('[data-lang="hu"]');
const hu9b = await langIs('hu');
const at9b = await focusName(page);
const close9b = await isOn('#panel [data-close]');
await page.click('[data-lang="en"]');
await langIs('en');
step('9b A control in the panel\'s text has focus, HU clicked with the mouse: the text is rebuilt, focus on the panel\'s Close button', inBody && hu9b && close9b, `before: ${before9b}; after HU: ${at9b}`);
await page.click('#panel [data-close]');
await page.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });

await page.evaluate(() => window.__ap.viewer.open(window.__ap.data.works[0]));
await page.waitForFunction(() => !document.getElementById('viewer').hidden && document.getElementById('viewer').contains(document.activeElement), null, { timeout: 30000 });
await page.focus('#viewer-next');
await page.click('[data-lang="hu"]');
const hu9c = await langIs('hu');
const at9c = await focusName(page);
const next9c = await isOn('#viewer-next');
await page.click('[data-lang="en"]');
const en9c = await langIs('en');
step('9c Viewer open with focus on Next, HU then EN clicked with the mouse: focus stays on Next (not the view)', hu9c && en9c && next9c && (await isOn('#viewer-next')), `after HU: ${at9c}; after EN: ${await focusName(page)}`);
await page.click('#viewer [data-close]');
await page.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 });
step('9d The viewer closed with the mouse afterwards: focus on the view', await onView(), await focusName(page));

// focus on a full-video button, which the language switch rebuilds (it is only focused, never
// pressed: pressing it would load the Drive player)
await page.evaluate(() => window.__ap.viewer.open(window.__ap.data.works.find((w) => w.video && w.video.full && w.video.full.length)));
await page.waitForFunction(() => !document.getElementById('viewer').hidden && document.getElementById('viewer').contains(document.activeElement), null, { timeout: 30000 });
const onFull = await page.evaluate(() => { const b = document.querySelector('#viewer [data-full]'); b?.focus(); return !!b && document.activeElement === b; });
const before9e = await focusName(page);
await page.click('[data-lang="hu"]');
const hu9e = await langIs('hu');
const at9e = await focusName(page);
const close9e = await isOn('#viewer [data-close]');
const open9e = await page.evaluate(() => !document.getElementById('viewer').hidden);
await page.click('[data-lang="en"]');
await langIs('en');
step('9e Viewer open with focus on a full-video button, HU clicked with the mouse: the buttons are rebuilt, focus on the viewer\'s Close button', onFull && hu9e && close9e && open9e, `before: ${before9e}; after HU: ${at9e}; viewer open: ${open9e}`);
await page.click('#viewer [data-close]');
await page.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 });

await page.click('#site-nav [data-nav="about"]');
await page.waitForTimeout(300);
await page.click('#panel [data-close]');
await page.waitForTimeout(300);
step('10 Inside: About opened and closed with the mouse: focus on the view', await onView(), await focusName(page));

await page.focus('#site-nav [data-nav="about"]');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
step('11 Inside: About opened and closed by keyboard: focus back on the About button', await isOn('#site-nav [data-nav="about"]'), await focusName(page));

await page.focus('#scene');
await page.keyboard.press('+');
await page.keyboard.press('+');
// the readout appears on the next drawn frame
const shown = await page.waitForFunction(() => !document.getElementById('zoom-level').hidden, null, { timeout: 30000 }).then(() => true, () => false);
await page.focus('#zoom-level');
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.getElementById('zoom-level').hidden, null, { timeout: 30000 }).catch(() => {});
step('12 Zoom readout used by keyboard: zoom reset, focus on the view (not lost with the readout)', shown && (await onView()) && (await page.evaluate(() => document.getElementById('zoom-level').hidden)), `readout was shown: ${shown}; focus on ${await focusName(page)}`);

await page.keyboard.press('KeyM');
step('13 After all that, M still works from the view', (await page.getAttribute('[data-action="sound"]', 'aria-pressed')) === 'true', `sound pressed: ${await page.getAttribute('[data-action="sound"]', 'aria-pressed')}`);

// ---------------- footer links: they open a new tab or leave the page
// Nothing outside is fetched: the new tab's request is refused and the tab closed.
await ctx.route(/instagram\.com|mamu\.hu/, (r) => r.abort());
const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }).catch(() => null), page.click('#site-foot a[href*="instagram"]')]);
if (popup) await popup.close();
await page.bringToFront();
step('14 Instagram in the footer clicked with the mouse (opens a new tab): focus is on the view on coming back', !!popup && (await onView()), `new tab opened: ${!!popup}; focus on ${await focusName(page)}`);

// the accessible version opens in the same tab: the click is let through to the page's own
// handlers, and only the leaving is stopped, so focus can be read
await page.evaluate(() => document.querySelector('#site-foot a[href*="text/"]').addEventListener('click', (e) => e.preventDefault(), { once: true }));
await page.click('#site-foot a[href*="text/"]');
step('15 The accessible version in the footer clicked with the mouse: focus handed to the view before leaving', await onView(), await focusName(page));
await page.evaluate(() => document.querySelector('#site-foot a[href*="text/"]').addEventListener('click', (e) => e.preventDefault(), { once: true }));
await page.focus('#site-foot a[href*="text/"]');
await page.keyboard.press('Enter');
step('16 The same link by keyboard: focus stays on the link', await isOn('#site-foot a[href*="text/"]'), await focusName(page));

// the walk above is done: close it, so the fresh pages below load at full speed
await ctx.close();

// ---------------- the sound question answered each other way, each on a fresh page
// "Without sound" has focus when the question opens; by mouse no frame follows focus to the
// view, by keyboard the frame shows there, as after any keyboard move.
// by: 'mouse' or 'key' on the choice's button, or a function that answers some other way.
const PHONE = { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true };
const centreOf = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
async function answer(enterBy, choice, by, context = { viewport: { width: 1280, height: 800 } }) {
  const w = await openWalk(browser, context);
  const p = w.page;
  if (enterBy === 'key') { await p.focus('#enter'); await p.keyboard.press('Enter'); } else if (enterBy === 'tap') await p.tap('#enter'); else await p.click('#enter');
  await p.waitForFunction(() => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); }, null, { timeout: 30000 });
  if (typeof by === 'function') await by(p);
  else if (by === 'mouse') await p.click(`[data-sound="${choice}"]`);
  else {
    if (choice === 'on') await p.keyboard.press('Tab');
    await p.keyboard.press(choice === 'on' ? 'Space' : 'Enter');
  }
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden && document.activeElement === document.getElementById('scene'), null, { timeout: 30000 }).catch(() => {});
  const got = await p.evaluate(() => ({ view: document.activeElement === document.getElementById('scene'), frame: document.getElementById('scene').matches(':focus-visible'), sound: document.querySelector('[data-action="sound"]').getAttribute('aria-pressed'), panel: !document.getElementById('panel').hidden, menu: document.querySelector('#site-nav .nav-toggle').getAttribute('aria-expanded'), lang: document.documentElement.lang }));
  errors.push(...w.errors);
  await w.ctx.close();
  return got;
}
let r = await answer('mouse', 'on', 'mouse');
step('17 "With sound" clicked with the mouse: sound on, focus on the view, no keyboard frame', r.view && !r.frame && r.sound === 'true', JSON.stringify(r));
r = await answer('key', 'off', 'key');
step('18 Enter on "Without sound" (the question opened by keyboard): focus on the view with the keyboard frame', r.view && r.frame && r.sound === 'false', JSON.stringify(r));
r = await answer('mouse', 'on', 'key');
step('19 Tab to "With sound" and Space (the question opened with the mouse): sound on, focus on the view with the keyboard frame', r.view && r.frame && r.sound === 'true', JSON.stringify(r));
// the case C8 is about, on its own page (step 4a reaches it only after the walk's earlier steps)
r = await answer('mouse', 'off', 'mouse');
step('20 Enter and then "Without sound" clicked with the mouse: sound off, focus on the view, no keyboard frame', r.view && !r.frame && r.sound === 'false', JSON.stringify(r));

// A click or tap anywhere outside the card answers "without sound" too. The question itself
// takes focus from the press, as a mouse focus, so no frame follows to the view. Since C3 the
// navbar strip is part of that: a press there lands on the question, and opens nothing.
const quiet = (x) => x.view && !x.frame && x.sound === 'false' && !x.panel && x.menu === 'false' && x.lang === 'en';
r = await answer('mouse', 'off', (p) => p.mouse.click(10, 300));
step('21 The dimmed backdrop clicked with the mouse: sound off, focus on the view, no keyboard frame', quiet(r), JSON.stringify(r));
r = await answer('mouse', 'off', async (p) => { const [x, y] = await centreOf(p, '#site-nav [data-nav="about"]'); await p.mouse.click(x, y); });
step('22 Clicked with the mouse where About lies under the question: no panel, sound off, focus on the view, no keyboard frame', quiet(r), JSON.stringify(r));
r = await answer('mouse', 'off', async (p) => { const [x, y] = await centreOf(p, '#site-nav [data-lang="hu"]'); await p.mouse.click(x, y); });
step('23 Clicked with the mouse where HU lies under the question: language unchanged, sound off, focus on the view, no keyboard frame', quiet(r), JSON.stringify(r));
r = await answer('tap', 'off', (p) => p.touchscreen.tap(10, 300), PHONE);
step('24 Phone (375 x 667, touch): the backdrop tapped: sound off, focus on the view, no keyboard frame', quiet(r), JSON.stringify(r));
r = await answer('tap', 'off', async (p) => { const [x, y] = await centreOf(p, '#site-nav .nav-toggle'); await p.touchscreen.tap(x, y); }, PHONE);
step('25 Phone: tapped where Menu lies under the question: menu not opened, sound off, focus on the view, no keyboard frame', quiet(r), JSON.stringify(r));

// a press on the card's own text: the question keeps focus (on itself), Tab and Shift+Tab
// go on to its buttons and do not leave it
{
  const w = await openWalk(browser, { viewport: { width: 1280, height: 800 } });
  const p = w.page;
  await p.click('#enter');
  await p.waitForFunction(() => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); }, null, { timeout: 30000 });
  const where = () => p.evaluate(() => { const d = document.getElementById('sound-ask'); const a = document.activeElement; return d.hidden ? 'closed' : a === d ? 'question' : a.dataset.sound ? `button ${a.dataset.sound}` : d.contains(a) ? 'in' : 'OUT'; });
  const seen = [];
  await p.click('#sound-ask-q');
  seen.push(await where());
  await p.keyboard.press('Shift+Tab');
  seen.push(await where());
  await p.click('#sound-ask-q');
  seen.push(await where());
  await p.keyboard.press('Tab');
  seen.push(await where());
  step('26 The question\'s text clicked with the mouse: focus on the question; Shift+Tab goes to "With sound"; clicked again, Tab goes to "Without sound"', seen.join(',') === 'question,button on,question,button off', seen.join(' '));
  errors.push(...w.errors);
  await w.ctx.close();
}

// A browser that moves no focus on a mouse press (Safari, Firefox on macOS, for buttons), and
// a press on "Without sound" dragged off it, so no click comes: focus is not left outside
// the question. Chromium focuses the button on a press, so the page stops that here.
{
  const w = await openWalk(browser, { viewport: { width: 1280, height: 800 } });
  const p = w.page;
  await p.click('#enter');
  await p.waitForFunction(() => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); }, null, { timeout: 30000 });
  await p.evaluate(() => window.addEventListener('mousedown', (e) => e.preventDefault(), true));
  const [bx, by] = await centreOf(p, '[data-sound="off"]');
  const [tx, ty] = await centreOf(p, '#sound-ask-q');
  await p.mouse.move(bx, by);
  await p.mouse.down();
  await p.mouse.move(tx, ty, { steps: 4 });
  await p.mouse.up();
  const back = await p.waitForFunction(() => document.activeElement === document.querySelector('[data-sound="off"]'), null, { timeout: 30000 }).then(() => true, () => false);
  const open27 = await p.evaluate(() => !document.getElementById('sound-ask').hidden);
  step('27 A press on "Without sound" dragged off it, in a browser that moves no focus on a press: the question stays open, focus back on "Without sound"', back && open27, `question open: ${open27}; focus on ${await focusName(p)}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
