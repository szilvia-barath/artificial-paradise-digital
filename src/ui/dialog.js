// Keyboard focus for the dialogs (panels, artwork viewer, sound question): focus moves in
// when one opens, Tab and Shift+Tab stay inside while it is open, and focus goes back to
// the control that opened it when it closes. Closing on Esc stays with each dialog.

const FOCUSABLE = 'a[href], button:not([disabled]), summary, video[controls], iframe, [tabindex]:not([tabindex="-1"])';

// Can this element take focus right now? (.gone is the title screen fading out.)
export const shown = (n) => !!n && n.isConnected && !n.closest('[hidden], [inert], .gone') && n.getClientRects().length > 0;

// el: the dialog. initial(): the element to focus on opening (default: the first control).
// fallback(): where focus goes on closing if the opener is gone or hidden by then.
export function focusDialog(el, { initial, fallback } = {}) {
  let opener = null;
  let open = false;
  const items = () => [...el.querySelectorAll(FOCUSABLE)].filter(shown);
  const first = () => (initial && initial()) || items()[0];

  // On the document, so Tab also comes back in if a mouse click put focus elsewhere.
  document.addEventListener('keydown', (e) => {
    if (!open || e.key !== 'Tab') return;
    const list = items();
    if (!list.length) return;
    const a = document.activeElement;
    const head = list[0];
    const tail = list[list.length - 1];
    if (!el.contains(a)) {
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
      const target = shown(opener) ? opener : fallback && fallback();
      opener = null;
      target?.focus({ preventScroll: true });
    },
  };
}
