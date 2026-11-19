// Read aloud, as it stands since 18 November 2026: it is out of the 3D version (item 16). The
// module src/ui/readAloud.js and its strings stay in the repository for the voices still to
// be decided (item 3), but nothing imports them. This run checks that the 3D version offers
// no "Read aloud" / "Felolvasás" button in a panel or in the viewer, in either language, even
// where the browser has voices, that nothing under src/ imports the module, and what the
// accessible version offers. The older run (a stand-in for speechSynthesis, thirteen steps on
// the button and the reading) is in the history of this file.
// Usage: npm run build && npm run preview &   then   node tests/a11y/read-aloud.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { launch, openWalk, BASE } from './lib.mjs';

const browser = await launch();
let failed = 0;
const errors = [];
const step = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` · ${detail}` : ''}`); if (!ok) failed++; };

// a stand-in with one voice per language, so a missing button is not for want of a voice
const voices = () => {
  const list = [{ name: 'Test English', lang: 'en-GB', localService: true }, { name: 'Test Hungarian', lang: 'hu-HU', localService: true }];
  const synth = new EventTarget();
  synth.getVoices = () => list.map((v) => ({ ...v, default: false, voiceURI: v.name }));
  synth.speak = () => {};
  synth.cancel = () => {};
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class extends EventTarget {}, configurable: true });
};
const READ = /read aloud|felolvas/i;
const readButtons = (p) => p.evaluate((src) => [...document.querySelectorAll('button, [role="button"], a')].filter((b) => new RegExp(src, 'i').test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`) || b.classList.contains('read-aloud')).map((b) => b.textContent.trim()), READ.source);

for (const lang of ['en', 'hu']) {
  const { ctx, page, errors: e } = await openWalk(browser, { lang, viewport: { width: 1280, height: 800 } });
  await page.addInitScript(voices);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.state === 'ready', null, { timeout: 90000 });
  await ctx.route(/google|gstatic|ggpht|googleusercontent|youtube|ytimg/, (r) => r.abort());
  await page.evaluate(() => document.getElementById('enter').click());
  await page.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await page.evaluate(() => document.querySelector('[data-sound="off"]').click());
  await page.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  const found = [];
  for (const panel of ['about', 'contact', 'help', 'legal']) {
    await page.evaluate((k) => window.__ap.ui.show(k), panel);
    await page.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 });
    found.push(...(await readButtons(page)).map((x) => `${panel}: ${x}`));
    await page.evaluate(() => window.__ap.ui.close());
    await page.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 30000 });
  }
  for (const i of [0, 6]) {
    await page.evaluate((k) => window.__ap.viewer.open(window.__ap.data.works[k]), i);
    await page.evaluate(() => { for (const d of document.querySelectorAll('#viewer details')) d.open = true; });
    await page.waitForTimeout(700);
    found.push(...(await readButtons(page)).map((x) => `viewer ${i}: ${x}`));
    await page.keyboard.press('Escape');
  }
  step(`RA1 ${lang.toUpperCase()}: no "Read aloud" button in any panel (About, Contact, Help, Legal notice) or in the viewer, though the browser has a voice in each language`, found.length === 0, found.join('; ') || 'none');
  errors.push(...e);
  await ctx.close();
}

const imports = [];
const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|mjs|html)$/.test(f) && !/readAloud\.js$/.test(f) && /readAloud/.test(readFileSync(p, 'utf8').replace(/readAloud\.(lang|start|stop|noVoice|noVoiceSaid|started|stopped|done)/g, ''))) imports.push(p); } };
walk('src');
if (/readAloud/.test(readFileSync('index.html', 'utf8'))) imports.push('index.html');
step('RA2 Nothing under src/ or in index.html imports or uses src/ui/readAloud.js', imports.length === 0, imports.join(', ') || 'none');

{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 820 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}text/`);
  const found = await readButtons(page);
  // what it says about read aloud, for the report: the Controls text still mentions a Read aloud button
  const says = await page.evaluate(() => [...document.querySelectorAll('p')].filter((x) => /read aloud/i.test(x.textContent)).map((x) => x.textContent.slice(0, 90)));
  step('RA3 The accessible version offers no read-aloud button of its own (the voices for its works are still to be decided, item 3)', found.length === 0, found.join('; ') || 'none');
  console.log(`NOTE  the accessible version's Controls text says: ${JSON.stringify(says)}`);
  await ctx.close();
}

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
console.log(failed ? `\n${failed} step(s) failed` : '\nAll steps passed');
process.exit(failed ? 1 : 0);
