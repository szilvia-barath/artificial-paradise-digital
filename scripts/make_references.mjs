// Reads the reference table (references/*.csv) and writes src/data/references.json: the
// references and concepts mentioned in the exhibition's texts, the themes, the three
// footnotes of the opening speech, and the network diagram's layout.
// Usage: node scripts/make_references.mjs
// It checks every anchor against the texts in src/i18n (the same matching the site uses,
// src/refs.js) and stops with a message if an anchor is not found or two links overlap.
// Nothing is invented: an empty cell stays an empty string. The few rules the table gives
// in words (its "note" column) are written out below, each with the note it comes from.
import { readFileSync, writeFileSync } from 'node:fs';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';
import { locate, locateFootnotes, linkFor } from '../src/refs.js';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// ---- CSV (RFC 4180: quoted cells, doubled quotes, line breaks inside quotes) ----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== '')) rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}
const table = (name) => parseCSV(read(`references/${name}.csv`));
const list = (s) => s.split(';').map((v) => v.trim()).filter(Boolean);
const fail = (msg) => { console.error(`make_references: ${msg}`); process.exit(1); };

// ---- The texts in the site, by the names the table uses under mentioned_in ----
// key: where the text lives in src/i18n (openingSpeech.text, descriptions.<id>.text).
// title: the text's name on the Concept page (the work or series title, English in both
// languages as everywhere on the site); kind: a word added to tell two texts with the same
// title apart (ui.concept.textKind in src/i18n). The opening speech takes its title and
// author from src/i18n, the supporters their label from the credits.
const TEXTS = {
  'Opening speech': { key: 'openingSpeech', row: 'Opening speech' },
  'Human as Error': { key: 'descriptions.human-as-error', title: 'Human as Error', row: 'Human as Error' },
  'Artificial Paradise videos': { key: 'descriptions.artificial-paradise-videos', title: 'Artificial Paradise', kind: 'videos', row: 'Artificial Paradise – Singapore / The Eden project' },
  'Artificial Paradise prints': { key: 'descriptions.artificial-paradise-prints', title: 'Artificial Paradise', kind: 'prints', row: '' },
  'Paradise Factory': { key: 'descriptions.paradise-factory', title: 'Paradise Factory', row: '' },
  'Let it Flow': { key: 'descriptions.let-it-flow', title: 'Let it Flow', row: 'Let it Flow' },
  'Natural Life': { key: 'descriptions.natural-life', title: 'Natural Life', row: 'Natural Life (Let It Flow)' },
  Supporters: { key: 'credits.supporters', row: 'Supporters' },
};
// "Opening speech (S12), footnote 1" -> ['openingSpeech']; "Let it Flow; Natural Life (S13)"
// -> both texts.
function textKeys(mentioned, id) {
  const names = mentioned.replace(/,\s*footnote \d+/, '').split(';').map((s) => s.replace(/\(.*?\)/g, '').trim()).filter(Boolean);
  return names.map((n) => {
    if (!TEXTS[n]) fail(`${id}: mentioned_in names a text this script does not know: "${n}"`);
    return TEXTS[n].key;
  });
}

// ---- Rules the table gives in its notes ----
const RULES = {
  // X02's note: link the word in the sentence that calls the greenhouse the archetype; the
  // earlier occurrences sit inside "greenhouse effect" (X01), "greenhouses" and
  // "greenhouse metaphor".
  X02: { passage: { en: 'The greenhouse, the archetype of the artificial, humanly controlled environment', hu: 'Az üvegház mint a mesterséges, emberileg kontrollált környezet' } },
  // X11's note: "link only the speech".
  X11: { texts: ['openingSpeech'] },
  // R20's note: no English Wikipedia article; the Academy's English pages on the English
  // page, url_primary on the Hungarian page, no language mark.
  R20: { fixed: { en: 'https://www.mma.hu/en/web/en', hu: null } },
};
// The supporters (R19–R21) have no anchor in the table: they are not in a text but in the
// credits line "Supported by", three names in this order. Each name as a whole is the
// link; `word` is checked to be in the name, in both languages.
const SUPPORTERS = [
  { id: 'R19', word: { en: 'National Cultural Fund', hu: 'Nemzeti Kulturális Alap' } },
  { id: 'R20', word: { en: 'Hungarian Academy of Arts', hu: 'Magyar Művészeti Akadémia' } },
  { id: 'R21', word: { en: 'Erzsébetváros', hu: 'Erzsébetváros' } },
];
const SUPPORTERS_ROW = 4; // the credits line, the same place in en.json and hu.json
const SUPPORTERS_SEP = ' · ';
// The three footnotes of the original opening speech (source S12): the marker goes after
// the sentence that ends with these words; the note is the reference's citation, linked to
// its url_primary.
const FOOTNOTES = [
  { n: 1, ref: 'R02', after: { en: 'and so warm the atmosphere.', hu: 'és visszasugározzák, ezáltal pedig melegítik a légkört.' } },
  { n: 2, ref: 'R04', after: { en: 'In other words, only one step separates the artificial paradise from a real hell.', hu: 'Azaz a mesterséges mennyországot csak egy lépés választja el a valódi pokoltól.' } },
  { n: 3, ref: 'R05', after: { en: 'to distil the eternal from the transitory.”', hu: 'az átmenetiből kiszűrje a maradandót”.' } },
];

// ---- Works: catalogue ids (ap-w01 … ap-w17) to the site's work ids, by number ----
const exhibition = JSON.parse(read('src/data/exhibition.json'));
const workByNo = new Map();
for (const w of exhibition.works) if (!workByNo.has(w.no)) workByNo.set(w.no, w.id); // the first entry per number (no. 3: the installation, not its screen)
const workId = (cat, id) => {
  const m = /^ap-w(\d+)$/.exec(cat);
  const w = m && workByNo.get(Number(m[1]));
  if (!w) fail(`${id}: no work for catalogue id "${cat}" in src/data/exhibition.json`);
  return w;
};
const catalogueOrder = (a, b) => exhibition.works.findIndex((w) => w.id === a) - exhibition.works.findIndex((w) => w.id === b);

// ---- Items: every reference, and every suggestion whose "include" starts with "yes" ----
const yearOf = (s) => { const m = /\d{4}/.exec(s); return m ? Number(m[0]) : null; };
const items = [];
for (const r of table('references')) {
  const id = r.ref_id;
  // An anchor that is itself "footnote N" (R02) has no words in the text: the footnote is its link.
  const inline = !!r.anchor_en && !/^footnote \d+/.test(r.anchor_en);
  items.push({
    id,
    kind: 'reference',
    label: { en: r.label_en, hu: r.label_hu },
    type: r.type,
    subtype: r.subtype,
    date: r.date_in_text,
    year: yearOf(r.date_in_text),
    mentionedIn: r.mentioned_in,
    texts: RULES[id]?.texts || textKeys(r.mentioned_in, id),
    works: list(r.related_works).map((c) => workId(c, id)),
    anchor: { en: inline ? r.anchor_en : '', hu: inline ? r.anchor_hu : '' },
    inline,
    ...(RULES[id]?.passage ? { passage: RULES[id].passage } : {}),
    url: { en: r.url_en, hu: r.url_hu, primary: r.url_primary },
    ...(RULES[id]?.fixed ? { fixed: { en: RULES[id].fixed.en, hu: RULES[id].fixed.hu ?? r.url_primary } } : {}),
    wikidata: r.wikidata,
    citation: r.citation,
    themes: list(r.themes_proposed),
    note: r.note,
  });
}
for (const s of table('suggestions')) {
  if (!s.include.startsWith('yes')) continue;
  const id = s.sug_id;
  items.push({
    id,
    kind: 'concept',
    label: { en: s.label_en, hu: s.label_hu },
    type: s.type,
    subtype: '',
    date: '',
    year: null,
    mentionedIn: s.mentioned_in,
    texts: RULES[id]?.texts || textKeys(s.mentioned_in, id),
    works: [],
    anchor: { en: s.anchor_en, hu: s.anchor_hu },
    inline: !!s.anchor_en,
    ...(RULES[id]?.passage ? { passage: RULES[id].passage } : {}),
    url: { en: s.url_en, hu: s.url_hu, primary: '' },
    wikidata: s.wikidata,
    citation: '',
    themes: list(s.themes_proposed),
    note: s.note,
  });
}
const byId = new Map(items.map((it) => [it.id, it]));

// ---- Themes ----
const themes = table('themes').map((t) => {
  const refs = [...list(t.refs), ...list(t.suggestions)];
  for (const r of refs) if (!byId.has(r)) fail(`${t.theme_id}: names ${r}, which is not in the table (or not included)`);
  const all = t.works.trim() === 'all';
  return {
    id: t.theme_id,
    label: { en: t.label_en_proposed, hu: t.label_hu_proposed },
    refs,
    works: all ? 'all' : list(t.works).map((c) => workId(c, t.theme_id)),
    url: { en: t.url_en, hu: t.url_hu, primary: '' },
    wikidata: t.wikidata,
    status: t.status,
    confirmed: t.status.startsWith('confirmed'),
    intro: { en: t.intro_en, hu: t.intro_hu },
  };
});
const themeIds = new Set(themes.map((t) => t.id));
for (const it of items) for (const t of it.themes) if (!themeIds.has(t)) fail(`${it.id}: themes_proposed names ${t}, which is not in themes.csv`);

// ---- Check the anchors against the texts, in both languages ----
const LOCALES = { en: JSON.parse(read('src/i18n/en.json')), hu: JSON.parse(read('src/i18n/hu.json')) };
const paragraphs = (loc, key) => (key === 'openingSpeech' ? loc.openingSpeech.text : loc.descriptions[key.slice(13)]?.text);
const textKeysUsed = [...new Set(items.flatMap((it) => it.texts))].filter((k) => k !== 'credits.supporters');
const report = { found: [], notFound: [], repeats: [], fallbacks: [] };
for (const lang of ['en', 'hu']) {
  const foundIn = new Map(); // id -> texts where its anchor was found
  for (const key of textKeysUsed) {
    const paras = paragraphs(LOCALES[lang], key);
    if (!paras) fail(`the text "${key}" is not in src/i18n/${lang}.json`);
    const { hits, missing, repeats, overlaps } = locate(items, key, paras, lang);
    if (overlaps.length) fail(`${lang}, ${key}: two links overlap: ${overlaps.map((o) => o.join(' and ')).join('; ')}`);
    for (const h of hits) {
      foundIn.set(h.id, [...(foundIn.get(h.id) || []), key]);
      report.found.push(`${lang} ${h.id} "${byId.get(h.id).anchor[lang]}" in ${key}, paragraph ${h.para + 1}`);
    }
    for (const id of missing) report.notFound.push(`${lang} ${id} "${byId.get(id).anchor[lang]}" not in ${key}`);
    for (const r of repeats) report.repeats.push(`${lang} ${r.id} "${byId.get(r.id).anchor[lang]}" occurs ${r.count} times in ${key}: the ${byId.get(r.id).passage ? 'one in the passage its note names' : 'first'} is linked`);
  }
  // An anchor must be found in at least one of the texts its row names.
  for (const it of items) {
    if (!it.inline || it.texts.includes('credits.supporters')) continue;
    if (!it.anchor[lang]) fail(`${it.id}: anchor_${lang} is empty`);
    if (!foundIn.has(it.id)) fail(`${it.id}: anchor_${lang} "${it.anchor[lang]}" was not found in ${it.texts.join(' or ')} (src/i18n/${lang}.json)`);
  }
  // The supporters' line.
  const names = LOCALES[lang].credits[SUPPORTERS_ROW][1].split(SUPPORTERS_SEP);
  if (names.length !== SUPPORTERS.length) fail(`${lang}: the supporters' line has ${names.length} names, expected ${SUPPORTERS.length}`);
  SUPPORTERS.forEach((s, i) => {
    if (!names[i].includes(s.word[lang])) fail(`${lang}: supporter ${i + 1} ("${names[i]}") does not look like ${s.id} ("${s.word[lang]}")`);
    report.found.push(`${lang} ${s.id} "${names[i]}" in the credits (supporters)`);
  });
  // The footnotes.
  const marks = locateFootnotes(FOOTNOTES, LOCALES[lang].openingSpeech.text, lang);
  for (const f of FOOTNOTES) {
    const m = marks.find((x) => x.n === f.n);
    if (!m) fail(`footnote ${f.n}: the sentence ending "${f.after[lang]}" is not in the opening speech (${lang})`);
    report.found.push(`${lang} footnote ${f.n} (${f.ref}) after "…${f.after[lang].slice(-40)}", paragraph ${m.para + 1}`);
  }
  // Links that fall back to another language.
  for (const it of [...items, ...themes]) {
    const l = linkFor(it, lang);
    if (l?.mark) report.fallbacks.push(`${lang} ${it.id} ${it.label[lang]}: ${l.href} (marked ${l.mark})`);
  }
}
const footnotes = FOOTNOTES.map((f) => {
  const r = byId.get(f.ref);
  if (!r.citation || !r.url.primary) fail(`footnote ${f.n}: ${f.ref} needs a citation and a url_primary`);
  return { n: f.n, ref: f.ref, after: f.after, citation: r.citation, url: r.url.primary };
});

// ---- The network: nodes, edges and a layout worked out here, not in the browser ----
// Nodes: the themes, every item, and every work that a theme or an item names. Edges:
// item to theme (themes_proposed), item to work (related_works), theme to work (works in
// themes.csv; "all" draws no edges). The layout is d3-force with fixed starting places and
// a fixed number of steps (its random source is seeded), so the same table always gives
// the same picture. A node's position carries no meaning.
const edges = [];
for (const it of items) {
  for (const t of it.themes) edges.push({ a: it.id, b: t, kind: 'item-theme' });
  for (const w of it.works) edges.push({ a: it.id, b: w, kind: 'item-work' });
}
for (const t of themes) if (t.works !== 'all') for (const w of t.works) edges.push({ a: t.id, b: w, kind: 'theme-work' });
const workNodes = [...new Set(edges.map((e) => e.b).filter((b) => !byId.has(b) && !themeIds.has(b)))].sort(catalogueOrder);
const nodes = [
  ...themes.map((t) => ({ id: t.id, kind: 'theme' })),
  ...items.map((it) => ({ id: it.id, kind: 'item' })),
  ...workNodes.map((id) => ({ id, kind: 'work' })),
];
const W = 1000;
const H = 760;
nodes.forEach((n, i) => {
  if (n.kind === 'theme') {
    const a = (i / themes.length) * 2 * Math.PI - Math.PI / 2;
    n.x = W / 2 + Math.cos(a) * W * 0.3;
    n.y = H / 2 + Math.sin(a) * H * 0.3;
  } else {
    // a sunflower spiral: every node starts at its own fixed place
    const r = 14 * Math.sqrt(i + 1);
    const a = i * 2.39996323;
    n.x = W / 2 + Math.cos(a) * r * 3;
    n.y = H / 2 + Math.sin(a) * r * 3;
  }
});
const sim = forceSimulation(nodes)
  .force('link', forceLink(edges.map((e) => ({ source: e.a, target: e.b }))).id((n) => n.id).distance((l) => (l.source.kind === 'theme' || l.target.kind === 'theme' ? 95 : 70)).strength(0.5))
  .force('charge', forceManyBody().strength((n) => (n.kind === 'theme' ? -900 : -160)))
  .force('collide', forceCollide().radius((n) => (n.kind === 'theme' ? 78 : 24)).iterations(2))
  .force('x', forceX(W / 2).strength(0.06))
  .force('y', forceY(H / 2).strength(0.085))
  .stop();
for (let i = 0; i < 400; i++) sim.tick();
// Positions as shares of the picture (0 to 1), with a margin for the labels.
const xs = nodes.map((n) => n.x);
const ys = nodes.map((n) => n.y);
const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
const share = (v, a, b, pad) => Number((pad + ((v - a) / (b - a)) * (1 - 2 * pad)).toFixed(4));
const degree = (id) => edges.filter((e) => e.a === id || e.b === id).length;
const network = {
  aspect: Number((H / W).toFixed(3)),
  nodes: nodes.map((n) => ({ id: n.id, kind: n.kind, x: share(n.x, x0, x1, 0.09), y: share(n.y, y0, y1, 0.07), links: degree(n.id) })),
  edges,
};

// ---- Texts: names and authors for "Mentioned in" and the quoted passages ----
const textRows = table('texts');
const texts = {};
for (const def of Object.values(TEXTS)) {
  const row = textRows.find((r) => r.text === def.row);
  texts[def.key] = { title: def.title || '', kind: def.kind || '', author: row?.author || (def.key.startsWith('descriptions.') ? textRows.find((r) => r.text === 'Human as Error').author : ''), source: row?.source_id || '' };
}

const out = {
  _readme: 'Written by scripts/make_references.mjs from references/*.csv. Do not edit by hand: change the table and run the script. Ids are the table\'s own (R = reference, X = concept, T = theme). Empty cells stay empty strings. network: positions are shares of the picture (0 to 1), computed with d3-force at build time; a node\'s position carries no meaning.',
  texts,
  supporters: { row: SUPPORTERS_ROW, sep: SUPPORTERS_SEP, ids: SUPPORTERS.map((s) => s.id) },
  items,
  themes,
  footnotes,
  network,
};
writeFileSync(new URL('src/data/references.json', root), `${JSON.stringify(out, null, 1)}\n`);

console.log(`references.json: ${items.filter((i) => i.kind === 'reference').length} references, ${items.filter((i) => i.kind === 'concept').length} concepts, ${themes.length} themes, ${footnotes.length} footnotes; network: ${nodes.length} nodes, ${edges.length} edges`);
console.log(`\nAnchors found (${report.found.length}):\n  ${report.found.join('\n  ')}`);
console.log(`\nAnchors not found in one of the texts their row names (${report.notFound.length}; each was found in another):\n  ${report.notFound.join('\n  ') || 'none'}`);
console.log(`\nAnchors that occur more than once (${report.repeats.length}):\n  ${report.repeats.join('\n  ') || 'none'}`);
console.log(`\nLinks that fall back to the other language (${report.fallbacks.length}):\n  ${report.fallbacks.join('\n  ') || 'none'}`);
console.log(`\nThemes waiting for an introduction: ${themes.filter((t) => !(t.confirmed && t.intro.en && t.intro.hu)).map((t) => `${t.id} (${t.status || 'no status'})`).join(', ') || 'none'}`);
