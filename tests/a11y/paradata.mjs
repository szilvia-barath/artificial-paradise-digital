// The "measured or guessed" view (Part 6, 6.2): the toggle on the toolbar is a real button with
// aria-pressed, reached and pressed from the keyboard; the legend names every status with its
// pattern and the number of parts, and those numbers are the ones the data gives
// (src/data/paradata-scene.json and src/data/paradata.json); every part named in the data is in
// the scene, and nothing in the scene is without a part; the works keep their own materials;
// off puts back every material and takes away every band and overlay. In a narrow window the
// switch is in the folded menu. With reduced motion nothing moves while the view is on.
// Usage: npm run build && npm run preview &   then   node tests/a11y/paradata.mjs
import { readFileSync } from 'node:fs';
import { launch, openWalk } from './lib.mjs';

const json = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const sceneMap = json('src/data/paradata-scene.json');
const pd = json('src/data/paradata.json');
const EN = json('src/i18n/en.json').ui.paradata;
const HU = json('src/i18n/hu.json').ui.paradata;
const CLASSES = ['measured', 'inferred', 'invented', 'omitted', 'not-recorded'];
const status = new Map(pd.rows.map((r) => [r.decision_id, r.status]));
const want = Object.fromEntries(CLASSES.map((k) => [k, 0]));
for (const e of sceneMap.elements) {
  const s = status.get(e.decision);
  want[CLASSES.slice(0, 4).includes(s) ? s : 'not-recorded']++;
}

let failed = 0;
const step = (ok, name, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${detail}`);
  if (!ok) failed++;
};
const enter = async (page) => {
  await page.evaluate(() => document.getElementById('enter').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-sound="off"]').click());
  await page.waitForTimeout(1500);
};
// every mesh's material, by the mesh's place in the scene (bands and overlays left out)
const materials = (page) => page.evaluate(() => {
  const out = [];
  window.__ap.scene.traverse((o) => { if (o.isMesh && !o.userData.pdAdded) out.push(o.material.uuid); });
  return out;
});
const meshCount = (page) => page.evaluate(() => { let n = 0; window.__ap.scene.traverse(() => n++); return n; });
const legend = (page) => page.evaluate(() => ({
  hidden: document.getElementById('pd-legend').hidden,
  shown: document.getElementById('pd-legend').getClientRects().length > 0,
  title: document.getElementById('pd-legend-h').textContent,
  rows: [...document.querySelectorAll('#pd-legend-list li')].map((li) => ({ status: li.dataset.status, n: +li.querySelector('.ct').dataset.n, text: li.textContent.replace(/\s+/g, ' ').trim() })),
}));
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 60000 });

const browser = await launch();

// ---------------------------------------------------------------- 1. computer, English
{
  const { page, errors, ctx } = await openWalk(browser);
  await enter(page);
  const btn = '#toolbar [data-action="paradata"]';
  const name = await page.evaluate((s) => document.querySelector(`${s} .lbl`).textContent.trim(), btn); // the sign before it is hidden from screen readers
  const before = await materials(page);
  const nodes = await meshCount(page);
  step(name === EN.button && (await page.getAttribute(btn, 'aria-pressed')) === 'false' && (await legend(page)).hidden,
    '1.1 The switch at rest', `named "${name}", aria-pressed ${await page.getAttribute(btn, 'aria-pressed')}, legend hidden ${(await legend(page)).hidden}`);

  // Tab from the 3D view to the switch, Enter
  await page.focus('#scene');
  let tabs = 0;
  for (let i = 1; i <= 12; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => document.activeElement === document.querySelector(s), btn)) { tabs = i; break; }
  }
  await page.keyboard.press('Enter');
  await until(page, () => window.__ap.paradata.state().replaced > 0);
  const on = await page.evaluate(() => window.__ap.paradata.state());
  const lg = await legend(page);
  const heard = await page.textContent('#announcer');
  step(tabs > 0 && (await page.getAttribute(btn, 'aria-pressed')) === 'true' && lg.shown && on.on,
    `1.2 Tab from the 3D view reaches it (${tabs} presses); Enter switches it on`, `aria-pressed ${await page.getAttribute(btn, 'aria-pressed')}; legend shown ${lg.shown} ("${lg.title}"); ${on.replaced} materials replaced, ${on.added} bands and overlays; announced "${heard.trim()}"`);

  const got = Object.fromEntries(lg.rows.map((r) => [r.status, r.n]));
  const counts = CLASSES.every((k) => got[k] === want[k]) && lg.rows.length === CLASSES.length;
  const words = lg.rows.every((r) => r.text.includes(EN.status[r.status]) && r.text.includes(EN.pattern[r.status]));
  step(counts && words, '1.3 The legend: every status in words, its pattern, and the counts the data gives',
    lg.rows.map((r) => `${r.text} (data: ${want[r.status]})`).join('; '));

  const census = await page.evaluate(() => window.__ap.paradata.census());
  const missing = census.elements.filter((id) => !census.found.includes(id));
  step(!missing.length && !on.untagged.length, '1.4 Every part in paradata-scene.json is in the scene, and every mesh has a part',
    `${census.elements.length} parts, missing in the scene: ${missing.join(', ') || 'none'}; meshes with no part: ${on.untagged.join(', ') || 'none'}`);

  // the meshes of the works: a hung work's picture, screen, frame and shadow, and the
  // installations' own meshes (the pools of light are not the works)
  const works = await page.evaluate((ids) => {
    const out = [];
    window.__ap.scene.traverse((o) => {
      if (!o.isMesh || o.userData.pdAdded) return;
      let p = o;
      while (p && !p.userData.paradata) p = p.parent;
      const id = p && p.userData.paradata;
      if (id && (ids.includes(id) || id.startsWith('pf-') || id.startsWith('lif-'))) out.push({ id, replaced: !!o.material.uniforms?.uClass });
    });
    return out;
  }, sceneMap.elements.map((e) => e.id).filter((id) => /^w\d\d-/.test(id)));
  step(works.length > 0 && works.every((w) => !w.replaced), '1.5 The works keep their own materials (pictures, screens, installations): a band or an overlay is added, nothing replaced',
    `${works.length} meshes of works checked, ${works.filter((w) => w.replaced).length} replaced (${[...new Set(works.filter((w) => w.replaced).map((w) => w.id))].join(', ') || 'none'})`);

  // Enter again: off
  await page.keyboard.press('Enter');
  await until(page, () => !window.__ap.paradata.state().on);
  const off = await page.evaluate(() => window.__ap.paradata.state());
  const after = await materials(page);
  const same = after.length === before.length && after.every((u, i) => u === before[i]);
  step((await page.getAttribute(btn, 'aria-pressed')) === 'false' && (await legend(page)).hidden && same && off.replaced === 0 && off.added === 0 && (await meshCount(page)) === nodes,
    '1.6 Enter again switches it off and restores the scene', `aria-pressed ${await page.getAttribute(btn, 'aria-pressed')}; legend hidden ${(await legend(page)).hidden}; every material back: ${same} (${after.length} meshes); bands and overlays left: ${off.added}; objects in the scene ${await meshCount(page)} (before ${nodes})`);

  // a room at a time, on and off, for the console
  for (const r of ['r1', 'r2', 'r3', 'r4']) {
    await page.evaluate((id) => window.__ap.jumpToRoom(id), r);
    await page.evaluate(() => window.__ap.setParadata(true));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__ap.setParadata(false));
  }
  step(errors.length === 0, '1.7 No console errors, on and off in every room', errors.join(' | ') || 'none');
  await ctx.close();
}

// ---------------------------------------------------------------- 2. Hungarian
{
  const { page, errors, ctx } = await openWalk(browser, { lang: 'hu' });
  await enter(page);
  await page.click('#toolbar [data-action="paradata"]');
  await until(page, () => window.__ap.paradata.state().replaced > 0);
  const lg = await legend(page);
  const ok = lg.title === HU.legendTitle && lg.rows.every((r) => r.text.includes(HU.status[r.status]) && r.text.includes(HU.pattern[r.status]));
  step(ok && errors.length === 0, '2.1 Hungarian: the switch and the legend in Hungarian', `button "${(await page.textContent('#toolbar [data-action="paradata"] .lbl')).trim()}"; ${lg.title}: ${lg.rows.map((r) => r.text).join('; ')}; console errors: ${errors.join(' | ') || 'none'}`);
  await ctx.close();
}

// ---------------------------------------------------------------- 3. a narrow window: the folded menu
{
  const { page, errors, ctx } = await openWalk(browser, { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  await enter(page);
  const onBar = await page.evaluate(() => document.querySelector('#toolbar [data-action="paradata"]').getClientRects().length > 0);
  await page.tap('.nav-toggle');
  const item = '#nav-links [data-paradata]';
  const inMenu = await page.evaluate((s) => document.querySelector(s).getClientRects().length > 0, item);
  await page.tap(item);
  await until(page, () => window.__ap.paradata.state().replaced > 0);
  const closed = !(await page.evaluate(() => document.getElementById('site-nav').classList.contains('open')));
  const box = await page.evaluate(() => { const r = document.getElementById('pd-legend').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight }; });
  const inside = box.l >= 0 && box.r <= box.w && box.t >= 0 && box.b <= box.h;
  step(!onBar && inMenu && closed && (await page.getAttribute(item, 'aria-pressed')) === 'true' && (await page.getAttribute('#toolbar [data-action="paradata"]', 'aria-pressed')) === 'true' && inside && errors.length === 0,
    '3.1 Phone 375 × 667: not on the toolbar but in the folded menu; a tap switches it on, the menu closes, the legend lies inside the window',
    `on the toolbar: ${onBar}; in the menu: ${inMenu}; menu closed after: ${closed}; aria-pressed ${await page.getAttribute(item, 'aria-pressed')}; legend ${Math.round(box.l)}–${Math.round(box.r)} × ${Math.round(box.t)}–${Math.round(box.b)} in ${box.w} × ${box.h}; console errors: ${errors.join(' | ') || 'none'}`);
  await ctx.close();
}

// ---------------------------------------------------------------- 4. reduced motion: nothing moves
{
  const { page, ctx } = await openWalk(browser, { reducedMotion: 'reduce' });
  await enter(page);
  await page.evaluate(() => window.__ap.setParadata(true));
  await until(page, () => window.__ap.paradata.state().replaced > 0);
  // the floor of Room 1, where no video is in view (as reduced-motion.mjs does)
  await page.evaluate(() => { const c = window.__ap.controls; c.setPose(3.4, 5.6, 0); c.pitch = -1.25; });
  await page.waitForTimeout(2500);
  const clip = { x: 400, y: 200, width: 400, height: 250 };
  const a = await page.screenshot({ clip, timeout: 180000 });
  await page.waitForTimeout(1200);
  const b = await page.screenshot({ clip, timeout: 180000 });
  const anim = await page.evaluate(() => document.getAnimations().filter((x) => document.getElementById('pd-legend').contains(x.effect?.target)).length);
  step(a.equals(b) && anim === 0, '4.1 Reduced motion, view on: two frames of a still view are the same, and the legend has no animation', `frames identical: ${a.equals(b)}; animations in the legend: ${anim}`);
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
