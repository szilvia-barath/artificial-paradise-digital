// Floor plan of the MAMŰ basement, in metres, traced from the gallery's measured plan
// ("Alaprajz_ok new.jpg") at 0.026 m per plan pixel, not from the room sheet seen in
// DSC_0049: Room 1 5.0 × 7.0 m, Room 2 4.0 m wide, Room 3 5.4 m and Room 4 9.5 m long,
// Rooms 2–4 4.0 m deep. Openings, recesses and where things stand were checked against
// the photos: the Room 1 panorama (camera solved from the corner bearings), brick
// courses, floor tiles and the listed canvas sizes. The inner room sizes agree with the
// measurement reference of 18 and 19 November 2026 (MAMU_measurement_reference.md, with the
// Blender reference model; its frame is this one shifted: x here = x there - 0.15, z here =
// z there in Room 1 and z there + 0.05 in Rooms 2 to 4).
// Orientation (corrected 19 November 2026): the gallery is in the basement of Damjanich
// utca 39, a corner building. The street door and both Room 1 windows are on the Murányi
// utca front (Street View, confirmed by the reconstructor), so Room 1's 7 m window wall lies
// along Murányi utca and +x (Room 1 -> Room 4) points to bearing 56° into the block,
// parallel to Damjanich utca; +z (plan south) points to bearing 146°. OpenStreetMap (way
// 257583285): Murányi front 26.46 m, the south party wall runs 31.6 m into the block; the
// basement's length along +x has to fit that 31.6 m, and does. (Until 19 November this
// comment had +x at bearing 146° and compared the basement's length with the 26.5 m front,
// the wrong pair.)
//
// Room 1 is the exception: its walls come from the panorama measurement (see BLOCKS).
//
// x = right on the plan, z = down on the plan, y = up ("north/south/east/west" in this
// code mean plan directions, not compass ones). The origin is Room 1's north wall, 0.35 m
// west of its west wall face.
//
//   Room 1 (stairs, paintings, Paradise Factory) → Room 2 (videos, bar) →
//   Room 3 (prints) | Room 4 (Let it Flow), 3 and 4 being one long room split only
//   by two short wall stubs.

// Rooms 3 and 4 stand 0.15 m further east than the plan drawing puts them (19 November 2026):
// the wall between Rooms 2 and 3 is 0.50 m thick, two bricks (DSC_0064: the side of the bar's
// pass-through; inferred, +-0.1 m; the reconstructor's decision), not the 0.35 m the plan
// draws. Every x of Rooms 3 and 4 in this code is 0.15 more than before that date, and 0.15
// more than the measurement reference gives after its own shift; x values quoted in comments
// written earlier are in the old frame. The river's data (river.json, written by scripts in
// the old frame) is shifted where it is read (letItFlow.js, gallery.js).
export const R34_SHIFT = 0.15;

export const EYE = 1.62;

// Room 1 is 5.0 × 7.0 m (the gallery's measured plan). Change W and D here and the walls,
// stairs, bench, windows and Paradise Factory follow.
export const R1 = { W: 5.0, D: 7.0, east: 4.85, recess: 5.4 };
R1.west = R1.east - R1.W;

// Ceilings. No source records a height; all are photo estimates, +-0.2 m (inferred):
// Room 1 2.80 m (the 190 cm canvas in DSC_0018 gives 2.7 to 2.8, the 90 x 120 canvas in
// DSC_0026 at least 2.70, the doorway in DSC_0021 2.75 to 2.95; the measurement reference of
// 19 November 2026; 3.0 until then, with no source), Rooms 2 and 3 2.75 m, Room 4's vaults
// spring at 2.92 m (R4_VAULT, measured on DSC_0113 against the end wall's 4.00 m width).
export const R1_CEILING = 2.8;

export const ROOMS = [
  {
    id: 'r1',
    x0: R1.west, x1: R1.east, z0: 0, z1: R1.D,
    ceiling: R1_CEILING,
    // In the open middle of the room, east of Paradise Factory (the foot of the stairs is
    // too tight between the flight and the walls), looking across the plant to the stairs.
    spawn: { x: 3.4, z: 4.4, look: { x: 1.0, z: 2.4 } },
  },
  {
    id: 'r2',
    // south: z 5.122 at the corridor and behind the bar (its inner edge); west of the corridor
    // the wall with the room sheet stands at z 4.55 inside this box (Room 2's model, 21
    // November 2026; it was z 5.73)
    x0: 5.85, x1: 9.85, z0: 1.73, z1: 5.122,
    ceiling: 2.75,
    spawn: { x: 6.629, z: 4.124, look: { x: 8.292, z: 1.73 } },
  },
  {
    id: 'r3',
    x0: 10.35, x1: 15.75, z0: 1.73, z1: 5.73,
    ceiling: 2.75,
    spawn: { x: 11.00, z: 3.317, look: { x: 15.70, z: 3.792 } },
  },
  {
    id: 'r4',
    x0: 16.05, x1: 25.55, z0: 1.73, z1: 5.73,
    ceiling: 3.06, // crown of the vaults (R4_VAULT)
    spawn: { x: 16.864, z: 3.792, look: { x: 25.55, z: 3.697 } },
  },
];

// Room 4's ceiling: shallow brick vaults between steel beams (architecture.js). They spring
// at 2.92 m, the end wall's height on DSC_0113 (0.72 to 0.73 of its 4.00 m width: 2.90 to
// 2.94 m); the beams' ends on the south wall stand as high as the end wall's top on the same
// photograph, so the whole room springs there (decision log, 17 November 2026). Until then
// 2.75 m. The walls run up to 3.1 m, behind the vaults.
export const R4_VAULT = { spring: 2.92, rise: 0.14, wallTop: 3.1 };

export const CEILING = 3.06; // tallest room: the crown of Room 4's vaults

// Opening heights
const DOOR = 2.1;
const ARCH = 2.15;
// the doorway between Rooms 1 and 2: 2.20 m (DSC_0021; the reconstructor's answer 2, 19 November 2026)
const R1_DOOR = 2.2;

// ---------------------------------------------------------------- solid blocks
// Every wall is a solid axis-aligned block. `mat` is the default material; `faces`
// overrides one side: px = face looking east (+x), nx = west, pz = south, nz = north.
// Blocks lower than 1.2 m still collide (counters, half walls); y0 > 1.2 (lintels) don't.
// Outer wall thickness: 0.64 m, two and a half bricks (0.40 until 19 November 2026, a
// placeholder). Inferred, +-0.1 m: in DSC_0048 the side of the toilet corridor's mouth in Room
// 2's south wall shows one brick's length of whitewashed reveal (0.25 to 0.30 m) and behind it
// the dark lined door frame, as deep again; OpenStreetMap gives a 5.2 m wide wing for the 4.0 m
// deep rooms, 0.6 m a wall. The walls grow outward: the rooms' inner sizes are unchanged.
const T = 0.64;
const N_OUT = 1.73 - T; // outer face of the north wall of Rooms 3 and 4
const S_OUT = 5.73 + T; // outer face of the south wall of Rooms 2 to 4

// The stairs (props.js) and their opening in the street wall, as the measurement reference of
// 19 November 2026 has them (the reconstructor's answer 3: keep them so): 9 risers of 0.18 m,
// treads 0.288 m deep, the foot 2.59 m from the street wall, the top step level with the
// street door at 1.62 m (Street View: the pavement is about 1.6 m above the basement floor).
// The opening in the wall is 1.04 m wide (z 0.43 to 1.47, scaled from the plan), open above
// the top step. The ceiling is not cut over the flight.
export const STAIRS = { rise: 0.18, run: 0.288, steps: 9, footFromWall: 2.59, z0: 0.43, z1: 1.47 };
STAIRS.landing = STAIRS.rise * STAIRS.steps;

// Room 1's street wall: each high window sits at the back of a niche under a lintel at 2.6 m.
// Places: the windows' centres at z 3.45 and 5.85 (Street View, the Murányi utca front, +-0.2 m;
// confirmed by the reconstructor, answer 4, 19 November 2026; they were 3.58 and 5.97). The
// window is 0.80 m wide inside and stands from 1.75 to 2.60 m; the niche is 1.05 m wide (the
// reference's photo estimates). Re-measured on DSC_0030 (the south window, against its radiator's
// five 8 cm sections): the niche is about 1.0 m wide and 0.25 to 0.30 m deep at the window, and it
// does not run down to the floor: under the window the wall climbs in plastered steps from a
// ledge just above the radiator (about 0.92 m) back to the window's foot. Inferred, +-0.08 m; the
// north niche is taken to be the same (not seen as well).
export const R1_NICHES = [
  { z0: 2.925, z1: 3.975, win: { z: 3.45, w: 0.8 } }, // the one with the round vent
  { z0: 5.325, z1: 6.375, win: { z: 5.85, w: 0.8 } }, // above the small radiator by the bench
];
export const NICHE = { depth: 0.28, top: 2.6, sill: 1.75, ledge: 0.92 };
function room3NorthWall() {
  const D = 0.22; // depth of the niches (DSC_0086 to 0093; checked by eye on DSC_0089, 19 November 2026)
  const z0 = N_OUT;
  const z1 = 1.73;
  const g = (x0, x1, y0, y1, zFront = z1, faces) => ({ x0, x1, z0, z1: zFront, y0, y1, mat: 'greyBrick', faces });
  // the niches' sides stay in shade in the photos: they get the darker paint
  const out = [g(10.35, 10.75, 0, 2.9, z1, { px: 'greyBrickReveal' })];
  // [x0, x1, sill height, sill height at the east end, width of the steps]
  for (const [x0, x1, sill, low, stepW] of [[10.75, 11.80, 1.27, 0.97, 0.18], [13.60, 15.20, 1.63, 1.08, 0.36]]) {
    out.push(g(x0, x1, 0, 2.9, z1 - D)); // the bricked-up back
    const steps = Math.round((sill - low) / 0.077 / 2); // toothing: two courses a step
    const flat = x1 - stepW;
    out.push(g(x0, flat, 0, sill));
    for (let k = 0; k < steps; k++) {
      const a = flat + (k * stepW) / steps;
      out.push(g(a, a + stepW / steps, 0, sill - ((k + 1) * (sill - low)) / steps, z1, { nx: 'greyBrickReveal' }));
    }
  }
  out.push(g(11.80, 13.60, 0, 2.9, z1, { nx: 'greyBrickReveal', px: 'greyBrickReveal' }), g(15.20, 15.75, 0, 2.9, z1, { nx: 'greyBrickReveal' }));
  return out;
}
// Room 4's north wall, the one on the left as you walk in. Two old openings, bricked up
// 0.12 m back (the depth is inferred), run up to where the vault springs, hidden behind the
// big pipe. A (x 21.86-22.78) has a flat sill at 0.95 m with toothed brick fill on its west
// part; B (x 24.10 to the end wall) has a bottom that steps down towards the end wall, as
// Room 3's openings do. Positions from the end-wall corner by cross-ratio (A west arris,
// A east arris, B west arris, corner) on DSC_0112, the 04-03 photograph and the video.
// C (19 November 2026): a third one by the gas meter at the west end, above the radiator,
// measured on DSC_0101 and DSC_0102 against the gas meter (0.22 m wide): its west arris 0.41 m
// east of the meter's middle, about 0.70 m wide, its flat sill about 1.1 m up, running up out
// of the frame (taken to the springing, as A and B); inferred, +-0.15 m, its depth as A and B.
const R4_RECESSES = {
  back: 1.61, // z of the bricked-up backs (wall face 1.73)
  C: { x0: 16.99, x1: 17.69, sill: 1.1 },
  A: { x0: 22.01, x1: 22.93, sill: 0.95 },
  B: { x0: 24.25, x1: 25.55 },
  top: 2.92, // the vault springing (R4_VAULT.spring; 2.75 until 17 November 2026)
};
function room4NorthWall() {
  const z0 = N_OUT;
  const z1 = 1.73;
  const { back, A, B, C, top } = R4_RECESSES;
  const H = R4_VAULT.wallTop;
  const r = (x0, x1, y0, y1, zA = z0, zB = z1) => ({ x0, x1, z0: zA, z1: zB, y0, y1, mat: 'rawBrick' });
  const out = [
    r(15.75, C.x0, 0, H), // the wall west of C
    r(C.x1, A.x0, 0, H), // the wall between C and A
    r(A.x1, B.x0, 0, H), // the pier between A and B
    r(C.x0, C.x1, 0, C.sill, back, z1), // C: the wall up to its flat sill
  ];
  for (const R of [C, A, B]) {
    out.push(r(R.x0, R.x1, 0, H, z0, back)); // the bricked-up back
    out.push(r(R.x0, R.x1, top, H, back, z1)); // the wall above, where the vault springs
  }
  // A: wall face up to the sill, then the toothed fill standing 5 cm proud of the back
  // (the 5 cm is invented); [x0, x1, top of the step]
  out.push(r(A.x0, A.x1, 0, A.sill, back, z1));
  for (const [x0, x1, y1] of [[22.01, 22.12, 1.49], [22.12, 22.22, 1.43], [22.22, 22.32, 1.38], [22.32, 22.47, 1.32], [22.47, 22.56, 1.25], [22.56, 22.61, 1.15]]) {
    out.push(r(x0, x1, A.sill, y1, back, back + 0.05));
  }
  // B: the bottom steps down eastwards, filled out to the wall face; the last step is
  // hidden by the low pipes (inferred)
  for (const [x0, x1, y1] of [[24.25, 24.55, 1.38], [24.55, 24.76, 1.15], [24.76, 24.98, 1.02], [24.98, 25.22, 0.88], [25.22, 25.33, 0.71], [25.33, 25.55, 0.51]]) {
    out.push(r(x0, x1, 0, y1, back, z1));
  }
  return out;
}
function streetWall(z0, z1) {
  const out = [];
  const w = (za, zb, y0, y1, x1 = R1.west) => out.push({ x0: R1.west - T, x1, z0: za, z1: zb, y0, y1, mat: 'whiteBrick' });
  let z = z0;
  for (const n of R1_NICHES) {
    w(z, n.z0, 0, 3.0);
    // under the window: the wall up to the ledge, then five plastered steps back to the window's foot
    w(n.z0, n.z1, 0, NICHE.ledge);
    const steps = 5;
    for (let k = 0; k < steps; k++) {
      const y0 = NICHE.ledge + (k * (NICHE.sill - NICHE.ledge)) / steps;
      w(n.z0, n.z1, y0, y0 + (NICHE.sill - NICHE.ledge) / steps, R1.west - (NICHE.depth * (k + 1)) / (steps + 1));
    }
    w(n.z0, n.z1, NICHE.sill, NICHE.top, R1.west - NICHE.depth); // the niche's back, behind the window
    w(n.z0, n.z1, NICHE.top, 3.0);
    z = n.z1;
  }
  w(z, z1, 0, 3.0);
  return out;
}

// The dark corridor to the toilets (DSC_0047 to DSC_0049, the plan S05 and the guide S33):
// it opens in Room 2's south wall between the wall with the room sheet and the bar, and
// runs south to a tiled end wall with a basin; the toilet itself is through a dark door
// on its west side. x0/x1: its side walls, z1: its end wall, step: its floor above Room 2's,
// ceiling: its height. Width and length measured on DSC_0047 (±0.1 m, ±0.3 m).
// Its place (19 November 2026): the south side is closed from x 6.98 eastwards (the measurement
// reference's x 7.13; the reconstructor's answer 10: keep it so), so the mouth's east side is
// there and the mouth, 0.78 m wide as measured, runs from x 6.20; it was x 6.63 to 7.408. The
// wall with the room sheet is west of it (DSC_0048, DSC_0049).
export const TOILET = { x0: 6.2, x1: 6.98, z1: 7.68, step: 0.1, ceiling: 2.6 };

export const BLOCKS = [
  // ---------- Room 1 ----------
  // Layout from the 360° panorama (camera solved from the corners, the four canvases of
  // known size and the floor line); overall size from R1 above.
  // west wall (street side), with the opening the stairs climb through and the two window niches
  // (the stairs' opening: solid up to the top step, open above it; STAIRS)
  { x0: R1.west - T, x1: R1.west, z0: -T, z1: STAIRS.z0, y1: 3.0, mat: 'whiteBrick' },
  { x0: R1.west - T, x1: R1.west, z0: STAIRS.z0, z1: STAIRS.z1, y1: STAIRS.landing, mat: 'whiteBrick' },
  ...streetWall(STAIRS.z1, R1.D + T),
  // north wall
  { x0: R1.west - T, x1: R1.east, z0: -T, z1: 0, y1: 3.0, mat: 'whiteBrick' },
  // south wall
  { x0: R1.west - T, x1: R1.east, z0: R1.D, z1: R1.D + T, y1: 3.0, mat: 'whiteBrick' },
  // Room 1 | Room 2 wall: 1 m thick piers north (Human as Error VI) and south (text,
  // radiator); between them a 55 cm recess holding the doorway and two plinths
  // (DSC_0019–0023 and the panorama), doorway z 3.75–4.55, 2.20 m high (DSC_0021: the view
  // through it passes north of the bar and ends on the Room 3|4 north stub; the plan drawing
  // puts it 0.8 m further south, and the photograph wins: answer 2, 19 November 2026; it was
  // z 3.70–4.55 and 2.10 m)
  // Since 21 November 2026 Room 2's side of this wall, x 5.40 to 5.85 with the doorway, is
  // Room 2's model (props.js, README_room2.md): the north pier stops at x 5.40 (it ran to 5.85)
  // and the blocks of the recess's back wall and the doorway's lintel are gone. The block kept at
  // x 5.40-5.85, z 4.80-5.00 is collision only since 22 November 2026: the model's wall now runs
  // on to z 5.00 (Blender fix B4).
  { x0: R1.east, x1: R1.recess, z0: -T, z1: 3.2, y1: 3.0, mat: 'whiteBrick' },
  { x0: R1.recess, x1: 5.85, z0: 4.8, z1: 5.0, y1: 3.0, collide: true },
  // south of the doorway Room 2 reaches x 5.4 (R1.recess) up to its south wall, so the wall with
  // the room sheet runs on 0.45 m further west and no corner stands beside the sheet (the
  // reconstructor, 18 November 2026: "the corner next to the room sheet ... is invented")
  { x0: R1.east, x1: R1.recess, z0: 5.0, z1: 5.73, y1: 3.0, mat: 'whiteBrick', faces: { px: 'warmBrick' } },
  { x0: R1.east, x1: 5.85, z0: 5.73, z1: R1.D + T, y1: 3.0, mat: 'whiteBrick', faces: { px: 'warmBrick' } },

  // ---------- Room 2 ----------
  // Since 21 November 2026 Room 2 is the Blender agent's model (props.js, README_room2.md):
  // its north wall and gated opening, the storage alcove, the south side with the wall that
  // carries the room sheet, the toilet corridor, the bar, the pillar (there is none), the
  // back wall and the Room 2 | Room 3 wall (both of its faces) were blocks here until then.
  // What stays here is where one walks into them (collide: drawn by the model; architecture.js
  // makes only their collision lines, which the floor plan also draws). From the model's faces:
  // the north wall with the storage opening and its gate (one block: the gate is closed)
  { x0: 5.85, x1: 9.85, z0: 1.5, z1: 1.73, y1: 2.75, collide: true },
  // Room 2's side of the wall to Room 1, north of the doorway (z 3.75 to 4.55 is open)
  { x0: R1.recess, x1: 5.85, z0: 1.73, z1: 3.75, y1: 2.75, collide: true },
  // the wall with the room sheet, from the doorway's south end, face z 4.55
  { x0: R1.recess, x1: 6.98, z0: 4.55, z1: 4.8, y1: 2.75, collide: true },
  // the toilet corridor: its west wall, the 0.10 m step across its mouth (not walkable, the
  // step stops you, as before), its east wall
  { x0: 6.73, x1: 6.98, z0: 4.8, z1: 7.88, y1: 2.75, collide: true },
  { x0: 6.98, x1: 7.76, z0: 5.122, z1: 5.2, y1: 0.1, collide: true },
  { x0: 7.76, x1: 8.06, z0: 5.122, z1: 7.88, y1: 2.75, collide: true },
  // the bar counter, from the corner of the corridor's east wall through the pass-through
  // 0.20 m into Room 3 (README_room2.md: x 8.06 to 10.55, z 4.69 to 5.12)
  { x0: 8.06, x1: 10.55, z0: 4.69, z1: 5.122, y1: 1.0, collide: true },
  // the Room 2 | Room 3 wall: the north pier, and south of the doorway (z 2.557 to 4.60) the
  // wall under the pass-through's sill and beyond
  { x0: 9.85, x1: 10.35, z0: 1.5, z1: 2.557, y1: 2.75, collide: true },
  { x0: 9.85, x1: 10.35, z0: 4.6, z1: 6.37, y1: 2.75, collide: true },

  // ---------- Room 3 + Room 4 (one long room) ----------
  // north wall: painted grey brick in Room 3, bare brick in Room 4 (lit photo of the empty room)
  // Room 3's north wall (DSC_0086–0093): two old openings bricked up 22 cm back, one
  // either side of the pier that carries #8; they run up to the ceiling and their sills
  // drop in toothed steps towards the east
  ...room3NorthWall(),
  // Room 4's north wall (DSC_0112, the 04-03 photograph, w16-documentation.mp4 00:00-00:02,
  // MAMŰ's photograph of 2013): bare brick with two old openings bricked up at the back,
  // A west of the pier, B running to the end wall (see room4NorthWall)
  ...room4NorthWall(),
  // the low concrete ledge along its western half, the radiator on it
  { x0: 16.05, x1: 20.35, z0: 1.73, z1: 2.07, y1: 0.36, mat: 'ledge' },
  // south wall: white brick
  { x0: 10.35, x1: 14.95, z0: 5.73, z1: S_OUT, y1: 2.9, mat: 'whiteBrick' },
  { x0: 16.05, x1: 25.55 + T, z0: 5.73, z1: S_OUT, y1: R4_VAULT.wallTop, mat: 'dimBrick' },
  // closet block beside the south stub (#14 hangs on its west face). Its west face stands at
  // x 14.8 (was 14.5: the gap closed by the curtain was about 0.3 m too wide, 18 Nov 2026)
  // In the photographs this is a space between two thin walls, open to the north and closed
  // there by a curtain (props.js). What is inside is not known, so the block stays solid.
  { x0: 14.95, x1: 15.75, z0: 4.666, z1: S_OUT, y1: 2.9, mat: 'plaster' },
  // the two side stubs between Room 3 and Room 4, plus the header above the opening
  { x0: 15.75, x1: 16.05, z0: 1.73, z1: 2.918, y1: R4_VAULT.wallTop, mat: 'plaster' },
  { x0: 15.75, x1: 16.05, z0: 4.666, z1: S_OUT, y1: R4_VAULT.wallTop, mat: 'plaster' },
  // (the header's underside at 2.35 m: on DSC_0064 it hangs about 0.39 m below Room 3's
  // ceiling, against no. 14's 0.75 m; S34 corridor_room3-4.jpg shows it too; inferred, +-0.1 m;
  // it was 2.45 m with no recorded source, 19 November 2026)
  { x0: 15.75, x1: 16.05, z0: 2.918, z1: 4.666, y0: 2.35, y1: R4_VAULT.wallTop, mat: 'plaster' },
  // projection wall (east end)
  { x0: 25.55, x1: 25.55 + T, z0: N_OUT, z1: S_OUT, y1: R4_VAULT.wallTop, mat: 'dimBrick', faces: { nx: 'projWall' } },
];

// Floors and ceilings (rectangles); doorway soffits come from the lintel blocks.
// The stairs' top step passes through Room 1's west wall to the street door, in the opening
// STAIRS.z0 to z1 (it was z 0 to 1.95 until 19 November 2026). Room 1's ceiling is closed over the flight (DSC_0014, DSC_0015; PROGRESS.md,
// 17 November 2026): until then it had a hole x -0.15 to 1.25 for an invented shaft.
export const STAIRWELL = { x0: R1.west - T, x1: R1.west, z0: STAIRS.z0, z1: STAIRS.z1 };
export const R1_WEST_OUTER = R1.west - T; // outer face of Room 1's west wall (the street door)
export const FLOORS = [
  // Room 1's floor ends where Room 2's model's floor begins (x 5.40) and Room 3's begins where
  // it ends (x 10.35): they overlapped at y 0 and flickered (texture joins S1, 22 November 2026)
  { x0: R1.west - 0.1, x1: R1.recess, z0: -0.1, z1: R1.D + 0.1, mat: 'floor' },
  // (Room 2's floor, the storage room's and the toilet corridor's are in Room 2's model)
  // Room 3: the darker grey tiles of the MAMŰ photos (Kivonat, 2015)
  { x0: 10.35, x1: 15.90, z0: 1.6, z1: 5.79, mat: 'floorGrey' },
  { x0: 15.90, x1: 25.58, z0: 1.6, z1: 5.79, mat: 'floorDark' },
];
export const CEILINGS = [
  { x0: R1.west, x1: R1.east, z0: 0, z1: R1.D, y: R1_CEILING, mat: 'ceiling' },
  { x0: R1.east, x1: R1.recess, z0: 3.2, z1: 5.0, y: R1_CEILING, mat: 'ceiling' },
  // (Room 2's ceiling, the storage room's and the corridor's are in Room 2's model)
  { x0: 10.35, x1: 15.75, z0: 1.73, z1: 5.73, y: 2.75, mat: 'ceiling' },
  // Room 4's ceiling is a run of shallow brick vaults (built in architecture.js)
];

// Solid obstacles (axis-aligned boxes on the floor) the visitor collides with.
// Filled in by props.js as furniture is placed.
export const OBSTACLES = [];

export function roomAt(x, z) {
  for (const r of ROOMS) {
    if (x >= r.x0 - 0.05 && x <= r.x1 + 0.05 && z >= r.z0 - 0.05 && z <= r.z1 + 0.05) return r;
  }
  return null;
}

export function roomById(id) {
  return ROOMS.find((r) => r.id === id);
}

// Placement frame for something hung on a wall plane.
// face: the direction the wall surface looks ('+x', '-x', '+z', '-z'); at: the wall
// plane coordinate; along: the coordinate along the wall.
export function wallFrame(face, at, along, inset = 0.02) {
  switch (face) {
    case '+z': return { x: along, z: at + inset, rotY: 0, nx: 0, nz: 1 };
    case '-z': return { x: along, z: at - inset, rotY: Math.PI, nx: 0, nz: -1 };
    case '+x': return { x: at + inset, z: along, rotY: Math.PI / 2, nx: 1, nz: 0 };
    case '-x': return { x: at - inset, z: along, rotY: -Math.PI / 2, nx: -1, nz: 0 };
    default: throw new Error(`Unknown wall face ${face}`);
  }
}
