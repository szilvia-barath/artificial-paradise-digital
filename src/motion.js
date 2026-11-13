// The visitor's "reduce motion" setting (prefers-reduced-motion), read live from the
// system: no setting of our own and nothing stored. With it on, the walk has no grain, no
// chromatic aberration and no pulses, the camera does not bob or
// ease its zoom, and the tour jumps from stop to stop (see post.js, controls.js, tour.js,
// minimap.js and the media query at the end of style.css).
const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export const reducedMotion = () => query.matches;

export function onMotionChange(fn) {
  query.addEventListener('change', () => fn(query.matches));
}
