// Copies one language's content onto the exhibition data in place, so code that reads
// data.text, data.rooms or work.medium always sees that language. No browser APIs here:
// the walk (src/i18n.js) and the text edition's build step (scripts/text-edition.mjs)
// both call it, so the two read the data the same way.
export function localizeData(data, en, loc) {
  data.meta = { ...data.meta, ...en.meta, ...loc.meta };
  for (const k of ['text', 'textCredit', 'credits', 'behindTheScenes', 'source', 'tourIntro', 'openingSpeech', 'descriptions']) data[k] = loc[k] ?? en[k];
  data.rooms = {};
  for (const id of Object.keys(en.rooms)) data.rooms[id] = { ...en.rooms[id], ...loc.rooms?.[id] };
  for (const w of data.works) {
    w.officialTitle ??= w.title;
    Object.assign(w, { title: w.officialTitle }, en.works[w.id], loc.works?.[w.id]);
  }
  return data;
}

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
