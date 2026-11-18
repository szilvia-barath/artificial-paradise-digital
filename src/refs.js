// References in the exhibition's texts: where each anchor sits, and which link it gets.
// No browser APIs here: the site (src/ui/reflinks.js), the accessible version's build step
// and scripts/make_references.mjs all call it, so the three find the same words. The texts
// in src/i18n are never edited: links and footnote markers are laid over them when they
// are shown.

const isWordChar = (ch) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);

// Every whole-word occurrence of `anchor` in `text` (never part of a longer word).
export function occurrences(text, anchor) {
  const out = [];
  if (!anchor) return out;
  for (let i = text.indexOf(anchor); i >= 0; i = text.indexOf(anchor, i + 1)) {
    if (!isWordChar(text[i - 1]) && !isWordChar(text[i + anchor.length])) out.push(i);
  }
  return out;
}

// The texts that carry links, by key: the opening speech and the artist's texts on the
// works. `data` is the localized exhibition data (data.openingSpeech, data.descriptions).
export function textParagraphs(data, key) {
  if (key === 'openingSpeech') return data.openingSpeech?.text || [];
  if (key.startsWith('descriptions.')) return data.descriptions?.[key.slice(13)]?.text || [];
  return [];
}

// Where the items' anchors sit in one text (its paragraphs), in one language.
// An item is linked once per text: at its first whole-word occurrence, or, where the table
// names the passage (item.passage), at the anchor inside that passage.
// Returns hits ({ id, para, start, end }, in reading order), the ids not found, the ids
// whose anchor occurs more than once ({ id, count }) and any two hits that overlap.
export function locate(items, key, paras, lang) {
  const hits = [];
  const missing = [];
  const repeats = [];
  for (const it of items) {
    if (!it.inline || !it.texts.includes(key)) continue;
    const anchor = it.anchor[lang];
    if (!anchor) continue;
    let hit = null;
    let count = 0;
    const passage = it.passage?.[lang];
    paras.forEach((p, para) => {
      const all = occurrences(p, anchor);
      count += all.length;
      if (hit) return;
      if (passage) {
        const at = p.indexOf(passage);
        if (at < 0) return;
        const rel = occurrences(passage, anchor)[0];
        if (rel === undefined) return;
        hit = { id: it.id, para, start: at + rel, end: at + rel + anchor.length };
      } else if (all.length) hit = { id: it.id, para, start: all[0], end: all[0] + anchor.length };
    });
    if (!hit) missing.push(it.id);
    else {
      hits.push(hit);
      if (count > 1) repeats.push({ id: it.id, count });
    }
  }
  hits.sort((a, b) => a.para - b.para || a.start - b.start);
  const overlaps = [];
  for (let i = 1; i < hits.length; i++) {
    const a = hits[i - 1];
    const b = hits[i];
    if (a.para === b.para && b.start < a.end) overlaps.push([a.id, b.id]);
  }
  return { hits, missing, repeats, overlaps };
}

// Where the footnote markers go in the opening speech: after the sentence that ends with
// footnote.after[lang]. Returns { n, para, at } (at: the index just after those words).
export function locateFootnotes(footnotes, paras, lang) {
  const out = [];
  for (const f of footnotes) {
    const tail = f.after[lang];
    paras.some((p, para) => {
      const i = p.indexOf(tail);
      if (i < 0) return false;
      out.push({ n: f.n, para, at: i + tail.length });
      return true;
    });
  }
  return out;
}

// The link for an item on a page in `lang`: the page language's own link first; if it is
// empty, the other language's link, marked with that language ("EN" on the Hungarian page,
// "HU" on the English one); then the primary source. `fixed` (R20) names a link per
// language and gets no mark. Returns { href, mark } or null.
export function linkFor(it, lang) {
  const other = lang === 'en' ? 'hu' : 'en';
  if (it.fixed?.[lang]) return { href: it.fixed[lang], mark: '' };
  if (it.url[lang]) return { href: it.url[lang], mark: '' };
  if (it.url[other]) return { href: it.url[other], mark: other.toUpperCase() };
  if (it.url.primary) return { href: it.url.primary, mark: '' };
  return null;
}
