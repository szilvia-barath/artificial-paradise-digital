import { applyStatic, setLang, setText, t } from './i18n.js';
import { announce } from './ui/announce.js';

// Entry point. Translates the title screen, navbar and footer straight away (this chunk
// is a few kB), then loads the 3D exhibition, which is the heavy part.

applyStatic();

for (const b of document.querySelectorAll('[data-lang]')) {
  b.addEventListener('click', () => setLang(b.dataset.lang));
}

// Phone navbar: the links fold into a small menu.
const nav = document.getElementById('site-nav');
const toggle = nav.querySelector('.nav-toggle');
const closeMenu = () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
};
toggle.addEventListener('click', () => {
  const open = !nav.classList.contains('open');
  nav.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', (e) => {
  if (e.target.closest('[data-nav], [data-lang], a[href]')) closeMenu();
});
document.addEventListener('pointerdown', (e) => {
  if (!nav.contains(e.target)) closeMenu();
});
// Esc closes the open menu and puts focus back on its button; nothing else hears that Esc.
nav.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !nav.classList.contains('open')) return;
  e.stopPropagation();
  closeMenu();
  toggle.focus();
});
// The menu closes when focus leaves the navbar for another control (Tab past the last
// language button, Shift+Tab before the menu button). A press that moves focus nowhere is
// left to the pointerdown above.
nav.addEventListener('focusout', (e) => {
  if (e.relatedTarget && !nav.contains(e.relatedTarget)) closeMenu();
});

// The footer wraps onto more lines in a narrow window. Everything placed above it (the
// toolbar, the on-screen keys, the focus frame) reads its real height from --foot-h, so
// the footer never covers a control or its focus ring.
const foot = document.getElementById('site-foot');
const syncFoot = () => document.documentElement.style.setProperty('--foot-h', `${foot.offsetHeight}px`);
// Where the footer wraps, the dot between the last item of one line and the first of the
// next is hidden, so no line ends or starts with a lone "·". Hiding keeps its place
// (visibility), so it never changes where the footer wraps. In a narrow window CSS puts
// all the dots away.
const seps = [...foot.querySelectorAll('.sep')];
const shown = (el) => el.getClientRects().length > 0;
const middle = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
const neighbour = (el, dir) => {
  let n = el[dir];
  while (n && (!shown(n) || n.classList.contains('sep'))) n = n[dir];
  return n;
};
function markWraps() {
  for (const s of seps) {
    if (!shown(s)) continue;
    const y = middle(s);
    const a = neighbour(s, 'previousElementSibling');
    const b = neighbour(s, 'nextElementSibling');
    s.classList.toggle('at-wrap', !a || !b || Math.abs(middle(a) - y) > 3 || Math.abs(middle(b) - y) > 3);
  }
}
if ('ResizeObserver' in window) {
  const ro = new ResizeObserver(() => { syncFoot(); markWraps(); });
  ro.observe(foot);
  // a language switch changes the items' widths, and with them where the footer wraps
  for (const el of foot.children) ro.observe(el);
}

// If the scene can't start, say so on the title screen instead of leaving it on
// "Preparing the basement…" for ever. Only a real start-up failure counts: main.js could
// not be loaded, or it stopped while it ran (no WebGL: three.js throws when it cannot
// create the context). A later error, a texture that fails on a slow phone say, is not
// one: the loading goes on and ends in "Ready". After a failure the state is "failed",
// and markReady() in main.js then announces nothing.
function showFailure(err) {
  if (document.body.dataset.state === 'ready') return;
  document.body.dataset.state = 'failed';
  const label = document.getElementById('progress-label');
  setText(label, 'loader.failure');
  label.classList.add('error');
  announce(t('loader.failure'), 'loader');
  console.error(err);
}

import('./main.js').catch(showFailure);
