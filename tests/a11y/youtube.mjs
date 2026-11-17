// The full videos in the artwork viewer: pressing "Full video with sound" makes the player's
// frame, from youtube-nocookie.com for nos. 3, 6, 7, 16 (Siluett) and 17, and from Google
// Drive for nos. 8 and 15; nothing from YouTube or Google is asked for before the press (not
// by the page, the 3D view or opening the viewer), the address asks for no autoplay, and
// pressing the button again takes the frame away. Nothing from YouTube or Google loads: the
// players' addresses are answered by a stand-in page of this test, every other request to
// them is stopped, and all of them are counted.
// Usage: npm run build && npm run preview &   then   node tests/a11y/youtube.mjs
// With AP_SHOTS=<folder> it also saves the viewer of nos. 6 and 16 before and after the press
// (they show the artwork: keep them out of the repository).
import { readFileSync } from 'node:fs';
import { launch, BASE } from './lib.mjs';

const data = JSON.parse(readFileSync('src/data/exhibition.json', 'utf8'));
const UI = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')).ui, hu: JSON.parse(readFileSync('src/i18n/hu.json', 'utf8')).ui };
const fill = (s, vars) => String(s ?? '(no such string)').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const SHOTS = process.env.AP_SHOTS;

const browser = await launch();
let failed = 0;
const step = (name, ok, got) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got: ${got}`);
  if (!ok) failed++;
};
const third = /^https?:\/\/([^/]+\.)?(google|gstatic|googleapis|googleusercontent|ggpht|googlevideo|doubleclick|youtube|youtube-nocookie|ytimg)\.[a-z.]+(\/|$)/;
const player = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/|drive\.google\.com\/file\/)/;
const STAND_IN = '<!doctype html><title>stand-in</title><button>Play</button>';

const works = [
  ['w03-screen', 'youtube', '0bYQhJxJXGY'],
  ['w06-artificial-paradise-singapore', 'youtube', 'NiU0N4QQOrQ'],
  ['w07-artificial-paradise-eden-project', 'youtube', 'MOC4FsdfIoY'],
  ['w16-let-it-flow', 'youtube', 'XmZfvQJOORw'],
  ['w17-natural-life', 'youtube', '7dasVu6jdd8'],
  ['w08-wiena-wrong-landscape-i', 'drive', '1iwGauzuP_sOdcIbcs9J8F7Aa-qffDfqW'],
  ['w15-wiena-wrong-landscape-ii', 'drive', '1RCL-S3kwpjcpTsVgCWZxLheWWjFYPBOt'],
];

for (const lang of ['en', 'hu']) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const asked = [];
  // every request to YouTube or Google, from the first one the page makes
  await ctx.route(third, (r) => {
    asked.push(r.request().url());
    return player.test(r.request().url()) ? r.fulfill({ contentType: 'text/html', body: STAND_IN }) : r.abort();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { window.__apNoAdapt = true; });
  await page.goto(`${BASE}?lang=${lang}`);
  await page.waitForFunction(() => document.body.dataset.state === 'ready', null, { timeout: 90000 });
  await page.click('#enter');
  await page.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await page.click('[data-sound="off"]');
  await page.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  // the walk entered and every work's viewer opened once, with no full video pressed
  for (const w of data.works) {
    await page.evaluate((id) => { window.__ap.viewer.close(); window.__ap.viewer.open(window.__ap.data.works.find((k) => k.id === id)); }, w.id);
  }
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__ap.viewer.close());
  step(`${lang.toUpperCase()} 1 Before any press: no request to YouTube or Google (the walk entered, all ${data.works.length} viewer entries opened)`, asked.length === 0, asked.length ? asked.join(', ') : 'none');

  const L = UI[lang].viewer;
  for (const [id, host, vid] of works) {
    const w = data.works.find((k) => k.id === id);
    const v = w.video.full[0];
    await page.evaluate((x) => { window.__ap.viewer.close(); window.__ap.viewer.open(window.__ap.data.works.find((k) => k.id === x)); }, id);
    await page.waitForFunction((x) => !document.getElementById('viewer').hidden && document.getElementById('viewer-title').textContent === x, w.title, { timeout: 30000 });
    const before = await page.evaluate(() => ({ frames: document.querySelectorAll('#viewer iframe[src]').length, hidden: document.getElementById('viewer-frame').hidden }));
    const askedBefore = asked.filter((u) => u.includes(vid)).length;
    const btn = '#viewer-videos [data-full="0"]';
    const label = await page.textContent(btn);
    const wantLabel = fill(L[v.label], { title: v.title || w.title });
    if (SHOTS && lang === 'en' && (id === 'w06-artificial-paradise-singapore' || id === 'w16-let-it-flow')) await page.screenshot({ path: `${SHOTS}/viewer-${w.no}-before-ARTWORK.png` });
    await page.click(btn);
    await page.waitForFunction(() => !document.getElementById('viewer-frame').hidden, null, { timeout: 30000 });
    await page.frameLocator('#viewer-frame').locator('button').waitFor({ timeout: 30000 });
    if (SHOTS && lang === 'en' && (id === 'w06-artificial-paradise-singapore' || id === 'w16-let-it-flow')) await page.screenshot({ path: `${SHOTS}/viewer-${w.no}-after-ARTWORK.png` });
    const after = await page.evaluate(() => {
      const f = document.getElementById('viewer-frame');
      return { src: f.getAttribute('src'), title: f.title, frames: document.querySelectorAll('#viewer iframe[src]').length, back: document.querySelector('#viewer-videos [data-full="0"]').textContent, focus: document.activeElement?.dataset?.full ?? null };
    });
    const wantSrc = host === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${vid}?rel=0&hl=${lang}`
      : `https://drive.google.com/file/d/${vid}/preview`;
    const wantTitle = fill(host === 'youtube' ? L.frameTitleYoutube : L.frameTitle, { title: v.title || w.title });
    const wantBack = L[w.video.viewer ? 'backDoc' : w.video.loop ? 'loop' : 'photo'];
    const askedAfter = asked.filter((u) => u.includes(vid)).length;
    // pressed again: the frame goes, and with it its address
    await page.click(btn);
    const gone = await page.evaluate(() => { const f = document.getElementById('viewer-frame'); return f.hidden && !f.hasAttribute('src') && !document.querySelector('#viewer iframe[src]'); });
    const ok = before.frames === 0 && before.hidden && askedBefore === 0 && label === wantLabel
      && after.src === wantSrc && !/autoplay/.test(after.src) && after.frames === 1 && after.title === wantTitle && after.back === wantBack && after.focus === '0'
      && askedAfter > 0 && gone;
    step(`${lang.toUpperCase()} no. ${w.no} (${w.title}): "${wantLabel}" makes a ${host === 'youtube' ? 'youtube-nocookie' : 'Google Drive'} frame "${wantTitle}" only when pressed; pressed again, "${wantBack}" takes it away`,
      ok,
      `before: ${before.frames} frame(s) with an address, frame hidden ${before.hidden}, requests for ${vid} ${askedBefore}; button "${label}"; after: src ${after.src}, title "${after.title}", button "${after.back}", focus on it ${after.focus === '0'}, requests for ${vid} ${askedAfter} (answered by the stand-in); pressed again, frame gone ${gone}`);
  }
  // only requests the press asked for: the players' own addresses, nothing else
  const others = asked.filter((u) => !player.test(u));
  step(`${lang.toUpperCase()} After the presses: the only requests to YouTube or Google were the 7 players' addresses`, others.length === 0 && asked.length === works.length, `${asked.length} request(s); others: ${others.join(', ') || 'none'}`);
  const own = errors.filter((e) => !/ERR_FAILED|ERR_BLOCKED/.test(e));
  step(`${lang.toUpperCase()} No console errors`, own.length === 0, own.join(' | ') || 'none');
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
