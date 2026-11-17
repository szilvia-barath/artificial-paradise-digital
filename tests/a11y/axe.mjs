// axe-core on the text edition (both languages, light and dark) and on the walk in each of
// its states: title screen, every panel, the sound question, the HUD (with the first-use card), the rooms menu, the
// artwork viewer, and the viewer with the full video's frame (YouTube and Google blocked, so
// nothing from them loads). Fails on any serious or critical violation; lists every other one.
// Writes its results to the system's temporary folder. With --write it writes them to
// docs/accessibility/axe-results.md instead, the log the statement quotes: the counts of
// "incomplete" items vary a little from run to run, so a plain run leaves the tracked log alone.
// Usage: npm run build && npm run preview &   then   node tests/a11y/axe.mjs [--write]
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { launch, openWalk, BASE } from './lib.mjs';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const browser = await launch();
const results = [];

async function scan(page, state) {
  // let fades finish first: on a slow machine a panel can still be fading in after 450 ms,
  // and axe would measure its text at part opacity
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity), null, { timeout: 15000 }).catch(() => {});
  await page.addScriptTag({ path: axePath });
  const r = await page.evaluate(async () => {
    const out = await window.axe.run(document, { resultTypes: ['violations', 'incomplete'] });
    const slim = (list) => list.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) }));
    return { violations: slim(out.violations), incomplete: slim(out.incomplete), passes: out.passes.length, version: window.axe.version };
  });
  results.push({ state, ...r });
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${state}: ${r.violations.length} violations (${bad.length} serious or critical), ${r.incomplete.length} to check by hand, ${r.passes} rules passed`);
  for (const v of r.violations) console.log(`       ${v.impact}: ${v.id} (${v.nodes}) ${v.help} · ${v.targets.join(' | ')}`);
}

// ---------------- text edition
for (const [path, name] of [['text/', 'Text edition, English'], ['text/hu/', 'Text edition, Hungarian']]) {
  for (const colorScheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme });
    const page = await ctx.newPage();
    await page.goto(BASE + path);
    await scan(page, `${name} (${colorScheme})`);
    await ctx.close();
  }
}

// ---------------- the walk
const PANELS = ['about', 'works', 'bts', 'help', 'contact', 'accessibility', 'legal', 'privacy'];
for (const lang of ['en', 'hu']) {
  const { page, ctx, errors } = await openWalk(browser, { lang });
  // Nothing from Google or YouTube loads in this run: the full-video state below opens the
  // YouTube player's frame with its requests blocked, so only the page's own frame is checked.
  const google = /^https?:\/\/([^/]+\.)?(google|gstatic|googleapis|googleusercontent|ggpht|youtube|youtube-nocookie|ytimg)\.[a-z.]+(\/|$)/;
  const blocked = [];
  await page.route(google, (r) => { blocked.push(r.request().url()); return r.abort(); });
  const L = lang.toUpperCase();
  await scan(page, `Walk ${L}: title screen`);
  for (const name of PANELS) {
    const has = await page.evaluate((n) => { try { window.__ap.ui.show(n); return true; } catch { return false; } }, name);
    if (!has) { console.log(`     (no panel "${name}")`); continue; }
    await page.evaluate(() => { for (const d of document.querySelectorAll('#panel details')) d.open = true; });
    await page.waitForTimeout(450);
    await scan(page, `Walk ${L}: panel "${name}" open (title screen)`);
    await page.keyboard.press('Escape');
  }
  await page.focus('#enter');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await scan(page, `Walk ${L}: sound question`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await scan(page, `Walk ${L}: inside, HUD`);
  await page.evaluate(() => window.__ap.ui.show('about'));
  await page.waitForTimeout(450);
  await scan(page, `Walk ${L}: panel "about" open (inside)`);
  await page.keyboard.press('Escape');
  await page.click('[data-action="rooms"]');
  await scan(page, `Walk ${L}: rooms menu open`);
  await page.keyboard.press('Escape');
  for (const [i, kind] of [[0, 'painting'], [6, 'video, with Pause button'], [3, 'video on a small screen']]) {
    await page.evaluate((k) => window.__ap.viewer.open(window.__ap.data.works[k]), i);
    await page.evaluate(() => { for (const d of document.querySelectorAll('#viewer details')) d.open = true; });
    await page.waitForTimeout(900);
    await scan(page, `Walk ${L}: viewer open (${kind})`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  // the full video: "Full video with sound" pressed on no. 6, the YouTube player's frame shown
  await page.evaluate(() => window.__ap.viewer.open(window.__ap.data.works.find((w) => w.id === 'w06-artificial-paradise-singapore')));
  const asked = page.waitForRequest(google, { timeout: 30000 }).catch(() => null);
  await page.click('#viewer-videos [data-full="0"]');
  await page.waitForFunction(() => !document.getElementById('viewer-frame').hidden, null, { timeout: 30000 });
  await asked;
  await scan(page, `Walk ${L}: viewer open (full video, the YouTube player blocked: ${blocked.length} request${blocked.length === 1 ? '' : 's'} stopped)`);
  await page.keyboard.press('Escape');
  // the frame's request to YouTube, blocked, is the only console error expected here
  const own = errors.filter((e) => !/ERR_FAILED|ERR_BLOCKED/.test(e));
  if (own.length) console.log('console errors:', own);
  await ctx.close();
}
await browser.close();

const bad = results.flatMap((r) => r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ state: r.state, ...v })));
const other = results.flatMap((r) => r.violations.filter((v) => v.impact !== 'serious' && v.impact !== 'critical').map((v) => ({ state: r.state, ...v })));
const byRule = (list) => {
  const m = new Map();
  for (const v of list) {
    const k = `${v.impact ?? 'n/a'} · ${v.id}: ${v.help}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(`${v.state} (${v.nodes}: ${v.targets.join(', ')})`);
  }
  return [...m].map(([k, states]) => `- **${k}**\n${states.map((s) => `  - ${s}`).join('\n')}`).join('\n') || '- none';
};
const incomplete = byRule(results.flatMap((r) => r.incomplete.map((v) => ({ state: r.state, ...v }))));
const out = process.argv.includes('--write') ? 'docs/accessibility/axe-results.md' : join(tmpdir(), 'ap-axe-results.md');
if (out.startsWith('docs/')) mkdirSync('docs/accessibility', { recursive: true });
writeFileSync(out, `# axe-core results

Written by \`tests/a11y/axe.mjs\` on ${new Date().toISOString().slice(0, 10)}: axe-core ${results[0].version}, default rule set, Chromium (Playwright, headless), ${results.length} states scanned.

## States scanned

${results.map((r) => `- ${r.state}: ${r.violations.length} violations, ${r.incomplete.length} items axe could not decide, ${r.passes} rules passed`).join('\n')}

## Serious or critical violations

${byRule(bad)}

## Every other violation (moderate, minor)

${byRule(other)}

## Items axe could not decide by itself ("incomplete")

These are not failures. axe reports them when it cannot measure something, mostly the contrast of text that lies over the 3D view or a picture.

${incomplete}
`);
console.log(`\n${results.length} states; ${bad.length} serious or critical; ${other.length} other; results in ${out}`);
process.exit(bad.length ? 1 : 0);
