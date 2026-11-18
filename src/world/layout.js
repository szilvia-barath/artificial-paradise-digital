// Floor plan of the MAMŰ basement, in metres, traced from the gallery's measured plan
// ("Alaprajz_ok new.jpg") at 0.026 m per plan pixel, not from the room sheet seen in
// DSC_0049: Room 1 5.0 × 7.0 m, Room 2 4.0 m wide, Room 3 5.4 m and Room 4 9.5 m long,
// Rooms 2–4 4.0 m deep. Openings, recesses and where things stand were checked against
// the photos: the Room 1 panorama (camera solved from the corner bearings), brick
// courses, floor tiles and the listed canvas sizes. Cross-check with OpenStreetMap:
// the gallery is in the basement of Damjanich utca 39, a corner building whose wing
// along Murányi utca is 26.5 m from the street front to the back; this basement
// measures 26.35 m from the outer face of Room 1's west wall to the outer face of
// Room 4's end wall.
// +x (Room 1 -> Room 4) points to bearing 146° (south-east); Room 1's window wall
// faces Damjanich utca.
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

export const EYE = 1.62;

// Room 1 is 5.0 × 7.0 m (the gallery's measured plan). Change W and D here and the walls,
// stairs, bench, windows and Paradise Factory follow.
export const R1 = { W: 5.0, D: 7.0, east: 4.85, recess: 5.4 };
R1.west = R1.east - R1.W;

export const ROOMS = [
  {
    id: 'r1',
    x0: R1.west, x1: R1.east, z0: 0, z1: R1.D,
    ceiling: 3.0,
    // In the open middle of the room, east of Paradise Factory (the foot of the stairs is
    // too tight between the flight and the walls), looking across the plant to the stairs.
    spawn: { x: 3.4, z: 4.4, look: { x: 1.0, z: 2.4 } },
  },
  {
    id: 'r2',
    x0: 5.85, x1: 9.85, z0: 1.73, z1: 5.73,
    ceiling: 2.75,
    spawn: { x: 6.629, z: 4.124, look: { x: 8.292, z: 1.73 } },
  },
  {
    id: 'r3',
    x0: 10.2, x1: 15.6, z0: 1.73, z1: 5.73,
    ceiling: 2.75,
    spawn: { x: 10.85, z: 3.317, look: { x: 15.55, z: 3.792 } },
  },
  {
    id: 'r4',
    x0: 15.9, x1: 25.4, z0: 1.73, z1: 5.73,
    ceiling: 2.9,
    spawn: { x: 16.714, z: 3.792, look: { x: 25.4, z: 3.697 } },
  },
];

export const CEILING = 3.0; // tallest room (used for shafts / light rigs)

// Opening heights
const DOOR = 2.1;
const ARCH = 2.15;

// ---------------------------------------------------------------- solid blocks
// Every wall is a solid axis-aligned block. `mat` is the default material; `faces`
// overrides one side: px = face looking east (+x), nx = west, pz = south, nz = north.
// Blocks lower than 1.2 m still collide (counters, half walls); y0 > 1.2 (lintels) don't.
const T = 0.4; // outer wall thickness

// Room 1's street wall (_artificial paradise 01 - 02): each high window sits at the back of a
// niche that runs from the floor to a lintel at 2.6 m, its radiator below it. Measured on the
// photo against the radiators and the 30 cm floor tiles.
export const R1_NICHES = [
  { z0: 2.98, z1: 4.08, win: { z: 3.58, w: 0.92 } }, // the one with the round vent
  { z0: 5.52, z1: 6.54, win: { z: 5.97, w: 0.84 } }, // above the small radiator by the bench
];
export const NICHE = { depth: 0.22, top: 2.6, sill: 1.7 };
function room3NorthWall() {
  const D = 0.22; // depth of the niches
  const z0 = 1.33;
  const z1 = 1.73;
  const g = (x0, x1, y0, y1, zFront = z1, faces) => ({ x0, x1, z0, z1: zFront, y0, y1, mat: 'greyBrick', faces });
  // the niches' sides stay in shade in the photos: they get the darker paint
  const out = [g(10.2, 10.6, 0, 2.9, z1, { px: 'greyBrickReveal' })];
  // [x0, x1, sill height, sill height at the east end, width of the steps]
  for (const [x0, x1, sill, low, stepW] of [[10.6, 11.65, 1.27, 0.97, 0.18], [13.45, 15.05, 1.63, 1.08, 0.36]]) {
    out.push(g(x0, x1, 0, 2.9, z1 - D)); // the bricked-up back
    const steps = Math.round((sill - low) / 0.077 / 2); // toothing: two courses a step
    const flat = x1 - stepW;
    out.push(g(x0, flat, 0, sill));
    for (let k = 0; k < steps; k++) {
      const a = flat + (k * stepW) / steps;
      out.push(g(a, a + stepW / steps, 0, sill - ((k + 1) * (sill - low)) / steps, z1, { nx: 'greyBrickReveal' }));
    }
  }
  out.push(g(11.65, 13.45, 0, 2.9, z1, { nx: 'greyBrickReveal', px: 'greyBrickReveal' }), g(15.05, 15.6, 0, 2.9, z1, { nx: 'greyBrickReveal' }));
  return out;
}
// Room 4's north wall, the one on the left as you walk in. Two old openings, bricked up
// 0.12 m back (the depth is inferred), run up to where the vault springs, hidden behind the
// big pipe. A (x 21.86-22.78) has a flat sill at 0.95 m with toothed brick fill on its west
// part; B (x 24.10 to the end wall) has a bottom that steps down towards the end wall, as
// Room 3's openings do. Positions from the end-wall corner by cross-ratio (A west arris,
// A east arris, B west arris, corner) on DSC_0112, the 04-03 photograph and the video.
const R4_RECESSES = {
  back: 1.61, // z of the bricked-up backs (wall face 1.73)
  A: { x0: 21.86, x1: 22.78, sill: 0.95 },
  B: { x0: 24.1, x1: 25.4 },
  top: 2.75, // the vault springing
};
function room4NorthWall() {
  const z0 = 1.33;
  const z1 = 1.73;
  const { back, A, B, top } = R4_RECESSES;
  const r = (x0, x1, y0, y1, zA = z0, zB = z1) => ({ x0, x1, z0: zA, z1: zB, y0, y1, mat: 'rawBrick' });
  const out = [
    r(15.6, A.x0, 0, 2.9), // the wall west of A
    r(A.x1, B.x0, 0, 2.9), // the pier between A and B
  ];
  for (const R of [A, B]) {
    out.push(r(R.x0, R.x1, 0, 2.9, z0, back)); // the bricked-up back
    out.push(r(R.x0, R.x1, top, 2.9, back, z1)); // the wall above, where the vault springs
  }
  // A: wall face up to the sill, then the toothed fill standing 5 cm proud of the back
  // (the 5 cm is invented); [x0, x1, top of the step]
  out.push(r(A.x0, A.x1, 0, A.sill, back, z1));
  for (const [x0, x1, y1] of [[21.86, 21.97, 1.49], [21.97, 22.07, 1.43], [22.07, 22.17, 1.38], [22.17, 22.32, 1.32], [22.32, 22.41, 1.25], [22.41, 22.46, 1.15]]) {
    out.push(r(x0, x1, A.sill, y1, back, back + 0.05));
  }
  // B: the bottom steps down eastwards, filled out to the wall face; the last step is
  // hidden by the low pipes (inferred)
  for (const [x0, x1, y1] of [[24.1, 24.4, 1.38], [24.4, 24.61, 1.15], [24.61, 24.83, 1.02], [24.83, 25.07, 0.88], [25.07, 25.18, 0.71], [25.18, 25.4, 0.51]]) {
    out.push(r(x0, x1, 0, y1, back, z1));
  }
  return out;
}
function streetWall(z0, z1) {
  const out = [];
  let z = z0;
  for (const n of R1_NICHES) {
    out.push({ x0: R1.west - T, x1: R1.west, z0: z, z1: n.z0, y1: 3.0, mat: 'whiteBrick' });
    out.push({ x0: R1.west - T, x1: R1.west - NICHE.depth, z0: n.z0, z1: n.z1, y1: NICHE.top, mat: 'whiteBrick' });
    out.push({ x0: R1.west - T, x1: R1.west, z0: n.z0, z1: n.z1, y0: NICHE.top, y1: 3.0, mat: 'whiteBrick' });
    z = n.z1;
  }
  out.push({ x0: R1.west - T, x1: R1.west, z0: z, z1: z1, y1: 3.0, mat: 'whiteBrick' });
  return out;
}

// The dark corridor to the toilets (DSC_0047 to DSC_0049, the plan S05 and the guide S33):
// it opens in Room 2's south wall between the wall with the room sheet and the bar, and
// runs south to a tiled end wall with a basin; the toilet itself is through a dark door
// on its west side. x0/x1: its side walls, z1: its end wall, step: its floor above Room 2's,
// ceiling: its height. Width and length measured on DSC_0047 (±0.1 m, ±0.3 m).
export const TOILET = { x0: 6.63, x1: 7.408, z1: 7.68, step: 0.1, ceiling: 2.6 };

export const BLOCKS = [
  // ---------- Room 1 ----------
  // Layout from the 360° panorama (camera solved from the corners, the four canvases of
  // known size and the floor line); overall size from R1 above.
  // west wall (street side), with the opening the stairs climb through and the two window niches
  ...streetWall(1.95, R1.D + T),
  { x0: R1.west - T, x1: R1.west, z0: -T, z1: 0, y1: 3.0, mat: 'whiteBrick' },
  // north wall
  { x0: R1.west - T, x1: R1.east, z0: -T, z1: 0, y1: 3.0, mat: 'whiteBrick' },
  // south wall
  { x0: R1.west - T, x1: R1.east, z0: R1.D, z1: R1.D + T, y1: 3.0, mat: 'whiteBrick' },
  // Room 1 | Room 2 wall: 1 m thick piers north (Human as Error VI) and south (text,
  // radiator); between them a 55 cm recess holding the doorway and two plinths
  // (DSC_0019–0023 and the panorama), doorway z 3.70–4.55
  { x0: R1.east, x1: 5.85, z0: -T, z1: 3.2, y1: 3.0, mat: 'whiteBrick', faces: { px: 'warmBrick' } },
  { x0: R1.recess, x1: 5.85, z0: 3.2, z1: 3.7, y1: 3.0, mat: 'whiteBrick', faces: { px: 'warmBrick' } },
  // (its Room 2 face is warm like the rest of Room 2's walls; it was cold white until 17 November 2026)
  { x0: R1.recess, x1: 5.85, z0: 3.7, z1: 4.55, y0: DOOR, y1: 3.0, mat: 'whiteBrick', reveal: 'warmBrick', faces: { px: 'warmBrick' } },
  { x0: R1.recess, x1: 5.85, z0: 4.55, z1: 5.0, y1: 3.0, mat: 'whiteBrick', faces: { px: 'warmBrick' } },
  { x0: R1.east, x1: 5.85, z0: 5.0, z1: R1.D + T, y1: 3.0, mat: 'whiteBrick', faces: { px: 'warmBrick' } },

  // ---------- Room 2 ----------
  // north: wall in front of the storage alcove (not accessible), gated opening x 8.76–9.85
  { x0: 5.85, x1: 8.759, z0: 1.5, z1: 1.73, y1: 2.75, mat: 'warmBrick' },
  { x0: 8.759, x1: 9.85, z0: 1.5, z1: 1.73, y0: DOOR, y1: 2.75, mat: 'warmBrick' },
  // storage alcove shell (only glimpsed through the gate)
  { x0: 5.85, x1: 10.2, z0: -T, z1: 0, y1: 2.75, mat: 'darkBrick' },
  // south: the wall that carries the room sheet, then the mouth of the dark corridor to
  // the toilets, next to the bar (TOILET); a lintel over the mouth (its height invented)
  { x0: 5.85, x1: TOILET.x0, z0: 5.73, z1: 6.13, y1: 2.75, mat: 'warmBrick' },
  { x0: TOILET.x0, x1: TOILET.x1, z0: 5.73, z1: 6.13, y0: DOOR, y1: 2.75, mat: 'warmBrick', reveal: 'dimBrick', faces: { pz: 'dimBrick' } },
  // the corridor: whitewashed brick left in the dark, a step up at the back of the wall,
  // the end wall (tiles, basin and mirror in props.js); not walkable, the step stops you
  { x0: TOILET.x0 - 0.2, x1: TOILET.x0, z0: 6.13, z1: TOILET.z1 + 0.2, y1: 2.75, mat: 'dimBrick' },
  { x0: TOILET.x1, x1: TOILET.x1 + 0.2, z0: 6.13, z1: TOILET.z1 + 0.2, y1: 2.75, mat: 'dimBrick' },
  { x0: TOILET.x0, x1: TOILET.x1, z0: TOILET.z1, z1: TOILET.z1 + 0.2, y1: 2.75, mat: 'dimBrick' },
  { x0: TOILET.x0, x1: TOILET.x1, z0: 6.13, z1: 6.2, y1: TOILET.step, mat: 'darkFloor', faces: { nz: 'floor' } },
  // bar: low brick counter (you see over it from the Room 1 doorway, DSC_0021),
  // a brick pillar at its back corner and the back wall
  { x0: 7.772, x1: 9.85, z0: 4.694, z1: 5.122, y1: 1.0, mat: 'warmBrick' },
  { x0: 7.481, x1: 7.772, z0: 5.264, z1: 5.73, y1: 2.75, mat: 'warmBrick' },
  { x0: 7.408, x1: 9.85, z0: 5.73, z1: 6.13, y1: 2.75, mat: 'warmBrick' },
  // Room 2 | Room 3 wall: pillar, doorway z 2.56–4.08, bar pass-through z 4.08–4.74, wall
  { x0: 9.85, x1: 10.2, z0: -T, z1: 2.557, y1: 2.75, mat: 'warmBrick', faces: { px: 'whiteBrick' } },
  { x0: 9.85, x1: 10.2, z0: 2.557, z1: 4.077, y0: ARCH, y1: 2.75, mat: 'whiteBrick', reveal: 'whiteBrick', faces: { nx: 'warmBrick' } },
  { x0: 9.85, x1: 10.2, z0: 4.077, z1: 4.742, y1: 1.0, mat: 'whiteBrick', faces: { nx: 'warmBrick' } },
  { x0: 9.85, x1: 10.2, z0: 4.077, z1: 4.742, y0: ARCH, y1: 2.75, mat: 'whiteBrick', faces: { nx: 'warmBrick' } },
  { x0: 9.85, x1: 10.2, z0: 4.742, z1: 6.13, y1: 2.75, mat: 'whiteBrick', faces: { nx: 'warmBrick' } },

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
  { x0: 15.9, x1: 20.2, z0: 1.73, z1: 2.07, y1: 0.36, mat: 'ledge' },
  // south wall: white brick
  { x0: 10.2, x1: 14.8, z0: 5.73, z1: 6.13, y1: 2.9, mat: 'whiteBrick' },
  { x0: 15.9, x1: 25.4 + T, z0: 5.73, z1: 6.13, y1: 2.9, mat: 'dimBrick' },
  // closet block beside the south stub (#14 hangs on its west face). Its west face stands at
  // x 14.8 (was 14.5: the gap closed by the curtain was about 0.3 m too wide, 18 Nov 2026)
  // In the photographs this is a space between two thin walls, open to the north and closed
  // there by a curtain (props.js). What is inside is not known, so the block stays solid.
  { x0: 14.8, x1: 15.6, z0: 4.666, z1: 6.13, y1: 2.9, mat: 'plaster' },
  // the two side stubs between Room 3 and Room 4, plus the header above the opening
  { x0: 15.6, x1: 15.9, z0: 1.73, z1: 2.918, y1: 2.9, mat: 'plaster' },
  { x0: 15.6, x1: 15.9, z0: 4.666, z1: 6.13, y1: 2.9, mat: 'plaster' },
  { x0: 15.6, x1: 15.9, z0: 2.918, z1: 4.666, y0: 2.45, y1: 2.9, mat: 'plaster' },
  // projection wall (east end)
  { x0: 25.4, x1: 25.4 + T, z0: 1.33, z1: 6.13, y1: 2.9, mat: 'dimBrick', faces: { nx: 'projWall' } },
];

// Floors and ceilings (rectangles); doorway soffits come from the lintel blocks.
// The stairs' landing passes through Room 1's west wall to the street door, in the opening
// z 0 to 1.95. Room 1's ceiling is closed over the flight (DSC_0014, DSC_0015; PROGRESS.md,
// 17 November 2026): until then it had a hole x -0.15 to 1.25 for an invented shaft.
export const STAIRWELL = { x0: R1.west - T, x1: R1.west, z0: 0, z1: 1.95 };
export const R1_WEST_OUTER = R1.west - T; // outer face of Room 1's west wall (the street door)
export const FLOORS = [
  { x0: R1.west - 0.1, x1: 5.6, z0: -0.1, z1: R1.D + 0.1, mat: 'floor' },
  { x0: 5.4, x1: 10, z0: 1.6, z1: 5.79, mat: 'floor' },
  // Room 3: the darker grey tiles of the MAMŰ photos (Kivonat, 2015)
  { x0: 9.85, x1: 15.75, z0: 1.6, z1: 5.79, mat: 'floorGrey' },
  { x0: 15.75, x1: 25.43, z0: 1.6, z1: 5.79, mat: 'floorDark' },
  { x0: 5.85, x1: 9.85, z0: 0, z1: 1.5, mat: 'darkFloor', y: 0.002 },
  // the mouth of the toilet corridor, then its floor a step up
  { x0: TOILET.x0, x1: TOILET.x1, z0: 5.79, z1: 6.13, mat: 'floor' },
  { x0: TOILET.x0, x1: TOILET.x1, z0: 6.2, z1: TOILET.z1, mat: 'darkFloor', y: TOILET.step },
];
export const CEILINGS = [
  { x0: R1.west, x1: R1.east, z0: 0, z1: R1.D, y: 3.0, mat: 'ceiling' },
  { x0: R1.east, x1: R1.recess, z0: 3.2, z1: 5.0, y: 3.0, mat: 'ceiling' },
  { x0: 5.85, x1: 9.85, z0: 1.73, z1: 5.73, y: 2.75, mat: 'ceiling' },
  { x0: 5.85, x1: 9.85, z0: 0, z1: 1.5, y: 2.4, mat: 'darkCeiling' },
  { x0: TOILET.x0, x1: TOILET.x1, z0: 6.13, z1: TOILET.z1, y: TOILET.ceiling, mat: 'darkCeiling' },
  { x0: 10.2, x1: 15.6, z0: 1.73, z1: 5.73, y: 2.75, mat: 'ceiling' },
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
