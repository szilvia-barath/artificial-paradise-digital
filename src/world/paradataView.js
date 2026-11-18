import * as THREE from 'three';
import { PD_ELEMENTS, pdIndex, pdOf } from './paradataTags.js';

// The "measured or guessed" view (CLAUDE.md roadmap, item 3). While it is on, every part of the
// rooms is drawn by the status of its paradata row (src/data/paradata-scene.json says which row,
// src/data/paradata.json holds the rows): a pattern for each status, with a colour, so the status
// never rests on colour alone. Lit by a fixed light of its own, so Room 4, dark as it is, shows too.
// The works are not repainted: a hung work keeps its image and gets a band round it; the
// installations (Paradise Factory, Let it Flow) keep theirs under a pattern laid over them.
// Nothing moves. Off puts every material back and takes the bands and overlays away.

// The classes shown, in the legend's order. A row's status maps onto them; a part with no row,
// or a row whose status is none of the first four, is "not recorded".
export const PD_CLASSES = ['measured', 'inferred', 'invented', 'omitted', 'not-recorded'];
const CLASS_OF_STATUS = { measured: 'measured', inferred: 'inferred', invented: 'invented', omitted: 'omitted' };
// sRGB colours, on the light ground of the view (contrast with the ground in PROGRESS.md, H1 table)
export const PD_COLOURS = {
  ground: 0xe4e1da,
  measured: 0x1f5fbf, // solid
  inferred: 0xa65300, // diagonal stripes
  invented: 0x9b2a85, // dots
  omitted: 0x23704c, // cross-hatch
  'not-recorded': 0x8d8984, // plain grey, no marks
  edge: 0x16181d, // the dark edge round a work's band
};

const vert = /* glsl */ `
attribute float pdel;
uniform float uEl;
uniform float uClass[${PD_ELEMENTS.length}];
varying vec3 vPos;
varying vec3 vN;
varying float vClass;
varying vec2 vUv;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
  n = mat3(instanceMatrix) * n;
#endif
  vec4 wp = modelMatrix * p;
  vPos = wp.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  // uEl: the part of the whole mesh; -1: per vertex (merged meshes); -2: no part found
  int el = clamp(int((uEl >= 0.0 ? uEl : pdel) + 0.5), 0, ${PD_ELEMENTS.length - 1});
  vClass = uEl < -1.5 ? 4.0 : uClass[el];
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const frag = /* glsl */ `
uniform vec3 uGround;
uniform vec3 uCol[5];
uniform float uPeriod;
uniform int uMode; // 0 solid surface, 1 pattern over a work, 2 a pool of light
uniform sampler2D uMap;
uniform float uUseMap;
uniform float uAlphaTest;
varying vec3 vPos;
varying vec3 vN;
varying float vClass;
varying vec2 vUv;
float aastep(float edge, float x) {
  float w = max(fwidth(x), 1e-4);
  return smoothstep(edge - w, edge + w, x);
}
void main() {
  float a0 = 1.0;
  if (uUseMap > 0.5) {
    a0 = texture2D(uMap, vUv).a;
    if (uMode != 2 && a0 < uAlphaTest) discard;
  }
  int c = int(vClass + 0.5);
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 a = abs(n);
  // the pattern lies on the surface in world metres, from the axis the surface faces most
  vec2 q = (a.y >= a.x && a.y >= a.z ? vPos.xz : (a.x >= a.z ? vPos.zy : vPos.xy)) / uPeriod;
  float m = 0.0; // how much of this pixel is mark
  if (c == 0) m = 1.0;
  else if (c == 1) m = aastep(0.29, abs(fract(q.x + q.y) - 0.5));
  else if (c == 2) m = 1.0 - aastep(0.2, length(fract(q) - 0.5));
  else if (c == 3) m = max(aastep(0.39, abs(fract(q.x + q.y) - 0.5)), aastep(0.39, abs(fract(q.x - q.y) - 0.5)));
  vec3 L = normalize(vec3(0.35, 0.85, 0.4));
  float sh = 0.66 + 0.34 * max(dot(n, L), 0.0);
  if (n.y < -0.6) sh = 0.6; // ceilings a little darker, so the room reads
  vec3 mark = uCol[c];
  vec3 col;
  float alpha = 1.0;
  if (c == 4) col = mark * sh;
  else col = mix(uGround, mark, m) * sh;
  if (uMode == 1) {
    col = mark * sh;
    alpha = c == 0 ? 0.45 : (c == 4 ? 0.35 : m * 0.9);
  } else if (uMode == 2) {
    col = mark;
    alpha = a0 * (c == 0 ? 0.55 : (c == 4 ? 0.4 : m * 0.9));
  }
  gl_FragColor = vec4(col, alpha);
}`;

export function createParadataView(scene, works) {
  let on = false;
  let classOf = null; // element id -> class
  const saved = new Map(); // mesh -> its own material
  const added = []; // bands and overlays
  const cache = new Map();
  const classUniform = new Array(PD_ELEMENTS.length).fill(4);
  const cols = PD_CLASSES.map((k) => new THREE.Color(PD_COLOURS[k]));
  const ground = new THREE.Color(PD_COLOURS.ground);
  let untagged = [];

  // The class of every part, from the rows. Loaded on first use, so the rows are not in the
  // first download.
  async function load() {
    if (classOf) return;
    const { default: pd } = await import('../data/paradata.json');
    const status = new Map(pd.rows.map((r) => [r.decision_id, r.status]));
    classOf = new Map(PD_ELEMENTS.map((e) => [e.id, (e.decision && CLASS_OF_STATUS[status.get(e.decision)]) || 'not-recorded']));
    PD_ELEMENTS.forEach((e, i) => { classUniform[i] = PD_CLASSES.indexOf(classOf.get(e.id)); });
    view.source = pd.source;
  }

  function material(mode, el, map = null, alphaTest = 0, period = 0.14) {
    const key = `${mode}|${el}|${map ? map.uuid : ''}|${alphaTest}|${period}`;
    if (cache.has(key)) return cache.get(key);
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uEl: { value: el },
        uClass: { value: classUniform },
        uGround: { value: ground },
        uCol: { value: cols },
        uPeriod: { value: period },
        uMode: { value: mode },
        uMap: { value: map },
        uUseMap: { value: map ? 1 : 0 },
        uAlphaTest: { value: alphaTest },
      },
      vertexShader: vert,
      fragmentShader: frag,
      side: THREE.DoubleSide,
      transparent: mode !== 0,
      depthWrite: mode === 0,
    });
    if (mode !== 0) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = -1;
      m.polygonOffsetUnits = -4;
    }
    cache.set(key, m);
    return m;
  }

  const workIds = new Set(works.map((w) => w.id));
  const kindOf = (id) => {
    if (!id) return 'surface';
    if (id.endsWith('-light-pools')) return 'pool';
    if (id.startsWith('pf-') || id.startsWith('lif-')) return 'overlay';
    if (workIds.has(id)) return 'work';
    return 'surface';
  };

  // A band round a hung work, outside its edge, on a thin dark edge: the work's own picture,
  // frame and screen stay as they are.
  function band(holder, id) {
    const box = new THREE.Box3();
    holder.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert();
    holder.traverse((o) => {
      if (!o.isMesh || o.material.depthWrite === false || o.userData.pdAdded) return; // not the pool or the shadow
      o.geometry.computeBoundingBox();
      box.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
    });
    const g = new THREE.Group();
    g.userData.pdAdded = true;
    const ring = (x0, x1, y0, y1, w, mat, z) => {
      for (const [cx, cy, sx, sy] of [
        [(x0 + x1) / 2, y1 + w / 2, x1 - x0 + 2 * w, w],
        [(x0 + x1) / 2, y0 - w / 2, x1 - x0 + 2 * w, w],
        [x0 - w / 2, (y0 + y1) / 2, w, y1 - y0],
        [x1 + w / 2, (y0 + y1) / 2, w, y1 - y0],
      ]) {
        const q = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), mat);
        q.position.set(cx, cy, z);
        q.userData.pdAdded = true;
        g.add(q);
      }
    };
    const gap = 0.012;
    const W = 0.07;
    const E = 0.01;
    const z = Math.max(box.max.z, 0.01) + 0.004;
    const { min, max } = box;
    ring(min.x - gap, max.x + gap, min.y - gap, max.y + gap, E, new THREE.MeshBasicMaterial({ color: PD_COLOURS.edge }), z);
    ring(min.x - gap - E, max.x + gap + E, min.y - gap - E, max.y + gap + E, W, material(0, pdIndex(id), null, 0, 0.09), z);
    ring(min.x - gap - E - W, max.x + gap + E + W, min.y - gap - E - W, max.y + gap + E + W, E, new THREE.MeshBasicMaterial({ color: PD_COLOURS.edge }), z);
    holder.add(g);
    added.push(g);
  }

  function apply() {
    untagged = [];
    const meshes = [];
    const holders = new Map();
    scene.traverse((o) => {
      if (o.userData.pdAdded) return;
      if (o.userData.work && o.userData.paradata && o.userData.work.hang && !holders.has(o)) holders.set(o, o.userData.paradata);
      if (!o.isMesh || !o.visible || o.material.visible === false) return;
      meshes.push(o);
    });
    for (const o of meshes) {
      const id = pdOf(o);
      const perVertex = !!o.geometry.attributes.pdel && o.userData.paradata === undefined && !o.parent?.userData.paradata;
      if (!id && !perVertex) untagged.push(o.name || o.parent?.name || o.type);
      const kind = perVertex ? 'surface' : kindOf(id);
      if (kind === 'work') continue;
      const el = perVertex ? -1 : id ? pdIndex(id) : -2;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      const cut = mat.alphaTest > 0 && mat.map ? mat.map : null; // leaves, wire grids: keep their holes
      if (kind === 'overlay') {
        const om = material(1, el, cut, cut ? mat.alphaTest : 0);
        const ov = o.isInstancedMesh ? new THREE.InstancedMesh(o.geometry, om, o.count) : new THREE.Mesh(o.geometry, om);
        ov.frustumCulled = false;
        if (o.isInstancedMesh) ov.instanceMatrix = o.instanceMatrix;
        ov.userData.pdAdded = true;
        ov.renderOrder = 5;
        ov.matrixAutoUpdate = false;
        o.add(ov);
        added.push(ov);
        continue;
      }
      saved.set(o, o.material);
      if (kind === 'pool') o.material = material(2, el, mat.map);
      else o.material = material(0, el, cut, cut ? mat.alphaTest : 0);
    }
    for (const [holder, id] of holders) band(holder, id);
    if (untagged.length) console.warn('paradata view: parts with no paradata id', untagged);
  }

  function remove() {
    for (const [o, m] of saved) o.material = m;
    saved.clear();
    for (const a of added) {
      a.parent?.remove(a);
      // the bands' own quads and edge materials go; the overlays share their mesh's geometry
      if (a.isGroup) a.traverse((q) => { if (q.isMesh) { q.geometry.dispose(); if (q.material.isMeshBasicMaterial) q.material.dispose(); } });
    }
    added.length = 0;
  }

  const view = {
    get on() { return on; },
    source: null,
    async set(next) {
      next = !!next;
      if (next === on) return;
      on = next;
      if (on) {
        await load();
        if (!on) return; // switched off while the rows were loading
        apply();
      } else remove();
    },
    // what the legend shows: the number of parts in each class
    async counts() {
      await load();
      const n = Object.fromEntries(PD_CLASSES.map((k) => [k, 0]));
      for (const e of PD_ELEMENTS) n[classOf.get(e.id)]++;
      return n;
    },
    async classOf(id) {
      await load();
      return classOf.get(id);
    },
    // for the checks: what is changed now, and which parts are found in the scene
    state() {
      return { on, replaced: saved.size, added: added.length, untagged: untagged.slice() };
    },
    census() {
      const found = new Set();
      scene.traverse((o) => {
        if (!o.isMesh || o.userData.pdAdded) return;
        const id = pdOf(o);
        if (id) found.add(id);
        const a = o.geometry.attributes.pdel;
        if (a) for (let i = 0; i < a.count; i += 1) found.add(PD_ELEMENTS[a.getX(i)].id);
      });
      return { elements: PD_ELEMENTS.map((e) => e.id), found: [...found] };
    },
  };
  return view;
}
