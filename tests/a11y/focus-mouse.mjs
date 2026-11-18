// Mouse and focus: the paths where a mouse click could leave the 3D view without focus
// (and so its letter keys dead, since they work only while the view has focus), or where
// focus could go somewhere unexpected. Each step says what should happen.
// Usage: npm run build && npm run preview &   then   node tests/a11y/focus-mouse.mjs
import { launch, openWalk, focusName, TOUCH_LAPTOP } from './lib.mjs';

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
// pressed: pressing it would load the YouTube or Drive player)
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

// ---------------- B3: what lies behind an open dialog is inert
// Behind a panel or the viewer: the skip link, the 3D view and its controls (#stage), the
// title screen and the footer are out of the accessibility tree and out of reach; the
// navbar stays usable. Behind the sound question the navbar is inert too. On closing,
// nothing is left inert but the title screen once inside.
const BEHIND = ['.skip-nav', '#stage', '#loader', '#site-foot', '#site-nav'];
const inertOf = (p) => p.evaluate((sels) => Object.fromEntries(sels.map((x) => [x, !!document.querySelector(x).closest('[inert]')])), BEHIND);
const inertList = (p) => p.evaluate(() => [...document.querySelectorAll('[inert]')].map((n) => (n.id ? `#${n.id}` : `.${n.className}`)).join(' ') || 'none');
const showInert = (o) => BEHIND.map((x) => `${x} ${o[x] ? 'inert' : 'live'}`).join(', ');
const behindDialog = (o) => o['.skip-nav'] && o['#stage'] && o['#loader'] && o['#site-foot'] && !o['#site-nav'];
// what a screen reader can reach: the browser's own accessibility tree (through the DevTools
// protocol, which leaves out inert content), as "role:name", in lower case
const viewHas = (p) => p.evaluate(() => document.activeElement === document.getElementById('scene'));
const tree = async (p) => {
  const cdp = await p.context().newCDPSession(p);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes.filter((n) => !n.ignored).map((n) => `${n.role?.value}:${n.name?.value || ''}`.toLowerCase());
};
const has = (t, x) => t.some((n) => n === x || (x.endsWith('*') && n.startsWith(x.slice(0, -1))));
{
  const w = await openWalk(browser, { viewport: { width: 1280, height: 800 } });
  const p = w.page;
  await p.focus('#site-nav [data-nav="about"]');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('panel').hidden && document.getElementById('panel').contains(document.activeElement), null, { timeout: 30000 });
  const o = await inertOf(p);
  const t = await tree(p);
  const reach = { skip: has(t, 'link:accessible version of the digital exhibition*'), enter: has(t, 'button:enter'), footer: has(t, 'contentinfo:'), works: has(t, 'button:works'), hu: has(t, 'button:hu'), close: has(t, 'button:close') };
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });
  const after = await inertList(p);
  const back = await p.evaluate(() => document.activeElement === document.querySelector('#site-nav [data-nav="about"]'));
  step('28 B3 Title screen, About open by keyboard: skip link, title screen, 3D view and footer inert and out of the accessibility tree, the navbar not; Esc: nothing left inert, focus back on About', behindDialog(o) && !reach.skip && !reach.enter && !reach.footer && reach.works && reach.hu && reach.close && after === 'none' && back, `${showInert(o)}; in the tree: ${JSON.stringify(reach)}; inert after Esc: ${after}; focus on ${await focusName(p)}`);

  // a panel opened from the footer: the footer is inert while it is open, and wakes before
  // focus goes back to its button
  await p.focus('#site-foot [data-nav="legal"]');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 });
  const o2 = await inertOf(p);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });
  const after2 = await inertList(p);
  const back2 = await p.evaluate(() => document.activeElement === document.querySelector('#site-foot [data-nav="legal"]'));
  step('29 B3 Legal notice opened from the footer by keyboard: the footer inert while open; Esc: nothing left inert, focus back on the footer\'s Legal notice', behindDialog(o2) && after2 === 'none' && back2, `${showInert(o2)}; inert after Esc: ${after2}; focus on ${await focusName(p)}`);

  // the sound question: the navbar inert as well; a screen reader cannot reach EN / HU
  await p.focus('#enter');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); }, null, { timeout: 30000 });
  const o3 = await inertOf(p);
  const t3 = await tree(p);
  const reach3 = { hu: has(t3, 'button:hu'), about: has(t3, 'button:about'), view: has(t3, 'application:*'), toolbar: has(t3, 'navigation:exhibition controls'), off: has(t3, 'button:without sound'), on: has(t3, 'button:with sound') };
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden && document.activeElement === document.getElementById('scene'), null, { timeout: 30000 }).catch(() => {});
  const after3 = await inertList(p);
  step('30 B3 Sound question open: the navbar is inert too, with the rest of the page (EN, HU, About not in the accessibility tree); answered: only the title screen stays inert, focus on the view', BEHIND.every((x) => o3[x]) && !reach3.hu && !reach3.about && !reach3.view && !reach3.toolbar && reach3.off && reach3.on && after3 === '#loader' && (await viewHas(p)), `${showInert(o3)}; in the tree: ${JSON.stringify(reach3)}; inert after: ${after3}; focus on ${await focusName(p)}`);

  // dialogs that follow each other: the panel to the viewer, the viewer to a panel, a panel
  // to another through a link in it, the language switched; inert all the way, nothing left after
  const seen = [];
  const note = async (what) => { const x = await inertOf(p); seen.push(`${what}: ${behindDialog(x) ? 'ok' : showInert(x)}`); return behindDialog(x); };
  let ok = true;
  await p.focus('#site-nav [data-nav="works"]');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 });
  ok = (await note('Works')) && ok;
  await p.focus('#panel-body [data-work="w02-human-as-error-vi"]');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('viewer').hidden && document.getElementById('panel').hidden, null, { timeout: 30000 });
  ok = (await note('viewer from the list')) && ok;
  await p.click('#site-nav [data-nav="about"]');
  await p.waitForFunction(() => !document.getElementById('panel').hidden && document.getElementById('viewer').hidden, null, { timeout: 30000 });
  ok = (await note('About from the navbar over the viewer')) && ok;
  await p.click('#site-nav [data-nav="contact"]');
  await p.click('#panel-body [data-nav="legal"]');
  await p.waitForFunction(() => document.getElementById('panel-title')?.textContent === 'Legal notice', null, { timeout: 30000 });
  ok = (await note('Contact, then Legal notice from its text')) && ok;
  await p.click('[data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  ok = (await note('HU')) && ok;
  await p.click('[data-lang="en"]');
  await p.waitForFunction(() => document.documentElement.lang === 'en', null, { timeout: 30000 });
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });
  const after4 = await inertList(p);
  step('31 B3 Works, a work from it, About over the viewer, Contact, Legal notice from its text, HU and EN, Esc: inert behind every one, only the title screen inert after', ok && after4 === '#loader', `${seen.join('; ')}; inert after Esc: ${after4}; focus on ${await focusName(p)}`);

  // the tour: a work opened during it stops it; the viewer closed, nothing left inert
  await p.focus('#scene');
  await p.keyboard.press('KeyT');
  const touring = await p.evaluate(() => window.__ap.tour.active);
  await p.evaluate(() => window.__ap.viewer.open(window.__ap.data.works[0])); // as a click on a work during the tour
  await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 });
  const o5 = await inertOf(p);
  const stopped = await p.evaluate(() => !window.__ap.tour.active);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 });
  const after5 = await inertList(p);
  step('32 B3 Tour started, a work opened during it: the tour stops and the page behind the viewer is inert; Esc: only the title screen inert, focus on the view', touring && stopped && behindDialog(o5) && after5 === '#loader' && (await viewHas(p)), `tour started: ${touring}, stopped: ${stopped}; ${showInert(o5)}; inert after Esc: ${after5}; focus on ${await focusName(p)}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
// the phone layout: the folded menu still works behind a panel; the joystick and the
// toolbar (inside #stage) are out of reach
{
  const w = await openWalk(browser, PHONE);
  const p = w.page;
  await p.tap('#enter');
  await p.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.tap('[data-sound="off"]');
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.tap('#site-nav .nav-toggle');
  await p.waitForFunction(() => document.querySelector('#site-nav .nav-toggle').getAttribute('aria-expanded') === 'true', null, { timeout: 30000 });
  await p.tap('#site-nav [data-nav="about"]');
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 });
  const o = await inertOf(p);
  const hud = await p.evaluate(() => ({ joystick: !!document.getElementById('joystick').closest('[inert]'), toolbar: !!document.getElementById('toolbar').closest('[inert]'), shown: document.getElementById('joystick').getClientRects().length > 0 }));
  // what a screen reader reaches: the toolbar and the zoom buttons are out of the tree (a tap
  // at the joystick lands on the full-screen panel with or without inert, so it proves nothing)
  const t33 = await tree(p);
  const reach = { toolbar: has(t33, 'navigation:exhibition controls'), tour: has(t33, 'button:tour'), rooms: has(t33, 'button:rooms'), sound: has(t33, 'button:sound'), zoom: has(t33, 'button:zoom in*'), close: has(t33, 'button:close') };
  await p.tap('#site-nav .nav-toggle');
  await p.waitForFunction(() => document.querySelector('#site-nav .nav-toggle').getAttribute('aria-expanded') === 'true', null, { timeout: 30000 });
  await p.tap('#site-nav [data-nav="works"]');
  const switched = await p.waitForFunction(() => !!document.querySelector('#panel-body .works-list'), null, { timeout: 30000 }).then(() => true, () => false);
  const o2 = await inertOf(p);
  await p.tap('#panel [data-close]');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });
  const after = await inertList(p);
  step('33 B3 Phone (375 x 667, touch): About from the folded menu: page behind inert, the joystick and the toolbar too, the toolbar and the zoom buttons out of the accessibility tree; the menu still opens Works over it; closed: only the title screen inert', behindDialog(o) && hud.joystick && hud.toolbar && hud.shown && !reach.toolbar && !reach.tour && !reach.rooms && !reach.sound && !reach.zoom && reach.close && switched && behindDialog(o2) && after === '#loader', `${showInert(o)}; ${JSON.stringify(hud)}; in the tree: ${JSON.stringify(reach)}; Works from the menu: ${switched} (${showInert(o2)}); inert after Close: ${after}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- C6: closing a work opened from the works list reopens the list
// with focus on the work last shown, scrolled into view; a work opened another way closes as before
{
  const w = await openWalk(browser, { viewport: { width: 1280, height: 800 } });
  const p = w.page;
  await p.click('#enter');
  await p.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.click('[data-sound="off"]');
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  // which row has focus, and whether it is in view under the navbar
  const row = () => p.evaluate(() => {
    const a = document.activeElement;
    const r = a.getBoundingClientRect();
    const top = document.getElementById('site-nav').getBoundingClientRect().bottom;
    return { list: !document.getElementById('panel').hidden && !!document.querySelector('#panel-body .works-list'), viewer: !document.getElementById('viewer').hidden, work: a.dataset.work || null, inView: r.top >= top && r.bottom <= window.innerHeight };
  });
  const viewerOn = (id) => p.waitForFunction((x) => !document.getElementById('viewer').hidden && document.getElementById('viewer-title').textContent === window.__ap.data.works.find((k) => k.id === x).title, id, { timeout: 30000 });
  const listBack = () => p.waitForFunction(() => !document.getElementById('panel').hidden && document.getElementById('viewer').hidden, null, { timeout: 30000 }).catch(() => {});
  const listOpen = () => p.evaluate(() => !!document.querySelector('#panel:not([hidden]) .works-list'));
  // from the list on screen, or from the navbar's Works if it is not (the steps go on even
  // where the list failed to come back)
  const openFromList = async (id) => {
    if (!(await listOpen())) {
      await p.click('#site-nav [data-nav="works"]');
      await p.waitForFunction(() => !!document.querySelector('#panel:not([hidden]) .works-list'), null, { timeout: 30000 });
    }
    await p.click(`#panel-body [data-work="${id}"]`);
    await viewerOn(id);
  };

  await openFromList('w16-let-it-flow');
  await p.click('#viewer [data-close]');
  await listBack();
  let r = await row();
  step('34 C6 No. 16 clicked in the works list, the viewer\'s Close clicked with the mouse: the list reopens with focus on no. 16, in view', r.list && !r.viewer && r.work === 'w16-let-it-flow' && r.inView, JSON.stringify(r));

  await openFromList('w16-let-it-flow');
  await p.click('#viewer-next');
  await viewerOn('w17-natural-life');
  await p.keyboard.press('Escape');
  await listBack();
  r = await row();
  step('35 C6 From the reopened list, no. 16 again, Next clicked, then Esc: the list reopens with focus on no. 17, the work last shown, in view', r.list && !r.viewer && r.work === 'w17-natural-life' && r.inView, JSON.stringify(r));

  // Since B5 Next passes no. 3's screen by: from no. 3 it goes to no. 4
  await openFromList('w03-paradise-factory');
  await p.click('#viewer-next');
  await viewerOn('w04-human-as-error-iii');
  const media = await p.locator('#viewer .viewer-media').boundingBox();
  await p.mouse.click(media.x + 8, media.y + media.height - 8); // beside the picture
  await listBack();
  r = await row();
  step('36 C6 No. 3, Next (to no. 4, past its screen since B5), then a click beside the picture: the list reopens with focus on no. 4', r.list && !r.viewer && r.work === 'w04-human-as-error-iii' && r.inView, JSON.stringify(r));
  // no. 3's screen is an entry of its own in the viewer, not in the list: if it is the work
  // last shown (only the page's code can now open it with the way back to the list), its row is no. 3's
  await p.evaluate(() => { const ap = window.__ap; ap.ui.close(); const opener = document.querySelector('#site-nav [data-nav="works"]'); ap.viewer.open(ap.data.works.find((k) => k.id === 'w03-screen'), { opener, back: (last) => ap.ui.works({ opener, work: last }) }); });
  await viewerOn('w03-screen');
  await p.click('#viewer [data-close]');
  await listBack();
  r = await row();
  step('36a C6 No. 3\'s screen shown last, Close clicked: the list reopens with focus on no. 3', r.list && !r.viewer && r.work === 'w03-paradise-factory' && r.inView, JSON.stringify(r));

  const was37 = await listOpen();
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });
  const onWorks = await p.evaluate(() => document.activeElement === document.querySelector('#site-nav [data-nav="works"]'));
  step('37 C6 Esc on the reopened list: it closes, focus back on the Works button', was37 && onWorks && (await p.evaluate(() => document.getElementById('panel').hidden)), `list open before Esc: ${was37}; focus on ${await focusName(p)}`);

  await openFromList('w02-human-as-error-vi');
  await p.click('#viewer [data-close]');
  await listBack();
  const was38 = await listOpen();
  if (was38) await p.click('#panel [data-close]');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });
  step('38 C6 The reopened list closed with the mouse: focus on the view, as for any panel', was38 && (await viewHas(p)) && (await p.evaluate(() => document.getElementById('viewer').hidden)), `list reopened: ${was38}; focus on ${await focusName(p)}`);

  // 39 and 40 check what must not change: they pass on the build before C6 as well

  // "Walk to this work" from a work opened from the list goes to the work, not to the list
  await openFromList('w05-human-as-error-i');
  await p.click('#viewer-goto');
  await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 });
  const walked = await p.evaluate(() => document.getElementById('panel').hidden);
  step('39 C6 "Walk to this work" from a work opened from the list: no list, focus on the view', walked && (await viewHas(p)), `list open: ${!walked}; focus on ${await focusName(p)}`);

  // opened another way: Page Down and Enter, then Close with the mouse; a work opened as a
  // click in the 3D view opens it (no options), then Esc: no list, focus on the view
  await p.focus('#scene');
  await p.keyboard.press('PageDown');
  await p.waitForFunction(() => document.getElementById('prompt').classList.contains('show'), null, { timeout: 30000 }).catch(() => {}); // the work in front is named
  await p.keyboard.press('Enter');
  const opened = await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 }).then(() => true, () => false);
  await p.click('#viewer [data-close]');
  await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 });
  const a1 = { list: await p.evaluate(() => !document.getElementById('panel').hidden), view: await viewHas(p) };
  await p.evaluate(() => window.__ap.viewer.open(window.__ap.data.works[7]));
  await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 });
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 });
  const a2 = { list: await p.evaluate(() => !document.getElementById('panel').hidden), view: await viewHas(p) };
  step('40 C6 A work opened another way (Page Down and Enter, then Close clicked; as a click in the 3D view, then Esc): no list, focus on the view, as before', opened && !a1.list && a1.view && !a2.list && a2.view, `Page Down and Enter opened it: ${opened}; after Close ${JSON.stringify(a1)}; after Esc ${JSON.stringify(a2)}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- C7: in a narrow window a panel opened from the folded menu closes onto
// the Menu button (the item that opened it is hidden with the menu by then)
{
  const w = await openWalk(browser, PHONE);
  const p = w.page;
  const onMenu = () => p.evaluate(() => document.activeElement === document.querySelector('#site-nav .nav-toggle'));
  const menuOpen = () => p.waitForFunction(() => document.querySelector('#site-nav .nav-toggle').getAttribute('aria-expanded') === 'true', null, { timeout: 30000 });
  const panelIs = (shut) => p.waitForFunction((x) => document.getElementById('panel').hidden === x, shut, { timeout: 30000 });
  // by keyboard on the title screen: Menu, Tab to About, Enter, Esc
  await p.focus('#site-nav .nav-toggle');
  await p.keyboard.press('Enter');
  await menuOpen();
  await p.keyboard.press('Tab');
  const fromAbout = await p.evaluate(() => document.activeElement === document.querySelector('#site-nav [data-nav="about"]'));
  await p.keyboard.press('Enter');
  await panelIs(false);
  await p.keyboard.press('Escape');
  await panelIs(true);
  step('41 C7 Phone (375 x 667), title screen: Menu, About, Esc by keyboard: focus on the Menu button (not Enter)', fromAbout && (await onMenu()), `About had focus before Enter: ${fromAbout}; focus on ${await focusName(p)}`);

  // an item under the line in the menu (what the footer holds): Legal notice
  await p.focus('#site-nav .nav-toggle'); // where 41 left it, if it passed
  await p.keyboard.press('Enter');
  await menuOpen();
  const t43 = await (async () => { for (let i = 1; i <= 12; i++) { await p.keyboard.press('Tab'); if (await p.evaluate(() => document.activeElement === document.querySelector('#site-nav .nav-more [data-nav="legal"]'))) return i; } return 0; })();
  await p.keyboard.press('Enter');
  await panelIs(false);
  await p.keyboard.press('Escape');
  await panelIs(true);
  step(`42 C7 Phone, title screen: Menu, Tab to Legal notice under the line (${t43} Tabs), Enter, Esc: focus on the Menu button`, t43 > 0 && (await onMenu()), `focus on ${await focusName(p)}`);

  // inside, by touch: Menu tapped, About tapped, Close tapped
  await p.tap('#enter');
  await p.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.tap('[data-sound="off"]');
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.tap('#site-nav .nav-toggle');
  await menuOpen();
  await p.tap('#site-nav [data-nav="about"]');
  await panelIs(false);
  await p.tap('#panel [data-close]');
  await panelIs(true);
  step('43 C7 Phone, inside: Menu, About and Close tapped: focus on the Menu button (not the 3D view)', await onMenu(), `focus on ${await focusName(p)}`);

  // with C6: Works from the menu, a work, Close: the list is back; Esc: the Menu button
  await p.tap('#site-nav .nav-toggle');
  await menuOpen();
  await p.tap('#site-nav [data-nav="works"]');
  await p.waitForFunction(() => !!document.querySelector('#panel:not([hidden]) .works-list'), null, { timeout: 30000 });
  await p.tap('#panel-body [data-work="w08-wiena-wrong-landscape-i"]');
  await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 });
  await p.tap('#viewer [data-close]');
  await p.waitForFunction(() => document.getElementById('viewer').hidden && !document.getElementById('panel').hidden, null, { timeout: 30000 }).catch(() => {});
  const row44 = await p.evaluate(() => document.activeElement.dataset.work || null);
  await p.keyboard.press('Escape');
  await panelIs(true);
  step('44 C7 Phone, inside: Works from the menu, no. 8, Close tapped: the list is back on no. 8; Esc: focus on the Menu button', row44 === 'w08-wiena-wrong-landscape-i' && (await onMenu()), `focus after Close on row ${row44}; after Esc on ${await focusName(p)}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- "Walk to this work" on the title screen, from a work opened from the works
// list: once the sound question is answered, focus is on the 3D view, whatever the viewer
// closed onto (the Menu button on a phone, the Works button in a wide window)
{
  const viewAfter = async (context, by, folded) => {
    const w = await openWalk(browser, context);
    const p = w.page;
    const press = async (sel) => { if (by === 'tap') await p.tap(sel); else { await p.focus(sel); await p.keyboard.press('Enter'); } };
    if (folded) {
      await press('#site-nav .nav-toggle');
      await p.waitForFunction(() => document.querySelector('#site-nav .nav-toggle').getAttribute('aria-expanded') === 'true', null, { timeout: 30000 });
    }
    await press('#site-nav [data-nav="works"]');
    await p.waitForFunction(() => !!document.querySelector('#panel:not([hidden]) .works-list'), null, { timeout: 30000 });
    await press('#panel-body [data-work="w05-human-as-error-i"]');
    await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 });
    await press('#viewer-goto');
    await p.waitForFunction(() => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); }, null, { timeout: 60000 });
    await press('[data-sound="off"]');
    await p.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
    // focus settles on the view, or stays wherever the question sent it
    await p.waitForFunction(() => document.activeElement === document.getElementById('scene'), null, { timeout: 10000 }).catch(() => {});
    const r = { view: await viewHas(p), focus: await focusName(p) };
    errors.push(...w.errors);
    await w.ctx.close();
    return r;
  };
  const tap = await viewAfter(PHONE, 'tap', true);
  const key = await viewAfter(PHONE, 'key', true);
  step('45 Phone, title screen: Menu, Works, a work, "Walk to this work", the sound question answered (by tap, by keyboard): focus on the 3D view (not the Menu button)', tap.view && key.view, `by tap: ${tap.focus}; by keyboard: ${key.focus}`);
  const wide = await viewAfter({ viewport: { width: 1280, height: 800 } }, 'key', false);
  step('46 Wide window, title screen: Works, a work, "Walk to this work", the sound question answered by keyboard: focus on the 3D view (not the Works button)', wide.view, `focus on ${wide.focus}`);
}

// ---------------- D10: on a laptop with a touch screen a mouse press on the view is a mouse
// press (before, the press was dropped there, so the keyboard frame stayed on the view)
{
  const w = await openWalk(browser, TOUCH_LAPTOP);
  const p = w.page;
  await p.click('#enter');
  await p.waitForFunction(() => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); }, null, { timeout: 30000 });
  await p.click('[data-sound="off"]');
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden && document.activeElement === document.getElementById('scene'), null, { timeout: 30000 }).catch(() => {});
  const frame = () => p.evaluate(() => document.getElementById('scene').matches(':focus-visible'));
  await p.keyboard.press('Shift+Tab');
  await p.keyboard.press('Tab');
  const byKey = (await viewHas(p)) && (await frame());
  await p.mouse.move(640, 420);
  await p.mouse.down();
  await p.mouse.move(660, 420, { steps: 3 });
  await p.mouse.up();
  await p.waitForTimeout(200);
  step('47 D10 Laptop with a touch screen and a mouse: focus by Tab shows the frame on the view; a mouse press on the view keeps focus and drops the frame, as on any computer', byKey && (await viewHas(p)) && !(await frame()), `frame after Tab: ${byKey}; after the mouse: focus on view ${await viewHas(p)}, frame ${await frame()}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
