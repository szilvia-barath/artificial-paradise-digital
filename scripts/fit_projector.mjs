// Fits the floor projector of Let it Flow (#16, Room 4) and writes its pose and the lit
// area on the floor into src/data/river.json (key "projector").
//
//   node scripts/fit_projector.mjs            (writes river.json)
//   node scripts/fit_projector.mjs --check    (prints the fit, writes nothing)
//
// Deterministic: fixed starting points, Nelder-Mead, no random numbers. Node only, no packages.
//
// What is measured and what is fitted (decision log, 17 November 2026, Decision 4):
// - The projector's place is measured: the box on a wall arm high on the north wall, just
//   under the big pipe, above Natural Life's screen and at recess A's west arris (DSC_0108 to
//   DSC_0112). Its lens is taken at the top front corner of the box, where the photographs
//   show the light (POS below).
// - Its aim, the width of its picture and the lens shift are fitted (inferred) to:
//   the lit specks' edges on the floor (photographs DSC_0112 to DSC_0117 and the
//   documentation video at 1.2 s: north limit z 2.5 to 2.6 at x 22 to 23.5 and 2.7 to 2.85
//   nearer the door, south limit z 5.0 to 5.05 at x 22 to 24 and 4.8 to 4.95 nearer the door,
//   2.3 to 2.4 m wide), their length (at least 6.2 m from the end wall, video 0.0 to 2.44 s),
//   their east end (to within 0.3 to 0.5 m of the end wall, video 6.04 to 7.88 s), and the
//   artist's statement that the video's river fell on the plastic river: the plastic's centre
//   line (river.json "obstacles", one slice per 35 cm) must land where the video's river is,
//   read through the composite's own frame ("composite", the frame PLANE javított.png was
//   laid out in by scripts/make_river.py).
// - The picture is 16:9 (Let it Flow_ok.mp4 is 1920 x 1080) and is not stretched.
// Texture coordinates follow the old floor mapping, so the video keeps its orientation:
// s runs from the east end of the frame (0) to the west (1), t from north (0) to south (1).

import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../src/data/river.json', import.meta.url);
const R = JSON.parse(readFileSync(FILE, 'utf8'));
const C = R.composite ?? R.projection; // the composite's frame (make_river.py)

const POS = [21.82, 2.36, 1.87]; // lens: x, height, z (measured, ±0.15 / ±0.08 / ±0.05)
const ASPECT = 16 / 9;

// --------------------------------------------------------------------------- geometry
const sub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(...a);
  return a.map((v) => v / l);
};

// p = [yaw, pitch, roll, log(tan of half the picture's width angle), shift along s, shift along t]
function pose(p) {
  const [yaw, pitch, roll, lt, sx, sy] = p;
  const f = [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)];
  let r = norm(cross(f, [0, 1, 0]));
  let u = cross(r, f);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  [r, u] = [r.map((v, i) => cr * v + sr * u[i]), r.map((v, i) => -sr * v + cr * u[i])];
  const th = Math.exp(lt);
  return { f, r, u, th, tv: th / ASPECT, sx, sy };
}
// floor point (x, z) lit by texture point (s, t), or null if that ray does not reach the floor
function floorAt(q, s, t) {
  const a = 2 * s - 1 + q.sx;
  const b = 2 * t - 1 + q.sy;
  const d = q.f.map((v, i) => v + a * q.th * q.r[i] + b * q.tv * q.u[i]);
  if (d[1] > -1e-4) return null;
  const k = -POS[1] / d[1];
  return [POS[0] + k * d[0], POS[2] + k * d[2]];
}
// texture point of a world point (what the shader does)
function texAt(q, w) {
  const d = sub(w, POS);
  const z = dot(d, q.f);
  return [((dot(d, q.r) / z / q.th - q.sx) + 1) / 2, ((dot(d, q.u) / z / q.tv - q.sy) + 1) / 2, z];
}
// z where the image of the edge t = tEdge crosses x (the edge is a straight line on the floor)
function edgeZ(q, tEdge, x) {
  const A = floorAt(q, 0, tEdge);
  const B = floorAt(q, 1, tEdge);
  if (!A || !B) return null;
  const k = (x - A[0]) / (B[0] - A[0]);
  return A[1] + k * (B[1] - A[1]);
}
function edgeX(q, sEdge, z) {
  const A = floorAt(q, sEdge, 0);
  const B = floorAt(q, sEdge, 1);
  if (!A || !B) return null;
  const k = (z - A[1]) / (B[1] - A[1]);
  return A[0] + k * (B[0] - A[0]);
}

// --------------------------------------------------------------------------- the evidence
// the plastic's centre line: one point per obstacle slice, and where the video has it
const river = R.obstacles.map(([x0, x1, z0, z1]) => {
  const x = (x0 + x1) / 2;
  const z = (z0 + z1) / 2;
  return { x, z, s: (C.xEast - x) / C.lengthM, t: 0.5 + (z - C.zCentre) / C.widthM };
});
// [which edge (t), x, z wanted, sigma]
const SIDES = [
  [0, 22.75, 2.55, 0.1], // north limit, x 22 to 23.5
  [0, 20.5, 2.78, 0.12], // north limit nearer the door
  [1, 23.0, 5.03, 0.1], // south limit, x 22 to 24
  [1, 20.5, 4.88, 0.12], // south limit nearer the door
];
const EAST_MIN = 24.9; // specks to within 0.3 to 0.5 m of the end wall (x 25.4)
const WEST_MAX = 19.2; // at least 6.2 m long
const RIVER_SIGMA = 0.15;
// widest lens allowed: tan of half the picture's width angle. 1.25 is a throw ratio of 0.4
// (distance / picture width), about the widest of the short-throw projectors without a
// mirror; --max-tan=<v> changes it
const MAX_TAN = Number((process.argv.find((a) => a.startsWith('--max-tan=')) ?? '--max-tan=1.25').split('=')[1]);

function terms(p) {
  const q = pose(p);
  const out = [];
  for (const pt of river) {
    const w = floorAt(q, pt.s, pt.t);
    if (!w) return null;
    out.push(['river', (w[0] - pt.x) / RIVER_SIGMA], ['river', (w[1] - pt.z) / RIVER_SIGMA]);
  }
  for (const [t, x, z, sg] of SIDES) {
    const zz = edgeZ(q, t, x);
    if (zz == null) return null;
    out.push(['side', (zz - z) / sg]);
  }
  for (const s of [0, 1]) for (const t of [0, 1]) if (!floorAt(q, s, t)) return null;
  // the east end at the river's latitude and near the south side; the west end at the middle
  for (const z of [3.7, 4.6]) {
    const xe = edgeX(q, 0, z);
    out.push(['east', Math.min(0, xe - EAST_MIN) / 0.1]);
  }
  const xw = edgeX(q, 1, 3.8);
  out.push(['west', Math.max(0, xw - WEST_MAX) / 0.2]);
  out.push(['lens', Math.max(0, q.th - MAX_TAN) / 0.01]);
  return out;
}
const cost = (p) => {
  const t = terms(p);
  return t ? t.reduce((a, [, v]) => a + v * v, 0) : 1e9;
};

// --------------------------------------------------------------------------- Nelder-Mead
function nelderMead(fn, x0, step, iters = 4000) {
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
    if (Math.abs(vals[n] - vals[0]) < 1e-10) break;
  }
  return { x: simplex[0], f: vals[0] };
}

let best = null;
for (const yaw of [-1.2, -0.4, 0.4, 1.2, 1.57, 2.0]) {
  for (const pitch of [-1.4, -1.0, -0.6]) {
    for (const roll of [0, 1.57, 3.14, -1.57]) {
      for (const lt of [-0.3, 0.3]) {
        let r = nelderMead(cost, [yaw, pitch, roll, lt, 0, 0], [0.3, 0.2, 0.3, 0.2, 0.3, 0.3]);
        r = nelderMead(cost, r.x, [0.05, 0.05, 0.05, 0.05, 0.05, 0.05]);
        if (!best || r.f < best.f) best = r;
      }
    }
  }
}

// --------------------------------------------------------------------------- report and write
const q = pose(best.x);
const rnd = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const quad = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([s, t]) => floorAt(q, s, t).map((v) => rnd(v, 3)));
const T = terms(best.x);
const rms = (k) => {
  const v = T.filter(([n]) => n === k).map(([, x]) => x);
  return rnd(Math.sqrt(v.reduce((a, x) => a + x * x, 0) / v.length), 2);
};
const riverErr = river.map((pt) => {
  const w = floorAt(q, pt.s, pt.t);
  return Math.hypot(w[0] - pt.x, w[1] - pt.z);
});
const sides = SIDES.map(([t, x, z]) => [t ? 'south' : 'north', x, z, rnd(edgeZ(q, t, x), 2)]);
const widthAt = (x) => rnd(edgeZ(q, 1, x) - edgeZ(q, 0, x), 2);
const projector = {
  _note: 'Written by scripts/fit_projector.mjs. Position measured (DSC_0108 to DSC_0112); aim, picture width and lens shift inferred by the fit; quad = floor corners at texture (s,t) = (0,0), (1,0), (1,1), (0,1): s from the east end, t from the north side.',
  position: POS,
  forward: q.f.map((v) => rnd(v, 5)),
  right: q.r.map((v) => rnd(v, 5)),
  up: q.u.map((v) => rnd(v, 5)),
  tanHalfWidth: rnd(q.th, 5),
  aspect: rnd(ASPECT, 5),
  shift: [rnd(q.sx, 5), rnd(q.sy, 5)],
  quad,
  fit: {
    cost: rnd(best.f, 3),
    riverCentreLineErrorM: { mean: rnd(riverErr.reduce((a, b) => a + b, 0) / riverErr.length, 3), max: rnd(Math.max(...riverErr), 3) },
    sides: sides.map(([n, x, z, got]) => `${n} limit at x ${x}: wanted z ${z}, fitted ${got}`),
    widthM: { x20_5: widthAt(20.5), x23: widthAt(23) },
    eastEndX: [rnd(edgeX(q, 0, 3.7), 2), rnd(edgeX(q, 0, 4.6), 2)],
    westEndX: rnd(edgeX(q, 1, 3.8), 2),
    throwRatio: rnd(1 / (2 * q.th), 3),
    rms: { river: rms('river'), side: rms('side'), east: rms('east'), west: rms('west') },
  },
};
console.log(JSON.stringify(projector, null, 2));

if (!process.argv.includes('--check')) {
  // the composite's frame keeps its numbers under its own name; the old key goes
  const out = {};
  for (const [k, v] of Object.entries(R)) {
    if (k === 'projection') out.composite = v;
    else if (k !== 'projector') out[k] = v;
  }
  out.projector = projector;
  writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log('written', FILE.pathname);
}
