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

// A phone or a low-power device: a phone or tablet as above, or any device that reports 4
// processor threads or fewer (navigator.hardwareConcurrency; a browser that does not say
// counts as 8). Safari reports 4 or 8 whatever the machine has, so some Macs are here too.
// Memory (navigator.deviceMemory) is not asked: Safari and Firefox do not offer it.
// It sets the lighter picture (main.js: no MSAA, smaller text sheets, fewer HD images) and
// the videos by room (world/videoPlan.js). A laptop with a touch screen and more than 4
// threads is neither.
export const lowPower = isTouch || (navigator.hardwareConcurrency || 8) <= 4;
