// The references: the links laid over the exhibition's texts, the opening speech's three
// footnotes, and the Concept page with its four views, by keyboard, with reduced motion and
// on a phone. Every link is compared with src/data/references.json (the same matching the
// site uses, src/refs.js); nothing outside the site is opened. Writes
// docs/accessibility/concept-test-log.md.
// Usage: npm run build && npm run preview &   then   node tests/a11y/concept.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { launch, openWalk, focusName } from './lib.mjs';
import { locate, linkFor } from '../../src/refs.js';

const refs = JSON.parse(readFileSync('src/data/references.json', 'utf8'));
const LOC = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')), hu: JSON.parse(readFileSync('src/i18n/hu.json', 'utf8')) };
const data = JSON.parse(readFileSync('src/data/exhibition.json', 'utf8'));
const byId = new Map(refs.items.map((it) => [it.id, it]));
const paragraphs = (lang, key) => (key === 'openingSpeech' ? LOC[lang].openingSpeech.text : LOC[lang].descriptions[key.slice(13)].text);
// the links a text should carry, in reading order: [{ id, text, href, mark }]
const expected = (lang, key) => locate(refs.items, key, paragraphs(lang, key), lang).hits.map((h) => {
  const it = byId.get(h.id);
  const l = linkFor(it, lang);
  return { id: h.id, text: it.anchor[lang], href: l.href, mark: l.mark };
});

const browser = await launch();
const log = [];
let failed = 0;
const step = (name, expected_, got, pass) => {
  log.push({ name, expected: expected_, got, pass });
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      expected: ${expected_}\n      got:      ${got}`);
};
const allErrors = [];

// what the page's links say about themselves
const readLinks = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((a) => ({
  text: [...a.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''),
  href: a.getAttribute('href'), target: a.target, rel: a.rel,
  mark: a.querySelector('.lang-mark')?.textContent || '',
  said: a.querySelector('.sr-only')?.textContent || '',
  hreflang: a.getAttribute('hreflang') || '',
})), sel);
const sameLinks = (got, want, lang) => {
  const newTab = LOC[lang].ui.concept.newTab;
  const bad = [];
  if (got.length !== want.length) bad.push(`${got.length} links, expected ${want.length}`);
  want.forEach((w, i) => {
    const g = got[i];
    if (!g) return;
    if (g.text !== w.text || decodeURI(g.href) !== decodeURI(w.href)) bad.push(`${w.id}: "${g.text}" → ${g.href}`);
    if (g.target !== '_blank' || g.rel !== 'noopener noreferrer') bad.push(`${w.id}: target ${g.target}, rel ${g.rel}`);
    if (!g.said.includes(newTab)) bad.push(`${w.id}: name does not say "${newTab}"`);
    if (g.mark !== w.mark || (w.mark && g.hreflang !== w.mark.toLowerCase())) bad.push(`${w.id}: mark "${g.mark}", expected "${w.mark}"`);
  });
  return bad;
};
const focusId = (page) => page.evaluate(() => { const a = document.activeElement; return a?.dataset?.node ? `node ${a.dataset.node}` : a?.id || a?.dataset?.nav || a?.tagName.toLowerCase(); });
const panelOpen = (page) => page.evaluate(() => !document.getElementById('panel').hidden);
const tabOn = (page) => page.evaluate(() => document.querySelector('.concept [role="tab"][aria-selected="true"]')?.dataset.tab);
// A tab chosen from the page (the tabs' own keys are checked in 2.2): with the 3D view drawing
// in software behind the panel, a pointer click can wait very long for the page to hold still.
const choose = (page, view) => page.evaluate((v) => document.getElementById(`concept-tab-${v}`).click(), view);
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 30000, polling: 100 }).catch(() => {});

// ---------------- 1. Links and footnotes in the texts, both languages
for (const lang of ['en', 'hu']) {
  const L = lang.toUpperCase();
  const { page, ctx, errors } = await openWalk(browser, { lang });
  await page.evaluate(() => document.querySelector('#site-nav [data-nav="about"]').click());
  await page.evaluate(() => { for (const d of document.querySelectorAll('#panel details')) d.open = true; });
  // the opening speech
  const want = expected(lang, 'openingSpeech');
  const got = await readLinks(page, '#panel-body details.speech > p a.ref');
  const bad = sameLinks(got, want, lang);
  step(`${L} 1.1 Opening speech: every anchor is a link to the right page, in a new tab`, `${want.length} links as in references.json (page language first, else the other language with its mark)`, bad.length ? bad.join('; ') : `${got.length} links: ${got.map((g) => g.text + (g.mark ? ` [${g.mark}]` : '')).join(', ')}`, !bad.length);
  const nested = await page.evaluate(() => document.querySelectorAll('#panel-body a a').length);
  step(`${L} 1.2 No link inside another link`, '0', String(nested), nested === 0);
  // the speech's words are untouched: without the markers, each paragraph reads as in src/i18n
  const same = await page.evaluate((paras) => {
    const ps = [...document.querySelectorAll('#panel-body details.speech > p:not(.note)')];
    return ps.length === paras.length && ps.every((p, i) => {
      const c = p.cloneNode(true);
      for (const x of c.querySelectorAll('sup.fn, .sr-only, .lang-mark')) x.remove();
      return c.textContent === paras[i];
    });
  }, LOC[lang].openingSpeech.text);
  step(`${L} 1.3 The speech's words are as in src/i18n (links and markers taken out)`, 'identical paragraphs', same ? 'identical' : 'different', same);
  // the supporters
  const sup = await readLinks(page, '#panel-body .credits a.ref');
  const supWant = refs.supporters.ids.map((id, i) => ({ id, text: LOC[lang].credits[refs.supporters.row][1].split(refs.supporters.sep)[i], ...linkFor(byId.get(id), lang) }));
  const supBad = sameLinks(sup, supWant, lang);
  step(`${L} 1.4 Supporters in the credits: three links`, supWant.map((s) => `${s.text} → ${s.href}${s.mark ? ` [${s.mark}]` : ''}`).join('; '), supBad.length ? supBad.join('; ') : 'as expected', !supBad.length);
  // the footnotes: there and back, by keyboard
  const fnOut = [];
  let fnOk = true;
  for (const f of refs.footnotes) {
    await page.focus(`#fnref-${f.n}`);
    const name = await page.getAttribute(`#fnref-${f.n}`, 'aria-label');
    await page.keyboard.press('Enter');
    const there = await focusId(page);
    const note = await page.evaluate((n) => { const li = document.getElementById(`fn-${n}`); return { text: li.firstChild.textContent.trim() || li.firstElementChild.textContent.trim(), href: li.querySelector('a.ref').getAttribute('href'), target: li.querySelector('a.ref').target }; }, f.n);
    await page.focus(`#fn-${f.n} .fn-back`);
    await page.keyboard.press('Enter');
    const back = await focusId(page);
    const ok = there === `fn-${f.n}` && back === `fnref-${f.n}` && note.text === f.citation && note.href === f.url && note.target === '_blank' && name === LOC[lang].ui.concept.footnote.replace('{n}', f.n);
    fnOk &&= ok;
    fnOut.push(`${f.n}: "${name}" → ${there} → ${back}; note ${note.text === f.citation ? 'is the citation' : 'DIFFERS'}, link ${note.href}`);
  }
  const heading = await page.textContent('#panel-body .fn-h');
  step(`${L} 1.5 Footnotes 1 to 3: the marker goes to its note and the note back to its marker`, `markers named "${LOC[lang].ui.concept.footnote}", notes under "${LOC[lang].ui.concept.notes}" with the table's citation and url_primary`, `${heading}: ${fnOut.join(' | ')}`, fnOk && heading === LOC[lang].ui.concept.notes);
  await page.keyboard.press('Escape');
  // the artist's texts in the viewer
  const keys = ['human-as-error', 'artificial-paradise-videos', 'artificial-paradise-prints', 'paradise-factory', 'let-it-flow', 'natural-life'];
  const out = [];
  let ok = true;
  for (const k of keys) {
    const i = data.works.findIndex((w) => w.desc === k);
    await page.evaluate((n) => window.__ap.viewer.open(window.__ap.data.works[n]), i);
    const w = expected(lang, `descriptions.${k}`);
    const g = await readLinks(page, '#viewer-desc a.ref');
    const b = sameLinks(g, w, lang);
    ok &&= !b.length;
    out.push(`${k}: ${b.length ? b.join('; ') : `${g.length} links`}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }
  step(`${L} 1.6 The artist's texts in the viewer carry their links`, 'each text: the links of references.json', out.join(' | '), ok);
  allErrors.push(...errors.map((e) => `${L}: ${e}`));
  await ctx.close();
}

// ---------------- 2. The Concept page by keyboard (English), from the title screen and inside
{
  const { page, ctx, errors } = await openWalk(browser, { lang: 'en' });
  let n = 0;
  for (let i = 1; i <= 40 && !n; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.dataset?.nav === 'concept')) n = i;
  }
  await page.keyboard.press('Enter');
  const title = await page.textContent('#panel-title').catch(() => '');
  step('2.1 Tab reaches "Concept" in the navbar; Enter opens the page', 'the panel "The concept of Artificial Paradise", focus on Close, the Themes tab chosen', `${n} Tabs; "${title}"; focus on ${await focusName(page)}; tab: ${await tabOn(page)}`, n > 0 && title === LOC.en.ui.concept.title && (await tabOn(page)) === 'themes');
  // the tabs
  await page.keyboard.press('Tab');
  const onTab = await focusId(page);
  const seen = [];
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'End', 'Home', 'ArrowLeft']) {
    await page.keyboard.press(key);
    seen.push(`${key}: ${await tabOn(page)}`);
  }
  const roles = await page.evaluate(() => {
    const list = document.querySelector('.concept [role="tablist"]');
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    return list.getAttribute('aria-label') && tabs.every((b) => document.getElementById(b.getAttribute('aria-controls'))?.getAttribute('role') === 'tabpanel' && document.getElementById(b.getAttribute('aria-controls')).getAttribute('aria-labelledby') === b.id)
      && tabs.filter((b) => b.tabIndex === 0).length === 1 && [...document.querySelectorAll('.concept [role="tabpanel"]')].filter((p) => !p.hidden).length === 1;
  });
  step('2.2 The tabs follow the WAI-ARIA pattern: one Tab stop, arrows, Home and End choose', 'Tab lands on the chosen tab; → works, timeline, network, themes; End network; Home themes; ← network', `first Tab: ${onTab}; ${seen.join(', ')}; roles and labels ${roles ? 'right' : 'WRONG'}`, onTab === 'concept-tab-themes' && seen.join() === 'ArrowRight: works,ArrowRight: timeline,ArrowRight: network,ArrowRight: themes,End: network,Home: themes,ArrowLeft: network' && !!roles);
  // every control of each view is reached by Tab, and focus stays in the panel
  for (const view of ['themes', 'works', 'timeline']) {
    await choose(page, view);
    const want = await page.evaluate(() => [...document.querySelectorAll('#panel a[href], #panel button')].filter((el) => !el.closest('[hidden]') && el.tabIndex >= 0 && el.getClientRects().length).length);
    await page.focus('#panel [data-close]');
    let stops = 1;
    let left = false;
    for (let i = 0; i < want + 5; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement === document.querySelector('#panel [data-close]'))) break;
      if (!(await page.evaluate(() => document.getElementById('panel').contains(document.activeElement)))) left = true;
      stops++;
    }
    const counts = await page.evaluate((v) => { const p = document.getElementById(`concept-view-${v}`); return `${p.querySelectorAll('section').length} sections, ${p.querySelectorAll('.ref-card').length} cards, ${p.querySelectorAll('blockquote').length} passages, ${p.querySelectorAll('[data-goto]').length} work links, ${p.querySelectorAll('li').length} list items`; }, view);
    step(`2.3 ${view}: Tab reaches every link and button and comes back to Close`, `${want} stops, focus never leaves the panel`, `${stops} stops${left ? ', focus LEFT the panel' : ''} (${counts})`, stops === want && !left);
  }
  const themes = await page.evaluate(() => { const p = document.getElementById('concept-view-themes'); return { n: p.querySelectorAll('section.concept-theme').length, all: p.textContent.includes('All works in the exhibition'), heads: [...p.querySelectorAll('section > h3')].map((h) => h.textContent) }; });
  step('2.4 Themes: six themes in the table\'s order; "all" is written out', `${refs.themes.map((t) => t.label.en).join(' | ')}; "All works in the exhibition" under T2`, `${themes.heads.join(' | ')}; all: ${themes.all}`, themes.heads.join('|') === refs.themes.map((t) => t.label.en).join('|') && themes.all);
  const tl = await page.evaluate(() => [...document.querySelectorAll('.concept .timeline .year')].map((y) => y.textContent));
  const tlWant = [...refs.items.filter((i) => i.year).map((i) => i.year).sort((a, b) => a - b), 2025].map(String);
  step('2.5 Timeline: the dated references in date order, the exhibition last', tlWant.join(', '), tl.join(', '), tl.join() === tlWant.join());
  // the network
  await choose(page, 'network');
  await page.focus('#concept-tab-network');
  const order = [];
  const names = [];
  for (let i = 0; i < refs.network.nodes.length; i++) {
    await page.keyboard.press('Tab');
    const a = await page.evaluate(() => ({ id: document.activeElement?.dataset?.node, name: document.activeElement?.getAttribute('aria-label'), dim: document.querySelector('.concept-net').classList.contains('dim'), hl: document.activeElement?.classList.contains('hl') }));
    order.push(a.id);
    names.push(a);
  }
  const col = new Intl.Collator('en');
  const wantOrder = [
    ...refs.themes.map((t) => t.id),
    ...refs.items.slice().sort((a, b) => col.compare(a.label.en, b.label.en)).map((i) => i.id),
    ...refs.network.nodes.filter((x) => x.kind === 'work').map((x) => x.id).sort((a, b) => data.works.find((w) => w.id === a).no - data.works.find((w) => w.id === b).no),
  ];
  const nameOk = names.every((a) => /, (theme|work|person|place|organisation|text|concept|event), (\d+ links|1 link)$/.test(a.name || ''));
  step('2.6 Network: Tab reaches every node, themes first, then references and concepts by label, then works', `${wantOrder.length} nodes in that order, each named with what it is and its number of links, highlighted while focused`, `${order.filter(Boolean).length} nodes; order ${order.join() === wantOrder.join() ? 'as expected' : 'DIFFERS: ' + order.join(' ')}; names ${nameOk ? 'right' : 'WRONG'}, e.g. "${names[0].name}", "${names.find((a) => a.id === 'R12')?.name}", "${names[names.length - 1].name}"; highlighted: ${names.every((a) => a.dim && a.hl)}`, order.join() === wantOrder.join() && nameOk && names.every((a) => a.dim && a.hl));
  const svg = await page.evaluate(() => { const s = document.querySelector('.concept-net'); const sizes = [...s.querySelectorAll('.lbl')].map((x) => parseFloat(getComputedStyle(x).fontSize)); const r = s.getBoundingClientRect(); return { role: s.getAttribute('role'), label: s.getAttribute('aria-label'), min: Math.min(...sizes), shown: [...s.querySelectorAll('.lbl')].filter((x) => getComputedStyle(x).visibility === 'visible' && x.classList.contains('theme')).length, w: Math.round(r.width), panel: Math.round(document.getElementById('panel-body').getBoundingClientRect().width), note: s.parentElement.nextElementSibling.textContent, legend: document.querySelectorAll('.concept .net-legend li').length }; });
  step('2.7 Network: role, label, the line under it, the key, and type of 12 px at least', 'role="group" with a label; the note on the links and positions; a key of 6 entries; six theme labels shown; labels 12 px or more; as wide as the panel', `role ${svg.role}, "${svg.label}"; note "${svg.note}"; key ${svg.legend}; theme labels ${svg.shown}; smallest label ${svg.min} px; ${svg.w} of ${svg.panel} px`, svg.role === 'group' && !!svg.label && svg.note === LOC.en.ui.concept.netNote && svg.legend === 6 && svg.shown === 6 && svg.min >= 12 && svg.w <= svg.panel);
  // Enter on a reference: its card; Back to the diagram
  await page.focus('[data-node="R12"]');
  await page.keyboard.press('Enter');
  const cardAt = await page.evaluate(() => ({ on: document.activeElement?.closest('#concept-card') ? document.activeElement.textContent : '', type: document.querySelector('#concept-card .ref-type')?.textContent }));
  await page.focus('#concept-card [data-back]');
  await page.keyboard.press('Enter');
  const backAt = await focusId(page);
  step('2.8 Enter on a reference opens its card with focus on its heading; "Back to the diagram" returns to the node', 'Caspar David Friedrich, "Person"; then node R12', `"${cardAt.on}", "${cardAt.type}"; then ${backAt}`, cardAt.on === 'Caspar David Friedrich' && cardAt.type === 'Person' && backAt === 'node R12');
  // Esc: the highlight first, then the panel; focus back on the navbar's Concept button
  const before = await page.evaluate(() => document.querySelector('.concept-net').classList.contains('dim'));
  await page.keyboard.press('Escape');
  const mid = { dim: await page.evaluate(() => document.querySelector('.concept-net')?.classList.contains('dim')), open: await panelOpen(page) };
  await page.keyboard.press('Escape');
  const after = { open: await panelOpen(page), focus: await focusId(page) };
  step('2.9 Esc clears the highlight; a second Esc closes the panel; focus returns to "Concept" in the navbar', 'highlight on → off with the panel open → panel closed, focus on the navbar button', `highlight ${before} → ${mid.dim}, panel open ${mid.open} → panel open ${after.open}, focus on ${after.focus}`, before && !mid.dim && mid.open && !after.open && after.focus === 'concept');
  // Enter on a theme node: its section in Themes
  await page.keyboard.press('Enter');
  await choose(page, 'network');
  await page.focus('[data-node="T4"]');
  await page.keyboard.press('Enter');
  const th = { tab: await tabOn(page), focus: await focusId(page) };
  step('2.10 Enter on a theme node opens its section in Themes', 'tab themes, focus on concept-theme-T4', `tab ${th.tab}, focus on ${th.focus}`, th.tab === 'themes' && th.focus === 'concept-theme-T4');
  // hover highlights
  await choose(page, 'network');
  await page.hover('[data-node="T1"] .hit', { timeout: 120000 });
  const hov = await page.evaluate(() => { const s = document.querySelector('.concept-net'); return { dim: s.classList.contains('dim'), hl: s.querySelectorAll('.node.hl').length, label: getComputedStyle(s.querySelector('.lbl[data-for="T1"]')).visibility }; });
  const wantHl = 1 + new Set(refs.network.edges.filter((e) => e.a === 'T1' || e.b === 'T1').map((e) => (e.a === 'T1' ? e.b : e.a))).size;
  step('2.11 Hovering a node highlights it and its neighbours and dims the rest', `${wantHl} nodes highlighted, the rest dimmed`, `${hov.hl} highlighted, dimmed: ${hov.dim}`, hov.dim && hov.hl === wantHl);
  await page.mouse.move(5, 300);
  // no highlighted label overlaps an always-shown theme label (EN and HU, desktop and phone width)
  const overlaps = () => page.evaluate(() => {
    const svg = document.querySelector('.concept-net');
    const box = (t) => { const b = t.getBBox(); return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height }; };
    const themes = [...svg.querySelectorAll('.lbl.theme')].map((t) => ({ id: t.dataset.for, b: box(t) }));
    const bad = [];
    for (const t of svg.querySelectorAll('.lbl:not(.theme)')) {
      t.classList.add('on');
      const b = box(t);
      for (const th of themes) if (b.x0 < th.b.x1 && b.x1 > th.b.x0 && b.y0 < th.b.y1 && b.y1 > th.b.y0) bad.push(`${t.dataset.for}/${th.id}`);
      t.classList.remove('on');
    }
    return bad;
  });
  const ovl = [];
  for (const [w, h] of [[1366, 768], [375, 812]]) {
    await page.setViewportSize({ width: w, height: h });
    await until(page, () => document.querySelectorAll('.concept-net .lbl').length > 0);
    for (const lg of ['en', 'hu']) {
      await page.evaluate((l) => document.querySelector(`#site-nav [data-lang="${l}"]`).click(), lg);
      await page.waitForTimeout(400);
      await choose(page, 'network');
      ovl.push(`${w} ${lg}: ${(await overlaps()).join(', ') || 'none'}`);
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  step('2.12a Highlighted labels do not overlap theme labels', 'none, EN and HU, 1366 and 375 wide', ovl.join('; '), ovl.every((x) => x.endsWith('none')));
  await page.evaluate(() => document.querySelector('#site-nav [data-lang="en"]').click());
  // a language switch keeps the view
  // (the language buttons are pressed from the page, as in hud.mjs: with the 3D view drawing in
  // software a pointer click can wait a long time for the navbar to hold still)
  await page.evaluate(() => document.querySelector('#site-nav [data-lang="hu"]').click());
  await until(page, (title) => document.getElementById('panel-title')?.textContent === title, LOC.hu.ui.concept.title);
  const hu = { tab: await tabOn(page), title: await page.textContent('#panel-title'), nodes: await page.evaluate(() => document.querySelectorAll('.concept-net [data-node]').length) };
  step('2.12 A language switch keeps the view and redraws it in Hungarian', `tab network, "${LOC.hu.ui.concept.title}", ${refs.network.nodes.length} nodes`, `tab ${hu.tab}, "${hu.title}", ${hu.nodes} nodes`, hu.tab === 'network' && hu.title === LOC.hu.ui.concept.title && hu.nodes === refs.network.nodes.length);
  await page.evaluate(() => document.querySelector('#site-nav [data-lang="en"]').click());
  await until(page, (title) => document.getElementById('panel-title')?.textContent === title, LOC.en.ui.concept.title);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // inside the exhibition: a work's link goes to the work, focus on the 3D view
  await page.focus('#enter');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await until(page, () => document.body.classList.contains('entered') && document.getElementById('sound-ask').hidden);
  await page.evaluate(() => window.__ap.ui.show('concept'));
  await page.focus('#concept-view-themes [data-goto="w16-let-it-flow"]');
  await page.keyboard.press('Enter');
  await until(page, () => document.getElementById('panel').hidden);
  await until(page, (name) => document.querySelector('#room-label .room-name')?.textContent === name, LOC.en.rooms.r4.name);
  const go = { open: await panelOpen(page), focus: await focusId(page), room: await page.evaluate(() => document.querySelector('#room-label .room-name')?.textContent) };
  step('2.13 A work\'s link closes the panel and goes to the work; focus is on the 3D view', 'panel closed, focus on scene, Room 4', `panel open ${go.open}, focus on ${go.focus}, ${go.room}`, !go.open && go.focus === 'scene' && go.room === LOC.en.rooms.r4.name);
  // the viewer's Connections line
  await page.evaluate(() => window.__ap.viewer.open(window.__ap.data.works.find((w) => w.id === 'w02-human-as-error-vi')));
  const conn = await page.evaluate(() => { const c = document.getElementById('viewer-connections'); return { hidden: c.hidden, head: c.querySelector('h3')?.textContent, links: [...c.querySelectorAll('a.ref')].map((a) => a.firstChild.textContent), themes: [...c.querySelectorAll('[data-theme]')].map((b) => b.dataset.theme) }; });
  await page.focus('#viewer-connections [data-theme="T4"]');
  await page.keyboard.press('Enter');
  const viaViewer = { viewer: await page.evaluate(() => document.getElementById('viewer').hidden), panel: await panelOpen(page), tab: await tabOn(page), focus: await focusId(page) };
  step('2.14 The viewer\'s "Connections" line: the work\'s references and themes; a theme opens the Concept page at that theme', '"Connections" with R09 to R12 and themes T2, T3, T4; then the viewer closed, the Concept page on Themes, focus on concept-theme-T4', `"${conn.head}": ${conn.links.join(', ')}; themes ${conn.themes.join(', ')}; viewer hidden ${viaViewer.viewer}, panel open ${viaViewer.panel}, tab ${viaViewer.tab}, focus on ${viaViewer.focus}`, !conn.hidden && conn.head === 'Connections' && conn.links.length === 4 && conn.themes.join() === 'T2,T3,T4' && viaViewer.viewer && viaViewer.panel && viaViewer.tab === 'themes' && viaViewer.focus === 'concept-theme-T4');
  await page.keyboard.press('Escape');
  const none = await page.evaluate(() => { window.__ap.viewer.open(window.__ap.data.works.find((w) => w.id === 'w01-dresden')); return document.getElementById('viewer-connections').hidden; });
  step('2.15 A work no reference names has no "Connections" line', 'hidden at no. 1', String(none), none === true);
  allErrors.push(...errors.map((e) => `keyboard run: ${e}`));
  await ctx.close();
}

// ---------------- 3. Reduced motion: nothing on the page moves or fades
{
  const { page, ctx, errors } = await openWalk(browser, { lang: 'en', reducedMotion: 'reduce' });
  await page.evaluate(() => window.__ap.ui.show('concept'));
  await choose(page, 'network');
  await page.focus('[data-node="T1"]');
  const rm = await page.evaluate(() => {
    const s = document.querySelector('.concept-net');
    const durs = [...s.querySelectorAll('.node, .edge, .lbl')].map((n) => getComputedStyle(n).transitionDuration);
    return { transitions: [...new Set(durs)].join(' '), running: document.getAnimations().filter((a) => a.playState === 'running' && document.getElementById('panel').contains(a.effect?.target)).length, dim: s.classList.contains('dim') };
  });
  step('3.1 With prefers-reduced-motion the highlight does not fade and nothing is animated', 'transition 0s on every node, line and label; no running animation; the highlight still shows', `transitions: ${rm.transitions}; running animations: ${rm.running}; highlighted: ${rm.dim}`, rm.transitions === '0s' && rm.running === 0 && rm.dim);
  allErrors.push(...errors.map((e) => `reduced motion: ${e}`));
  await ctx.close();
}
// without the setting, only the highlight fades
{
  const { page, ctx } = await openWalk(browser, { lang: 'en' });
  await page.evaluate(() => window.__ap.ui.show('concept'));
  await choose(page, 'network');
  const t = await page.evaluate(() => { const n = document.querySelector('.concept-net .node'); const c = getComputedStyle(n); return `${c.transitionProperty} ${c.transitionDuration}`; });
  step('3.2 Without it, the only motion is the highlight\'s fade', 'opacity 0.15s', t, t === 'opacity 0.15s');
  await ctx.close();
}

// ---------------- 4. A phone, 375 px wide: opens on Themes, no sideways scroll, both languages
for (const lang of ['en', 'hu']) {
  const { page, ctx, errors } = await openWalk(browser, { lang, viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  await page.evaluate(() => window.__ap.ui.show('concept'));
  const first = await tabOn(page);
  const out = [];
  let ok = first === 'themes';
  for (const view of ['themes', 'works', 'timeline', 'network']) {
    await choose(page, view);
    const m = await page.evaluate(() => { const p = document.getElementById('panel'); const s = document.querySelector('.concept-net'); return { sw: p.scrollWidth, cw: p.clientWidth, doc: document.documentElement.scrollWidth, win: innerWidth, svg: s && !s.closest('[hidden]') ? Math.round(s.getBoundingClientRect().width) : 0, min: s && !s.closest('[hidden]') ? Math.min(...[...s.querySelectorAll('.lbl')].map((x) => parseFloat(getComputedStyle(x).fontSize))) : 0 }; });
    const fine = m.sw <= m.cw && m.doc <= m.win;
    ok &&= fine && (view !== 'network' || (m.svg <= m.cw && m.min >= 12));
    out.push(`${view}: ${m.sw}/${m.cw} px${view === 'network' ? `, diagram ${m.svg} px, labels ${m.min} px` : ''}`);
  }
  step(`4 ${lang.toUpperCase()} phone 375 × 667: the page opens on Themes; no view scrolls sideways; Network is a tab`, 'first view themes; scroll width no more than the panel in each view; the diagram fits, labels 12 px or more', `first view ${first}; ${out.join('; ')}`, ok);
  allErrors.push(...errors.map((e) => `phone ${lang}: ${e}`));
  await ctx.close();
}

step('5 No console errors in any run', 'none', allErrors.length ? allErrors.join(' | ') : 'none', allErrors.length === 0);
await browser.close();

writeFileSync('docs/accessibility/concept-test-log.md', `# Concept page and references: test log

Written by \`tests/a11y/concept.mjs\` on ${new Date().toISOString().slice(0, 10)} (Chromium, Playwright, headless, real key presses). ${log.length} steps, ${failed} failed.

| Step | Expected | Got | Result |
|---|---|---|---|
${log.map((s) => `| ${s.name} | ${String(s.expected).replace(/\|/g, '\\|')} | ${String(s.got).replace(/\|/g, '\\|')} | ${s.pass ? 'pass' : 'FAIL'} |`).join('\n')}
`);
console.log(`\n${log.length} steps, ${failed} failed; log in docs/accessibility/concept-test-log.md`);
process.exit(failed ? 1 : 0);
