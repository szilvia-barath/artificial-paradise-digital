// Keyboard focus for the dialogs (panels, artwork viewer, sound question): focus moves in
// when one opens, Tab and Shift+Tab stay inside while it is open, the page behind it is
// inert, and focus goes back to the control that opened it when it closes. Closing on Esc
// stays with each dialog.

const FOCUSABLE = 'a[href], button:not([disabled]), summary, video[controls], iframe, [tabindex]:not([tabindex="-1"])';

// Was the last thing the visitor used a mouse, or the keyboard? Taps (and the taps a
// screen reader sends on a phone) count as neither, so they keep "back to the opener".
let byPointer = false;
document.addEventListener('pointerdown', (e) => { byPointer = e.pointerType === 'mouse'; }, true);
document.addEventListener('keydown', () => { byPointer = false; }, true);

// Can this element take focus right now? (.gone is the title screen fading out.)
export const shown = (n) => !!n && n.isConnected && !n.closest('[hidden], [inert], .gone') && n.getClientRects().length > 0;

// What lies behind an open dialog is made inert: out of the accessibility tree, so a screen
// reader's virtual cursor or swipe cannot leave the dialog, and out of reach of Tab, clicks
// and taps. The navbar stays usable behind a panel or the viewer (EN / HU, the other
// sections); the sound question adds it (sound-ask in main.js).
export const BEHIND = ['.skip-nav', '#stage', '#loader', '#site-foot'];
const behind = new Map(); // each open dialog and what lies behind it
// Only what this module made inert is woken again: the title screen, inert for good once
// inside (main.js), stays so.
const held = new Set();
function syncInert() {
  const want = new Set();
  for (const sels of behind.values()) for (const s of sels) for (const n of document.querySelectorAll(s)) want.add(n);
  for (const n of held) {
    if (want.has(n)) continue;
    held.delete(n);
    n.inert = false;
  }
  for (const n of want) {
    if (n.inert) continue;
    n.inert = true;
    held.add(n);
  }
}

// el: the dialog. initial(): the element to focus on opening (default: the first control).
// fallback(why): where focus goes on closing if the opener is gone or hidden by then.
// Called with 'mouse' when the dialog was closed with the mouse: if it returns an element
// then (main.js returns the 3D view once inside), focus goes there even though the opener
// is still on screen, so the view's letter keys work again without another click.
// behind: selectors of what is made inert while the dialog is open (default BEHIND).
export function focusDialog(el, { initial, fallback, behind: back = BEHIND } = {}) {
  let opener = null;
  let open = false;
  const items = () => [...el.querySelectorAll(FOCUSABLE)].filter(shown);
  const first = () => (initial && initial()) || items()[0];

  // On the document, so Tab also comes back in if a mouse click put focus elsewhere.
  // Focus on the dialog itself (the sound question takes it from a mouse press on its
  // backdrop or text) counts as outside its controls: Tab goes to the first, Shift+Tab to the last.
  document.addEventListener('keydown', (e) => {
    if (!open || e.key !== 'Tab') return;
    const list = items();
    if (!list.length) return;
    const a = document.activeElement;
    const head = list[0];
    const tail = list[list.length - 1];
    if (a === el || !el.contains(a)) {
      e.preventDefault();
      (e.shiftKey ? tail : head).focus();
    } else if (e.shiftKey && a === head) {
      e.preventDefault();
      tail.focus();
    } else if (!e.shiftKey && a === tail) {
      e.preventDefault();
      head.focus();
    }
  }, true);

  return {
    opened() {
      if (!open) {
        const a = document.activeElement;
        opener = a && a !== document.body && !el.contains(a) ? a : null;
      }
      open = true;
      // the opener is taken first: making the page inert takes focus away from it
      behind.set(el, back);
      syncInert();
      first()?.focus({ preventScroll: true });
    },
    // The dialog's content was rebuilt while open: if that took the focused control with
    // it, start again from the top.
    rebuilt() {
      if (open && !el.contains(document.activeElement)) first()?.focus({ preventScroll: true });
    },
    closed() {
      if (!open) return;
      open = false;
      // the page behind wakes first, so the opener can take focus again
      behind.delete(el);
      syncInert();
      // Keyboard: back to the control that opened it. Mouse, inside the walk: to the 3D view.
      const viaMouse = byPointer && fallback && fallback('mouse');
      const target = viaMouse || (shown(opener) ? opener : fallback && fallback());
      opener = null;
      target?.focus({ preventScroll: true });
    },
  };
}
