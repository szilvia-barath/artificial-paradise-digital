// "Open No. …, in the digital exhibition", the accessible version's link to a work, followed by
// keyboard only, before and after entering the digital exhibition: where focus lands, what a
// screen reader is given for it (the accessible name, read from the browser through the DevTools
// protocol), that the title card (the loading page) is never shown on the way, and that the sound
// question, where it comes, stands over the 3D view at the work.
//   A. Before entering: the title card, the skip link, then the link to no. 6.
//   B. After entering without sound: the skip link, then the link to no. 14 (no question).
//   C. After entering with sound: the skip link, then the link to no. 3 (the question again).
// Usage: npm run build && npm run preview &   then   node tests/a11y/go-to-work.mjs [folder for screenshots]
// The screenshots show the works: their names end in -ARTWORK.
import { readFileSync } from 'node:fs';
import { launch, BASE } from './lib.mjs';

const EN = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')).ui;
const shots = process.argv[2];
const browser = await launch();
let failed = 0;
const errors = [];
const step = (name, ok, got) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got: ${got}`);
  if (!ok) failed++;
};

// Every frame the browser draws on a page opened from a link to a work, note whether the title
// card or the sound question was on screen (requestAnimationFrame runs before each paint).
const watch = () => {
  window.__apNoAdapt = true;
  if (!/[?&]work=/.test(location.search)) return;
  const seen = { loader: false, soundAsk: false, frames: 0 };
  window.__seen = seen;
  const look = () => {
    const l = document.getElementById('loader');
    if (l) {
      const cs = getComputedStyle(l);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0) seen.loader = true;
    }
    const q = document.getElementById('sound-ask');
    if (q && !q.hidden) seen.soundAsk = true;
    seen.frames++;
    requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
};

async function context() {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'en-GB' });
  await ctx.route(/google|gstatic|ggpht|googleusercontent/, (r) => r.abort());
  await ctx.addInitScript(watch);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page };
}
const until = (p, fn, arg, timeout = 90000) => p.waitForFunction(fn, arg, { timeout, polling: 100 }).catch(() => {});
// The focused element's role and accessible name, as the browser gives them to a screen reader.
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
// where the 3D view stands, against the viewing point of the work (exhibition.json via the page)
const pose = (p, id) => p.evaluate((x) => {
  const w = window.__ap.data.works.find((k) => k.id === x);
  const c = window.__ap.controls;
  return { d: Math.hypot(c.pos.x - w._focus.x, c.pos.y - w._focus.z), x: c.pos.x, z: c.pos.y, want: [w._focus.x, w._focus.z] };
}, id);
const title = (id) => JSON.parse(readFileSync('src/data/exhibition.json', 'utf8')).works.find((w) => w.id === id).title;

// The exhibition entered by keyboard: Enter on the title card, then the sound question answered.
async function enterByKeys(p, sound) {
  await p.goto(`${BASE}?lang=en`);
  await until(p, () => document.body.dataset.state === 'ready' && document.activeElement === document.getElementById('enter'));
  await p.keyboard.press('Enter');
  await until(p, () => { const d = document.getElementById('sound-ask'); return !d.hidden && d.contains(document.activeElement); }, null, 30000);
  if (sound) await p.keyboard.press('Tab'); // to "With sound"
  await p.keyboard.press('Enter');
  await until(p, () => document.getElementById('sound-ask').hidden && document.activeElement === document.getElementById('scene'), null, 30000);
}
// From the exhibition (title card or inside) to the accessible version by its skip link, then
// to the link to the work, all by keys. Returns what the accessible version's address was.
async function viaAccessibleVersion(p, id, tag, key) {
  const back = await tabTo(p, '.skip-link', key, 40);
  await Promise.all([p.waitForURL(/\/text\//), p.keyboard.press('Enter')]);
  await p.waitForLoadState('load');
  const textURL = p.url().replace(BASE, '/');
  // the engine is fetched in the background while this page is open
  await until(p, () => document.querySelectorAll('link[rel="prefetch"]').length > 0, null, 10000);
  const prefetch = await p.locator('link[rel="prefetch"]').count();
  const tabs = await tabTo(p, `a[href*="work=${id}"]`);
  const link = await ax(p);
  if (shots) await p.screenshot({ path: `${shots}/goto-${tag}-1-link.png` });
  await Promise.all([p.waitForURL((u) => u.searchParams.get('work') === id), p.keyboard.press('Enter')]);
  return { back, textURL, prefetch, tabs, link };
}

// ---------------- A. before entering
{
  const id = 'w06-artificial-paradise-singapore';
  const { ctx, page: p } = await context();
  await p.goto(`${BASE}?lang=en`);
  await until(p, () => !!document.getElementById('enter'), null, 30000);
  const v = await viaAccessibleVersion(p, id, 'A', 'Tab');
  step(`A.1 Before entering: from the title card Tab reaches the skip link, which leads to the accessible version, which fetches the engine in the background; Tab reaches the link to no. 6 and Enter follows it`, v.back > 0 && /\/text\/\?|\/text\/$/.test(v.textURL) && v.prefetch === 5 && v.tabs > 0 && v.link.name === `Open No. 6, ${title(id)}, in the digital exhibition`, `${v.back} Tab to the skip link; ${v.textURL}; ${v.prefetch} files prefetched; ${v.tabs} Tabs to "${v.link.name}" (${v.link.role}); now at ${p.url().replace(BASE, '/')}`);
  await until(p, () => { const d = document.getElementById('sound-ask'); return d && !d.hidden && d.contains(document.activeElement); });
  const q = await ax(p, '#sound-ask');
  const f = await ax(p);
  const at = await pose(p, id);
  const over = await p.evaluate(() => ({ loaderGone: document.getElementById('loader').classList.contains('gone'), canvasHidden: document.getElementById('scene').getAttribute('aria-hidden'), viewer: !document.getElementById('viewer').hidden }));
  if (shots) await p.screenshot({ path: `${shots}/goto-A-2-question-over-work-ARTWORK.png` });
  step('A.2 The sound question opens at once over the 3D view standing at no. 6, focus on "Without sound" in it (named "Start with sound?")', q.role === 'dialog' && q.name === EN.soundAsk.question && f.name === EN.soundAsk.off && f.role === 'button' && at.d < 0.05 && over.loaderGone && over.canvasHidden === null && !over.viewer, `question: ${q.role} "${q.name}"; focus: ${f.role} "${f.name}"; 3D view ${at.d.toFixed(3)} m from the work's viewing point; title card gone: ${over.loaderGone}; viewer open: ${over.viewer}`);
  await p.keyboard.press('Enter');
  await until(p, () => !document.getElementById('viewer').hidden && document.getElementById('viewer').contains(document.activeElement), null, 30000);
  const d = await ax(p, '#viewer');
  const g = await ax(p);
  if (shots) await p.screenshot({ path: `${shots}/goto-A-3-viewer-ARTWORK.png` });
  step('A.3 Enter ("Without sound"): no. 6 opens in the viewer, a dialog named by its title, focus on its Close button', d.role === 'dialog' && d.name === title(id) && g.role === 'button' && g.name === EN.viewer.close, `viewer: ${d.role} "${d.name}"; focus: ${g.role} "${g.name}"`);
  await p.keyboard.press('Escape');
  await until(p, () => document.getElementById('viewer').hidden && document.activeElement === document.getElementById('scene'), null, 30000);
  const s = await ax(p);
  const at2 = await pose(p, id);
  const seen = await p.evaluate(() => window.__seen);
  step('A.4 Esc: focus on the 3D view, still at no. 6, named as the 3D view; the title card was never on screen', s.role === 'application' && s.name === EN.sceneLabel && at2.d < 0.05 && !seen.loader && seen.frames > 0, `focus: ${s.role} "${s.name.slice(0, 40)}…"; ${at2.d.toFixed(3)} m from the work; title card seen in ${seen.frames} frames: ${seen.loader}`);
  await ctx.close();
}

// ---------------- B. after entering, without sound
{
  const id = 'w14-warsaw-g24-ii';
  const { ctx, page: p } = await context();
  await enterByKeys(p, false);
  const v = await viaAccessibleVersion(p, id, 'B', 'Shift+Tab');
  step('B.1 Inside, without sound: Shift+Tab reaches the skip link, the accessible version opens with ?sound=off, and its link to no. 14 hands it on', v.back > 0 && v.textURL.includes('sound=off') && p.url().includes('sound=off') && v.link.name === `Open No. 14, ${title(id)}, in the digital exhibition`, `${v.back} Shift+Tab; ${v.textURL}; "${v.link.name}"; now at ${p.url().replace(BASE, '/')}`);
  await until(p, () => !document.getElementById('viewer').hidden && document.getElementById('viewer').contains(document.activeElement));
  const d = await ax(p, '#viewer');
  const g = await ax(p);
  const at = await pose(p, id);
  if (shots) await p.screenshot({ path: `${shots}/goto-B-2-viewer-ARTWORK.png` });
  const seen = await p.evaluate(() => window.__seen);
  step('B.2 Straight to no. 14: no sound question, no title card; it opens in the viewer named by its title, focus on Close, the 3D view at the work behind it', d.role === 'dialog' && d.name === title(id) && g.name === EN.viewer.close && at.d < 0.05 && !seen.loader && !seen.soundAsk, `viewer: ${d.role} "${d.name}"; focus: ${g.role} "${g.name}"; ${at.d.toFixed(3)} m from the work; title card seen: ${seen.loader}, sound question seen: ${seen.soundAsk} (${seen.frames} frames)`);
  await p.keyboard.press('Escape');
  await until(p, () => document.getElementById('viewer').hidden && document.activeElement === document.getElementById('scene'), null, 30000);
  const s = await ax(p);
  const muted = await p.evaluate(() => document.querySelector('[data-action="sound"]').getAttribute('aria-pressed'));
  step('B.3 Esc: focus on the 3D view at no. 14, named as the 3D view; the sound stays off (Sound not pressed)', s.role === 'application' && s.name === EN.sceneLabel && muted === 'false', `focus: ${s.role} "${(s.name || '').slice(0, 40)}…"; Sound pressed: ${muted}`);
  await ctx.close();
}

// ---------------- C. after entering, with sound
{
  const id = 'w03-paradise-factory';
  const { ctx, page: p } = await context();
  await enterByKeys(p, true);
  const v = await viaAccessibleVersion(p, id, 'C', 'Shift+Tab');
  step('C.1 Inside, with sound: the accessible version opens without ?sound=off, and Enter follows its link to no. 3', v.back > 0 && !v.textURL.includes('sound=') && !p.url().includes('sound=') && v.link.name === `Open No. 3, ${title(id)}, in the digital exhibition`, `${v.back} Shift+Tab; ${v.textURL}; "${v.link.name}"; now at ${p.url().replace(BASE, '/')}`);
  await until(p, () => { const d = document.getElementById('sound-ask'); return d && !d.hidden && d.contains(document.activeElement); });
  const f = await ax(p);
  const at = await pose(p, id);
  if (shots) await p.screenshot({ path: `${shots}/goto-C-2-question-over-work-ARTWORK.png` });
  step('C.2 The sound question comes again (a browser starts sound only after a key or click on the page), over the 3D view at no. 3, focus in it', f.name === EN.soundAsk.off && at.d < 0.05, `focus: ${f.role} "${f.name}"; ${at.d.toFixed(3)} m from the work`);
  await p.keyboard.press('Tab');
  await p.keyboard.press('Enter');
  await until(p, () => !document.getElementById('viewer').hidden && document.getElementById('viewer').contains(document.activeElement), null, 30000);
  await until(p, () => window.__ap.audio.ctx?.state === 'running', null, 10000);
  const d = await ax(p, '#viewer');
  const st = await p.evaluate(() => ({ pressed: document.querySelector('[data-action="sound"]').getAttribute('aria-pressed'), ctx: window.__ap.audio.ctx?.state }));
  const seen = await p.evaluate(() => window.__seen);
  step('C.3 "With sound" by keyboard: the sound is on and running, no. 3 opens in the viewer named by its title; the title card was never on screen', d.name === title(id) && st.pressed === 'true' && st.ctx === 'running' && !seen.loader, `viewer: ${d.role} "${d.name}"; Sound pressed: ${st.pressed}, audio ${st.ctx}; title card seen: ${seen.loader} (${seen.frames} frames)`);
  await ctx.close();
}

await browser.close();
const real = errors.filter((e) => !/google|gstatic|net::ERR_FAILED/i.test(e));
step('No console errors', real.length === 0, real.join(' | ') || 'none');
console.log(failed ? `\n${failed} step(s) failed` : '\nAll steps passed');
process.exit(failed ? 1 : 0);
