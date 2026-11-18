// Read aloud (Part 6, 6.1) and the places for the descriptions to come (6.4).
// Headless Chromium has no voices, so speechSynthesis and SpeechSynthesisUtterance are stood
// in for by an init script: it lists the voices a test asks for, keeps what is spoken and
// cancelled in window.__speech, and window.__finishSpeech() ends the reading as a voice would.
// The descriptions are filled with test words only here, in the page's memory and in the
// text edition built in this process: nothing is written to the data files.
// Usage: npm run build && npm run preview &   then   node tests/a11y/read-aloud.mjs
import { readFileSync } from 'node:fs';
import { launch, BASE } from './lib.mjs';
import { buildTextEdition } from '../../scripts/text-edition.mjs';

const UI = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')).ui, hu: JSON.parse(readFileSync('src/i18n/hu.json', 'utf8')).ui };
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const browser = await launch();
let failed = 0;
const errors = [];
const step = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` · ${detail}` : ''}`); if (!ok) failed++; };

const LOCAL_EN = { name: 'Test English (on the device)', lang: 'en-GB', localService: true };
const LOCAL_HU = { name: 'Test Hungarian (on the device)', lang: 'hu-HU', localService: true };
const CLOUD_HU = { name: 'Test Hungarian (online)', lang: 'hu-HU', localService: false };

// The stand-in. voices: the list getVoices() gives; null: no speech synthesis at all.
function speechStub(voices) {
  window.__speech = [];
  if (voices === null) {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: undefined, configurable: true });
    return;
  }
  class Utterance extends EventTarget {
    constructor(text) { super(); this.text = text; this.lang = ''; this.voice = null; }
  }
  let queue = [];
  const synth = new EventTarget();
  synth.getVoices = () => voices.map((v) => ({ ...v, default: false, voiceURI: v.name }));
  synth.speak = (u) => { window.__speech.push({ type: 'speak', text: u.text, lang: u.lang, voice: u.voice && u.voice.name }); queue.push(u); };
  synth.cancel = () => {
    window.__speech.push({ type: 'cancel' });
    const q = queue;
    queue = [];
    for (const u of q) { const e = new Event('error'); e.error = 'canceled'; u.dispatchEvent(e); }
  };
  synth.pause = () => {};
  synth.resume = () => {};
  Object.defineProperty(synth, 'speaking', { get: () => queue.length > 0 });
  window.__finishSpeech = () => { const q = queue; queue = []; for (const u of q) u.dispatchEvent(new Event('end')); };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
}

// The walk, entered without sound, with the stand-in in place before the page's scripts run
// (as openWalk in lib.mjs, plus the init script) and what the live region says in window.__said.
async function inside(lang, voices) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route(/google|gstatic|ggpht|googleusercontent/, (r) => r.abort());
  const p = await ctx.newPage();
  const w = { ctx, page: p, errors: [] };
  p.on('console', (m) => { if (m.type() === 'error') w.errors.push(m.text()); });
  p.on('pageerror', (e) => w.errors.push(String(e)));
  await p.addInitScript(speechStub, voices);
  await p.addInitScript(() => { window.__apNoAdapt = true; });
  await p.goto(`${BASE}?lang=${lang}`);
  await p.waitForFunction(() => document.body.dataset.state === 'ready', null, { timeout: 90000 });
  await p.evaluate(() => {
    window.__said = [];
    const el = document.getElementById('announcer');
    new MutationObserver(() => window.__said.push(el.textContent.trim())).observe(el, { childList: true, characterData: true, subtree: true });
  });
  await p.click('#enter');
  await p.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.click('[data-sound="off"]');
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  return w;
}
const btn = (p, where) => p.evaluate((sel) => {
  const b = document.querySelector(`${sel} .read-aloud`);
  return b && { tag: b.tagName, type: b.type, text: b.textContent, pressed: b.getAttribute('aria-pressed'), disabled: b.getAttribute('aria-disabled'), focused: document.activeElement === b };
}, where);
const speech = (p) => p.evaluate(() => window.__speech.splice(0));
const heard = async (p, s, timeout = 5000) => {
  await p.waitForFunction((x) => window.__said.join(' | ').includes(x), s, { timeout, polling: 100 }).catch(() => {});
  return p.evaluate(() => window.__said.splice(0).join(' | '));
};
const openPanel = async (p, name) => {
  await p.click(`#site-nav [data-nav="${name}"]`);
  await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 });
};
const openWork = async (p, id) => {
  await p.evaluate((x) => { window.__ap.viewer.close(); window.__ap.viewer.open(window.__ap.data.works.find((k) => k.id === x)); }, id);
  await p.waitForFunction((x) => !document.getElementById('viewer').hidden && document.getElementById('viewer-title').textContent === window.__ap.data.works.find((k) => k.id === x).title, id, { timeout: 30000 });
};
const lastSpeakVoice = (log) => [...log].reverse().find((e) => e.type === 'speak');

// ---------------- RA1 to RA6: the button in a panel, by keyboard
{
  const w = await inside('en', [LOCAL_EN, LOCAL_HU, CLOUD_HU]);
  const p = w.page;
  await openPanel(p, 'about');
  await p.keyboard.press('Tab');
  const b0 = await btn(p, '#panel');
  step('RA1 A panel has a real button "Read aloud", aria-pressed="false", next after Close in the Tab order', b0 && b0.tag === 'BUTTON' && b0.type === 'button' && b0.text === UI.en.readAloud.start && b0.pressed === 'false' && b0.focused, JSON.stringify(b0));

  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('#panel .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  const b1 = await btn(p, '#panel');
  const s1 = await speech(p);
  const spoken = s1.filter((e) => e.type === 'speak');
  const title = await p.textContent('#panel-title');
  const said1 = await heard(p, UI.en.readAloud.started);
  step('RA2 Enter starts it: aria-pressed="true", the label says "Stop reading", the panel text is spoken with the English voice on the device, focus stays on the button, the live region says so',
    b1.pressed === 'true' && b1.text === UI.en.readAloud.stop && b1.focused && spoken.length > 1 && spoken.some((e) => e.text.includes(title)) && spoken.every((e) => e.voice === LOCAL_EN.name && e.lang === 'en-GB') && said1.includes(UI.en.readAloud.started),
    `${spoken.length} parts, first "${spoken[0]?.text.slice(0, 60)}"; ${JSON.stringify(b1)}; said "${said1}"`);

  await p.keyboard.press('Space');
  await p.waitForFunction(() => document.querySelector('#panel .read-aloud').getAttribute('aria-pressed') === 'false', null, { timeout: 5000 }).catch(() => {});
  const b2 = await btn(p, '#panel');
  const s2 = await speech(p);
  const said2 = await heard(p, UI.en.readAloud.stopped);
  step('RA3 Space stops it: cancelled, aria-pressed="false", "Read aloud" again, focus stays, the live region says it stopped', b2.pressed === 'false' && b2.text === UI.en.readAloud.start && b2.focused && s2.some((e) => e.type === 'cancel') && said2.includes(UI.en.readAloud.stopped), `${JSON.stringify(s2)}; said "${said2}"`);

  // reading to the end
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('#panel .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  await p.evaluate(() => window.__finishSpeech());
  const b3 = await btn(p, '#panel');
  const said3 = await heard(p, UI.en.readAloud.done);
  step('RA4 At the end of the text it goes back to "Read aloud", aria-pressed="false", and the live region says it finished', b3.pressed === 'false' && b3.text === UI.en.readAloud.start && said3.includes(UI.en.readAloud.done), `${JSON.stringify(b3)}; said "${said3}"`);
  await speech(p);

  // closing the panel stops it
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('#panel .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  await speech(p);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 5000 }).catch(() => {});
  const s4 = await speech(p);
  const b4 = await btn(p, '#panel');
  step('RA5 Esc closes the panel and the reading stops (cancelled, aria-pressed="false")', s4.some((e) => e.type === 'cancel') && b4.pressed === 'false', JSON.stringify(s4));

  // another text: from Contact to Legal notice through the link inside the panel
  await openPanel(p, 'contact');
  await p.click('#panel .read-aloud');
  await p.waitForFunction(() => document.querySelector('#panel .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  await speech(p);
  await p.click('#panel-body [data-nav="legal"]');
  await p.waitForFunction(() => document.getElementById('panel-title').textContent !== '', null, { timeout: 5000 }).catch(() => {});
  const s5 = await speech(p);
  const b5 = await btn(p, '#panel');
  step('RA6 Another text replaces it (Contact to Legal notice in the same panel): the reading stops', s5.some((e) => e.type === 'cancel') && b5.pressed === 'false' && !s5.some((e) => e.type === 'speak'), JSON.stringify(s5));
  await p.evaluate(() => window.__ap.ui.close());

  // ---------------- RA7 to RA9: the viewer
  await openWork(p, 'w01-dresden');
  const v0 = await btn(p, '#viewer');
  const order = await p.evaluate(() => { const b = document.querySelector('#viewer .read-aloud'); return b && b.previousElementSibling?.id; });
  await p.click('#viewer .read-aloud');
  await p.waitForFunction(() => document.querySelector('#viewer .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  const sv = (await speech(p)).filter((e) => e.type === 'speak').map((e) => e.text).join(' ');
  const wk = await p.evaluate(() => { const w = window.__ap.data.works.find((k) => k.id === 'w01-dresden'); return { title: w.title, medium: w.medium, desc: document.querySelector('#viewer-desc p')?.textContent || '' }; });
  step('RA7 The viewer has the button under the title; it reads the title, the details and the artist\'s text, not the buttons',
    v0 && v0.text === UI.en.readAloud.start && order === 'viewer-title' && sv.includes(wk.title) && sv.includes(wk.medium) && sv.includes(wk.desc.slice(0, 40)) && !sv.includes(UI.en.viewer.goto) && !sv.includes(UI.en.readAloud.start),
    `"${sv.slice(0, 120)}…" (${sv.length} characters)`);
  await p.click('#viewer-next');
  await p.waitForFunction(() => document.querySelector('#viewer .read-aloud').getAttribute('aria-pressed') === 'false', null, { timeout: 5000 }).catch(() => {});
  const s8 = await speech(p);
  step('RA8 Next work: the reading of the old one stops', s8.some((e) => e.type === 'cancel') && !s8.some((e) => e.type === 'speak'), JSON.stringify(s8));

  await p.click('#viewer .read-aloud');
  await p.waitForFunction(() => document.querySelector('#viewer .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  await speech(p);
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  const s9 = await speech(p);
  const b9 = await btn(p, '#viewer');
  await p.click('#viewer .read-aloud');
  await p.waitForFunction(() => document.querySelector('#viewer .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  const s9b = await speech(p);
  const hv = lastSpeakVoice(s9b);
  step('RA9 The language switched while it reads: it stops, the label is "Felolvasás"; started again it reads with the Hungarian voice on the device (not the online one)',
    s9.some((e) => e.type === 'cancel') && b9.pressed === 'false' && b9.text === UI.hu.readAloud.start && hv && hv.voice === LOCAL_HU.name && hv.lang === 'hu-HU',
    `${JSON.stringify(b9)}; voice ${hv && hv.voice}`);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 5000 }).catch(() => {});
  const s10 = await speech(p);
  step('RA10 Esc closes the viewer and the reading stops', s10.some((e) => e.type === 'cancel'), JSON.stringify(s10));
  const store = await p.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage), cookies: document.cookie }));
  step('RA11 Nothing is stored but the language (no setting for reading aloud)', store.local.every((k) => k === 'ap-lang') && !store.session.length && !store.cookies, JSON.stringify(store));
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- RA12: no Hungarian voice on the device (only an online one)
{
  const w = await inside('hu', [LOCAL_EN, CLOUD_HU]);
  const p = w.page;
  await openPanel(p, 'about');
  const b = await btn(p, '#panel');
  // aria-disabled: Playwright's click() waits for an enabled control, so it is pressed by keyboard
  await p.focus('#panel .read-aloud');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  const s = await speech(p);
  const want = fill(UI.hu.readAloud.noVoiceSaid, { language: UI.hu.readAloud.lang.hu });
  const said = await heard(p, want);
  step('RA12 No Hungarian voice on the device (only an online one): the button says so, aria-disabled="true", nothing is spoken in another voice, and pressing it says why',
    b.text === fill(UI.hu.readAloud.noVoice, { language: UI.hu.readAloud.lang.hu }) && b.disabled === 'true' && b.pressed === 'false' && !s.some((e) => e.type === 'speak') && said.includes(want),
    `"${b.text}"; ${JSON.stringify(s)}; said "${said}"`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- RA13: no speech synthesis in the browser
{
  const w = await inside('en', null);
  const p = w.page;
  await openPanel(p, 'about');
  const inPanel = await p.locator('.read-aloud').count();
  await p.evaluate(() => window.__ap.ui.close());
  await openWork(p, 'w05-human-as-error-i');
  const inViewer = await p.locator('.read-aloud').count();
  step('RA13 A browser without speech synthesis shows no Read aloud button (panel, viewer)', inPanel === 0 && inViewer === 0, `panel ${inPanel}, viewer ${inViewer}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- DS1 to DS3: the places for the descriptions, empty and filled
const HEAD = (l) => [UI[l].describe.visual, UI[l].describe.video, UI[l].describe.videoDoc, UI[l].describe.space];
{
  const w = await inside('en', [LOCAL_EN, LOCAL_HU]);
  const p = w.page;
  const ids = await p.evaluate(() => window.__ap.data.works.map((k) => k.id));
  const shownAny = [];
  for (const id of ids) {
    await openWork(p, id);
    const r = await p.evaluate(() => ['viewer-describe', 'viewer-space'].map((x) => { const e = document.getElementById(x); return { hidden: e.hidden, html: e.innerHTML, h: e.offsetHeight }; }));
    if (r.some((x) => !x.hidden || x.html || x.h)) shownAny.push(id);
  }
  const heads = await p.evaluate((h) => [...document.querySelectorAll('#viewer h3')].map((e) => e.textContent).filter((t) => h.includes(t)), HEAD('en'));
  step('DS1 Every field empty: in the viewer nothing shows for any of the 17 works and no. 3\'s screen (no heading, no box)', shownAny.length === 0 && heads.length === 0, shownAny.join(', ') || `${ids.length} entries`);

  // test words, in the page's memory only
  const T = {
    en: { visual: 'TEST visual description of Dresden.', room: ['TEST audio description of Room 1, first paragraph.', 'TEST second paragraph.'], video: 'TEST video description of Singapore.', doc: 'TEST description of the Let it Flow documentation.' },
    hu: { visual: 'TESZT: Drezda leírása.', room: ['TESZT: az 1. terem audionarrációja.'] },
  };
  const put = (t) => p.evaluate((x) => {
    const a = window.__ap.data.accessDescriptions;
    a.visual['w01-dresden'] = x.visual;
    a.space.r1 = x.room;
    if (x.video) a.videoText['w06-artificial-paradise-singapore'] = x.video;
    if (x.doc) a.videoDocText['w16-let-it-flow'] = x.doc;
  }, t);
  await put(T.en);
  const view = () => p.evaluate(() => ({
    describe: [...document.querySelectorAll('#viewer-describe h3, #viewer-describe p')].map((e) => `${e.tagName}:${e.textContent}`),
    space: [...document.querySelectorAll('#viewer-space h3, #viewer-space p')].map((e) => `${e.tagName}:${e.textContent}`),
    shown: ['viewer-describe', 'viewer-space'].map((x) => !document.getElementById(x).hidden),
  }));
  await openWork(p, 'w01-dresden');
  const v1 = await view();
  await p.click('#viewer .read-aloud');
  await p.waitForFunction(() => document.querySelector('#viewer .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  const sp = (await speech(p)).filter((e) => e.type === 'speak').map((e) => e.text);
  await openWork(p, 'w06-artificial-paradise-singapore');
  const v6 = await view();
  await openWork(p, 'w16-let-it-flow');
  const v16 = await view();
  const ok1 = JSON.stringify(v1.describe) === JSON.stringify([`H3:${UI.en.describe.visual}`, `P:${T.en.visual}`])
    && JSON.stringify(v1.space) === JSON.stringify([`H3:${UI.en.describe.space}`, `P:${T.en.room[0]}`, `P:${T.en.room[1]}`]) && v1.shown.every(Boolean);
  const ok6 = JSON.stringify(v6.describe) === JSON.stringify([`H3:${UI.en.describe.video}`, `P:${T.en.video}`]) && v6.space.length === 0 && v6.shown[1] === false;
  const ok16 = JSON.stringify(v16.describe) === JSON.stringify([`H3:${UI.en.describe.videoDoc}`, `P:${T.en.doc}`]);
  step('DS2 Filled (test words in memory): the viewer shows each under its heading, the room\'s in Room 1 only, the video\'s at no. 6, the documentation\'s at no. 16', ok1 && ok6 && ok16, JSON.stringify({ v1, v6, v16 }));
  step('DS3 Read aloud reads the filled description and the room\'s audio description, in the order they show', sp.includes(T.en.visual) && sp.includes(T.en.room[0]) && sp.includes(T.en.room[1]) && sp.indexOf(T.en.visual) < sp.indexOf(T.en.room[0]), sp.map((s) => s.slice(0, 40)).join(' / '));

  // Hungarian: its own fields (the English test words do not show there)
  await p.evaluate(() => window.__ap.viewer.close());
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  await openWork(p, 'w01-dresden');
  const h0 = await view();
  await put(T.hu);
  await openWork(p, 'w01-dresden');
  const h1 = await view();
  await p.click('#viewer .read-aloud');
  await p.waitForFunction(() => document.querySelector('#viewer .read-aloud').getAttribute('aria-pressed') === 'true', null, { timeout: 5000 }).catch(() => {});
  const sph = (await speech(p)).filter((e) => e.type === 'speak');
  step('DS4 Hungarian page: an empty Hungarian field shows nothing (the English words are not taken); filled, it shows under "Leírás" and "A terem audionarrációja" and is read with the Hungarian voice',
    h0.describe.length === 0 && h0.space.length === 0 && JSON.stringify(h1.describe) === JSON.stringify([`H3:${UI.hu.describe.visual}`, `P:${T.hu.visual}`]) && JSON.stringify(h1.space) === JSON.stringify([`H3:${UI.hu.describe.space}`, `P:${T.hu.room[0]}`]) && sph.some((e) => e.text === T.hu.visual && e.voice === LOCAL_HU.name),
    JSON.stringify({ h0, h1 }));
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- DS5, DS6: the accessible version, built here from the data as it is and with test words
{
  const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
  const src = () => ({ data: read('src/data/exhibition.json'), en: read('src/i18n/en.json'), hu: read('src/i18n/hu.json') });
  const asIs = buildTextEdition(src());
  const none = asIs.every(({ html }, i) => HEAD(i ? 'hu' : 'en').every((h) => !html.includes(`>${h}</h`)));
  step('DS5 Accessible version, every field empty: none of the four headings is on either page', none);

  const s = src();
  s.en.accessDescriptions.visual['w01-dresden'] = 'TEST visual.';
  s.en.accessDescriptions.videoText['w03-screen'] = 'TEST screen video.';
  s.en.accessDescriptions.videoDocText['w16-let-it-flow'] = ['TEST doc one.', 'TEST doc two.'];
  s.en.accessDescriptions.space.r2 = 'TEST Room 2.';
  s.hu.accessDescriptions.space.r2 = 'TESZT: 2. terem.';
  const [en, hu] = buildTextEdition(s).map((x) => x.html);
  const article = (html, id) => html.slice(html.indexOf(`<article id="${id}">`), html.indexOf('</article>', html.indexOf(`<article id="${id}">`)));
  const room = (html, id) => html.slice(html.indexOf(`<section id="room-${id}"`), html.indexOf('<article', html.indexOf(`<section id="room-${id}"`)));
  const D = UI.en.describe;
  const checks = {
    visual: article(en, 'w01-dresden').includes(`<h4>${D.visual}</h4>\n<p>TEST visual.</p>`),
    screenVideoUnderNo3: article(en, 'w03-paradise-factory').includes(`<h4>${D.video}</h4>\n<p>TEST screen video.</p>`),
    docTwoParagraphs: article(en, 'w16-let-it-flow').includes(`<h4>${D.videoDoc}</h4>\n<p>TEST doc one.</p>\n<p>TEST doc two.</p>`),
    roomBeforeWorks: room(en, 'r2').includes(`<h3>${D.space}</h3>\n<p>TEST Room 2.</p>`),
    otherRoomsEmpty: !room(en, 'r1').includes(D.space) && !room(en, 'r3').includes(D.space),
    huOwn: room(hu, 'r2').includes(`<h3>${UI.hu.describe.space}</h3>\n<p>TESZT: 2. terem.</p>`) && !hu.includes('TEST'),
  };
  step('DS6 Accessible version with test words: each under its heading in its work (no. 3\'s screen video under no. 3) or room, a list as paragraphs, the Hungarian page with its own words only', Object.values(checks).every(Boolean), JSON.stringify(checks));
}

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
