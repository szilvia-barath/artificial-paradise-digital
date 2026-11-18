// Sets the length of Let it Flow's plastic river (#16, Room 4) in src/data/river.json without
// re-running scripts/make_river.py (which needs NumPy, SciPy and Pillow). The textures
// (river.webp, river-normal.webp, river-height.png) do not depend on the length and stay.
//
//   node scripts/set_river_length.mjs 4.05     then   node scripts/fit_projector.mjs
//
// It does what make_river.py does with RIVER_M set to the new length: every size and place
// read from the composite scales by new / old length about the point make_river.py anchors,
// the wall tip's x (WALL_X) and the composite frame's centre line (Z_CENTRE). So the tip stays
// at the wall, the river stays centred where it was across the room, and the composite's frame
// ("composite") scales with it, keeping the video's river on the plastic. The relief's
// thickness (hmax) stays. The obstacles' 3 cm margin scales too (2.6 cm at 4.05 m).

import { readFileSync, writeFileSync } from 'node:fs';

const WALL_X = 25.38; // as in make_river.py
const Z_CENTRE = 3.73; // as in make_river.py
const FILE = new URL('../src/data/river.json', import.meta.url);
const target = Number(process.argv[2]);
if (!(target > 1 && target < 10)) {
  console.error('usage: node scripts/set_river_length.mjs <length in metres>');
  process.exit(1);
}
const R = JSON.parse(readFileSync(FILE, 'utf8'));
const k = target / R.lengthM;
const X = (x) => +(WALL_X + (x - WALL_X) * k).toFixed(4);
const Z = (z) => +(Z_CENTRE + (z - Z_CENTRE) * k).toFixed(4);
const C = R.composite ?? R.projection;
const out = {
  ...R,
  pxPerMetre: R.pxPerMetre / k,
  xTop: X(R.xTop),
  zLeft: Z(R.zLeft),
  widthM: +(R.widthM * k).toFixed(4),
  lengthM: +(R.lengthM * k).toFixed(4),
  obstacles: R.obstacles.map(([x0, x1, z0, z1]) => [+X(x0).toFixed(3), +X(x1).toFixed(3), +Z(z0).toFixed(3), +Z(z1).toFixed(3)]),
  composite: { xEast: +X(C.xEast).toFixed(3), lengthM: +(C.lengthM * k).toFixed(3), zCentre: C.zCentre, widthM: +(C.widthM * k).toFixed(3) },
};
delete out.projection;
writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
console.log(`river ${R.lengthM} -> ${out.lengthM} m (x ${out.xTop - out.lengthM} to ${out.xTop}); now run node scripts/fit_projector.mjs`);
