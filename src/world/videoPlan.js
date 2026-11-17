import { ROOMS, roomAt } from './layout.js';
import { lowPower } from '../device.js';

// Videos by room, for phones and low-power devices (the reconstructor's rule of 16 November
// 2026; PROGRESS.md, "Videos by room"). Laptops and desktops do not come here: they keep
// the nearest-screens rule in video.js.
//   - the visitor's own room: its screens play their normal loops;
//   - a screen in another room that can be seen through an opening from any share of this
//     room's floor: a light version of its loop (small picture, low bitrate, 12 s), never
//     nothing;
//   - Siluett on the end wall: always its 9 s loop, the light version being the same loop
//     at a smaller size, with its sound;
//   - a video whose sound reaches this room (audio/ambience.js) has its sound loaded here,
//     also where its picture cannot be seen or is the light version;
//   - leaving a room pauses its videos, coming back resumes them; nothing is unloaded.
// What can be seen from where is calculated from layout.js (standing points 12.5 cm apart,
// eye height 1.62 m, straight lines against the wall blocks, the curtain and the plinths):
// inferred from the model, not measured in the gallery.

// Who gets this rule: phones and low-power devices, `lowPower` in device.js (D10: a laptop
// with a touch screen is a computer here). Laptops and desktops keep the nearest screens.
export const videosByRoom = () => lowPower;

// The screens, by the name of their loop in public/video.
export const SCREENS = [
  'w03-screen',
  'w06-artificial-paradise-singapore',
  'w07-artificial-paradise-eden-project',
  'w08-wiena-wrong-landscape-i',
  'w15-wiena-wrong-landscape-ii',
  'w17-natural-life',
  'w16-projection',
  'w16-floor',
];
// The light version of Siluett is its whole loop and carries its sound; the light versions
// of the other videos with sound are shorter than their loops and silent, and their sound
// through a doorway comes from a file of its own (the loop's sound track, copied).
export const LIGHT_WITH_SOUND = new Set(['w16-projection']);
export const lightFile = (key) => `video/${key}-light.mp4`;
export const soundFile = (key) => `video/${key}-sound.m4a`;

// Visitor in a room (rows), each screen (columns, in the order of SCREENS):
//   N  its normal loop: the screen is in this room
//   L  the light version: seen from here through an opening
//   Ls the light version and its sound, which reaches this room
//   s  its sound only: heard here, not seen from here
//   -  nothing: neither seen nor heard from here
// Seen = some of the screen in view from at least one standing point (no. 15 from Room 2:
// from 2 of 492 points, a seventh of it, about 3 px wide); heard = a level of 0.02 or more
// somewhere in the room before the facing factor (reports/videos-by-room.md, sections 4 and 7).
const TABLE = {
  //    no. 3  no. 6  no. 7  no. 8  no. 15 no. 17 wall   floor
  r1: ['N',   's',   'Ls',  'L',   '-',   '-',   'L',   'L'],
  r2: ['L',   'N',   'N',   'L',   'L',   'L',   'L',   'L'],
  r3: ['L',   'Ls',  'Ls',  'N',   'L',   'Ls',  'Ls',  'L'],
  r4: ['L',   'L',   'L',   'L',   'N',   'N',   'N',   'N'],
};

const cell = (code) => ({
  pic: code[0] === 'N' ? 'normal' : code[0] === 'L' ? 'light' : null,
  snd: code === 'N' || code.endsWith('s'),
});
export const PLAN = Object.fromEntries(
  Object.entries(TABLE).map(([room, row]) => [room, Object.fromEntries(SCREENS.map((key, i) => [key, cell(row[i])]))]),
);

const RANK = { normal: 2, light: 1, null: 0 };
const both = (a, b) => Object.fromEntries(SCREENS.map((key) => [key, {
  pic: RANK[a[key].pic] >= RANK[b[key].pic] ? a[key].pic : b[key].pic,
  snd: a[key].snd || b[key].snd,
}]));
const STRIPS = ROOMS.slice(0, -1).map((r, i) => ({ x0: r.x1, x1: ROOMS[i + 1].x0, plan: both(PLAN[r.id], PLAN[ROOMS[i + 1].id]) }));

// What plays at a standing point. In a doorway, between two rooms, it is what either room
// would play, the better of the two for each screen, so the next room's loops are already
// starting as the visitor steps through.
let last = PLAN.r1;
export function planAt(x, z) {
  const room = roomAt(x, z);
  if (room) last = PLAN[room.id];
  else {
    const strip = STRIPS.find((s) => x > s.x0 && x < s.x1);
    if (strip) last = strip.plan;
  }
  return last;
}
