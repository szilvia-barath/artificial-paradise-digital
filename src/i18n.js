import en from './i18n/en.json';
import hu from './i18n/hu.json';
import { localizeData, translator } from './localize.js';

// Two languages. Every text a visitor reads lives in src/i18n/<lang>.json: "ui" holds
// the interface strings, the rest is exhibition content (texts, room names, captions)
// that localize() copies onto the shared exhibition data. Missing keys fall back to
// English. The language itself is picked before first paint by the inline script in
// index.html (?lang= → saved choice → browser language) and read here from <html lang>.

export const LOCALES = { en, hu };
const KEY = 'ap-lang';
let current = LOCALES[document.documentElement.lang] ? document.documentElement.lang : 'en';
const listeners = new Set();

export const lang = () => current;

// t('hud.tour') reads ui.hud.tour; keys outside "ui" (e.g. 'rooms.r1.name') read content.
export function t(key, vars) {
  return translator(LOCALES[current], en)(key, vars);
}

// Sets an element's text from a key and remembers it, so a language switch re-renders it.
export function setText(el, key, vars) {
  el.dataset.i18n = key;
  if (vars) el.dataset.i18nVars = JSON.stringify(vars);
  else delete el.dataset.i18nVars;
  el.textContent = t(key, vars);
}

// Static markup: data-i18n="key" sets the text, data-i18n-attr="title:key;aria-label:key"
// sets attributes.
export function applyStatic(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n, el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : undefined);
  }
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }
  }
  for (const b of root.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === current));
  const html = document.documentElement;
  html.lang = current;
  html.classList.remove('i18n-wait');
  document.title = t('docTitle');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('docDescription'));
}

// Copies the current language's content onto the exhibition data in place, so code that
// reads data.text, data.rooms or work.caption always sees the current language.
export function localize(data) {
  return localizeData(data, en, LOCALES[current]);
}

export function onLangChange(fn) {
  listeners.add(fn);
}

export function setLang(next) {
  if (!LOCALES[next] || next === current) return;
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // private mode / blocked storage: the choice still lives in the URL
  }
  const url = new URL(location.href);
  url.searchParams.set('lang', next);
  history.replaceState(history.state, '', url);
  applyStatic();
  for (const fn of listeners) fn(next);
}
