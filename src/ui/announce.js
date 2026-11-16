// The one polite live region (#announcer in index.html): what a screen reader says while
// you walk. It speaks at most about once a second. Messages that arrive closer together are
// read as one, and a newer message on the same topic replaces the older one, so holding a
// key to turn past three works announces the one you stop at.

const GAP = 1000; // ms between announcements
const pending = new Map(); // topic -> text, in the order the topics came up
let lastAt = -GAP;
let timer = 0;

// Words in another language than the page's (on the Hungarian page, the English work
// titles): each is put in a <span lang="..."> in the message, so a screen reader reads it
// in its own language. Longest first, so "Artificial Paradise II" is not cut short.
let foreign = [];
export function setForeign(list) {
  foreign = list.filter((f) => f.text).sort((a, b) => b.text.length - a.text.length);
}
function render(el, text) {
  const nodes = [];
  let at = 0;
  while (at < text.length) {
    let hit = null;
    for (const f of foreign) {
      const i = text.indexOf(f.text, at);
      if (i >= 0 && (!hit || i < hit.i)) hit = { i, f };
    }
    if (!hit) break;
    if (hit.i > at) nodes.push(text.slice(at, hit.i));
    const span = document.createElement('span');
    span.lang = hit.f.lang;
    span.textContent = hit.f.text;
    nodes.push(span);
    at = hit.i + hit.f.text.length;
  }
  if (at < text.length) nodes.push(text.slice(at));
  el.replaceChildren(...nodes);
}

function flush() {
  timer = 0;
  const el = document.getElementById('announcer');
  if (!el || !pending.size) return;
  const text = [...pending.values()].join(' ');
  pending.clear();
  lastAt = performance.now();
  // the same words twice in a row would not be read again: a trailing space tells them apart
  render(el, el.textContent === text ? `${text} ` : text);
}

export function announce(text, topic = 'general') {
  text = (text || '').trim();
  if (!text) return;
  pending.set(topic, text); // a topic keeps its place in the queue when its text is replaced
  if (!timer) timer = setTimeout(flush, Math.max(0, lastAt + GAP - performance.now()));
}

// Drop a message that has not been read out yet (the work is no longer in front).
export function unannounce(topic) {
  pending.delete(topic);
}
