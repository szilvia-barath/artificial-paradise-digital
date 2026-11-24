// What a screen reader hears: the viewer's counter and what its Previous and Next say,
// the language of the English titles on the Hungarian page, the 3D view's and the floor
// plan's names, the installation photo's text and the names of the video players. Each
// step waits for what it checks (the 3D view renders in software here, at 1 to 2 frames a
// second). Nothing from Google or YouTube is loaded: requests to them are blocked.
// Usage: npm run build && npm run preview &   then   node tests/a11y/names.mjs
import { readFileSync } from 'node:fs';
import { launch, openWalk } from './lib.mjs';

const UI = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')).ui, hu: JSON.parse(readFileSync('src/i18n/hu.json', 'utf8')).ui };
const fill = (s, vars) => String(s ?? '(no such string)').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

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
  await w.ctx.route(/google|gstatic|ggpht|googleusercontent|youtube|ytimg/, (r) => r.abort());
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
// An element's accessible name, as the browser gives it to a screen reader (DevTools protocol).
const axName = async (p, sel) => {
  const cdp = await p.context().newCDPSession(p);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
  const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
  await cdp.detach();
  return nodes[0]?.name?.value ?? null;
};
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

  // → and at once Esc: the work stepped to is not said after the viewer has closed (the
  // message is dropped from the queue with the viewer). Both keys in one go, so the message
  // is still waiting when Esc comes.
  await p.evaluate(() => window.__said.splice(0));
  const stale = fill(UI.en.announce.viewerWork, { title: 'Human as Error III', no: 4, total: 17 });
  await p.evaluate(() => {
    const press = (key) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    press('ArrowRight');
    press('Escape');
  });
  const closedNow = await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 }).then(() => true, () => false);
  // nothing to wait for if it is right: give the live region three of its one-second gaps
  const staleSaid = await p.waitForFunction((x) => window.__said.join(' | ').includes(x), stale, { timeout: 3000, polling: 100 }).then(() => true, () => false);
  step(`B5.7 → and at once Esc: the viewer closes and "${stale}" is not said after it`, closedNow && !staleSaid, `closed: ${closedNow}; said: "${await p.evaluate(() => window.__said.join(' | '))}"`);
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
    return {
      viewer: viewer.getAttribute('lang'),
      list: `${list.filter((e) => e.lang === 'en').length}/${list.length}`,
    };
  });
  await openWork(p, 'w08-wiena-wrong-landscape-i');
  const v = await marks();
  await p.evaluate(() => window.__ap.viewer.close());
  await p.evaluate(() => window.__ap.ui.works());
  await p.waitForFunction(() => !!document.querySelector('#panel:not([hidden]) .works-list'), null, { timeout: 30000 });
  const l = await marks();
  // (the rooms menu, which also listed the titles, was removed on 18 November 2026)
  step('B6.1 Hungarian page: the viewer\'s title and the 17 titles in the works list carry lang="en"', v.viewer === 'en' && l.list === '17/17', `viewer: ${v.viewer}; works list: ${l.list}`);
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
  step('B6.2 The language switched while they show: in English no title carries lang (works list, viewer); back in Hungarian the viewer\'s title has it again', le.list === '0/17' && vh.viewer === 'en' && ve.viewer === null, `English list: ${le.list}; viewer in HU: ${vh.viewer}, in EN: ${ve.viewer}`);
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
  h = await hear(p, ['Artificial Paradise - Singapore']);
  const workOk = html5.includes('<span lang="en">Human as Error I</span>.') && h.html.includes('<span lang="en">Artificial Paradise - Singapore</span>') && h.html.includes('2. terem');
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

// ---------------- B7: the 3D view's name is short and has the keys that matter, and what it says is so
{
  const w = await inside('en');
  const p = w.page;
  const en = await axName(p, '#scene');
  const words = en.split(/\s+/).length;
  const has = ['3D view', 'Page Down', 'Page Up', 'Enter', 'arrow keys', 'accessible version', 'first link'].every((x) => en.includes(x));
  step(`B7.1 The 3D view's name, shorter than the old one (37 words), has the keys: ${words} words, "${UI.en.sceneLabel}"`, en === UI.en.sceneLabel && en.startsWith('3D view.') && has && words < 37, `"${en}"`);
  // what it says: the first link in the page is the accessible version, and it is the
  // first thing Tab reaches; Page Down goes to a work and Enter opens it
  const first = await p.evaluate(() => {
    const link = document.querySelector('a[href]');
    const focusable = [...document.querySelectorAll('a[href], button, [tabindex]')].filter((e) => e.tabIndex >= 0 && !e.closest('[inert]') && !e.disabled && e.getClientRects().length);
    return { link: `${link.className} ${link.getAttribute('href')}`, firstTab: focusable[0] === link };
  });
  await p.focus('#scene');
  await p.keyboard.press('PageDown');
  await p.keyboard.press('PageDown');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => !document.getElementById('viewer').hidden, null, { timeout: 30000 }).catch(() => {});
  const opened = await p.evaluate(() => (document.getElementById('viewer').hidden ? '(nothing)' : document.getElementById('viewer-title').textContent));
  await p.keyboard.press('Escape');
  step('B7.2 What the name says is so: the first link is the accessible version and the first Tab stop; Page Down twice and Enter open no. 2', first.link.startsWith('skip-link ./text/') && first.firstTab && opened === 'Human as Error VI', `first link: ${first.link}, first Tab stop: ${first.firstTab}; Enter opened: ${opened}`);
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  const hu = await axName(p, '#scene');
  step('B7.3 Switched to Hungarian: the name is the Hungarian one', hu === UI.hu.sceneLabel && hu.includes('Page Down') && hu.includes('akadálymentes változat'), `"${hu}"`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- B10: the floor plan's name says where you are; the jump by a click is in its title
{
  const w = await inside('en');
  const p = w.page;
  const nameIs = (x) => p.waitForFunction((v) => document.getElementById('minimap').getAttribute('aria-label') === v, x, { timeout: 30000 }).catch(() => {});
  const here = (room, l = 'en') => fill(UI[l].hud.minimapHere, { room });
  await nameIs(here('Room 1'));
  const r1 = await axName(p, '#minimap');
  await p.evaluate(() => window.__ap.jumpToRoom('r2'));
  await nameIs(here('Room 2'));
  const r2 = await axName(p, '#minimap');
  // moved into Room 3 without a jump, as walking does: the frame notices the new room
  await p.evaluate(() => { const c = window.__ap.controls; c.setPose(12.5, 3.3, c.yaw); });
  await nameIs(here('Room 3'));
  const r3 = await axName(p, '#minimap');
  const title = await p.getAttribute('#minimap', 'title');
  step('B10.1 The floor plan\'s name says where you are, after the entry, a jump to Room 2 and a move into Room 3; the jump hint is in its title only', r1 === here('Room 1') && r2 === here('Room 2') && r3 === here('Room 3') && title === UI.en.hud.minimap && !r3.includes(UI.en.hud.minimap), `"${r1}" → "${r2}" → "${r3}"; title "${title}"`);
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  await nameIs(here('3. terem', 'hu'));
  const hu = await axName(p, '#minimap');
  const huTitle = await p.getAttribute('#minimap', 'title');
  await p.evaluate(() => window.__ap.jumpToRoom('r4'));
  await nameIs(here('4. terem', 'hu'));
  const hu4 = await axName(p, '#minimap');
  step('B10.2 Switched to Hungarian in Room 3: "Alaprajz. Jelenlegi hely: 3. terem", the title in Hungarian; a jump to Room 4 follows', hu === here('3. terem', 'hu') && huTitle === UI.hu.hud.minimap && hu4 === here('4. terem', 'hu'), `"${hu}"; title "${huTitle}"; then "${hu4}"`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- B16: the installation photo's text says it is a photo of the room
{
  const w = await inside('en');
  const p = w.page;
  const situ = '#viewer-caption + button';
  const altIs = (x) => p.waitForFunction((v) => document.getElementById('viewer-img').alt === v, x, { timeout: 30000 }).then(() => true, () => false);
  const workAlt = await p.evaluate(() => { const k = window.__ap.data.works.find((x) => x.id === 'w16-let-it-flow'); return `${k.title}, ${k.medium}`; });
  // the work shows as its video loop (the image is hidden then), so its text is read from the attribute
  const altNow = () => p.getAttribute('#viewer-img', 'alt');
  await openWork(p, 'w16-let-it-flow');
  const a0 = await altNow();
  await p.click(situ);
  const one = fill(UI.en.viewer.situAlt, { n: 1, total: 2, title: 'Let it Flow' });
  await altIs(one);
  const a1 = await axName(p, '#viewer-img');
  await p.click(situ);
  const two = fill(UI.en.viewer.situAlt, { n: 2, total: 2, title: 'Let it Flow' });
  await altIs(two);
  const a2 = await axName(p, '#viewer-img');
  await p.click(situ);
  await altIs(workAlt);
  const a3 = await altNow();
  step('B16.1 No. 16: the work\'s own text, then (read from the accessibility tree) "Installation photo 1 of 2: Let it Flow in the gallery", "2 of 2", and the work\'s own text again', a0 === workAlt && a1 === one && a2 === two && a3 === workAlt, `"${a0}" → "${a1}" → "${a2}" → "${a3}"`);
  await openWork(p, 'w01-dresden');
  await p.click(situ);
  const single = fill(UI.en.viewer.situAltOne, { title: 'Wrong Data Landscape Dresden' });
  await altIs(single);
  const b1 = await axName(p, '#viewer-img');
  step('B16.2 No. 1, its one installation photo: "Installation photo: Wrong Data Landscape Dresden in the gallery"', b1 === single, `"${b1}"`);
  // the language switched while a photo shows
  await openWork(p, 'w16-let-it-flow');
  await p.click(situ);
  await altIs(one);
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  const huOne = fill(UI.hu.viewer.situAlt, { n: 1, total: 2, title: 'Let it Flow' });
  await altIs(huOne);
  const h1 = await axName(p, '#viewer-img');
  await p.click('#site-nav [data-lang="en"]');
  await p.waitForFunction(() => document.documentElement.lang === 'en', null, { timeout: 30000 });
  await altIs(one);
  const e1 = await axName(p, '#viewer-img');
  step('B16.3 The language switched while the photo shows: "1. installációs fotó a 2 közül: Let it Flow a galériában", then the English again', h1 === huOne && e1 === one, `HU "${h1}"; EN "${e1}"`);
  errors.push(...w.errors);
  await w.ctx.close();
}

// ---------------- B17: the video players have names; Esc inside the YouTube player
// (no. 6's full video, from youtube-nocookie.com; the Drive player of nos. 8 and 15 is a
// frame from another site in the same way, and tests/a11y/youtube.mjs checks it is made)
// Nothing from Google or YouTube loads: every request to them is blocked, and the player's
// address is answered by a stand-in page of this test (one button), served in its place, so
// the frame is from another site as the real player is.
{
  const w = await inside('en');
  const p = w.page;
  const asked = [];
  p.on('request', (r) => { if (/google|youtube|ytimg/.test(new URL(r.url()).hostname)) asked.push(r.url()); });
  await w.ctx.route(/^https:\/\/www\.youtube-nocookie\.com\/embed\//, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stand-in</title><button>Play</button><script>window.keys = []; addEventListener("keydown", (e) => keys.push(e.key));</script>' }));
  // The name is read from the accessibility tree; this Chromium cannot play the MP4 files
  // (no H.264), and once a video has failed it names it "Unable to play media." whatever its
  // label, so then the label itself is checked and the failure said.
  // Right after the source changes, the tree can still carry the last clip's "Unable to play
  // media." while the new clip's error is not set yet: wait (up to 30 s) until the tree gives
  // the label or the new clip has failed, then decide.
  const videoName = async () => {
    const label = await p.getAttribute('#viewer-video', 'aria-label');
    let ax = null;
    let failed = false;
    for (const end = Date.now() + 30000; Date.now() < end;) {
      ax = await axName(p, '#viewer-video');
      failed = await p.evaluate(() => !!document.getElementById('viewer-video').error);
      if (ax === label || failed) break;
      await p.waitForTimeout(250);
    }
    return { label, ax, failed, ok: (want) => label === want && (ax === want || failed) };
  };
  await openWork(p, 'w06-artificial-paradise-singapore');
  const loop = await videoName();
  await openWork(p, 'w03-paradise-factory');
  const doc = await videoName();
  const wantLoop = fill(UI.en.viewer.videoLoopName, { title: 'Artificial Paradise - Singapore' });
  const wantDoc = fill(UI.en.viewer.videoDocName, { title: 'Paradise Factory' });
  step('B17.1 The video in the viewer has a name: "Video loop: Artificial Paradise - Singapore"; no. 3\'s documentation: "Video documentation: Paradise Factory"', loop.ok(wantLoop) && doc.ok(wantDoc), [loop, doc].map((v) => `label "${v.label}", in the tree "${v.ax}"${v.failed ? ' (the video failed to play here)' : ''}`).join('; '));

  await openWork(p, 'w06-artificial-paradise-singapore');
  const before = asked.length;
  await p.click('#viewer-videos [data-full="0"]');
  await p.waitForFunction(() => !document.getElementById('viewer-frame').hidden, null, { timeout: 30000 });
  const fr = p.frameLocator('#viewer-frame');
  await fr.locator('button').waitFor({ timeout: 30000 });
  const loaded = asked.length;
  const frameName = await axName(p, '#viewer-frame');
  const want = fill(UI.en.viewer.frameTitleYoutube, { title: 'Artificial Paradise - Singapore' });
  await p.click('#site-nav [data-lang="hu"]');
  await p.waitForFunction(() => document.documentElement.lang === 'hu', null, { timeout: 30000 });
  const frameHu = await p.getAttribute('#viewer-frame', 'title');
  await p.click('#site-nav [data-lang="en"]');
  await p.waitForFunction(() => document.documentElement.lang === 'en', null, { timeout: 30000 });
  step('B17.2 "Full video" pressed: the player\'s frame is named "Full video: Artificial Paradise - Singapore, YouTube player"; in Hungarian "Teljes videó: …, YouTube-lejátszó"; it loaded only after the press', frameName === want && frameHu === fill(UI.hu.viewer.frameTitleYoutube, { title: 'Artificial Paradise - Singapore' }) && before === 0 && loaded > 0, `"${frameName}"; HU "${frameHu}"; requests to Google or YouTube before the press: ${before}, after it: ${loaded} (answered by the stand-in)`);

  // Esc with focus inside the player's frame: the page never hears it, so the viewer stays open
  const inFrame = () => p.evaluate(() => document.activeElement === document.getElementById('viewer-frame'));
  const viewerOpen = () => p.evaluate(() => !document.getElementById('viewer').hidden);
  await fr.locator('button').focus();
  const focusedIn = await inFrame();
  await p.keyboard.press('Escape');
  // the frame's own page heard the Esc; the viewer's listener is on the page outside it
  const player = p.frames().find((f) => f.url().startsWith('https://www.youtube-nocookie.com/'));
  const heardIn = await player.waitForFunction(() => window.keys.includes('Escape'), null, { timeout: 30000 }).then(() => true, () => false);
  const stillOpen = await viewerOpen();
  // Tab leaves the frame into the viewer; then Esc closes it
  await p.keyboard.press('Tab');
  const outTab = !(await inFrame()) && (await p.evaluate(() => document.getElementById('viewer').contains(document.activeElement)));
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 }).catch(() => {});
  const closedTab = !(await viewerOpen());
  // the same with Shift+Tab
  await openWork(p, 'w06-artificial-paradise-singapore');
  await p.click('#viewer-videos [data-full="0"]');
  await fr.locator('button').waitFor({ timeout: 30000 });
  await fr.locator('button').focus();
  await p.keyboard.press('Shift+Tab');
  const outShift = !(await inFrame()) && (await p.evaluate(() => document.getElementById('viewer').contains(document.activeElement)));
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.getElementById('viewer').hidden, null, { timeout: 30000 }).catch(() => {});
  const closedShift = !(await viewerOpen());
  step('B17.3 Focus inside the player\'s frame: Esc goes to the frame and does not close the viewer; Tab or Shift+Tab leaves the frame into the viewer, and Esc then closes it (what the statement says)', focusedIn && heardIn && stillOpen && outTab && closedTab && outShift && closedShift, `focus in the frame: ${focusedIn}; Esc heard in the frame: ${heardIn}; open after Esc: ${stillOpen}; after Tab in the viewer: ${outTab}, Esc closed: ${closedTab}; after Shift+Tab in the viewer: ${outShift}, Esc closed: ${closedShift}`);
  // the accessibility statement says so, in both languages
  const says = {};
  for (const l of ['en', 'hu']) {
    await p.click(`#site-nav [data-lang="${l}"]`);
    await p.waitForFunction((x) => document.documentElement.lang === x, l, { timeout: 30000 });
    await p.evaluate(() => window.__ap.ui.show('accessibility'));
    await p.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 30000 });
    const gap = (t) => t.includes('YouTube') && t.includes('Google Drive') && t.includes('Shift+Tab');
    const want = JSON.parse(readFileSync(`src/i18n/${l}.json`, 'utf8')).accessibility.sections.find((x) => x.p.some(gap));
    const text = await p.textContent('#panel-body');
    says[l] = !!want && want.p.filter(gap).every((t) => text.includes(t));
    await p.evaluate(() => window.__ap.ui.close());
  }
  step('B17.4 The accessibility statement says that Esc does not work inside the YouTube or Google Drive player and how to get out, in English and in Hungarian', says.en && says.hu, JSON.stringify(says));
  errors.push(...w.errors);
  await w.ctx.close();
}

step('No console errors', errors.length === 0, errors.join(' | ') || 'none');
await browser.close();
process.exit(failed ? 1 : 0);
