import { isTouch } from '../device.js';

// How many pixels the 3D view may draw (docs/design/rendering-proposal.md, option 1), shared
// by main.js (the drawing buffer) and gallery.js (the text sheets' resolution).
// The pixel ratio is at most 2 on a computer and 1.5 on a phone or tablet, and the drawing
// buffer holds at most MAX_PIXELS (about 1920 x 1080), whatever the ratio.
export const MAX_DPR = isTouch ? 1.5 : 2;
export const MAX_PIXELS = 2.1e6;

// The pixel ratio that keeps a w x h (CSS pixels) view under the cap.
export const pixelCapFor = (w, h) => Math.sqrt(MAX_PIXELS / Math.max(1, w * h));

// The field of view (vertical, degrees) before zoom, as main.js sets it: wider when the view
// is taller than wide, and on a phone or tablet.
export const baseFovFor = (w, h) => (w < h ? 78 : isTouch ? 72 : 66);
