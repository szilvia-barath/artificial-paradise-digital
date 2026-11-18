// "Open No. …, in the digital exhibition", the accessible version's link to a work, followed by
// keyboard only: where focus lands, what a screen reader is given for it (role and accessible
// name, read from the browser's accessibility tree through the DevTools protocol), that the
// title card (the loading page) is never shown on the way, and that the sound question, where it
// comes, stands over the 3D view at the work.
//   A. No exhibition tab: the accessible version opened on its own; the link loads the
//      exhibition in its tab, at no. 6.
//   B. Exhibition tab not yet entered: its skip link opens the accessible version in a new tab;
//      the link to no. 6 sends the exhibition's tab to the work, with no reload.
//   C. Exhibition tab entered without sound: the link to no. 14, no reload, no question.
//   D. Exhibition tab entered with sound: the link to no. 3, no reload, the sound kept; then the
//      exhibition's tab is closed and the links point back to a new load.
// Headless Chromium counts every tab as in front, so whether the browser brings the exhibition's
// tab to the front is not checked here; focus inside that tab is.
// Usage: npm run build && npm run preview &   then   node tests/a11y/go-to-work.mjs [folder for screenshots]
// The screenshots show the works: their names end in -ARTWORK.
import { readFileSync } from 'node:fs';
import { launch, BASE } from './lib.mjs';

const EN = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')).ui;
const WORKS = JSON.parse(readFileSync('src/data/exhibition.json', 'utf8')).works;
const title = (id) => WORKS.find((w) => w.id === id).title;
const no = (id) => WORKS.find((w) => w.id === id).no;
const linkName = (id, hint) => `Open No. ${no(id)}, ${title(id)}, in the digital exhibition${hint ? ` ${EN.textEdition.otherTab}` : ''}`;
const shots = process.argv[2];
const browser = await launch();
let failed = 0;
const errors = [];
const step = (name, ok, got) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got: ${got}`);
  if (!ok) failed++;
};

// Every frame the browser draws (requestAnimationFrame runs before each paint), note whether the
// title card or the sound question is on screen; for a page opened from a link to a work from
// its start, otherwise from the moment its address gets #work=.
const watch = () => {
  window.__apNoAdapt = true;
  const seen = { watching: /[?&]work=/.test(location.search), loader: false, soundAsk: false, frames: 0, mark: Math.random() };
  window.__seen = seen;
  addEventListener('hashchange', () => { if (/work=/.test(location.hash)) seen.watching = true; });
  const look = () => {
    if (seen.watching) {
      const l = document.getElementById('loader');
      if (l) {
        const cs = getComputedStyle(l);
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0) seen.loader = true;
      }
      const q = document.getElementById('sound-ask');
      if (q && !q.hidden) seen.soundAsk = true;
      seen.frames++;
    }
    requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
};

async function context() {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
  await ctx.route(/google|gstatic|ggpht|googleusercontent/, (r) => r.abort());
  await ctx.addInitScript(watch);
  const listen = (page) => {
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
  };
  ctx.on('page', listen);
  const page = await ctx.newPage();
  return { ctx, page };
}
const until = (p, fn, arg, timeout = 90000) => p.waitForFunction(fn, arg, { timeout, polling: 100 }).catch(() => {});
// An element's role and accessible name (the focused one if no selector), as the browser gives
// them to a screen reader.
async function ax(p, sel = null) {
  const cdp = await p.context().newCDPSession(p);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  let nodeId;
  if (sel) ({ nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel }));
  else {
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'document.activeElement' });
    ({ nodeId } = await cdp.send('DOM.requestNode', { objectId: result.objectId }));
  }
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  await cdp.detach();
  return { role: nodes[0]?.role?.value ?? null, name: nodes[0]?.name?.value ?? null };
}
const isOn = (p, sel) => p.evaluate((s) => document.activeElement === document.querySelector(s), sel);
async function tabTo(p, sel, key = 'Tab', max = 120) {
  for (let i = 1; i <= max; i++) {
    await p.keyboard.press(key);
    if (await isOn(p, sel)) return i;
  }
  return 0;
}
// where the 3D view stands, against the viewing point of the work
const pose = (p, id) => p.evaluate((x) => {
  const w = window.__ap.data.works.find((k) => k.id === x);
  const c = window.__ap.controls;
  return Math.hypot(c.pos.x - w._focus.x, c.pos.y - w._focus.z);
}, id);
const questionWithFocus = () => { const d = document.getElementById('sound-ask'); return d && !d.hidden && d.contains(document.activeElement); };
const viewerWithFocus = () => !document.getElementById('viewer').hidden && document.getElementById('viewer').contains(document.activeElement);
const sceneWithFocus = () => document.getElementById('viewer').hidden && document.activeElement === document.getElementById('scene');

// The exhibition entered by keyboard: Enter on the title card, then the sound question answered.
async function enterByKeys(p, sound) {
  await p.goto(`${BASE}?lang=en`);
  await until(p, () => document.body.dataset.state === 'ready' && document.activeElement === document.getElementById('enter'));
  await p.keyboard.press('Enter');
  await until(p, questionWithFocus, null, 30000);
  if (sound) await p.keyboard.press('Tab'); // to "With sound"
  await p.keyboard.press('Enter');
  await until(p, sceneWithFocus, null, 30000);
}
// From the exhibition's tab: its skip link by keys, Enter; the accessible version in a new tab.
async function openTextTab(ctx, p, key) {
  const tabs = await tabTo(p, '.skip-link', key, 40);
  const skip = await ax(p);
  const [t] = await Promise.all([ctx.waitForEvent('page'), p.keyboard.press('Enter')]);
  await t.waitForLoadState('load');
  // its links to a work have found the exhibition's tab
  await until(t, () => [...document.querySelectorAll('a[data-work]')].every((a) => a.target === 'ap-exhibition'), null, 15000);
  const wired = await t.evaluate(() => ({ target: [...document.querySelectorAll('a[data-work], a[data-walk]')].every((a) => a.target === 'ap-exhibition'), sameTab: document.querySelectorAll('a[data-work]').length }));
  return { t, tabs, skip, wired, url: t.url().replace(BASE, '/'), pages: ctx.pages().length };
}

// ---------------- A. no exhibition tab
{
  const id = 'w06-artificial-paradise-singapore';
  const { ctx, page: p } = await context();
  await p.goto(`${BASE}text/`);
  await until(p, () => document.querySelectorAll('link[rel="prefetch"]').length > 0, null, 10000);
  const prefetch = await p.locator('link[rel="prefetch"]').count();
  const tabs = await tabTo(p, `a[data-work="${id}"]`);
  const link = await ax(p);
  const target = await p.evaluate(() => document.activeElement.getAttribute('target'));
  if (shots) await p.screenshot({ path: `${shots}/goto-A-1-link.png` });
  await Promise.all([p.waitForURL((u) => u.searchParams.get('work') === id), p.keyboard.press('Enter')]);
  step('A.1 No exhibition tab: the accessible version on its own fetches the engine in the background; Tab reaches the link to no. 6, a plain link in this tab (its name says nothing of another tab); Enter loads the exhibition here', prefetch === 5 && tabs > 0 && link.role === 'link' && link.name === linkName(id) && target === null && ctx.pages().length === 1, `${prefetch} files prefetched; ${tabs} Tabs to ${link.role} "${link.name}", target ${target}; ${ctx.pages().length} tab(s), now at ${p.url().replace(BASE, '/')}`);
  await until(p, questionWithFocus);
  const q = await ax(p, '#sound-ask');
  const f = await ax(p);
  const d0 = await pose(p, id);
  const over = await p.evaluate(() => ({ canvasHidden: document.getElementById('scene').getAttribute('aria-hidden'), viewer: !document.getElementById('viewer').hidden }));
  if (shots) await p.screenshot({ path: `${shots}/goto-A-2-question-over-work-ARTWORK.png` });
  step('A.2 The sound question opens at once over the 3D view standing at no. 6, focus on "Without sound" in it (a dialog named "Start with sound?")', q.role === 'dialog' && q.name === EN.soundAsk.question && f.role === 'button' && f.name === EN.soundAsk.off && d0 < 0.05 && over.canvasHidden === null && !over.viewer, `question: ${q.role} "${q.name}"; focus: ${f.role} "${f.name}"; the 3D view ${d0.toFixed(3)} m from the work's viewing point; viewer open: ${over.viewer}`);
  await p.keyboard.press('Enter');
  await until(p, viewerWithFocus, null, 30000);
  const d = await ax(p, '#viewer');
  const g = await ax(p);
  if (shots) await p.screenshot({ path: `${shots}/goto-A-3-viewer-ARTWORK.png` });
  step('A.3 Enter ("Without sound"): no. 6 opens in the viewer, a dialog named by its title, focus on its Close button', d.role === 'dialog' && d.name === title(id) && g.role === 'button' && g.name === EN.viewer.close, `viewer: ${d.role} "${d.name}"; focus: ${g.role} "${g.name}"`);
  await p.keyboard.press('Escape');
  await until(p, sceneWithFocus, null, 30000);
  const s = await ax(p);
  const d1 = await pose(p, id);
  const seen = await p.evaluate(() => window.__seen);
  step('A.4 Esc: focus on the 3D view, still at no. 6, named as the 3D view; the title card was never on screen', s.role === 'application' && s.name === EN.sceneLabel && d1 < 0.05 && !seen.loader && seen.frames > 0, `focus: ${s.role} "${(s.name || '').slice(0, 40)}…"; ${d1.toFixed(3)} m from the work; title card on screen in any of ${seen.frames} frames: ${seen.loader}`);
  await ctx.close();
}

// ---------------- B. exhibition tab not yet entered
{
  const id = 'w06-artificial-paradise-singapore';
  const { ctx, page: p } = await context();
  await p.goto(`${BASE}?lang=en`);
  await until(p, () => !!document.getElementById('enter'), null, 30000);
  const mark = await p.evaluate(() => window.__seen.mark);
  const o = await openTextTab(ctx, p, 'Tab');
  step('B.1 Title card: Tab reaches the skip link, named as opening in a new tab; Enter opens the accessible version in a second tab, whose links to a work and back point at the exhibition\'s tab', o.tabs > 0 && o.skip.name === `${EN.textEdition.skip} ${EN.textEdition.newTab}` && o.pages === 2 && /\/text\//.test(o.url) && o.wired.target, `${o.tabs} Tab: ${o.skip.role} "${o.skip.name}"; ${o.pages} tabs, the new one at ${o.url}; links pointed at the exhibition's tab: ${o.wired.target}`);
  const t = o.t;
  const tabs = await tabTo(t, `a[data-work="${id}"]`);
  const link = await ax(t);
  if (shots) await t.screenshot({ path: `${shots}/goto-B-1-link-other-tab.png` });
  await t.keyboard.press('Enter');
  await until(p, questionWithFocus);
  const f = await ax(p);
  const d0 = await pose(p, id);
  const same = await p.evaluate((m) => window.__seen.mark === m, mark);
  if (shots) await p.screenshot({ path: `${shots}/goto-B-2-question-over-work-ARTWORK.png` });
  step('B.2 The link to no. 6 (its name says it goes to the open tab) sends the exhibition\'s tab to the work, with no reload: the sound question over the 3D view at no. 6, focus on "Without sound"; the accessible version stays where it was', tabs > 0 && link.name === linkName(id, true) && f.name === EN.soundAsk.off && d0 < 0.05 && same && /\/text\//.test(t.url()) && ctx.pages().length === 2, `link: ${link.role} "${link.name}"; exhibition: focus ${f.role} "${f.name}", ${d0.toFixed(3)} m from the work, same page (not reloaded): ${same}; accessible version at ${t.url().replace(BASE, '/')}; ${ctx.pages().length} tabs`);
  await p.keyboard.press('Enter');
  await until(p, viewerWithFocus, null, 30000);
  const d = await ax(p, '#viewer');
  const g = await ax(p);
  const seen = await p.evaluate(() => window.__seen);
  step('B.3 Enter ("Without sound"): no. 6 opens in the viewer named by its title, focus on Close; the title card was not on screen once the link was followed', d.role === 'dialog' && d.name === title(id) && g.name === EN.viewer.close && !seen.loader && seen.frames > 0, `viewer: ${d.role} "${d.name}"; focus: ${g.role} "${g.name}"; title card on screen in any of ${seen.frames} frames since: ${seen.loader}`);
  await ctx.close();
}

// ---------------- C. exhibition tab entered, without sound
{
  const id = 'w14-warsaw-g24-ii';
  const { ctx, page: p } = await context();
  await enterByKeys(p, false);
  const mark = await p.evaluate(() => window.__seen.mark);
  const o = await openTextTab(ctx, p, 'Shift+Tab');
  const t = o.t;
  const tabs = await tabTo(t, `a[data-work="${id}"]`);
  const link = await ax(t);
  await t.keyboard.press('Enter');
  await until(p, viewerWithFocus);
  const d = await ax(p, '#viewer');
  const g = await ax(p);
  const d0 = await pose(p, id);
  const st = await p.evaluate((m) => ({ same: window.__seen.mark === m, seen: window.__seen, pressed: document.querySelector('[data-action="sound"]').getAttribute('aria-pressed') }), mark);
  if (shots) await p.screenshot({ path: `${shots}/goto-C-2-viewer-ARTWORK.png` });
  step('C.1 Inside without sound: Shift+Tab to the skip link, Enter opens the accessible version in a second tab; its link to no. 14 names the open tab', o.tabs > 0 && o.pages === 2 && o.wired.target && link.name === linkName(id, true), `${o.tabs} Shift+Tab; ${o.pages} tabs, ${o.url}; link "${link.name}" after ${tabs} Tabs`);
  step('C.2 Enter: the exhibition\'s tab, not reloaded, opens no. 14 in the viewer named by its title, focus on Close, the 3D view at the work behind it; no sound question, no title card; the sound still off', d.role === 'dialog' && d.name === title(id) && g.name === EN.viewer.close && d0 < 0.05 && st.same && !st.seen.loader && !st.seen.soundAsk && st.pressed === 'false', `viewer: ${d.role} "${d.name}"; focus: ${g.role} "${g.name}"; ${d0.toFixed(3)} m from the work; same page: ${st.same}; title card / question on screen: ${st.seen.loader} / ${st.seen.soundAsk} (${st.seen.frames} frames); Sound pressed: ${st.pressed}`);
  await p.keyboard.press('Escape');
  await until(p, sceneWithFocus, null, 30000);
  const s = await ax(p);
  step('C.3 Esc: focus on the 3D view at no. 14, named as the 3D view', s.role === 'application' && s.name === EN.sceneLabel && (await pose(p, id)) < 0.05, `focus: ${s.role} "${(s.name || '').slice(0, 40)}…"`);
  await ctx.close();
}

// ---------------- D. exhibition tab entered, with sound
{
  const id = 'w03-paradise-factory';
  const { ctx, page: p } = await context();
  await enterByKeys(p, true);
  await until(p, () => window.__ap.audio.ctx?.state === 'running', null, 10000);
  const mark = await p.evaluate(() => window.__seen.mark);
  const o = await openTextTab(ctx, p, 'Shift+Tab');
  const t = o.t;
  await tabTo(t, `a[data-work="${id}"]`);
  const link = await ax(t);
  await t.keyboard.press('Enter');
  await until(p, viewerWithFocus);
  const d = await ax(p, '#viewer');
  const st = await p.evaluate((m) => ({ same: window.__seen.mark === m, seen: window.__seen, pressed: document.querySelector('[data-action="sound"]').getAttribute('aria-pressed'), audio: window.__ap.audio.ctx?.state }), mark);
  step('D.1 Inside with sound: the link to no. 3 in the second tab opens it in the exhibition\'s viewer, not reloaded, no question, the sound still on and running', link.name === linkName(id, true) && d.name === title(id) && st.same && !st.seen.soundAsk && !st.seen.loader && st.pressed === 'true' && st.audio === 'running', `link "${link.name}"; viewer "${d.name}"; same page: ${st.same}; question / title card on screen: ${st.seen.soundAsk} / ${st.seen.loader}; Sound pressed: ${st.pressed}, audio ${st.audio}`);
  // the exhibition's tab closed: the accessible version's links point back to a new load
  await p.close();
  await until(t, () => [...document.querySelectorAll('a[data-work]')].every((a) => !a.target && /[?&]work=/.test(a.getAttribute('href')) && !a.querySelector('.tab-hint').textContent), null, 15000);
  const back = await t.evaluate((x) => { const a = document.querySelector(`a[data-work="${x}"]`); return { href: a.getAttribute('href'), target: a.target, hint: a.querySelector('.tab-hint').textContent }; }, id);
  const name = await t.evaluate((x) => document.querySelector(`a[data-work="${x}"]`).textContent, id);
  step('D.2 The exhibition\'s tab closed: the accessible version\'s links are plain links again (no target, ?work= in the address, no word of another tab)', back.target === '' && /\?lang=en&work=w03-paradise-factory$/.test(back.href) && back.hint === '' && name === linkName(id), JSON.stringify(back));
  await ctx.close();
}

await browser.close();
const real = errors.filter((e) => !/google|gstatic|net::ERR_FAILED/i.test(e));
step('No console errors', real.length === 0, real.join(' | ') || 'none');
console.log(failed ? `\n${failed} step(s) failed` : '\nAll steps passed');
process.exit(failed ? 1 : 0);
