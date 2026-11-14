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
await page.click('[data-sound="off"]');
await page.waitForTimeout(800);
step('4 Sound question answered with the mouse: focus on the 3D view', await onView(), await focusName(page));

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

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await ctx.close();
await browser.close();
process.exit(failed ? 1 : 0);
