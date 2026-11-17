import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OBSTACLES, R1, R1_NICHES, NICHE } from './layout.js';
import { dirtAlong } from './surface.js';
import { uvMetres } from './materials.js';
import { PLANT, BARS, BAR_BOTTOM } from './paradiseFactory.js';

// Furniture and fixtures, placed from the photos. Kept low-poly; static meshes are
// merged per material at the end, repeated parts are instanced.

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (rt, rb, h, mat, seg = 16) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);

function obstacle(x0, x1, z0, z1) {
  OBSTACLES.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
}

function place(obj, x, y, z, ry = 0) {
  obj.position.set(x, y, z);
  obj.rotation.y = ry;
  return obj;
}

// Box spanning explicit world bounds.
function slab(mat, x0, x1, y0, y1, z0, z1) {
  return place(box(x1 - x0, y1 - y0, z1 - z0, mat), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}

// Thin cylinder between two points.
function rod(mat, a, b, r = 0.01, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = cyl(r, r, d.length(), mat, seg);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

// Black wire-mesh grid (the folding chairs' seat and back), alpha-tested.
function wireGridMaterial() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = '#fff';
  g.lineWidth = 1.6;
  for (let i = 0; i <= 64; i += 8) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.anisotropy = 8;
  // alpha to coverage keeps the wires as wires at a distance instead of a solid panel
  return new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.45, metalness: 0.5, alphaMap: t, alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide });
}

// Perforated grey steel sheet (the bench fronts in _artificial paradise 01 - 02): round holes
// on an 8 mm grid, one texture tile = 25 cm, so UVs in metres repeat it 4 times a metre.
function perforatedMaterial() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#a3a5aa'; // lit from above only, the vertical sheet reads darker
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#26272b';
  const pitch = S / 32; // 32 holes per 25 cm
  for (let y = pitch / 2; y < S; y += pitch) {
    for (let x = pitch / 2; x < S; x += pitch) {
      g.beginPath();
      g.arc(x, y, pitch * 0.3, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.15 });
}

// A cable lying along a path of points (on the floor, down a wall).
function cable(mat, pts, r = 0.004) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 10), r, 5, false), mat);
}

// Folding wire chair as in Room 2 (DSC_0056–0059). Faces +z at ry = 0.
function wireChair(materials, gridMat, cushion = false) {
  const c = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.4), gridMat);
  seat.rotation.x = -Math.PI / 2;
  seat.position.set(0, 0.45, 0.02);
  c.add(seat);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), gridMat);
  back.position.set(0, 0.74, -0.2);
  back.rotation.x = -0.12;
  c.add(back);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const s of [-1, 1]) {
    const x = s * 0.21;
    c.add(rod(materials.black, V(x, 0, 0.2), V(x, 0.9, -0.22), 0.009));
    c.add(rod(materials.black, V(x, 0, -0.2), V(x, 0.45, 0.2), 0.009));
    c.add(rod(materials.black, V(x, 0.45, -0.18), V(x, 0.45, 0.22), 0.008));
  }
  c.add(rod(materials.black, V(-0.21, 0.89, -0.22), V(0.21, 0.89, -0.22), 0.008));
  if (cushion) {
    // a thin cream fabric seat pad tied to the frame (DSC_0059, DSC_0083)
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.028, 24), new THREE.MeshStandardMaterial({ color: 0xd8ceb6, roughness: 1 }));
    k.scale.set(0.38, 1, 0.36);
    k.position.set(0, 0.47, 0.02);
    c.add(k);
  }
  return c;
}

export function buildProps(materials) {
  const g = new THREE.Group();
  g.name = 'props';
  const anim = []; // per-frame callbacks (t, dt)
  const gridMat = wireGridMaterial();

  // ================================================================ Room 1
  // Positions measured in the 360° panorama (see layout.js). WX: west wall face,
  // EX: face of the two piers on the Room 2 side, RX: back of the doorway recess.
  const WX = R1.west;
  const EX = R1.east;
  const RX = R1.recess;
  const SZ = R1.D;

  // Stairs along the north wall, rising west through the wall into the stair shaft. This
  // comment named "DSC_0013–0016, panorama, close-ups of the flight" as the source; by the
  // reconstructor's account (PROGRESS.md, note of 15 November 2026) the flight was built from
  // her written descriptions and her close-ups, not measured on the photographs, and only
  // the foot is measured (below). Treads are dark, worn concrete. The
  // flight runs between two whitewashed brick parapets, each topped by a row of bare bricks
  // set on edge, square to the slope; a black railing on the open (south) side. The foot is
  // rebuilt from the stair photographs DSC_0016, DSC_0014 and DSC_0015 (PROGRESS.md, decision log,
  // 15 November 2026): a little bare brick pier under the open side's last coping brick, and
  // on the wall side a brick laid flat on a grey rendered base, with open floor between the
  // wall-side parapet and the north wall.
  {
    const run = 0.26;
    const rise = 0.19;
    const foot = EX - 2.54; // bottom riser; the last step ends ~50 cm before Wrong Data Landscape Dresden
    const steps = 17;
    // the bottom riser measures 0.11-0.12 m: the flight sits 0.07 m lower than rise x steps
    const sunk = 0.07;
    const tread = (i) => rise * (i + 1) - sunk; // top of step i (0 = the bottom step)
    // across the flight, z from the north wall face (measured at the foot in DSC_0016)
    const backOut = 0.37; // wall-side parapet, back face (0.13 thick: inferred)
    const backIn = 0.5; // wall-side parapet, face towards the treads
    const openIn = 1.69; // open-side parapet, face towards the treads (0.23 thick: inferred)
    const openOut = 1.92; // open-side parapet, face towards the room
    const pierX0 = foot + 0.08; // the pier: 0.12 m E-W, 0.21 m N-S
    const pierX1 = foot + 0.2;
    const pierZ0 = openOut - 0.21;
    const pierTop = 0.19;
    const capTop = pierTop + 0.012;
    const baseX1 = foot + 0.17; // wall-side base: 0.17 m E-W, 0.25 m high
    const baseTop = 0.25;
    const inRoom = Math.round((foot - WX) / run);
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.stair, steps);
    const m = new THREE.Matrix4();
    const q0 = new THREE.Quaternion();
    // the treads run under both parapets; their ends are hidden in the brickwork
    const tz0 = backIn - 0.02;
    const tz1 = openIn + 0.02;
    for (let i = 0; i < steps; i++) {
      const h = tread(i);
      const x1 = foot - run * i;
      m.compose(new THREE.Vector3(x1 - run / 2, h / 2, (tz0 + tz1) / 2), q0, new THREE.Vector3(run + 0.002, h, tz1 - tz0));
      inst.setMatrixAt(i, m);
    }
    g.add(inst);
    // behind the wall-side parapet: open floor at the foot (DSC_0016); further up nobody has
    // seen it (folding chairs stood there, higher up the flight), so it is filled in steps
    // 0.30 m below the treads (invented)
    {
      const first = 2;
      const fill = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.stair, steps - first);
      for (let i = first; i < steps; i++) {
        const h = tread(i) - 0.3;
        m.compose(new THREE.Vector3(foot - run * i - run / 2, h / 2, backOut / 2), q0, new THREE.Vector3(run + 0.002, h, backOut));
        fill.setMatrixAt(i - first, m);
      }
      g.add(fill);
    }
    // a parapet's side profile: its top runs 0.06 m above the step noses; `east` is where it
    // meets the floor at the foot, `eastTop` the height of its top there
    const parapet = (east, eastTop) => {
      const s = new THREE.Shape();
      s.moveTo(east, 0);
      s.lineTo(east, eastTop);
      for (let i = 0; i < inRoom; i++) s.lineTo(foot - run * i, tread(i) + 0.06);
      s.lineTo(WX - 0.02, tread(inRoom - 1) + 0.06);
      s.lineTo(WX - 0.02, 0);
      s.lineTo(east, 0);
      return s;
    };
    // open side: whitewashed brick down to the pier's west face, under the last coping bricks
    const openWall = new THREE.Mesh(new THREE.ExtrudeGeometry(parapet(pierX0, tread(0) + 0.06), { depth: openOut - openIn, bevelEnabled: false }), materials.whiteBrick);
    openWall.position.z = openIn;
    g.add(openWall);
    // wall side: whitewashed brick from the bottom riser up, its east end on the grey base
    const backWall = new THREE.Mesh(new THREE.ExtrudeGeometry(parapet(foot, tread(0) + 0.06), { depth: backIn - backOut, bevelEnabled: false }), materials.whiteBrick);
    backWall.position.z = backOut;
    g.add(backWall);
    // the grey rendered base at the wall-side end (render over brick, whitewashed in patches)
    const base = new THREE.Mesh(uvMetres(new THREE.BoxGeometry(baseX1 - foot, baseTop, backIn - backOut), baseX1 - foot, baseTop), materials.stair);
    base.position.set((foot + baseX1) / 2, baseTop / 2, (backOut + backIn) / 2);
    g.add(base);
    // the pier: one bare brick per course, laid flat, the lowest course partly under the
    // tiles (joints at 0.045 and 0.12 m), with a thin grey cement cap
    {
      const geo = uvMetres(new THREE.BoxGeometry(pierX1 - pierX0, pierTop, openOut - pierZ0), pierX1 - pierX0, pierTop);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + 0.032);
      const pier = new THREE.Mesh(geo, materials.stairBrick);
      pier.position.set((pierX0 + pierX1) / 2, pierTop / 2, (pierZ0 + openOut) / 2);
      g.add(pier);
      const cap = box(pierX1 - pierX0 + 0.006, capTop - pierTop, openOut - pierZ0 + 0.006, materials.stair);
      cap.position.set((pierX0 + pierX1) / 2, (pierTop + capTop) / 2, (pierZ0 + openOut) / 2);
      g.add(cap);
    }
    // damp stains, flaked render and dirt on the wall-side parapet's face, between the treads
    // and the coping (DSC_0016, DSC_0014)
    {
      const sh = new THREE.Shape();
      sh.moveTo(foot, tread(0));
      for (let i = 0; i < inRoom; i++) {
        sh.lineTo(foot - run * (i + 1), tread(i));
        if (i < inRoom - 1) sh.lineTo(foot - run * (i + 1), tread(i + 1));
      }
      sh.lineTo(foot - run * inRoom, tread(inRoom - 1) + 0.06);
      for (let i = inRoom - 1; i >= 0; i--) sh.lineTo(foot - run * i, tread(i) + 0.06);
      const geo = new THREE.ShapeGeometry(sh);
      // UVs: along the wall in metres, upwards measured from the line of the step noses
      const pos = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const base = ((foot - x) / run) * rise - sunk;
        uv.setXY(i, x, pos.getY(i) - base);
      }
      const stain = new THREE.Mesh(geo, materials.stairStain);
      stain.position.z = backIn + 0.003;
      stain.renderOrder = 1;
      g.add(stain);
    }
    // the brick-on-edge copings: one brick every 7.7 cm along the slope, each showing its
    // 6.5 x 12 cm end on the side, in its own red-brown, set a little irregularly in pale
    // mortar. On the open side the outer face is flush with the wall; at the foot the last
    // two bricks stand level, one over the end of the wall and one on the pier's cap. On the
    // wall side the inner face is flush with the parapet and the lowest brick meets the
    // brick on the base.
    {
      const len = Math.hypot(run * inRoom, rise * inRoom);
      const L = Math.hypot(run, rise);
      const d = new THREE.Vector2(-run / L, rise / L); // up the slope
      const nrm = new THREE.Vector2(rise / L, run / L); // square to it, upwards
      const angle = -Math.atan2(rise, run);
      const zOpen = (openIn + openOut) / 2;
      const zBack = backIn - 0.125;
      const base = (s) => new THREE.Vector2(foot, tread(0) + 0.06).addScaledVector(d, s);
      const mortarMat = new THREE.MeshStandardMaterial({ color: 0xcfc8ba, roughness: 1 });
      // on the wall side the mortar's inner face stands 3 mm back from the parapet's face and
      // the bricks' ends, so it shares no plane with them
      for (const zc of [zOpen, backIn - 0.1175 - 0.003]) {
        const mortar = box(len, 0.1, 0.235, mortarMat);
        const mc = base(len / 2).addScaledVector(nrm, 0.045);
        mortar.position.set(mc.x, mc.y, zc);
        mortar.rotation.z = angle;
        g.add(mortar);
      }
      // the level bed at the foot of the open side, over the wall's end, stopping at the
      // pier's cap
      const bedX1 = pierX0 - 0.003;
      const bed = box(bedX1 - foot, 0.02, 0.235, mortarMat);
      bed.position.set((foot + bedX1) / 2, tread(0) + 0.06 + 0.01, zOpen);
      g.add(bed);
      // where the sloped bricks start, up the slope from the foot: on the open side one pitch
      // up, so the lowest stands beside the level brick; on the wall side 5 cm up, so it meets
      // the brick on the base without running into it
      const sides = [[zOpen, 0, 0.077], [zBack, 101, 0.05]];
      const count = (s0) => Math.floor((len - s0) / 0.077);
      // old, soft, sand-faced brick: a pitted, dusty face with chips and mortar left on it
      // (one small texture on every face, tinted per brick), and worn, uneven edges
      const face = document.createElement('canvas');
      face.width = face.height = 128;
      const fg = face.getContext('2d');
      fg.fillStyle = '#f0eae2';
      fg.fillRect(0, 0, 128, 128);
      // the darker, brownish stain in the middle of each brick (close-ups)
      const stain = fg.createRadialGradient(64, 64, 4, 64, 64, 46);
      stain.addColorStop(0, 'rgba(120,88,66,0.42)');
      stain.addColorStop(0.6, 'rgba(130,98,74,0.22)');
      stain.addColorStop(1, 'rgba(130,98,74,0)');
      fg.fillStyle = stain;
      fg.fillRect(0, 0, 128, 128);
      let sd = 7;
      const fr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      for (let k = 0; k < 40; k++) {
        fg.fillStyle = fr() < 0.5 ? `rgba(255,248,238,${0.12 + fr() * 0.25})` : `rgba(150,110,90,${0.08 + fr() * 0.15})`;
        fg.beginPath();
        fg.ellipse(fr() * 128, fr() * 128, 6 + fr() * 26, 4 + fr() * 14, fr() * 3, 0, Math.PI * 2);
        fg.fill();
      }
      for (let k = 0; k < 900; k++) {
        fg.fillStyle = `rgba(70,45,35,${0.15 + fr() * 0.35})`;
        fg.fillRect(fr() * 128, fr() * 128, 1 + fr() * 2, 1 + fr() * 2);
      }
      for (let k = 0; k < 26; k++) {
        // chips and mortar crumbs at the edges
        const x = fr() < 0.5 ? fr() * 14 : 114 + fr() * 14;
        fg.fillStyle = fr() < 0.6 ? `rgba(240,236,228,${0.5 + fr() * 0.4})` : `rgba(110,80,64,${0.35 + fr() * 0.3})`;
        fg.fillRect(x, fr() * 128, 3 + fr() * 8, 3 + fr() * 12);
      }
      const faceTex = new THREE.CanvasTexture(face);
      faceTex.colorSpace = THREE.SRGBColorSpace;
      const faceBump = new THREE.CanvasTexture(face);
      const brickMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: faceTex, bumpMap: faceBump, bumpScale: 1.5, roughness: 0.97 });
      const brickGeo = new THREE.BoxGeometry(0.065, 0.12, 0.25, 2, 3, 6);
      {
        // round off and nick the edges: vertices on two faces at once are pulled in a little
        const pos = brickGeo.attributes.position;
        const hx = 0.0325;
        const hy = 0.06;
        const hz = 0.125;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = pos.getZ(i);
          const ex = Math.abs(Math.abs(x) - hx) < 1e-4;
          const ey = Math.abs(Math.abs(y) - hy) < 1e-4;
          const ez = Math.abs(Math.abs(z) - hz) < 1e-4;
          if (ex + ey + ez < 2) continue;
          const k = 0.75 + 0.25 * Math.abs(Math.sin(x * 913 + y * 577 + z * 311)); // same on every face
          pos.setXYZ(i, ex ? x - Math.sign(x) * 0.006 * k : x, ey ? y - Math.sign(y) * 0.007 * k : y, ez ? z - Math.sign(z) * 0.008 * k : z);
        }
        brickGeo.computeVertexNormals();
      }
      const extra = [
        // [x, bed y, z, tilt]: the two level bricks at the foot of the open side
        [foot + 0.04, tread(0) + 0.06 + 0.02, zOpen, 0.0],
        [(pierX0 + pierX1) / 2 + 0.01, capTop, zOpen, -0.06],
      ];
      const bricks = new THREE.InstancedMesh(brickGeo, brickMat, count(sides[0][2]) + count(sides[1][2]) + extra.length + 1);
      const q2 = new THREE.Quaternion();
      const e2 = new THREE.Euler();
      const c = new THREE.Color();
      const one = new THREE.Vector3(1, 1, 1);
      const r = (k) => (Math.sin(k * 12.9898) * 43758.5453) % 1; // fixed jitter per brick
      // faded, dusty orange-pink, a few scorched a shade deeper, old whitewash on some
      const tint = (k) => {
        const t = Math.abs(r(k + 11));
        c.setHSL(0.04 + t * 0.03, 0.22 + Math.abs(r(k + 13)) * 0.12, 0.6 + Math.abs(r(k + 17)) * 0.1 - (t > 0.9 ? 0.07 : 0), THREE.SRGBColorSpace);
        if (Math.abs(r(k + 19)) > 0.84) c.lerp(new THREE.Color(0xd9d3c8), 0.45 + Math.abs(r(k + 23)) * 0.3);
        return c;
      };
      let k = 0;
      for (const [zc, seed, s0] of sides) {
        for (let i = 0; i < count(s0); i++) {
          const j = i + seed;
          const p = base(s0 + (i + 0.5) * 0.077).addScaledVector(nrm, 0.055 + Math.abs(r(j + 1)) * 0.008);
          e2.set(r(j + 7) * 0.03, r(j + 3) * 0.02, angle + r(j + 5) * 0.05);
          q2.setFromEuler(e2);
          m.compose(new THREE.Vector3(p.x, p.y, zc + r(j + 9) * 0.012), q2, one);
          bricks.setMatrixAt(k, m);
          bricks.setColorAt(k++, tint(j));
        }
      }
      for (const [x, y, zc, tilt] of extra) {
        e2.set(0, 0, tilt);
        q2.setFromEuler(e2);
        m.compose(new THREE.Vector3(x, y + 0.06, zc), q2, one);
        bricks.setMatrixAt(k, m);
        bricks.setColorAt(k++, tint(k + 300));
      }
      // the brick laid flat on the wall-side base (about 14 x 12 x 7 cm), east face flush
      // with the base: the same brick, scaled
      m.compose(new THREE.Vector3(baseX1 - 0.07, baseTop + 0.035, backIn - 0.06), q0, new THREE.Vector3(0.14 / 0.065, 0.07 / 0.12, 0.12 / 0.25));
      bricks.setMatrixAt(k, m);
      bricks.setColorAt(k++, tint(207));
      g.add(bricks);
      obstacle(pierX0 - 0.02, pierX1 + 0.02, pierZ0 - 0.02, openOut + 0.02);
      // the wall-side end and the narrow strip of floor behind it
      obstacle(foot - 0.02, baseX1 + 0.02, 0, backIn + 0.02);
    }
    // railing posts + handrail, on the open side's coping; the first post 0.36 m up from the
    // bottom riser (DSC_0016: 0.33 to 0.38 m)
    const railH = 0.9;
    const zRail = (openIn + openOut) / 2;
    const top = (x) => ((foot - x) / run) * rise + tread(0) + 0.06;
    const firstPost = foot - 0.36;
    for (let x = firstPost; x > WX; x -= 0.75) {
      g.add(rod(materials.black, new THREE.Vector3(x, top(x), zRail), new THREE.Vector3(x, top(x) + railH, zRail), 0.014));
    }
    g.add(rod(materials.black, new THREE.Vector3(firstPost, top(firstPost) + railH, zRail), new THREE.Vector3(WX - 0.1, top(WX - 0.1) + railH, zRail), 0.02));
    obstacle(WX - 0.4, foot + 0.02, 0, openOut + 0.02);
  }

  // Grey bench along the south wall, turning up the west wall (the L on the plan): a dark
  // board on a box faced with perforated steel sheet in panels (_artificial paradise 01 - 02)
  {
    const H = 0.45;
    const perf = perforatedMaterial();
    const seamMat = new THREE.MeshStandardMaterial({ color: 0x3a3b3f, roughness: 0.5, metalness: 0.5 });
    // a perforated panel face: from a to b along the floor (x, z), facing out by (nx, nz)
    const face = (ax, az, bx, bz, nx, nz) => {
      const len = Math.hypot(bx - ax, bz - az);
      const geo = new THREE.PlaneGeometry(len, H - 0.05);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len, uv.getY(i) * (H - 0.05));
      const m = new THREE.Mesh(geo, perf);
      m.position.set((ax + bx) / 2 + nx * 0.002, 0.02 + (H - 0.05) / 2, (az + bz) / 2 + nz * 0.002);
      m.rotation.y = Math.atan2(nx, nz);
      g.add(m);
      // panel seams every ~60 cm
      const n = Math.max(1, Math.round(len / 0.6));
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.008, H - 0.05, 0.004), seamMat);
        s.position.set(ax + (bx - ax) * t + nx * 0.003, 0.02 + (H - 0.05) / 2, az + (bz - az) * t + nz * 0.003);
        s.rotation.y = Math.atan2(nx, nz);
        g.add(s);
      }
    };
    face(WX + 0.47, SZ - 0.43, EX - 0.02, SZ - 0.43, 0, -1); // long front
    face(WX + 0.47, SZ - 0.87, WX + 0.47, SZ - 0.43, 1, 0); // front of the return
    face(WX, SZ - 0.87, WX + 0.47, SZ - 0.87, 0, -1); // end of the return
    g.add(slab(materials.bench, WX, EX - 0.02, 0, H - 0.03, SZ - 0.43, SZ));
    g.add(slab(materials.benchTop, WX, EX, H - 0.03, H, SZ - 0.47, SZ));
    g.add(slab(materials.bench, WX, WX + 0.47, 0, H - 0.03, SZ - 0.87, SZ - 0.43));
    g.add(slab(materials.benchTop, WX, WX + 0.51, H - 0.03, H, SZ - 0.91, SZ - 0.43));
    obstacle(WX, EX, SZ - 0.49, SZ);
    obstacle(WX, WX + 0.52, SZ - 0.93, SZ - 0.43);
    // two white heating pipes on the wall just above the bench
    dirtAlong(WX, 0.6, SZ - 0.03, EX, 0.6, SZ - 0.03);
    for (const y of [0.56, 0.63]) {
      const p = cyl(0.016, 0.016, EX - WX, materials.white, 8);
      p.rotation.z = Math.PI / 2;
      g.add(place(p, (WX + EX) / 2, y, SZ - 0.03));
    }
  }

  // Plinths either side of the doorway, standing in the recess
  for (const z of [3.42, 4.82]) {
    g.add(place(box(0.32, 1.15, 0.32, materials.white), RX - 0.18, 0.575, z));
    obstacle(RX - 0.36, RX, z - 0.17, z + 0.17);
  }
  // electric box and cables left of the doorway (DSC_0020)
  g.add(place(box(0.03, 0.16, 0.13, materials.white), RX - 0.015, 1.62, 3.48));

  // Radiators (aluminium sections)
  const radiator = (x, z, ry, w = 0.8, h = 0.85, y = 0.1, mat = materials.white) => {
    const r = new THREE.Group();
    const fins = Math.round(w / 0.08);
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, h, 0.09), mat, fins);
    const m = new THREE.Matrix4();
    for (let i = 0; i < fins; i++) {
      m.makeTranslation(-w / 2 + (i + 0.5) * (w / fins), h / 2, 0);
      inst.setMatrixAt(i, m);
    }
    r.add(inst);
    place(r, x, y, z, ry);
    g.add(r);
  };
  // the two on the street wall stand in the window niches
  const NX = WX - NICHE.depth; // back of the niches
  radiator(NX + 0.07, 3.53, Math.PI / 2, 0.94);
  radiator(NX + 0.07, SZ - 1.09, Math.PI / 2, 0.42);
  radiator(EX - 0.08, 5.59, -Math.PI / 2, 0.94);

  // High basement windows at the back of the niches (_artificial paradise 01 - 02 and the
  // close-up of the window by the stairs): a thick white frame with an inner sash, frosted
  // grey-blue glass, reeded in its lower part, the grille outside showing through it only
  // faintly, a boxed white lintel above and a stepped sill below
  const barMat = new THREE.MeshStandardMaterial({ color: 0x737a8c, roughness: 0.7, emissive: 0x2c3040 });
  for (const { z0: nz0, z1: nz1, win: { z, w } } of R1_NICHES) {
    const y0 = NICHE.sill;
    const y1 = NICHE.top - 0.03;
    const f = 0.07; // outer frame
    const s = 0.035; // inner sash
    g.add(slab(materials.white, NX, NX + 0.05, y0, y1, z - w / 2, z + w / 2)); // frame
    g.add(slab(materials.white, NX + 0.05, NX + 0.07, y0 + f - s, y1 - f + s, z - w / 2 + f - s, z + w / 2 - f + s)); // sash
    const gy0 = y0 + f;
    const gy1 = y1 - f;
    const split = gy0 + (gy1 - gy0) * 0.42;
    g.add(slab(materials.reededGlass, NX + 0.07, NX + 0.072, gy0, split, z - w / 2 + f, z + w / 2 - f));
    g.add(slab(materials.windowGlass, NX + 0.07, NX + 0.072, split, gy1, z - w / 2 + f, z + w / 2 - f));
    for (let k = 1; k < 5; k++) {
      const bz = z - w / 2 + f + (k * (w - 2 * f)) / 5;
      g.add(slab(barMat, NX + 0.072, NX + 0.075, gy0, gy1, bz - 0.006, bz + 0.006));
    }
    for (let k = 1; k < 4; k++) {
      const by = gy0 + (k * (gy1 - gy0)) / 4;
      g.add(slab(barMat, NX + 0.072, NX + 0.075, by - 0.006, by + 0.006, z - w / 2 + f, z + w / 2 - f));
    }
    // the boxed lintel across the top of the niche, standing a little proud of the wall
    g.add(slab(materials.white, WX - 0.25, WX + 0.04, NICHE.top - 0.03, NICHE.top + 0.13, nz0 - 0.03, nz1 + 0.03));
    // the sill: two shallow steps out to the face of the wall
    g.add(slab(materials.white, NX, WX - 0.08, y0 - 0.04, y0, z - w / 2 - 0.02, z + w / 2 + 0.02));
    g.add(slab(materials.white, NX, WX, y0 - 0.09, y0 - 0.04, z - w / 2 - 0.02, z + w / 2 + 0.02));
  }
  // the round vent in the window by the stairs: a blue mesh disc in a white ring
  {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const vg = c.getContext('2d');
    vg.fillStyle = '#3d5cc4';
    vg.fillRect(0, 0, 64, 64);
    vg.strokeStyle = 'rgba(15,20,45,0.85)';
    vg.lineWidth = 1.4;
    for (let i = 2; i < 64; i += 5) {
      vg.beginPath(); vg.moveTo(i, 0); vg.lineTo(i, 64); vg.stroke();
      vg.beginPath(); vg.moveTo(0, i); vg.lineTo(64, i); vg.stroke();
    }
    const vt = new THREE.CanvasTexture(c);
    vt.colorSpace = THREE.SRGBColorSpace;
    const vent = new THREE.Mesh(new THREE.CircleGeometry(0.067, 28), new THREE.MeshStandardMaterial({ map: vt, roughness: 0.5, emissive: 0x101830 }));
    vent.rotation.y = Math.PI / 2;
    g.add(place(vent, NX + 0.078, 2.27, R1_NICHES[0].win.z));
    const ring = cyl(0.074, 0.074, 0.012, materials.white, 28);
    ring.rotation.z = Math.PI / 2;
    g.add(place(ring, NX + 0.07, 2.27, R1_NICHES[0].win.z));
  }
  // the heating pipe along the foot of the street wall, between the radiators
  {
    const p = cyl(0.016, 0.016, 2.6, materials.white, 8);
    p.rotation.x = Math.PI / 2;
    g.add(place(p, WX + 0.03, 0.06, 4.8));
    dirtAlong(WX + 0.03, 0.06, 3.5, WX + 0.03, 0.06, 6.1);
  }

  // Cables on the floor (_artificial paradise 01 - 02): the screen's black lead down the wall
  // to its adapter, two white power strips, and leads on to the plant's pump and the LED
  // bars; a white lead comes down the wall from the little sensor beside the window
  {
    const Y = 0.005; // lying on the floor
    const black = materials.black;
    const white = materials.white;
    const screenZ = 5.23;
    const ad = [0.62, 4.98]; // the screen's adapter
    const p1 = [1.02, 4.62]; // power strips
    const p2 = [1.42, 4.3];
    g.add(cable(black, [[WX + 0.03, 1.14, screenZ], [WX + 0.035, 0.6, screenZ + 0.01], [WX + 0.04, Y + 0.02, screenZ + 0.02], [0.15, Y, 5.12], [0.4, Y, 5.1], [ad[0] - 0.05, Y, ad[1]]]));
    g.add(place(box(0.11, 0.035, 0.065, black), ad[0], 0.0175, ad[1], 0.3));
    g.add(cable(black, [[ad[0] + 0.05, Y, ad[1] - 0.02], [0.78, Y, 4.92], [0.86, Y, 4.7], [p1[0] - 0.12, Y, p1[1] + 0.03]], 0.003));
    for (const [[x, z], ry] of [[p1, 0.6], [p2, -0.4]]) {
      g.add(place(box(0.3, 0.04, 0.055, white), x, 0.02, z, ry));
      for (const o of [-0.06, 0.04]) g.add(place(box(0.035, 0.045, 0.035, black), x + Math.cos(ry) * o, 0.06, z - Math.sin(ry) * o, ry));
    }
    // strip to strip, and the first strip to the wall socket by the radiator
    g.add(cable(white, [[p1[0] + 0.12, Y, p1[1] - 0.07], [1.15, Y, 4.42], [1.08, Y, 4.33], [p2[0] - 0.13, Y, p2[1] - 0.05]], 0.0045));
    g.add(cable(white, [[p1[0] - 0.1, Y, p1[1] + 0.06], [0.55, Y, 4.5], [0.2, Y, 4.42], [WX + 0.04, Y + 0.02, 4.4], [WX + 0.03, 0.28, 4.4]], 0.0045));
    g.add(place(box(0.03, 0.08, 0.08, white), WX + 0.015, 0.3, 4.4));
    // from the second strip to the pump in the plant's water box and up to the foot of each LED bar
    g.add(cable(black, [[p2[0] + 0.12, Y, p2[1] - 0.04], [1.7, Y, 4.12], [1.85, Y, 3.95], [PLANT.x - 0.15, Y, PLANT.z + 0.12], [PLANT.x - 0.1, 0.1, PLANT.z + 0.05]], 0.003));
    for (const [i, bar] of BARS.entries()) {
      g.add(cable(i ? white : black, [[p2[0] + 0.1, Y, p2[1] + 0.02], [1.65 + i * 0.2, Y, 4.35 - i * 0.05], [bar.x - 0.15, Y, bar.z + 0.1], [bar.x - 0.02, Y, bar.z], [bar.x - 0.015, BAR_BOTTOM * 0.5, bar.z], [bar.x - 0.01, BAR_BOTTOM, bar.z]], 0.003));
    }
    // the sensor beside the first window and its lead down the pier
    const sensorZ = R1_NICHES[1].z0 - 0.08;
    g.add(place(cyl(0.035, 0.035, 0.05, white, 16).rotateZ(Math.PI / 2), WX + 0.025, 2.3, sensorZ));
    g.add(cable(white, [[WX + 0.02, 2.27, sensorZ], [WX + 0.02, 1.2, sensorZ - 0.01], [WX + 0.025, Y + 0.02, sensorZ - 0.02], [0.2, Y, 5.25], [0.5, Y, 4.85], [p1[0] - 0.13, Y, p1[1] + 0.01]], 0.0045));
  }

  // White pipes running up beside the doorway to Room 2 (DSC_0021)
  dirtAlong(RX - 0.03, 0, 4.63, RX - 0.03, 2.9, 4.63);
  for (const z of [4.6, 4.66]) g.add(place(cyl(0.017, 0.017, 2.9, materials.white, 8), RX - 0.03, 1.45, z));

  // ================================================================ Room 2
  {
    // bar counter tops (dark laminate) over the brick half walls
    g.add(slab(materials.counterTop, 7.689, 9.87, 1.0, 1.05, 4.628, 5.179));
    g.add(slab(materials.counterTop, 9.788, 10.29, 1.0, 1.05, 4.058, 4.761));
    // behind the bar: low cabinets, shelves with glasses, kettle, bottles
    g.add(slab(materials.white, 7.793, 9.808, 0, 0.88, 5.331, 5.72));
    g.add(slab(materials.counterTop, 7.772, 9.829, 0.88, 0.92, 5.312, 5.73));
    for (const y of [1.42, 1.78]) g.add(slab(materials.wood, 7.876, 9.694, y, y + 0.025, 5.502, 5.72));
    const glassGeo = new THREE.CylinderGeometry(0.035, 0.028, 0.12, 10);
    const n = 22;
    const glasses = new THREE.InstancedMesh(glassGeo, materials.glass, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const row = i < 9 ? 0 : i < 18 ? 1 : 2;
      const k = row === 2 ? i - 18 : i % 9;
      const x = row === 2 ? 8.707 + k * 0.1 : 8.032 + k * 0.17;
      const y = row === 0 ? 1.505 : row === 1 ? 1.865 : 1.11;
      const z = row === 2 ? 4.837 + (k % 2) * 0.08 : 5.6;
      m.makeTranslation(x, y, z);
      glasses.setMatrixAt(i, m);
    }
    g.add(glasses);
    // wine bottles where the white roll stood: dark green glass, dark foil on the neck
    const wineMat = new THREE.MeshStandardMaterial({ color: 0x1d3a22, roughness: 0.15, metalness: 0.1 });
    const foilMat = new THREE.MeshStandardMaterial({ color: 0x5a1420, roughness: 0.4, metalness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const bx = 8.05 + i * 0.085;
      g.add(place(cyl(0.037, 0.037, 0.22, wineMat, 14), bx, 1.03, 5.502));
      g.add(place(cyl(0.014, 0.034, 0.05, wineMat, 12), bx, 1.165, 5.502));
      g.add(place(cyl(0.014, 0.014, 0.07, foilMat, 10), bx, 1.225, 5.502));
    }
    const bottleMat = new THREE.MeshStandardMaterial({ color: 0x3a1f16, roughness: 0.2, metalness: 0.1 });
    for (let i = 0; i < 3; i++) {
      g.add(place(cyl(0.035, 0.035, 0.24, bottleMat, 10), 9.331 + i * 0.09, 1.04, 5.51));
      g.add(place(cyl(0.012, 0.02, 0.08, bottleMat, 8), 9.331 + i * 0.09, 1.2, 5.51));
    }
    obstacle(7.481, 9.87, 4.628, 5.73);

    // round black café table and the folding wire chairs under Artificial Paradise – The Eden project (no. 7)
    const table = new THREE.Group();
    // (DSC_0059, DSC_0083: a glossy black round top on a single black column and round foot)
    const gloss = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.22, metalness: 0.2 });
    table.add(place(cyl(0.3, 0.3, 0.02, gloss, 40), 0, 0.75, 0));
    table.add(place(cyl(0.3, 0.29, 0.012, materials.black, 40), 0, 0.734, 0));
    table.add(place(cyl(0.022, 0.022, 0.7, gloss, 14), 0, 0.38, 0));
    table.add(place(cyl(0.022, 0.06, 0.05, gloss, 14), 0, 0.04, 0));
    table.add(place(cyl(0.21, 0.23, 0.018, gloss, 32), 0, 0.009, 0));
    g.add(place(table, 8.292, 0, 2.272));
    obstacle(7.98, 8.603, 1.987, 2.557);
    g.add(place(wireChair(materials, gridMat, true), 7.169, 0, 2.063, 0.1));
    obstacle(6.92, 7.419, 1.844, 2.291);
    g.add(place(wireChair(materials, gridMat, true), 8.967, 0, 2.557, -1.9));
    obstacle(8.707, 9.227, 2.319, 2.794);

    // enamel pendant lamps (DSC_0083)
    for (const [x, z] of [[7.408, 3.127], [8.603, 3.649]]) {
      const lamp = new THREE.Group();
      lamp.add(place(cyl(0.005, 0.005, 0.5, materials.black, 4), 0, 2.5, 0));
      lamp.add(place(cyl(0.05, 0.19, 0.15, materials.black, 24), 0, 2.2, 0));
      const inner = cyl(0.045, 0.18, 0.13, materials.white, 24);
      inner.material = materials.white.clone();
      inner.material.side = THREE.BackSide;
      lamp.add(place(inner, 0, 2.2, 0));
      lamp.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), materials.warmBulb), 0, 2.13, 0));
      g.add(place(lamp, x, 0, z));
    }

    // closed door to the toilets
    g.add(slab(materials.door, 6.089, 6.962, 0, 2.02, 5.692, 5.73));
    g.add(slab(materials.white, 6.027, 6.089, 0, 2.08, 5.682, 5.73));
    g.add(slab(materials.white, 6.962, 7.024, 0, 2.08, 5.682, 5.73));
    g.add(slab(materials.white, 6.027, 7.024, 2.02, 2.08, 5.682, 5.73));
    g.add(place(box(0.12, 0.02, 0.04, materials.steel), 6.837, 1.02, 5.673));

    // grille in front of the storage alcove (DSC_0058–0060): dark galvanised steel, round
    // rods ending in points above the top bar, three flat bars; lumber stored behind
    {
      const steel = new THREE.MeshStandardMaterial({ color: 0x4a4c50, roughness: 0.55, metalness: 0.6 });
      for (let x = 8.86; x < 9.82; x += 0.16) {
        g.add(rod(steel, new THREE.Vector3(x, 0.06, 1.59), new THREE.Vector3(x, 2.0, 1.59), 0.008, 6));
        g.add(place(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), steel), x, 2.025, 1.59));
      }
      for (const y of [0.25, 1.05, 1.86]) g.add(slab(steel, 8.78, 9.83, y, y + 0.035, 1.575, 1.582));
    }
    for (let i = 0; i < 5; i++) {
      const b = box(0.12, 2.0, 0.025, materials.wood);
      place(b, 8.915 + i * 0.17, 1.0, 0.25 + i * 0.06);
      b.rotation.x = -0.12;
      g.add(b);
    }
    obstacle(8.759, 9.85, 1.5, 1.62);
  }

  // ================================================================ Room 4
  {
    // ceiling-hung projector for Let it Flow
    const proj = new THREE.Group();
    proj.add(place(box(0.36, 0.13, 0.3, materials.black), 0, 2.38, 0));
    proj.add(place(cyl(0.02, 0.02, 0.45, materials.black, 6), 0, 2.66, 0));
    const lens = cyl(0.045, 0.045, 0.03, materials.led, 16);
    lens.rotation.z = Math.PI / 2;
    proj.add(place(lens, 0.19, 2.38, 0));
    g.add(place(proj, 17.48, 0, 3.725));

    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x55575c, roughness: 0.6 });
    // low heating pipe along the north wall + big drain pipes coming down (DSC_0104–0109)
    const low = cyl(0.03, 0.03, 9.48, pipeMat, 8);
    low.rotation.z = Math.PI / 2;
    g.add(place(low, 20.64, 0.42, 1.778));
    dirtAlong(15.9, 0.42, 1.778, 25.38, 0.42, 1.778);
    for (const [x, y0, r] of [[18.917, 0.42, 0.03], [24.184, 0.42, 0.03]]) {
      g.add(place(cyl(r, r, 2.9 - y0, pipeMat, 10), x, (2.9 + y0) / 2, 1.73 + r + 0.02));
      dirtAlong(x, y0, 1.75 + r, x, 2.9, 1.75 + r);
    }
    // a second low pipe above the first (DSC_0109)
    const low2 = cyl(0.028, 0.028, 9.48, pipeMat, 8);
    low2.rotation.z = Math.PI / 2;
    g.add(place(low2, 20.64, 0.66, 1.776));
    // the two big drain pipes coming down from the top pipe (DSC_0109, DSC_0111): one
    // straight down to an elbow into the wall at about 1 m, the other joining it at a slant
    {
      const r = 0.065;
      const z = 1.73 + r + 0.02;
      const V = (x, y) => new THREE.Vector3(x, y, z);
      const parts = [[V(20.305, 2.9), V(20.305, 1.05)], [V(20.976, 2.9), V(20.976, 2.0)], [V(20.976, 2.0), V(20.37, 1.42)]];
      for (const [a, b] of parts) g.add(rod(pipeMat, a, b, r, 12));
      // bottom elbow: a short bend turning into the wall
      g.add(place(cyl(r, r, 0.12, pipeMat, 12).rotateX(Math.PI / 2), 20.305, 1.0, z - 0.05));
      for (const y of [2.2, 1.65]) g.add(place(cyl(r + 0.012, r + 0.012, 0.06, pipeMat, 12), 20.305, y, z));
      g.add(place(cyl(r + 0.012, r + 0.012, 0.06, pipeMat, 12), 20.976, 2.25, z));
      dirtAlong(20.305, 1.0, z, 20.305, 2.9, z);
      dirtAlong(20.976, 2.0, z, 20.976, 2.9, z);
    }
    // small black box with a light and a round camera high on the north wall, right of the
    // drains (DSC_0109, DSC_0111), just west of recess A's west arris (DSC_0112, 04-03)
    g.add(place(box(0.11, 0.24, 0.1, materials.black), 21.8, 2.28, 1.79));
    g.add(place(box(0.04, 0.03, 0.04, materials.led), 21.82, 2.42, 1.8));
    g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), materials.black), 21.66, 2.15, 1.77));
    // a round pipe standing on recess A's sill against its east jamb, rising behind the big
    // pipe (DSC_0112, 04-03, w16-documentation.mp4 00:00); how far it stands from the back is
    // invented. Its top is hidden in every photograph: it runs on up into the wall over the
    // recess (from 2.75 m), so no open end shows (inferred)
    g.add(place(cyl(0.04, 0.04, 2.78 - 0.95, pipeMat, 10), 22.72, (2.78 + 0.95) / 2, 1.67));
    // the pale pipe with collars above the projection, and the dark one along the top of the
    // north wall. This comment named "DSC_0113; height and thickness from the 4 m wall's
    // scale" as the source of both. By the reconstructor's account (PROGRESS.md, note of 15
    // November 2026) the pale pipe was built from her written descriptions; it is now measured
    // on DSC_0113 (below). How the dark one's height and thickness were found is not
    // recorded; DSC_0112 gives 2.40 to 2.57 m against its 2.46 to 2.66 here (not changed yet)
    const palePipe = new THREE.MeshStandardMaterial({ color: 0x3f3c37, roughness: 0.65 });
    // the pipe over the projection is white paint; the projector lights it (DSC_0113–0114)
    const endPipe = new THREE.MeshStandardMaterial({ color: 0x8e8a83, roughness: 0.6 });
    const along = (r, len, mat, x, y, z) => {
      const m = cyl(r, r, len, mat, 14);
      m.rotation.x = Math.PI / 2;
      return place(m, x, y, z);
    };
    // Measured on DSC_0113 (4 m wall, 652 px/m), DSC_0116 (brick courses) and mamu.jpg (2013),
    // see the decision log, 15 November 2026: Ø 0.16 m, axis 2.58 m (0.88 to 0.90 of the end
    // wall's height in the photographs; the model's end wall shows 2.75 m), 2 cm off the wall
    // (invented); it comes out from behind the dark pipe's end and stops 5 cm short of the
    // south wall in a domed cap, tip at z 5.68
    const PX = 25.3;
    const PR = 0.08;
    g.add(along(PR, 3.75, endPipe, PX, 2.58, 3.725));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(PR, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), endPipe);
    cap.rotation.x = Math.PI / 2; // the dome faces south (+z)
    g.add(place(cap, PX, 2.58, 5.6));
    dirtAlong(PX, 2.58, 1.85, PX, 2.58, 5.68);
    // five sockets, the last one the cap's: 12 cm long, Ø 0.19
    for (const z of [2.0, 2.45, 3.44, 4.45, 5.45]) g.add(along(0.095, 0.12, endPipe, PX, 2.58, z));
    // its branch near the north corner: off the top at z 2.30, rising south at about 47° to a
    // rounded end just under the ceiling line (DSC_0113). The model's end wall shows only
    // 2.75 m, where the last vault bay springs, so the end (top 2.75, centre z 2.33) is lower
    // and nearer the pipe than the photograph's z 2.47 (decision log, fix of 15 November 2026)
    const bA = new THREE.Vector3(PX, 2.58, 2.23);
    const bB = new THREE.Vector3(PX, 2.685, 2.33);
    g.add(rod(endPipe, bA, bB, 0.062, 12));
    g.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 8), endPipe), PX, bB.y, bB.z));

    // the dark conduit along the middle of the ceiling with four LED floodlights on it, the
    // projector hanging at its west end (DSC_0111, DSC_0113, DSC_0114)
    {
      const x0 = 17.48;
      const x1 = 23.9;
      g.add(slab(materials.black, x0, x1, 2.665, 2.72, 3.69, 3.76));
      const lampFace = new THREE.MeshStandardMaterial({ color: 0x9a9b9e, roughness: 0.4, metalness: 0.3 });
      for (const [x, tilt, side] of [[19.1, 0.7, 1], [20.4, 0.55, -1], [21.75, 0.7, 1], [23.0, 0.6, -1]]) {
        const f = new THREE.Group();
        f.add(place(box(0.13, 0.035, 0.11, materials.black), 0, 0, 0));
        f.add(place(box(0.11, 0.004, 0.09, lampFace), 0, -0.019, 0));
        f.add(place(box(0.02, 0.06, 0.02, materials.black), 0, 0.04, 0));
        f.rotation.z = tilt; // tipped towards the end wall
        f.rotation.x = side * 0.25;
        g.add(place(f, x, 2.6, 3.725 + side * 0.03));
      }
    }
    // (the big one is painted white like the walls and runs the whole room, as in the lit
    // photo of the empty room)
    const top = cyl(0.1, 0.1, 9.5, palePipe, 12);
    top.rotation.z = Math.PI / 2;
    g.add(place(top, 20.65, 2.56, 1.84));
    for (const x of [17.2, 19.6, 22.0, 24.4]) {
      const c = cyl(0.115, 0.115, 0.09, palePipe, 12);
      c.rotation.z = Math.PI / 2;
      g.add(place(c, x, 2.56, 1.84));
    }
    dirtAlong(15.9, 2.56, 1.84, 25.4, 2.56, 1.84);
    // a whitewashed radiator standing on the concrete ledge by the entrance
    radiator(17.1, 1.79, 0, 0.96, 0.55, 0.46, palePipe);

    // gas meter by the partition (DSC_0098–0101)
    g.add(place(box(0.22, 0.3, 0.16, materials.white), 16.427, 1.62, 1.816));
    g.add(place(cyl(0.025, 0.025, 0.12, new THREE.MeshStandardMaterial({ color: 0xe6c21e, roughness: 0.5 }), 8), 16.427, 1.83, 1.816));
    g.add(place(cyl(0.018, 0.018, 1.45, pipeMat, 8), 16.331, 0.72, 1.787));
    dirtAlong(16.331, 0, 1.787, 16.331, 1.45, 1.787);

    // The curtain by the opening between Room 3 and Room 4. It does not hang in the opening
    // and does not divide the rooms: it closes the north side of the space between the two
    // short walls south of the opening (the wall that carries #14 and the south stub), and
    // it is drawn shut in every photograph (DSC_0064, 0069, 0097 from Room 3; DSC_0127,
    // 0128 from Room 4). The cloth falls from the ceiling to a roll about 3 cm thick that
    // hangs clear of the floor. No rail or rod shows in the photographs, so none is built.
    // What is behind the cloth is not known and not built: the block in layout.js stays
    // solid, and a dark panel on its face stands for the unlit space where the eye gets
    // past the cloth (under the roll and at its edges). No obstacle of its own: the block
    // behind it already stops the visitor.
    {
      const x0 = 14.58; // the end of the wall that carries #14 stays bare, about 8 cm (DSC_0069)
      const x1 = 15.6; // the west face of the south stub
      const zc = 4.64; // 2.6 cm in front of the block's north face (z 4.666)
      const top = 2.75; // Room 3's ceiling
      const rollR = 0.015;
      const clear = 0.04; // floor to the underside of the roll
      const w = x1 - x0;
      const y0 = clear + rollR;
      const h = top - y0;
      const cg = new THREE.PlaneGeometry(w, h, 64, 8);
      const pos = cg.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) + w / 2;
        const v = pos.getY(i) / h + 0.5;
        // shallow, uneven folds every 14 cm or so, flattening over the last 20 cm, where
        // the cloth is rolled up
        const k = Math.min(1, v / 0.075);
        const fold = 0.012 * Math.sin((u / 0.145) * Math.PI * 2 + 0.6) + 0.006 * Math.sin((u / 0.31) * Math.PI * 2 + 2.1);
        pos.setZ(i, fold * k * k * (3 - 2 * k));
      }
      cg.computeVertexNormals();
      g.add(place(new THREE.Mesh(cg, materials.curtain), (x0 + x1) / 2, y0 + h / 2, zc));
      const roll = cyl(rollR, rollR, w, materials.curtain, 10);
      roll.rotation.z = Math.PI / 2;
      g.add(place(roll, (x0 + x1) / 2, y0, zc));
      const shade = new THREE.Mesh(new THREE.PlaneGeometry(w, top), materials.curtainShade);
      g.add(place(shade, (x0 + x1) / 2, top / 2, 4.662, Math.PI));
    }
  }

  // ================================================================ track lights
  {
    const rails = [
      { x0: R1.west + 0.6, x1: R1.east - 0.45, z: 2.9, y: 3.0 },
      { x0: R1.west + 0.6, x1: R1.east - 0.45, z: R1.D * 0.74, y: 3.0 },
      { x0: 10.45, x1: 15.25, z: 3.725, y: 2.75 },
    ];
    const per = 4;
    const spotGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.15, 12);
    spotGeo.rotateX(Math.PI / 2);
    const count = rails.length * per;
    const spots = new THREE.InstancedMesh(spotGeo, materials.black, count);
    const lenses = new THREE.InstancedMesh(new THREE.CircleGeometry(0.036, 12), materials.led, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let k = 0;
    for (const r of rails) {
      g.add(place(box(r.x1 - r.x0, 0.03, 0.05, materials.black), (r.x0 + r.x1) / 2, r.y - 0.02, r.z));
      for (let i = 0; i < per; i++) {
        const x = r.x0 + 0.4 + (i / (per - 1)) * (r.x1 - r.x0 - 0.8);
        q.setFromEuler(new THREE.Euler(0.8, i % 2 ? 0 : Math.PI, 0, 'YXZ'));
        const p = new THREE.Vector3(x, r.y - 0.13, r.z);
        m.compose(p, q, new THREE.Vector3(1, 1, 1));
        spots.setMatrixAt(k, m);
        const lp = new THREE.Vector3(0, 0, 0.076).applyQuaternion(q).add(p);
        m.compose(lp, q, new THREE.Vector3(1, 1, 1));
        lenses.setMatrixAt(k, m);
        k++;
      }
    }
    g.add(spots, lenses);
  }

  mergeStatic(g);
  return { group: g, anim };
}

// Bake every plain (non-instanced) mesh into one merged mesh per material: a few
// hundred small meshes of furniture become a couple of dozen draw calls.
function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map();
  group.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh) {
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(o);
    }
  });
  for (const [mat, meshes] of byMat) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
      geo.applyMatrix4(m.matrixWorld);
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      geo.morphAttributes = {};
      geo.clearGroups();
      return geo;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    for (const m of meshes) m.parent.remove(m);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
}
