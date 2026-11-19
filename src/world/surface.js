import * as THREE from 'three';

// Shader variation for the tiled room surfaces, on top of their textures:
//  - anti-tiling: a slow noise picks one of eight offsets of the texture and blends between
//    neighbours (Quilez' "texture repetition" technique), so the same bricks don't line up
//    every metre. Offsets can be kept to whole courses or tiles (material.userData.surface);
//  - large, soft overlays by world position, which never repeat: a brightness drift, damp
//    rising from the floor with a tide line, dirt around and run down below the pipes, and
//    patchy whitewash (thick, flat coats and thin ones where the brick shows through).
//  - stains placed from the 2025 photographs (PHOTO_STAINS below), each one on the wall or
//    ceiling where a photograph shows it. The overlays above are invented; these are not.
// Patched into the materials together with the plan AO (ao.js), which supplies vAoPos.

const MAX_PIPES = 16;
// Pipe axes [ax, ay, az, bx, by, bz] in metres, registered by props.js where the pipes are built.
export const PIPES = [];
export const dirtAlong = (ax, ay, az, bx, by, bz) => PIPES.push([ax, ay, az, bx, by, bz]);

// Stains seen in the 2025 photographs (decision log, Brief 6, 17 November 2026). Each is a box
// in world metres [x0, y0, z0, x1, y1, z1], a few centimetres thick across its wall or
// ceiling; the shader finds which side is thin and draws in the other two. kind: 'blotch'
// (an ellipse filling the box), 'rising' (from the bottom of the box up to a ragged edge),
// 'hanging' (the same from the top down), 'specks' (scattered dots), 'marks' (streaky
// patches). tint multiplies the wall colour (ratios read off the photo against clean wall
// beside the stain); edge is how ragged the outline is (for specks, the share of 2.5 cm cells
// that hold a dot), tide how dark its rim. Only room
// walls and ceilings take them (the materials ao.js patches), never floors.
const MAX_STAINS = 16;
const KIND = { blotch: 0, rising: 1, hanging: 2, specks: 3, marks: 4 };
export const PHOTO_STAINS = [
  // Room 1. The ceiling's water stain in the south-west corner: DSC_0028-0031 (the corner and
  // #4 Human as Error III below it). Hugs the south wall from the corner to above the east
  // half of #4 (x 1.9 ±0.3) and reaches 0.65 m (±0.2) out; the ellipse is centred on the wall
  // line, so only its inner half shows
  { box: [-0.8, 2.77, 6.35, 1.9, 2.83, 7.65], kind: 'blotch', tint: [0.93, 0.9, 0.8], strength: 1, edge: 0.5, tide: 0.35, seed: 1 },
  // ... and its faint yellowing on the top of the south wall by the corner (DSC_0030, 0031)
  { box: [-0.15, 2.62, 6.97, 1.2, 2.8, 7.03], kind: 'hanging', tint: [0.95, 0.93, 0.85], strength: 0.8, edge: 0.6, tide: 0, seed: 2 },
  // Room 1, east wall (south pier, x 4.85): dark mottled damp along the foot under the radiator
  // and a brown streak between the radiator's south end and its pipe (DSC_0023, 0024; heights
  // against the radiator, 0.85 m tall from 0.1 m)
  { box: [4.82, 0, 5.05, 4.88, 0.12, 6.25], kind: 'rising', tint: [0.65, 0.62, 0.55], strength: 0.9, edge: 0.5, tide: 0.2, seed: 3 },
  { box: [4.82, 0.16, 6.04, 4.88, 0.48, 6.16], kind: 'blotch', tint: [0.65, 0.62, 0.55], strength: 0.8, edge: 0.6, tide: 0, seed: 4 },
  // Room 1, street wall: three flakes in the whitewash on the back of the round-vent window's
  // niche (x -0.37), just above the hydroponic channel (DSC_0011; heights against the sill at
  // 1.7 m and the radiator top at 0.95 m, along the wall against the 0.92 m window)
  { box: [-0.4, 1.14, 3.43, -0.34, 1.19, 3.51], kind: 'blotch', tint: [0.87, 0.85, 0.74], strength: 1, edge: 0.7, tide: 0.3, seed: 5 },
  { box: [-0.4, 1.15, 3.28, -0.34, 1.19, 3.33], kind: 'blotch', tint: [0.87, 0.85, 0.74], strength: 1, edge: 0.7, tide: 0.3, seed: 6 },
  { box: [-0.4, 1.14, 3.15, -0.34, 1.19, 3.22], kind: 'blotch', tint: [0.87, 0.85, 0.74], strength: 1, edge: 0.7, tide: 0.3, seed: 7 },
  // Room 2, east wall: grey streaky marks high on the west face of the pillar between the
  // storage gate and the doorway to Room 3 (x 9.85), perhaps from old fixings (DSC_0061, 0060;
  // height against the 2.75 m ceiling, along the face from the gate to the doorway's arris)
  { box: [9.82, 1.93, 1.82, 9.88, 2.12, 2.38], kind: 'marks', tint: [0.7, 0.71, 0.73], strength: 1, edge: 0.6, tide: 0, seed: 8 },
  // Room 3: yellow-brown damp along the foot of the north stub's west face (x 15.6, under #9)
  // (DSC_0095, also 0093, 0094, 0096; measured against #9 and the stub's 1.19 m width)
  { box: [15.72, 0, 1.87, 15.78, 0.3, 2.92], kind: 'rising', tint: [0.88, 0.86, 0.76], strength: 0.9, edge: 0.7, tide: 0.25, seed: 9 },
  // Room 3: dirty whitewash on the lowest four to five courses of the Room 2 / Room 3 north
  // pillar, its east face (x 10.2) and the doorway's jamb (z 2.557) (DSC_0085, 0084)
  { box: [10.32, 0, 1.73, 10.38, 0.36, 2.557], kind: 'rising', tint: [0.92, 0.85, 0.74], strength: 1, edge: 0.5, tide: 0.15, seed: 10 },
  { box: [9.85, 0, 2.527, 10.35, 0.34, 2.587], kind: 'rising', tint: [0.92, 0.85, 0.74], strength: 1, edge: 0.5, tide: 0.15, seed: 11 },
  // Room 3: a white chip in the grey paint of the north wall's pier, under #8's west edge
  // (DSC_0088; against the screen's corner and the pier's arris)
  { box: [11.97, 0.8, 1.7, 12.05, 0.88, 1.76], kind: 'blotch', tint: [2.2, 2.2, 2.05], strength: 1, edge: 0.6, tide: 0, seed: 12 },
  // Room 4: dark specks high on the south wall's west end (z 5.73) (DSC_0125, also 0123,
  // 0124; height against the corner's wall height, along the wall only roughly, ±0.5 m)
  { box: [16.45, 1.75, 5.7, 17.65, 2.25, 5.76], kind: 'specks', tint: [0.35, 0.33, 0.3], strength: 1, edge: 0.12, tide: 0, seed: 13 },
];
const STAIN_COUNT = Math.min(PHOTO_STAINS.length, MAX_STAINS);

export function surfaceUniforms() {
  const a = [];
  const b = [];
  for (let i = 0; i < MAX_PIPES; i++) {
    const p = PIPES[i] || [0, -9, 0, 0, -9, 0];
    a.push(new THREE.Vector3(p[0], p[1], p[2]));
    b.push(new THREE.Vector3(p[3], p[4], p[5]));
  }
  const lo = [];
  const hi = [];
  const tint = [];
  const form = [];
  for (let i = 0; i < MAX_STAINS; i++) {
    const s = PHOTO_STAINS[i];
    const box = s ? s.box : [0, -9, 0, 0, -9, 0];
    lo.push(new THREE.Vector3(box[0], box[1], box[2]));
    hi.push(new THREE.Vector3(box[3], box[4], box[5]));
    tint.push(s ? new THREE.Vector4(...s.tint, s.strength) : new THREE.Vector4(1, 1, 1, 0));
    form.push(s ? new THREE.Vector4(KIND[s.kind], s.edge, s.tide, s.seed) : new THREE.Vector4());
  }
  return {
    pipeA: { value: a },
    pipeB: { value: b },
    pipeCount: { value: Math.min(PIPES.length, MAX_PIPES) },
    stainLo: { value: lo },
    stainHi: { value: hi },
    stainTint: { value: tint },
    stainForm: { value: form },
    stainCount: { value: STAIN_COUNT },
  };
}

export const SURFACE_PARS = /* glsl */ `
uniform vec2 surfOffset;
uniform vec3 pipeA[${MAX_PIPES}];
uniform vec3 pipeB[${MAX_PIPES}];
uniform int pipeCount;
uniform vec3 stainLo[${MAX_STAINS}];
uniform vec3 stainHi[${MAX_STAINS}];
uniform vec4 stainTint[${MAX_STAINS}];
uniform vec4 stainForm[${MAX_STAINS}];
uniform int stainCount;
float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sHash(i), sHash(i + vec2(1, 0)), f.x), mix(sHash(i + vec2(0, 1)), sHash(i + vec2(1, 1)), f.x), f.y);
}
float sFbm(vec2 p) {
  return (0.5 * sNoise(p) + 0.25 * sNoise(p * 2.03 + 17.1) + 0.125 * sNoise(p * 4.07 + 3.7) + 0.0625 * sNoise(p * 8.11 + 9.2)) / 0.9375;
}
vec2 sOffset(float i) {
  vec2 o = fract(sin(vec2(3.1, 7.7) * i + vec2(0.3, 1.7)) * vec2(43758.5, 22578.1));
  return mix(o, floor(o / max(surfOffset, 1e-4)) * surfOffset, step(1e-5, surfOffset));
}
vec4 antiTile(sampler2D s, vec2 uv) {
  vec2 dx = dFdx(uv);
  vec2 dy = dFdy(uv);
  float l = sNoise(uv * 0.43) * 8.0;
  float i = floor(l);
  float f = fract(l);
  vec4 a = textureGrad(s, uv + sOffset(i), dx, dy);
  vec4 b = textureGrad(s, uv + sOffset(i + 1.0), dx, dy);
  vec3 d = a.rgb - b.rgb;
  return mix(a, b, smoothstep(0.2, 0.8, f - 0.1 * (d.x + d.y + d.z)));
}
`;

// Replaces three's map_fragment; AO_KIND (0 floor, 1 wall, 2 ceiling) comes from ao.js.
export const SURFACE_FRAG = /* glsl */ `
#ifdef USE_MAP
  diffuseColor *= antiTile(map, vMapUv);
#endif
{
  vec3 wp = vAoPos;
  #if AO_KIND == 1
    vec2 sp = vec2(wp.x + wp.z, wp.y); // walls are axis-aligned: run along them, and up
  #else
    vec2 sp = wp.xz;
  #endif
  // soft drift in tone over a few metres
  diffuseColor.rgb *= 0.92 + 0.16 * sFbm(sp * 0.33 + 4.0);
  #if AO_KIND == 1
    #ifdef SURF_WASH
      // whitewash: thick coats hide the brick under the plain colour, thin ones let it show
      float wash = sFbm(sp * vec2(0.9, 1.3) + 11.0);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuse, 0.55 * (1.0 - smoothstep(0.3, 0.45, wash)));
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.84, 0.79, 0.72), 0.75 * smoothstep(0.55, 0.72, wash));
    #endif
    // damp rising from the floor: uneven edge, darker and browner below, a tide line on it
    float edge = 0.16 + 0.42 * sFbm(vec2(sp.x * 0.75, 2.0)) + 0.05 * sNoise(vec2(sp.x * 6.0, 5.0));
    float damp = 1.0 - smoothstep(edge - 0.1, edge + 0.03, wp.y);
    damp *= 0.55 + 0.45 * sFbm(sp * 2.1 + 31.0);
    float tide = exp(-pow((wp.y - edge) / 0.022, 2.0));
    diffuseColor.rgb *= mix(vec3(1.0), vec3(0.72, 0.69, 0.63), damp) * (1.0 - 0.13 * tide);
    // dirt around the pipes, and run down the wall below them
    float dirt = 0.0;
    for (int i = 0; i < ${MAX_PIPES}; i++) {
      if (i >= pipeCount) break;
      vec3 a = pipeA[i];
      vec3 ab = pipeB[i] - a;
      float t = clamp(dot(wp - a, ab) / dot(ab, ab), 0.0, 1.0);
      vec3 c = a + ab * t;
      vec3 v = wp - c;
      float below = max(0.0, -v.y);
      float side = length(v.xz);
      float along = dot(c.xz, vec2(1.0));
      float halo = exp(-length(v) / 0.09);
      float run = exp(-below / 0.38) * step(0.001, below) * exp(-side / 0.12)
        * smoothstep(0.4, 0.8, sNoise(vec2(along * 11.0, wp.y * 1.6)));
      dirt = max(dirt, 0.7 * halo + 0.55 * run);
    }
    dirt = clamp(dirt, 0.0, 1.0) * (0.6 + 0.4 * sFbm(sp * 3.0 + 7.0));
    diffuseColor.rgb *= mix(vec3(1.0), vec3(0.58, 0.53, 0.46), dirt);
  #endif
  #if AO_KIND != 0
    // stains placed from the photographs (PHOTO_STAINS)
    for (int i = 0; i < ${MAX_STAINS}; i++) {
      if (i >= stainCount) break;
      vec3 lo = stainLo[i];
      vec3 hi = stainHi[i];
      if (any(lessThan(wp, lo)) || any(greaterThan(wp, hi))) continue;
      vec3 c = 0.5 * (lo + hi);
      vec3 h = 0.5 * (hi - lo);
      vec2 m;
      vec2 hs;
      if (h.x <= h.y && h.x <= h.z) { m = vec2(wp.z - c.z, wp.y - c.y); hs = h.zy; }
      else if (h.z <= h.y) { m = vec2(wp.x - c.x, wp.y - c.y); hs = h.xy; }
      else { m = vec2(wp.x - c.x, wp.z - c.z); hs = h.xz; }
      vec2 q = m / hs;
      vec4 f = stainForm[i];
      vec2 n = m * 7.0 + f.w * 17.3;
      float wob = f.y * (sFbm(n) - 0.5);
      float s = 0.0;
      if (f.x < 0.5) {
        // blotch: an ellipse with a ragged edge, mottled inside, a darker rim
        float d = length(q) + wob;
        s = (1.0 - smoothstep(0.6, 1.0, d)) * (0.7 + 0.3 * sFbm(n * 1.9 + 5.0));
        float rim = (d - 0.8) / 0.07;
        s = max(s, f.z * exp(-rim * rim));
      } else if (f.x < 2.5) {
        // rising (from the bottom) or hanging (from the top) to a ragged edge, a tide line on it
        float t = f.x < 1.5 ? 0.5 * (q.y + 1.0) : 0.5 * (1.0 - q.y);
        float e = 0.72 + f.y * 0.5 * (sFbm(vec2(m.x * 4.0 + f.w * 17.3, 3.0)) - 0.5);
        float side = 1.0 - smoothstep(0.85, 1.0, abs(q.x));
        s = (1.0 - smoothstep(e - 0.3, e, t)) * (0.6 + 0.4 * sFbm(n * 1.3 + 9.0));
        float tl = (t - e) / 0.05;
        s = max(s, f.z * exp(-tl * tl)) * side;
      } else if (f.x < 3.5) {
        // specks: one dot in some 2.5 cm cells, inside the ellipse
        vec2 cell = floor(m / 0.025);
        float r = sHash(cell + f.w * 7.1);
        vec2 o = vec2(sHash(cell + 3.3), sHash(cell + 5.9)) * 0.6 + 0.2;
        float rad = 0.003 + 0.005 * sHash(cell + 9.7);
        float dd = length((fract(m / 0.025) - o) * 0.025);
        s = step(1.0 - f.y, r) * (1.0 - smoothstep(rad * 0.6, rad, dd)) * (1.0 - smoothstep(0.75, 1.0, length(q)));
      } else {
        // marks: streaky patches inside the ellipse
        float d = length(q) + wob;
        s = (1.0 - smoothstep(0.7, 1.0, d)) * smoothstep(0.5, 0.62, sNoise(m * vec2(9.0, 26.0) + f.w * 17.3));
      }
      diffuseColor.rgb *= mix(vec3(1.0), stainTint[i].rgb, clamp(s, 0.0, 1.0) * stainTint[i].a);
    }
  #endif
}
`;

// Bump map lookups go through the same anti-tiling, so relief and colour stay together.
export const antiTileBump = (src) => src.replace(/texture2D\(\s*bumpMap,/g, 'antiTile(bumpMap,');
