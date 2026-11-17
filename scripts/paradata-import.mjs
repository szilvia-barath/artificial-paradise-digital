// Copies the paradata Sheet into the repository, so the site never reads Google at runtime.
//
//   node scripts/paradata-import.mjs <paradata_3 values> --modified <ISO time of the Sheet's last change>
//
// <paradata_3 values> is the tab `paradata_3` of the Google Sheet "paradata"
// (spreadsheet 1Ie77FU_RlFTL8H4XV998ru3IHVdbq24ffNbZrLGd2xc), either as the JSON the Sheets API
// returns for spreadsheets.values.get (`{ "values": [[header…], [row…], …] }`) or as a CSV
// downloaded from the tab (File > Download > Comma-separated values). The time of the last change
// is the Drive file's `modifiedTime` (File > Version history shows it too).
//
// It writes:
// - src/data/paradata.json: the header (Sheet, tab, last change, date copied) and, for every row,
//   the columns the site uses. Nothing is filled in that the Sheet does not give.
// - src/data/exhibition.json: each work's `reconstruction`, one aspect per paradata row that
//   names the work (related_titles), or names all works or all placed works (rules below).
//   `status` is set only where every aspect of a work has the same status; otherwise it is left
//   empty and the aspects carry the statuses.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = {
  title: 'paradata',
  spreadsheetId: '1Ie77FU_RlFTL8H4XV998ru3IHVdbq24ffNbZrLGd2xc',
  tab: 'paradata_3',
};
// the columns copied into the site (the long statement, note and attribution stay in the Sheet)
const KEEP = ['decision_id', 'element', 'element_role', 'status', 'uncertainty', 'evidence_class', 'source_ids', 'related_ids', 'related_titles', 'log_ref'];

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const modified = args[args.indexOf('--modified') + 1];
if (!input || !args.includes('--modified') || !/^\d{4}-\d\d-\d\dT/.test(modified || '')) {
  console.error('usage: node scripts/paradata-import.mjs <values.json|tab.csv> --modified <ISO time>');
  process.exit(1);
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c !== ''));
}

const raw = readFileSync(input, 'utf8').replace(/^﻿/, '');
const values = input.endsWith('.csv') ? parseCSV(raw) : JSON.parse(raw).values;
const [header, ...body] = values;
for (const k of KEEP) if (!header.includes(k)) throw new Error(`column ${k} is missing from ${SHEET.tab}`);
const rows = body
  .filter((r) => r[0])
  .map((r) => Object.fromEntries(KEEP.map((k) => [k, (r[header.indexOf(k)] ?? '').trim()])));

const out = {
  _readme: `A copy of the tab '${SHEET.tab}' of the Google Sheet '${SHEET.title}', made by scripts/paradata-import.mjs; the site reads this file and never the Sheet. Only the columns the site uses are copied: the statements, notes and attributions stay in the Sheet. Every value is as the Sheet gives it; an empty string is an empty cell. To refresh it, see PROGRESS.md ("Paradata in the site").`,
  source: {
    sheet: SHEET.title,
    spreadsheetId: SHEET.spreadsheetId,
    tab: SHEET.tab,
    lastChanged: modified,
    copied: new Date().toISOString().slice(0, 10),
    columns: KEEP,
  },
  rows,
};
writeFileSync(resolve(ROOT, 'src/data/paradata.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`src/data/paradata.json: ${rows.length} rows from ${SHEET.tab} (last changed ${modified})`);

// ---------------------------------------------------------------- the works' reconstruction
const exPath = resolve(ROOT, 'src/data/exhibition.json');
const ex = JSON.parse(readFileSync(exPath, 'utf8'));
const main = (no) => ex.works.find((w) => w.no === no && w.type !== 'video') || ex.works.find((w) => w.no === no);
// A title in related_titles names a work; "Paradise Factory (monitor)" names the monitor, which is
// its own entry in exhibition.json (w03-screen); the other parts in brackets belong to their work.
function worksNamed(title) {
  const t = title.trim();
  if (t === 'Paradise Factory (monitor)') return ex.works.filter((w) => w.id === 'w03-screen');
  const base = t.replace(/\s*\(.*\)\s*$/, '');
  const w = ex.works.find((o) => o.title === base && o.id !== 'w03-screen');
  return w ? [w] : [];
}
// Rows that name every work or every placed work in related_titles, and which works they cover,
// read from the row's element (the Sheet does not list them one by one).
const RULES = {
  'all 17 works': () => ex.works,
  'all placed works': (row) => {
    if (/^Paintings: hanging height/.test(row.element)) return ex.works.filter((w) => w.type === 'painting');
    if (/^Prints and screens: hanging height/.test(row.element)) return ex.works.filter((w) => w.type === 'print' || w.type === 'video');
    if (/^Lighting on the works/.test(row.element)) return ex.works.filter((w) => w.hang); // the light pools are behind the hung works only
    throw new Error(`no rule for 'all placed works' in ${row.decision_id} (${row.element})`);
  },
};
const aspects = new Map(ex.works.map((w) => [w.id, []]));
const unmatched = [];
for (const row of rows) {
  if (!row.related_titles) continue;
  const hit = new Set();
  for (const title of row.related_titles.split(';')) {
    const rule = RULES[title.trim()];
    const ws = rule ? rule(row) : worksNamed(title);
    if (!ws.length) unmatched.push(`${row.decision_id}: ${title.trim()}`);
    for (const w of ws) hit.add(w.id);
  }
  for (const id of hit) aspects.get(id).push({ id: row.decision_id, aspect: row.element, status: row.status });
}
if (unmatched.length) throw new Error(`titles in related_titles that name no work: ${unmatched.join(', ')}`);
for (const w of ex.works) {
  const list = aspects.get(w.id);
  const statuses = [...new Set(list.map((a) => a.status))];
  const by = (s) => list.filter((a) => a.status === s).map((a) => a.id).join(', ');
  let reconstruction;
  if (!list.length) reconstruction = { status: '', note: 'not in paradata_3', aspects: [] };
  else if (statuses.length === 1 && statuses[0]) reconstruction = { status: statuses[0], note: `${SHEET.tab}: ${by(statuses[0])}.`, aspects: list };
  else {
    reconstruction = {
      status: '',
      note: `${SHEET.tab} gives a status per aspect, not one for the work: ${statuses.map((s) => `${s || 'no status'} (${by(s)})`).join('; ')}.`,
      aspects: list,
    };
  }
  w.reconstruction = reconstruction;
}
writeFileSync(exPath, `${JSON.stringify(ex, null, 2)}\n`);
console.log(`src/data/exhibition.json: reconstruction for ${ex.works.length} entries`);
