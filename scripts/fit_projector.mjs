// Fits where Let it Flow's floor video (#16, Room 4) landed on the floor and writes it into
// src/data/river.json (key "projector").
//
//   node scripts/fit_projector.mjs            (writes river.json)
//   node scripts/fit_projector.mjs --check    (prints the fit, writes nothing)
//
// Deterministic: fixed starting points, Nelder-Mead, no random numbers. Node only, no packages.
//
// The model (decision log, 17 and 18 November 2026, Decision 4):
// - The projector's place is measured: the projector on a wall arm high on the north wall,
//   just under the big pipe, above Natural Life's screen, at recess A's west arris (DSC_0108
//   to DSC_0112). Its lens is taken at the light at the top of its body (POS).
// - The artist made the picture fit with the keystone effect in Resolume and rendered it
//   (the artist, reported by the reconstructor, 18 November 2026). The projected file
//   (Let it flow_ok.mp4) is a full 16:9 rectangle with no black corners or skewed edges, so
//   the keystone was not baked into the frame's edges; whatever warp Resolume made, the file
//   reaches the floor through one projective map (projector and keystone together). That
//   map is fitted here as a homography from the frame (s, t) to the floor: the floor
//   positions of the frame's four corners (8 numbers), not a projector's aim and lens, so the
//   picture can be squeezed across and stretched along as a keystone can.
// - It is fitted (inferred) to: the lit specks' edges on the floor (photographs DSC_0112 to
//   DSC_0117 and the documentation video at 1.2 s: north limit z 2.5 to 2.6 at x 22 to 23.5
//   and 2.7 to 2.85 nearer the door, south limit z 5.0 to 5.05 at x 22 to 24 and 4.8 to 4.95
//   nearer the door), the length (at least 6.2 m from the end wall, video 0.0 to 2.44 s; the
//   west end is taken at that bound, 19.2, since nothing shows it), the east end (specks to
//   within 0.3 to 0.5 m of the end wall, video 6.04 to 7.88 s), and the artist's statement
//   that the video's river fell on the plastic river: the plastic's centre line (river.json
//   "obstacles", one slice per 35 cm) must land where the video's river is, read through the
//   composite's own frame ("composite", the frame PLANE javított.png was laid out in by
//   scripts/make_river.py).
// - Points above the floor (the plastic's relief) take the picture along the ray from the
//   lens (POS), as a projector throws it.
// Texture coordinates follow the old floor mapping, so the video keeps its orientation:
// s runs from the east end of the frame (0) to the west (1), t from north (0) to south (1).

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../src/data/river.json', import.meta.url);
const R = JSON.parse(readFileSync(FILE, 'utf8'));
const C = R.composite ?? R.projection; // the composite's frame (make_river.py)

const POS = [21.82, 2.36, 1.87]; // lens: x, height, z (measured, ±0.15 / ±0.08 / ±0.05)
const WALL_X = 25.4;

// --------------------------------------------------------------------------- homography
// floor (x, z) of frame point (s, t), from the four corner positions q = [x00,z00, x10,z10, x11,z11, x01,z01]
function homography(q) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q; // corners at (0,0), (1,0), (1,1), (0,1)
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return [a, b, c, d, e, f, g, h]; // x = (a s + b t + c) / (g s + h t + 1), z likewise with d, e, f
}
const fwd = (H, s, t) => {
  const w = H[6] * s + H[7] * t + 1;
  return [(H[0] * s + H[1] * t + H[2]) / w, (H[3] * s + H[4] * t + H[5]) / w];
};
// inverse: floor (x, z) to (s, t); the 3 x 3 inverse, rows for s, t and w
function inverse(H) {
  const [a, b, c, d, e, f, g, h] = H;
  const m = [[a, b, c], [d, e, f], [g, h, 1]];
  const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const inv = [
    [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det],
    [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det],
    [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det],
  ];
  return inv.map((r) => r.map((v) => v / inv[2][2]));
}
// z of the edge t = tEdge where it crosses x, and x of the edge s = sEdge where it crosses z
const lerpAt = (A, B, i, v) => A[1 - i] + ((v - A[i]) / (B[i] - A[i])) * (B[1 - i] - A[1 - i]);
const edgeZ = (H, t, x) => lerpAt(fwd(H, 0, t), fwd(H, 1, t), 0, x);
const edgeX = (H, s, z) => lerpAt(fwd(H, s, 0), fwd(H, s, 1), 1, z);

// --------------------------------------------------------------------------- the evidence
const river = R.obstacles.map(([x0, x1, z0, z1]) => {
  const x = (x0 + x1) / 2;
  const z = (z0 + z1) / 2;
  return { x, z, s: (C.xEast - x) / C.lengthM, t: 0.5 + (z - C.zCentre) / C.widthM };
});
const SIDES = [
  [0, 22.75, 2.55, 0.1], // north limit, x 22 to 23.5
  [0, 20.5, 2.78, 0.12], // north limit nearer the door
  [1, 23.0, 5.03, 0.1], // south limit, x 22 to 24
  [1, 20.5, 4.88, 0.12], // south limit nearer the door
];
const EAST_MIN = 24.9; // specks to within 0.3 to 0.5 m of the end wall
const WEST = 19.2; // at least 6.2 m long; the west end is taken at that bound
const RIVER_SIGMA = 0.1;

function terms(q) {
  const H = homography(q);
  if (!H.every(Number.isFinite)) return null;
  // the picture must stay convex and the right way round
  const P = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([s, t]) => fwd(H, s, t));
  for (let i = 0; i < 4; i++) {
    const [a, b, c] = [P[i], P[(i + 1) % 4], P[(i + 2) % 4]];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 0) return null;
  }
  const out = [];
  for (const pt of river) {
    const w = fwd(H, pt.s, pt.t);
    out.push(['river', (w[0] - pt.x) / RIVER_SIGMA], ['river', (w[1] - pt.z) / RIVER_SIGMA]);
  }
  for (const [t, x, z, sg] of SIDES) out.push(['side', (edgeZ(H, t, x) - z) / sg]);
  for (const z of [3.7, 4.6]) out.push(['east', Math.min(0, edgeX(H, 0, z) - EAST_MIN) / 0.1]);
  out.push(['west', (edgeX(H, 1, 3.8) - WEST) / 0.2]);
  return out;
}
const cost = (q) => {
  const t = terms(q);
  return t ? t.reduce((a, [, v]) => a + v * v, 0) : 1e9;
};

// --------------------------------------------------------------------------- Nelder-Mead
function nelderMead(fn, x0, step, iters = 6000) {
  const n = x0.length;
  let simplex = [x0];
  for (let i = 0; i < n; i++) simplex.push(x0.map((v, j) => (j === i ? v + step[j] : v)));
  let vals = simplex.map(fn);
  for (let it = 0; it < iters; it++) {
    const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
    simplex = order.map((i) => simplex[i]);
    vals = order.map((i) => vals[i]);
    const c = simplex.slice(0, n).reduce((a, x) => a.map((v, j) => v + x[j] / n), new Array(n).fill(0));
    const xr = c.map((v, j) => v + (v - simplex[n][j]));
    const fr = fn(xr);
    if (fr < vals[0]) {
      const xe = c.map((v, j) => v + 2 * (v - simplex[n][j]));
      const fe = fn(xe);
      [simplex[n], vals[n]] = fe < fr ? [xe, fe] : [xr, fr];
    } else if (fr < vals[n - 1]) {
      [simplex[n], vals[n]] = [xr, fr];
    } else {
      const xc = c.map((v, j) => v + 0.5 * (simplex[n][j] - v));
      const fc = fn(xc);
      if (fc < vals[n]) [simplex[n], vals[n]] = [xc, fc];
      else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          vals[i] = fn(simplex[i]);
        }
      }
    }
    if (Math.abs(vals[n] - vals[0]) < 1e-12) break;
  }
  return { x: simplex[0], f: vals[0] };
}

// start: the composite's own frame (a rectangle), then squeezed to the lit band
const rect = (x0, x1, z0, z1) => [x1, z0, x0, z0, x0, z1, x1, z1];
let best = null;
for (const start of [rect(C.xEast - C.lengthM, C.xEast, C.zCentre - C.widthM / 2, C.zCentre + C.widthM / 2), rect(19.2, 25.6, 2.6, 5.0), rect(19.2, 25.9, 2.4, 5.1)]) {
  let r = { x: start };
  for (const st of [0.3, 0.1, 0.03, 0.01]) r = nelderMead(cost, r.x, new Array(8).fill(st));
  if (!best || r.f < best.f) best = r;
}

// --------------------------------------------------------------------------- report and write
const H = homography(best.x);
const rnd = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const quad = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([s, t]) => fwd(H, s, t).map((v) => rnd(v, 3)));
const T = terms(best.x);
const rms = (k) => {
  const v = T.filter(([n]) => n === k).map(([, x]) => x);
  return rnd(Math.sqrt(v.reduce((a, x) => a + x * x, 0) / v.length), 2);
};
const riverErr = river.map((pt) => {
  const w = fwd(H, pt.s, pt.t);
  return Math.hypot(w[0] - pt.x, w[1] - pt.z);
});
const widthAt = (x) => rnd(edgeZ(H, 1, x) - edgeZ(H, 0, x), 2);
const lengthAt = (z) => rnd(edgeX(H, 0, z) - edgeX(H, 1, z), 2);
const centre = fwd(H, 0.5, 0.5);
const aim = (() => {
  const d = [centre[0] - POS[0], -POS[1], centre[1] - POS[2]];
  const l = Math.hypot(...d);
  return d.map((v) => rnd(v / l, 4));
})();
const projector = {
  _note: 'Written by scripts/fit_projector.mjs. position: the lens (measured, DSC_0108 to DSC_0112). floorToFrame: the 3 x 3 homography from a floor point (x, z, 1) to the frame (s, t, 1) (inferred: projector and Resolume keystone together); quad: the floor corners of the frame at (s,t) = (0,0), (1,0), (1,1), (0,1), s from the east end, t from the north side. A point above the floor takes the picture along the ray from the lens. aim: from the lens to the frame centre (inferred, for the record).',
  position: POS,
  floorToFrame: inverse(H).map((r) => r.map((v) => rnd(v, 7))),
  quad,
  aim,
  fit: {
    cost: rnd(best.f, 3),
    riverCentreLineErrorM: { mean: rnd(riverErr.reduce((a, b) => a + b, 0) / riverErr.length, 3), max: rnd(Math.max(...riverErr), 3) },
    sides: SIDES.map(([t, x, z]) => `${t ? 'south' : 'north'} limit at x ${x}: wanted z ${z}, fitted ${rnd(edgeZ(H, t, x), 2)}`),
    widthM: { x20_5: widthAt(20.5), x23: widthAt(23) },
    lengthM: { north: lengthAt(2.8), middle: lengthAt(3.8), south: lengthAt(4.8) },
    eastEndX: [rnd(edgeX(H, 0, 3.7), 2), rnd(edgeX(H, 0, 4.6), 2)],
    westEndX: rnd(edgeX(H, 1, 3.8), 2),
    rms: { river: rms('river'), side: rms('side'), east: rms('east'), west: rms('west') },
  },
};
console.log(JSON.stringify(projector, null, 2));

if (!process.argv.includes('--check')) {
  const out = {};
  for (const [k, v] of Object.entries(R)) {
    if (k === 'projection') out.composite = v;
    else if (k !== 'projector') out[k] = v;
  }
  out.projector = projector;
  writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log('written', FILE.pathname, 'wall at x', WALL_X);
}
