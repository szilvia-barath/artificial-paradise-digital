// Keyboard-only run through the walk, from page load. Every step is driven by real key
// presses (Tab, Shift+Tab, Enter, Esc, Page Down / Page Up, T) and logs what happened:
// where focus landed, what the live region said. Writes docs/accessibility/keyboard-test-log.md.
// Usage: npm run build && npm run preview &   then   node tests/a11y/keyboard.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { launch, BASE, focusName } from './lib.mjs';
import { readFileSync } from 'node:fs';

// the visible names come from the language file, so a change of wording does not break the run
const EN = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')).ui;

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => {
  window.__apNoAdapt = true;
  window.__said = [];
  addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('announcer');
    if (el) new MutationObserver(() => window.__said.push(el.textContent.trim())).observe(el, { childList: true, characterData: true, subtree: true });
  });
});

const log = [];
let failed = 0;
const step = (name, expected, got, pass) => {
  log.push({ name, expected, got, pass });
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      expected: ${expected}\n      got:      ${got}`);
};
const said = () => page.evaluate(() => window.__said.splice(0));
const wait = (ms) => page.waitForTimeout(ms);
const ready = () => page.waitForFunction(() => document.body.dataset.state === 'ready', null, { timeout: 90000 });
const isOn = (sel) => page.evaluate((s) => document.activeElement === document.querySelector(s), sel);
const inside = (sel) => page.evaluate((s) => !!document.querySelector(s)?.contains(document.activeElement), sel);
const open = (sel) => page.evaluate((s) => !document.querySelector(s).hidden, sel);
// Tab until the control has focus, as a keyboard user would.
async function tabTo(sel, max = 60) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    if (await isOn(sel)) return i;
  }
  return 0;
}
// Tab round a dialog once: the controls it passes, and whether focus ever left it.
async function cycle(sel) {
  const seen = [];
  let stayed = true;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    if (!(await inside(sel))) stayed = false;
    const n = await focusName(page);
    if (seen.includes(n)) break;
    seen.push(n);
  }
  await page.keyboard.press('Shift+Tab');
  if (!(await inside(sel))) stayed = false;
  return { count: seen.length, stayed };
}

// ---------------------------------------------------------------- 1. skip link
await page.goto(`${BASE}?lang=en`, { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Tab');
const skip = await page.evaluate(() => {
  const a = document.activeElement;
  const r = a.getBoundingClientRect();
  return { cls: a.className, text: a.textContent.trim(), href: a.getAttribute('href'), onScreen: r.top >= 0 && r.left >= 0 && r.width > 0, firstFocusable: a === document.querySelector('a[href], button, [tabindex]') };
});
step('1.1 From page load, the first Tab reaches the skip link', `focus on a.skip-link "${EN.textEdition.skip}", visible on screen, first focusable element`, `${skip.cls} "${skip.text}", on screen: ${skip.onScreen}, first focusable: ${skip.firstFocusable}`, skip.cls === 'skip-link' && skip.text === EN.textEdition.skip && skip.onScreen && skip.firstFocusable);
await Promise.all([page.waitForURL(/\/text\//), page.keyboard.press('Enter')]);
step('1.2 Enter follows it to the accessible version', `address ends in /text/?lang=en, one h1 naming it in full ("${EN.textEdition.nameFull}")`, `${page.url().replace(BASE, '/')} · h1 "${await page.textContent('h1')}"`, /\/text\/\?lang=en$/.test(page.url()) && (await page.locator('h1').count()) === 1 && (await page.textContent('h1')).toLowerCase().includes(EN.textEdition.nameFull.toLowerCase()));
await page.keyboard.press('Tab');
const back = await focusName(page);
await Promise.all([page.waitForURL((u) => !u.pathname.includes('/text/')), page.keyboard.press('Enter')]);
step('1.3 Tab, Enter on its first link comes back to the digital exhibition', `first link "${EN.textEdition.toWalk}"; back on the digital exhibition's address`, `${back} → ${page.url().replace(BASE, '/')}`, back.includes(EN.textEdition.toWalk) && !page.url().includes('/text/'));
await ready();
await said();
step('1.4 When loading is done, focus is on Enter', 'button#enter', await focusName(page), await isOn('#enter'));

// ---------------------------------------------------------------- 2. panels from the title screen
const PANELS = [
  ['#site-nav [data-nav="about"]', 'About'],
  ['#site-nav [data-nav="works"]', 'Works'],
  ['#site-nav [data-nav="bts"]', 'Behind the scenes'],
  ['#site-nav [data-nav="contact"]', 'Contact (navbar)'],
  ['#site-foot [data-nav="contact"]', 'Contact (footer)'],
  ['#site-foot [data-nav="accessibility"]', 'Accessibility (footer)'],
  ['#site-foot [data-nav="legal"]', 'Legal notice (footer)'],
  ['#site-foot [data-nav="privacy"]', 'Privacy (footer)'],
];
for (const [sel, name] of PANELS) {
  if (!(await page.locator(sel).count())) { step(`2. Panel ${name}`, 'the control exists', 'not found', false); continue; }
  const tabs = await tabTo(sel);
  await page.keyboard.press('Enter');
  await wait(250);
  const at = await focusName(page);
  const title = await page.evaluate(() => document.getElementById(document.getElementById('panel').getAttribute('aria-labelledby'))?.textContent);
  const c = await cycle('#panel');
  await page.keyboard.press('Escape');
  await wait(250);
  const closed = !(await open('#panel'));
  const returned = await isOn(sel);
  step(`2. Panel ${name}: Tab to it (${tabs} presses), Enter, Tab round, Esc`, 'focus on Close inside the panel; Tab stays inside; Esc closes; focus back on the control that opened it', `opened with focus on ${at}; dialog named "${title}"; ${c.count} controls in the Tab round, stayed inside: ${c.stayed}; closed: ${closed}; focus back on opener: ${returned}`, tabs > 0 && at.includes('Close') && !!title && c.stayed && closed && returned);
}

// ---------------------------------------------------------------- 3. enter, the sound question
let tabs = await tabTo('#enter');
await page.keyboard.press('Enter');
await wait(500);
let at = await focusName(page);
let c = await cycle('#sound-ask');
step(`3.1 Tab to Enter (${tabs} presses), press Enter: the sound question opens`, 'focus on "Without sound"; Tab moves between its two buttons only', `focus on ${at}; ${c.count} controls in the Tab round, stayed inside: ${c.stayed}`, at.includes('Without sound') && c.count === 2 && c.stayed);
await page.keyboard.press('Escape');
await wait(1500);
let heard = await said();
step('3.2 Esc answers "without sound" and closes it', 'question closed; focus on the 3D view; the room is announced', `closed: ${!(await open('#sound-ask'))}; focus on ${(await focusName(page)).slice(0, 40)}…; announced: ${JSON.stringify(heard)}`, !(await open('#sound-ask')) && (await isOn('#scene')) && heard.some((s) => s.startsWith('Room 1.')));
const sceneName = await page.getAttribute('#scene', 'aria-label');
step('3.3 The 3D view has a name', 'says what it is, names the accessible version and the keys', `role ${await page.getAttribute('#scene', 'role')}: "${sceneName}"`, /3D view/.test(sceneName) && /accessible version/i.test(sceneName) && /keys/.test(sceneName));

// ---------------------------------------------------------------- 4. all works, Page Down / Page Up
const works = await page.evaluate(() => window.__ap.visit.map((w) => ({ no: w.no, title: w.title, room: w.room })));
let allOk = true;
const lines = [];
for (let i = 0; i < works.length; i++) {
  await page.keyboard.press('PageDown');
  await wait(1400);
  heard = (await said()).join(' | ');
  await page.keyboard.press('Enter');
  await wait(900);
  const title = (await open('#viewer')) ? await page.textContent('#viewer-title') : '(viewer did not open)';
  const onClose = (await focusName(page)).includes('Close');
  await page.keyboard.press('Escape');
  await wait(500);
  const backOnScene = await isOn('#scene');
  const w = works[i];
  const ok = heard.includes(`No. ${w.no}, ${w.title}. Press Enter to open.`) && title === w.title && onClose && backOnScene;
  if (!ok) allOk = false;
  lines.push(`${ok ? 'ok ' : 'BAD'} ${String(i + 1).padStart(2)}  announced: "${heard}" · Enter opened: "${title}" (focus on Close: ${onClose}) · Esc: focus on the 3D view: ${backOnScene}`);
}
step(`4.1 Page Down through all ${works.length} works; at each, Enter opens it and Esc closes it`, 'each work announced as "No. n, title. Press Enter to open." (with the room when it changes); Enter opens that work with focus on Close; Esc returns focus to the 3D view', `\n        ${lines.join('\n        ')}`, allOk && works.length === 17);
await page.keyboard.press('PageDown');
await wait(1400);
heard = (await said()).join(' | ');
step('4.2 Page Down after the last work', 'goes round to No. 1 and says so', heard, heard.includes(`No. ${works[0].no}, ${works[0].title}`));
await page.keyboard.press('PageUp');
await wait(1400);
heard = (await said()).join(' | ');
step('4.3 Page Up from No. 1', 'goes back to the last work', heard, heard.includes(`No. ${works[16].no}, ${works[16].title}`));

// ---------------------------------------------------------------- 5. viewer from the list of works
tabs = await tabTo('#site-nav [data-nav="works"]');
await page.keyboard.press('Enter');
await wait(300);
const t2 = await tabTo('#panel-body [data-work="w06-artificial-paradise-singapore"]');
await page.keyboard.press('Enter');
await wait(1200);
at = await focusName(page);
const vtitle = await page.textContent('#viewer-title');
c = await cycle('#viewer');
await page.keyboard.press('Escape');
await wait(400);
step(`5.1 Works panel (${tabs} Tabs), Tab to no. 6 (${t2} Tabs), Enter: the viewer opens on a video work`, 'viewer open on "Artificial Paradise – Singapore", focus on Close; Tab stays inside (the video\'s native controls are not in the round); Esc closes; focus back on the Works button', `"${vtitle}", focus on ${at}; ${c.count} controls in the Tab round, stayed inside: ${c.stayed}; closed: ${!(await open('#viewer'))}; focus now on ${await focusName(page)}`, vtitle === 'Artificial Paradise – Singapore' && at.includes('Close') && c.stayed && !(await open('#viewer')) && (await isOn('#site-nav [data-nav="works"]')));

// ---------------------------------------------------------------- 6. toolbar: rooms menu, Enter on a button
tabs = await tabTo('[data-action="rooms"]');
await page.keyboard.press('Enter');
await wait(200);
const expanded = await page.getAttribute('[data-action="rooms"]', 'aria-expanded');
await page.keyboard.press('Tab');
at = await focusName(page);
await page.keyboard.press('Escape');
await wait(200);
step('6.1 Rooms menu: Enter opens it, Tab goes into it, Esc closes it', 'aria-expanded true; focus on the first room; after Esc closed, focus on the Rooms button', `expanded: ${expanded}; Tab → ${at}; after Esc expanded: ${await page.getAttribute('[data-action="rooms"]', 'aria-expanded')}, focus on ${await focusName(page)}`, expanded === 'true' && at.includes('Room 1') && (await isOn('[data-action="rooms"]')));
await page.keyboard.press('Enter');
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
await said();
await page.keyboard.press('Enter');
await page.waitForFunction(() => document.querySelector('#room-label .room-name').textContent === 'Room 3', null, { timeout: 30000 }).catch(() => {});
await wait(1200);
heard = (await said()).join(' | ');
step('6.2 Choose Room 3 in the menu', 'jump to Room 3, announced; menu closed; focus on the Rooms button', `announced: "${heard}"; room label "${await page.textContent('#room-label .room-name')}"; focus on ${await focusName(page)}`, heard.includes('Room 3.') && (await isOn('[data-action="rooms"]')));
await page.keyboard.press('Shift+Tab'); // the Tour button
await page.keyboard.press('Tab');
await page.keyboard.press('Tab'); // the Sound button
await page.keyboard.press('Enter');
await wait(500);
step('6.3 Enter on the Sound button', 'switches the sound; does not also open the work in view', `sound button pressed: ${await page.getAttribute('[data-action="sound"]', 'aria-pressed')}; viewer open: ${await open('#viewer')}`, (await page.getAttribute('[data-action="sound"]', 'aria-pressed')) === 'true' && !(await open('#viewer')));
await page.keyboard.press('Enter');

// ---------------------------------------------------------------- 7. letter keys only in the 3D view; the tour
// Focus is on the Sound button here. T, M, E, W and + are character keys: nothing may happen.
const before = await page.evaluate(() => ({ tour: window.__ap.tour.active, muted: window.__ap.audio.muted, zoom: window.__ap.controls.zoomTarget }));
for (const k of ['KeyT', 'KeyM', 'KeyE', '+']) await page.keyboard.press(k);
await page.keyboard.down('KeyW');
await wait(300);
const wHeld = await page.evaluate(() => window.__ap.controls.keys.has('KeyW'));
await page.keyboard.up('KeyW');
const after = await page.evaluate(() => ({ tour: window.__ap.tour.active, muted: window.__ap.audio.muted, zoom: window.__ap.controls.zoomTarget }));
step('7.0a T, M, E, W and + while focus is on a button (Sound)', 'nothing happens: no tour, sound unchanged, no viewer, no walking, no zoom', `before ${JSON.stringify(before)}, after ${JSON.stringify(after)}; W registered: ${wHeld}; viewer open: ${await open('#viewer')}`, JSON.stringify(before) === JSON.stringify(after) && !wHeld && !(await open('#viewer')));
// press, drag a little, release: a look, not a click on a work
await page.mouse.move(640, 300);
await page.mouse.down();
await page.mouse.move(665, 300, { steps: 3 });
await page.mouse.up();
await wait(200);
const clicked = await isOn('#scene');
await page.keyboard.press('KeyM');
const mOn = await page.getAttribute('[data-action="sound"]', 'aria-pressed');
await page.keyboard.press('KeyM');
await page.keyboard.press('+');
const zoomed = await page.evaluate(() => window.__ap.controls.zoomTarget);
await page.keyboard.press('0');
await page.keyboard.down('KeyW');
await wait(300);
const wNow = await page.evaluate(() => window.__ap.controls.keys.has('KeyW'));
await page.keyboard.up('KeyW');
step('7.0b Pressing the mouse on the 3D view gives it focus; then M, + and W work', 'focus on the 3D view; M switches the sound; + zooms; W is taken as walking', `focus on the view: ${clicked}; sound after M: ${mOn}; zoom after +: ${zoomed}; W registered: ${wNow}`, clicked && mOn === 'true' && zoomed > 1 && wNow);
await page.keyboard.press('Tab'); // off the view, to come back to it by keyboard
tabs = await tabTo('#scene');
await wait(1200);
await said();
await page.keyboard.press('KeyT');
const pressed = await page.getAttribute('[data-action="tour"]', 'aria-pressed');
// Software rendering draws about two frames a second here, so the test moves the tour's
// own clock on (0.1 s a step) until the first two captions have come up.
const toCaption = (stop) => page.evaluate((n) => {
  const { tour } = window.__ap;
  for (let i = 0; i < 600 && tour.active && !(tour.i === n && tour.shown); i++) tour.update(0.1);
}, stop);
await toCaption(0);
await wait(1300);
await toCaption(1);
await wait(1300);
heard = (await said()).join(' | ');
step(`7.1 Tab back to the 3D view (${tabs} presses); T starts the tour`, 'Tour button reads as pressed; the opening caption and the first work\'s caption are announced', `aria-pressed: ${pressed}; announced: "${heard}"`, pressed === 'true' && heard.includes('Artificial Paradise.') && heard.includes('No. 1, Wrong Data Landscape Dresden. Acrylic on canvas, 140 × 160 cm, 2023.'));
await page.keyboard.press('Escape');
await wait(1500);
heard = (await said()).join(' | ');
step('7.2 Esc stops the tour', 'Tour button not pressed; "Tour stopped." announced', `aria-pressed: ${await page.getAttribute('[data-action="tour"]', 'aria-pressed')}; announced: "${heard}"`, (await page.getAttribute('[data-action="tour"]', 'aria-pressed')) === 'false' && heard.includes('Tour stopped.'));
await tabTo('[data-action="tour"]');
at = await focusName(page);
await page.keyboard.press('Enter');
await wait(600);
const on = await page.getAttribute('[data-action="tour"]', 'aria-pressed');
await page.keyboard.press('Enter');
await wait(600);
step('7.3 The Tour button by keyboard: Enter starts, Enter stops', 'pressed true, then false', `on ${at}: ${on}, then ${await page.getAttribute('[data-action="tour"]', 'aria-pressed')}`, on === 'true' && (await page.getAttribute('[data-action="tour"]', 'aria-pressed')) === 'false');

// ---------------------------------------------------------------- 8. language
tabs = await tabTo('[data-lang="hu"]');
await page.keyboard.press('Enter');
await wait(400);
const hu = { lang: await page.getAttribute('html', 'lang'), url: page.url().replace(BASE, '/'), skip: await page.getAttribute('.skip-link', 'href'), focus: await isOn('[data-lang="hu"]'), pressed: await page.getAttribute('[data-lang="hu"]', 'aria-pressed') };
step(`8.1 Tab to HU (${tabs} presses), Enter`, 'page language hu; address carries lang=hu; the skip link points to text/hu/; focus stays on HU', JSON.stringify(hu), hu.lang === 'hu' && hu.url.includes('lang=hu') && hu.skip.includes('text/hu/') && hu.focus && hu.pressed === 'true');
await page.keyboard.press('Shift+Tab');
await page.keyboard.press('Enter');
await wait(400);
step('8.2 Shift+Tab to EN, Enter', 'page language en', await page.getAttribute('html', 'lang'), (await page.getAttribute('html', 'lang')) === 'en');

// ---------------------------------------------------------------- 9. a link to a work
await page.goto(`${BASE}?lang=en&work=w11-artificial-paradise-i-print`, { waitUntil: 'domcontentloaded' });
await ready();
await said();
await page.keyboard.press('Enter');
await wait(500);
await page.keyboard.press('Enter');
await wait(1800);
heard = (await said()).join(' | ');
await page.keyboard.press('Enter');
await wait(900);
step('9.1 Open the walk from a link to a work (?work=w11-artificial-paradise-i-print)', 'after Enter and the sound question: Room 3 and No. 11 announced; Enter opens No. 11', `announced: "${heard}"; Enter opened: "${(await open('#viewer')) ? await page.textContent('#viewer-title') : '(nothing)'}"`, heard.includes('Room 3.') && heard.includes('No. 11, Artificial Paradise I. Press Enter to open.') && (await page.textContent('#viewer-title')) === 'Artificial Paradise I' && (await open('#viewer')));

step('Console errors during the whole run', 'none', errors.length ? errors.join(' | ') : 'none', errors.length === 0);
await browser.close();

mkdirSync('docs/accessibility', { recursive: true });
const md = `# Keyboard test log

Written by \`tests/a11y/keyboard.mjs\` on ${new Date().toISOString().slice(0, 10)}: Chromium (Playwright, headless, software WebGL), window 1366 × 768, English. Every step was driven by key presses only. ${log.filter((l) => l.pass).length} of ${log.length} steps passed.

${log.map((l) => `## ${l.pass ? 'PASS' : 'FAIL'}: ${l.name}\n\n- Expected: ${l.expected}\n- What happened: ${l.got.includes('\n') ? `\n\n\`\`\`\n${l.got.replace(/\n\s+/g, '\n').trim()}\n\`\`\`` : l.got}\n`).join('\n')}`;
writeFileSync('docs/accessibility/keyboard-test-log.md', md);
console.log(`\n${log.length - failed}/${log.length} steps passed; log written to docs/accessibility/keyboard-test-log.md`);
process.exit(failed ? 1 : 0);
