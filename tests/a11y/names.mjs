// What a screen reader hears: the viewer's counter and what its Previous and Next say,
// the language of the English titles on the Hungarian page, the 3D view's and the floor
// plan's names, the installation photo's text and the names of the video players. Each
// step waits for what it checks (the 3D view renders in software here, at 1 to 2 frames a
// second). Nothing from Google is loaded: requests to Google are blocked.
// Usage: npm run build && npm run preview &   then   node tests/a11y/names.mjs
import { readFileSync } from 'node:fs';
import { launch, openWalk } from './lib.mjs';

const UI = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')).ui, hu: JSON.parse(readFileSync('src/i18n/hu.json', 'utf8')).ui };
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

const browser = await launch();
let failed = 0;
const errors = [];
const step = (name, ok, got) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got: ${got}`);
  if (!ok) failed++;
};

// The walk, entered without sound, with what the live region says kept in window.__said
// (its text) and window.__saidHTML (its markup).
async function inside(lang, opts = {}) {
  const w = await openWalk(browser, { lang, viewport: { width: 1280, height: 800 }, ...opts });
  await w.ctx.route(/google|gstatic|ggpht|googleusercontent/, (r) => r.abort());
  const p = w.page;
  await p.evaluate(() => {
    window.__said = [];
    window.__saidHTML = [];
    const el = document.getElementById('announcer');
    new MutationObserver(() => { window.__said.push(el.textContent.trim()); window.__saidHTML.push(el.innerHTML.trim()); }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  await p.click('#enter');
  await p.waitForFunction(() => !document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  await p.click('[data-sound="off"]');
  await p.waitForFunction(() => document.getElementById('sound-ask').hidden, null, { timeout: 30000 });
  return w;
}
// Wait (up to 30 s) until the live region has said every one of `parts`, then take it all.
const hear = async (p, parts, timeout = 30000) => {
  await p.waitForFunction((x) => { const all = window.__said.join(' | '); return x.every((s) => all.includes(s)); }, parts, { timeout, polling: 100 }).catch(() => {});
  return p.evaluate(() => ({ text: window.__said.splice(0).join(' | '), html: window.__saidHTML.splice(0).join(' | ') }));
};
const openWork = async (p, id) => {
  await p.evaluate((x) => { window.__ap.viewer.close(); window.__ap.viewer.open(window.__ap.data.works.find((k) => k.id === x)); }, id);
  await p.waitForFunction((x) => !document.getElementById('viewer').hidden && document.getElementById('viewer-title').textContent === window.__ap.data.works.find((k) => k.id === x).title, id, { timeout: 30000 });
};
const shown = (p) => p.evaluate(() => `${document.getElementById('viewer-title').textContent} | ${document.getElementById('viewer-count').textContent}`);
const clickTo = async (p, sel, title) => {
  await p.click(sel);
  await p.waitForFunction((x) => document.getElementById('viewer-title').textContent === x, title, { timeout: 30000 }).catch(() => {});
  return shown(p);
};

// ---------------- B5: Previous and Next pass by no. 3's screen; "No. 3 of 17"; the new work is said
{
  const w = await inside('en');
  const p = w.page;
  const c = (no) => fill(UI.en.viewer.count, { no, total: 17 });
  await openWork(p, 'w03-paradise-factory');
  const at3 = await shown(p);
  const next = await clickTo(p, '#viewer-next', 'Human as Error III');
  const back = await clickTo(p, '#viewer-prev', 'Paradise Factory');
  const back2 = await clickTo(p, '#viewer-prev', 'Human as Error VI');
  step('B5.1 Viewer on no. 3: "No. 3 of 17"; Next goes to no. 4 (not to no. 3\'s screen), Previous back to no. 3, then to no. 2', at3 === `Paradise Factory | ${c(3)}` && next === `Human as Error III | ${c(4)}` && back === `Paradise Factory | ${c(3)}` && back2 === `Human as Error VI | ${c(2)}`, `${at3} → ${next} → ${back} → ${back2}`);

  // the screen opened on its own, as a click on it in the 3D view opens it
  await openWork(p, 'w03-screen');
  const scr = await shown(p);
  const scrNext = await clickTo(p, '#viewer-next', 'Human as Error III');
  await openWork(p, 'w03-screen');
  const scrPrev = await clickTo(p, '#viewer-prev', 'Human as Error VI');
  step('B5.2 No. 3\'s screen opened on its own: counted as "No. 3 of 17"; Next goes to no. 4, Previous to no. 2', scr === `Paradise Factory | ${c(3)}` && scrNext === `Human as Error III | ${c(4)}` && scrPrev === `Human as Error VI | ${c(2)}`, `${scr}; Next → ${scrNext}; Previous → ${scrPrev}`);

  await openWork(p, 'w17-natural-life');
  const round = await clickTo(p, '#viewer-next', 'Wrong Data Landscape Dresden');
  const roundBack = await clickTo(p, '#viewer-prev', 'Natural Life');
  // the last step's message is said before the next steps start, so nothing of it is still waiting
  const sayBack = fill(UI.en.announce.viewerWork, { title: 'Natural Life', no: 17, total: 17 });
  const h3 = await hear(p, [sayBack]);
  step('B5.3 Next after no. 17 goes round to "No. 1 of 17"; Previous from there back to "No. 17 of 17", and that is said', round === `Wrong Data Landscape Dresden | ${c(1)}` && roundBack === `Natural Life | ${c(17)}` && h3.text.endsWith(sayBack), `${round}; ${roundBack}; said last: "${h3.text.split(' | ').pop()}"`);

  // Next by keyboard (→ and the button): the new work is said, and a work in front said at
  // the same moment (Page Down, then at once Enter and →) does not take its place
  await p.evaluate(() => window.__ap.viewer.close());
  await p.waitForFunction(() => document.activeElement === document.getElementById('scene'), null, { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => window.__said.splice(0));
  await p.keyboard.press('PageDown');
  await p.keyboard.press('Enter');
  await p.keyboard.press('ArrowRight');
  const sayFront = fill(UI.en.announce.work, { no: 1, title: 'Wrong Data Landscape Dresden' });
  const sayNext = fill(UI.en.announce.viewerWork, { title: 'Human as Error VI', no: 2, total: 17 });
  let h = await hear(p, [sayFront, sayNext]);
  step(`B5.4 Page Down, Enter and → at once: the work in front and then "${sayNext}" are both said`, h.text.includes(sayFront) && h.text.includes(sayNext), h.text);
  await p.click('#viewer-next');
  const sayNext2 = fill(UI.en.announce.viewerWork, { title: 'Paradise Factory', no: 3, total: 17 });
  h = await hear(p, [sayNext2]);
  step(`B5.5 Next clicked: "${sayNext2}" is said`, h.text.includes(sayNext2), h.text);

  // the language switched while the viewer shows: the counter follows
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  const hu = await p.textContent('#viewer-count');
  await p.click('#site-nav [data-lang="en"]');
  await p.waitForFunction(() => document.documentElement.lang === 'en', null, { timeout: 30000 });
  const en = await p.textContent('#viewer-count');
  step('B5.6 The language switched while the viewer shows no. 3: the counter reads "3. mű a 17 közül", then "No. 3 of 17" again', hu === fill(UI.hu.viewer.count, { no: 3, total: 17 }) && en === c(3), `HU "${hu}"; EN "${en}"`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- B6: on the Hungarian page the English work titles carry lang="en"
// (all 17 titles in exhibition.json are the artist's English ones, and hu.json gives none a
// Hungarian title, so all are marked; on the English page none is)
{
  const w = await inside('hu');
  const p = w.page;
  const marks = () => p.evaluate(() => {
    const viewer = document.getElementById('viewer-title');
    const list = [...document.querySelectorAll('#panel-body .works-list em')];
    const menu = [...document.querySelectorAll('#rooms-menu small span')];
    return {
      viewer: viewer.getAttribute('lang'),
      list: `${list.filter((e) => e.lang === 'en').length}/${list.length}`,
      menu: `${menu.filter((e) => e.lang === 'en').length}/${menu.length}`,
    };
  });
  await openWork(p, 'w08-wiena-wrong-landscape-i');
  const v = await marks();
  await p.evaluate(() => window.__ap.viewer.close());
  await p.evaluate(() => window.__ap.ui.works());
  await p.waitForFunction(() => !!document.querySelector('#panel:not([hidden]) .works-list'), null, { timeout: 30000 });
  const l = await marks();
  step('B6.1 Hungarian page: the viewer\'s title, the 17 titles in the works list and the 17 in the rooms menu carry lang="en"', v.viewer === 'en' && l.list === '17/17' && l.menu === '17/17', `viewer: ${v.viewer}; works list: ${l.list}; rooms menu: ${l.menu}`);
  // switched to English while the list shows, then the viewer: the marks go
  await p.click('#site-nav [data-lang="en"]');
  await p.waitForFunction(() => document.documentElement.lang === 'en', null, { timeout: 30000 });
  const le = await marks();
  await p.evaluate(() => window.__ap.ui.close());
  await openWork(p, 'w08-wiena-wrong-landscape-i');
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  const vh = await marks();
  await p.click('#site-nav [data-lang="en"]');
  await p.waitForFunction(() => document.documentElement.lang === 'en', null, { timeout: 30000 });
  const ve = await marks();
  step('B6.2 The language switched while they show: in English no title carries lang (works list, rooms menu, viewer); back in Hungarian the viewer\'s title has it again', le.list === '0/17' && le.menu === '0/17' && vh.viewer === 'en' && ve.viewer === null, `English list: ${le.list}, menu: ${le.menu}; viewer in HU: ${vh.viewer}, in EN: ${ve.viewer}`);
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });

  // the live region: the work in front (Page Down), a room's subtitle, the viewer's Next
  await p.evaluate(() => window.__ap.viewer.close());
  await p.waitForFunction(() => document.activeElement === document.getElementById('scene'), null, { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => { window.__said.splice(0); window.__saidHTML.splice(0); });
  for (let i = 0; i < 4; i++) await p.keyboard.press('PageDown'); // on to no. 4 in Room 1
  await hear(p, ['Human as Error III']);
  await p.evaluate(() => { window.__said.splice(0); window.__saidHTML.splice(0); });
  await p.keyboard.press('PageDown'); // no. 5, still Room 1
  let h = await hear(p, ['Human as Error I.']);
  const html5 = h.html;
  await p.keyboard.press('PageDown'); // no. 6, Room 2: its subtitle names no title
  h = await hear(p, ['Artificial Paradise – Singapore']);
  const workOk = html5.includes('<span lang="en">Human as Error I</span>.') && h.html.includes('<span lang="en">Artificial Paradise – Singapore</span>') && h.html.includes('2. terem');
  await p.evaluate(() => window.__ap.jumpToRoom('r4')); // Room 4: "Let it Flow · videó"
  h = await hear(p, ['4. terem']);
  const roomOk = h.html.includes('<span lang="en">Let it Flow</span>') && !/lang="en">[^<]*terem/.test(h.html);
  await openWork(p, 'w16-let-it-flow');
  await p.click('#viewer-next');
  h = await hear(p, ['Natural Life']);
  const nextOk = h.html.includes('<span lang="en">Natural Life</span>') && h.html.includes('17. mű a 17 közül') && !/lang="en">[^<]*mű/.test(h.html);
  step('B6.3 Hungarian page, the live region: the titles in the work in front, in a room\'s subtitle and in the viewer\'s Next are each in a <span lang="en">, the Hungarian words are not', workOk && roomOk && nextOk, `work in front ${workOk}, room ${roomOk}, Next ${nextOk}; last: ${h.html}`);
  errors.push(...w.errors);
  await w.ctx.close();
}
{
  const w = await inside('en');
  const p = w.page;
  await p.evaluate(() => { window.__said.splice(0); window.__saidHTML.splice(0); });
  await p.keyboard.press('PageDown');
  const h = await hear(p, ['Wrong Data Landscape Dresden']);
  await openWork(p, 'w01-dresden');
  const v = await p.getAttribute('#viewer-title', 'lang');
  step('B6.4 English page: no lang mark in the live region or on the viewer\'s title', !h.html.includes('lang=') && v === null, `live region: ${h.html}; viewer title lang: ${v}`);
  errors.push(...w.errors);
  await w.ctx.close();
}

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
