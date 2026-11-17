// Copies one language's content onto the exhibition data in place, so code that reads
// data.text, data.rooms or work.medium always sees that language. No browser APIs here:
// the walk (src/i18n.js) and the text edition's build step (scripts/text-edition.mjs)
// both call it, so the two read the data the same way.
export function localizeData(data, en, loc) {
  data.meta = { ...data.meta, ...en.meta, ...loc.meta };
  for (const k of ['text', 'textCredit', 'credits', 'behindTheScenes', 'source', 'openingSpeech', 'descriptions', 'accessDescriptions']) data[k] = loc[k] ?? en[k];
  data.rooms = {};
  for (const id of Object.keys(en.rooms)) data.rooms[id] = { ...en.rooms[id], ...loc.rooms?.[id] };
  for (const w of data.works) {
    w.officialTitle ??= w.title;
    Object.assign(w, { title: w.officialTitle }, en.works[w.id], loc.works?.[w.id]);
  }
  return data;
}

// The places for the descriptions still to come (i18n "accessDescriptions", see its
// _readme): a field is a string or a list of strings. paragraphs() gives a field's
// paragraphs, [] while it is empty, so an empty field shows nothing (no heading, no box).
// Each language keeps its own: an empty Hungarian field does not take the English one.
export const paragraphs = (v) => (Array.isArray(v) ? v : [v])
  .flatMap((s) => (typeof s === 'string' ? s.split(/\n\s*\n/) : []))
  .map((s) => s.trim())
  .filter(Boolean);
// A work's filled descriptions, in the order they are shown: [[kind, paragraphs], ...] with
// kind 'visual', 'video' or 'videoDoc' (the heading's key is ui.describe.<kind>). parts: the
// entries shown with the work (no. 3's screen in the accessible version), for their videos.
export function workDescriptions(data, w, parts = []) {
  const a = data.accessDescriptions || {};
  return [
    ['visual', paragraphs(a.visual?.[w.id])],
    ['video', [w, ...parts].flatMap((x) => paragraphs(a.videoText?.[x.id]))],
    ['videoDoc', paragraphs(a.videoDocText?.[w.id])],
  ].filter(([, p]) => p.length);
}
// A room's audio description: its paragraphs, [] while empty.
export const roomDescription = (data, id) => paragraphs(data.accessDescriptions?.space?.[id]);

// t(locale, en)('hud.tour') reads ui.hud.tour; keys outside "ui" (e.g. 'rooms.r1.name')
// read content. Missing keys fall back to English, then to the key itself.
const lookup = (obj, key) => key.split('.').reduce((v, k) => (v == null ? v : v[k]), obj);
export function translator(loc, en) {
  return (key, vars) => {
    let s = lookup(loc.ui, key) ?? lookup(loc, key) ?? lookup(en.ui, key) ?? lookup(en, key) ?? key;
    if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  };
}
