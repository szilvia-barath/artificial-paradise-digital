// The one polite live region (#announcer in index.html): what a screen reader says while
// you walk. It speaks at most about once a second. Messages that arrive closer together are
// read as one, and a newer message on the same topic replaces the older one, so holding a
// key to turn past three works announces the one you stop at.

const GAP = 1000; // ms between announcements
const pending = new Map(); // topic -> text, in the order the topics came up
let lastAt = -GAP;
let timer = 0;

function flush() {
  timer = 0;
  const el = document.getElementById('announcer');
  if (!el || !pending.size) return;
  const text = [...pending.values()].join(' ');
  pending.clear();
  lastAt = performance.now();
  // the same words twice in a row would not be read again: a trailing space tells them apart
  el.textContent = el.textContent === text ? `${text} ` : text;
}

export function announce(text, topic = 'general') {
  text = (text || '').trim();
  if (!text) return;
  pending.delete(topic);
  pending.set(topic, text);
  if (!timer) timer = setTimeout(flush, Math.max(0, lastAt + GAP - performance.now()));
}

// Drop a message that has not been read out yet (the work is no longer in front).
export function unannounce(topic) {
  pending.delete(topic);
}
