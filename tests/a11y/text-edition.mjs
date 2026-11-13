// The text edition: structure, sameness with the data, no JavaScript needed, the language
// rule, and reading at 375 px without sideways scrolling.
// Usage: npm run build && npm run preview &   then   node tests/a11y/text-edition.mjs [folder for screenshots]
import { readFileSync } from 'node:fs';
import { launch, BASE } from './lib.mjs';

const shots = process.argv[2];
const data = JSON.parse(readFileSync('src/data/exhibition.json', 'utf8'));
const works = data.works.filter((w) => !w.id.endsWith('-screen'));
const browser = await launch();
let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` · ${detail}` : ''}`); if (!ok) failed++; };

for (const [path, lang] of [['text/', 'en'], ['text/hu/', 'hu']]) {
  for (const js of [true, false]) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, javaScriptEnabled: js, locale: 'en-GB' });
    const page = await ctx.newPage();
    const requests = [];
    page.on('request', (r) => requests.push(new URL(r.url()).pathname));
    await page.goto(BASE + path);
    const tag = `${lang}${js ? '' : ', JavaScript off'}`;
    // locator-based reads work with JavaScript off too
    const count = (sel) => page.locator(sel).count();
    const h = { h1: await count('h1'), h2rooms: await count('section[id^="room-"] > h2'), h3: await count('h3'), img: await count('img, picture, svg, video, canvas') };
    check(`[${tag}] headings: one h1, an h2 per room, an h3 per work; no images`, h.h1 === 1 && h.h2rooms === 4 && h.h3 === works.length && h.img === 0, JSON.stringify(h));
    check(`[${tag}] page language`, (await page.getAttribute('html', 'lang')) === lang);
    const body = await page.locator('body').innerText();
    const missing = works.filter((w) => !(body.includes(w.title) && body.includes(w.year) && (!w.size || body.includes(w.size)))).map((w) => w.id);
    check(`[${tag}] every work's title, year and size from exhibition.json is on the page`, missing.length === 0, missing.join(', '));
    const links = await page.locator('a[href*="work="]').evaluateAll((as) => as.map((a) => new URL(a.href).searchParams.get('work')));
    check(`[${tag}] one link into the walk per work, in visiting order`, JSON.stringify(links) === JSON.stringify(works.map((w) => w.id)), `${links.length} links`);
    check(`[${tag}] nothing else is downloaded (no script, style, font or image files)`, requests.filter((r) => !r.endsWith('/') && !r.endsWith('favicon.svg')).length === 0, requests.join(' '));
    if (js) {
      const w = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, widest: Math.max(...[...document.querySelectorAll('body *')].map((e) => e.getBoundingClientRect().right)) }));
      check(`[${tag}] 375 px wide: no sideways scroll`, w.scroll <= w.client && w.widest <= 375, JSON.stringify(w));
      if (shots) {
        await page.screenshot({ path: `${shots}/text-${lang}-375.png` });
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.screenshot({ path: `${shots}/text-${lang}-1200.png` });
        await page.locator('#room-r2').scrollIntoViewIfNeeded();
        await page.evaluate(() => document.getElementById('room-r2').scrollIntoView());
        await page.screenshot({ path: `${shots}/text-${lang}-1200-room2.png` });
      }
    }
    await ctx.close();
  }
}
// the language rule
for (const [label, opts, path, want] of [
  ['?lang=hu on text/', {}, 'text/?lang=hu', '/text/hu/'],
  ['?lang=en on text/hu/', {}, 'text/hu/?lang=en', '/text/'],
  ['text/hu/ with no ?lang= stays Hungarian', { locale: 'en-GB' }, 'text/hu/', '/text/hu/'],
  ['text/ in a Hungarian browser', { locale: 'hu-HU' }, 'text/', '/text/hu/'],
  ['text/ with the saved choice hu', { locale: 'en-GB', storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: 'ap-lang', value: 'hu' }] }] } }, 'text/', '/text/hu/'],
  ['text/ in an English browser', { locale: 'en-GB' }, 'text/', '/text/'],
]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(BASE + path).catch(() => {});
  await page.waitForTimeout(400);
  const got = new URL(page.url()).pathname;
  const keys = await page.evaluate(() => Object.keys(localStorage));
  check(`[language rule] ${label}`, got === want && keys.every((k) => k === 'ap-lang'), `→ ${got}; localStorage keys: ${JSON.stringify(keys)}`);
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
