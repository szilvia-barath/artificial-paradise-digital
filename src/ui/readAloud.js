// Read aloud: the browser's own speech synthesis reads a panel's text or the viewer's text
// column, in the page's language. Only a voice that lives on the device (localService) is
// used, so the words are not sent anywhere; with no such voice for the page's language the
// button says so and nothing is read in a voice of another language. Nothing is stored.
// One reading at a time: a new one, a language switch, or closing what is read stops it.
// Start and stop are said through the live region (announce.js); focus does not move.
// Without speechSynthesis in the browser there is no button.
import { t, lang, onLangChange } from '../i18n.js';
import { announce } from './announce.js';

const synth = typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null;
export const canReadAloud = !!synth;

// the page's language as a voice's language tag: British English first, then any English
const TAGS = { en: 'en-gb', hu: 'hu-hu' };
const norm = (s) => String(s || '').replace('_', '-').toLowerCase();
const voices = () => synth.getVoices() || [];
function voiceFor(code) {
  const tag = TAGS[code] || code;
  const base = tag.split('-')[0];
  const local = voices().filter((v) => v.localService === true);
  return local.find((v) => norm(v.lang) === tag) || local.find((v) => norm(v.lang).split('-')[0] === base) || null;
}
// Some browsers list their voices a moment after the page loads.
const voicesReady = (ms) => (voices().length ? Promise.resolve() : new Promise((done) => {
  const end = () => { synth.removeEventListener('voiceschanged', end); clearTimeout(timer); done(); };
  const timer = setTimeout(end, ms);
  synth.addEventListener('voiceschanged', end);
}));
const languageName = () => t(`readAloud.lang.${lang()}`);

// The text in parts a voice reads well: one paragraph each, a long one cut between sentences.
const MAX = 280;
function parts(text) {
  const out = [];
  for (const para of String(text).replace(/[↗→←]/g, '').split(/\n+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
    if (para.length <= MAX) { out.push(para); continue; }
    let buf = '';
    for (const s of para.split(/(?<=[.!?…])\s+/)) {
      if (buf && buf.length + s.length + 1 > MAX) { out.push(buf); buf = s; } else buf = buf ? `${buf} ${s}` : s;
    }
    if (buf) out.push(buf);
  }
  return out;
}

const readers = new Set();
let current = null; // the reader that is speaking
let run = 0; // counts readings, so the events of a cancelled one are let pass

function render(r) {
  const speaking = current === r;
  // "no voice" only once the browser has listed its voices and none fits
  const none = !speaking && voices().length > 0 && !voiceFor(lang());
  r.button.setAttribute('aria-pressed', String(speaking));
  if (none) r.button.setAttribute('aria-disabled', 'true');
  else r.button.removeAttribute('aria-disabled');
  r.button.textContent = speaking ? t('readAloud.stop') : none ? t('readAloud.noVoice', { language: languageName() }) : t('readAloud.start');
}
const renderAll = () => { for (const r of readers) render(r); };

// say: whether the live region says that the reading stopped
export function stopReading({ say = true } = {}) {
  if (!synth) return;
  const was = current;
  run++;
  current = null;
  synth.cancel();
  if (!was) return;
  render(was);
  if (say) announce(t('readAloud.stopped'), 'read');
}

async function start(r) {
  stopReading({ say: false });
  const id = run;
  await voicesReady(1500);
  if (id !== run) return; // stopped or started again while the voices were awaited
  const voice = voiceFor(lang());
  if (!voice) {
    renderAll();
    announce(t('readAloud.noVoiceSaid', { language: languageName() }), 'read');
    return;
  }
  const list = parts(r.getText());
  if (!list.length) return;
  current = r;
  list.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    if (i === list.length - 1) u.addEventListener('end', () => { if (id === run && current === r) finish(r); });
    u.addEventListener('error', (e) => { if (id === run && current === r && e.error !== 'interrupted' && e.error !== 'canceled') finish(r); });
    synth.speak(u);
  });
  render(r);
  announce(t('readAloud.started'), 'read');
}
function finish(r) {
  current = null;
  run++;
  render(r);
  announce(t('readAloud.done'), 'read');
}

// A Read aloud button for one place. getText() gives the words to read when it is pressed.
// Returns null where the browser has no speech synthesis (no button is shown then).
export function readAloudButton(getText) {
  if (!synth) return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'link read-aloud';
  const r = { button, getText };
  readers.add(r);
  render(r);
  button.addEventListener('click', () => {
    if (current === r) stopReading();
    else if (button.getAttribute('aria-disabled') === 'true') announce(t('readAloud.noVoiceSaid', { language: languageName() }), 'read');
    else start(r);
  });
  // stop(): what this button reads is gone (closed, or replaced by other text)
  return { button, stop: () => { if (current === r) stopReading(); } };
}

if (synth) {
  synth.addEventListener?.('voiceschanged', renderAll);
  // another language: a reading in the old one stops, and the buttons say whether there is a voice
  onLangChange(() => { stopReading(); renderAll(); });
  window.addEventListener('pagehide', () => synth.cancel());
}
