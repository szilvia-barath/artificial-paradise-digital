// Which interface the visitor gets (D10). `isTouch` means a phone or a tablet: a touch screen
// and no mouse or trackpad. It gets the touch interface (the stick, the touch hint, no
// keycaps, no footer inside; `body.touch` in style.css).
// A laptop with a touch screen has both, and gets the computer interface. Touch goes on
// working there: what a press does is decided press by press, from the kind of pointer that
// made it (controls.js, and the aim under the mouse in main.js), not from the device.
// A mouse or a trackpad is a fine pointer that can hover. A pen is fine too but does not
// hover, so a phone with a pen stays a phone.
const mq = (q) => matchMedia(q).matches;
const touchScreen = mq('(pointer: coarse)') || 'ontouchstart' in window;
const mouse = mq('(any-pointer: fine)') && mq('(any-hover: hover)');
export const isTouch = touchScreen && !mouse;
