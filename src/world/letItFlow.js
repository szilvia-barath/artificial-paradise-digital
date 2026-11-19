import * as THREE from 'three';
import { photoTexture } from './textures.js';
import RIVER from '../data/river.json';
import { OBSTACLES, R34_SHIFT } from './layout.js';
import { createVideo, BY_ROOM } from './video.js';

// #16 Let it Flow (2024), Room 4, as in the documentation video and the installation photos.
// A nearly black room lit only by its projections. On the end wall the video Siluett, bright
// trees on the dark wall. On the floor a river of melted plastic, rebuilt from the artist's
// top-down photograph of it (PLANE copy.png, scaled by its 30 cm tiles and checked against
// DSC_0113 and the photos' EXIF focal length): one relief mesh, soft lumps and folds read
// from the photo (scripts/make_river.py). The video Let it Flow (a night sky with the river
// glowing in it) is thrown onto the floor by the projector on the north wall above Natural
// Life (DSC_0108 to DSC_0112), its river on the plastic; its specks are the dots on the floor
// in the photos. The artist fitted the picture to the river with Resolume's keystone; where
// it landed is fitted in scripts/fit_projector.mjs (river.json "projector": the lens's
// place, and the projective map from the floor to the frame). The floor and the plastic take
// the picture by that projective texture mapping, the plastic's relief along the rays from
// the lens, so the same mapping lights the plastic, whose folds are shaded against the lens.

const BASE = import.meta.env.BASE_URL;
const WALL_X = 25.55;
const Z0 = 1.73;
const Z1 = 5.73;
// Measured on DSC_0113 (the 4 m wall is 259 px/m): the picture stands on the floor, reaches
// about 2.30 m, some 20 cm under the pipe's underside (2.50 m; checked on DSC_0116 and the
// documentation video at 00:00.0, where it never touches the pipe). At 16:9 that was 4.09 m
// wide, a little wider than the wall, and its sides fell off the wall. Since 19 November 2026
// the picture is as wide as its wall, 4.00 m, as the artist asked (the reconstructor's answer
// 7): the whole frame shows, 2.25 m high (within the measurement's +-0.05 m).
const TOP = (Z1 - Z0) / (16 / 9);
const VIDEO_ASPECT = 16 / 9;
const WALL_GAIN = 1.3; // the file's trees are mid grey; a projector in the dark makes them bright
const WALL_TINT = new THREE.Color(0.88, 1, 1); // the lamp is cool in the photos
const FLOOR_TINT = new THREE.Color(1, 1.12, 1.32);
const FLOOR_PEAK = 0.34; // the black floor returns far less of the lamp than white plastic does
// river.json is written by the scripts in the frame Rooms 3 and 4 had until 19 November 2026;
// they stand R34_SHIFT further east now, so its x values are shifted here as they are read
// (the homography takes a floor point back by the same amount).
const DX = R34_SHIFT;
const PJ = {
  ...RIVER.projector,
  position: [RIVER.projector.position[0] + DX, RIVER.projector.position[1], RIVER.projector.position[2]],
  quad: RIVER.projector.quad.map((q) => [q[0] + DX, ...q.slice(1)]),
  floorToFrame: RIVER.projector.floorToFrame.map((r) => [r[0], r[1], r[2] - DX * r[0]]),
};
// the light comes from the projector's lens
const LAMP = new THREE.Vector3(...PJ.position);
const AMBIENT = 0.14; // the little room light the plastic gets besides the projection

// Shows a texture on the end wall without stretching it: it fills the wall's height and
// what is too wide for the wall falls off both sides, as with a projector.
function coverWall(tex, aspect) {
  const shown = (Z1 - Z0) / TOP / aspect;
  tex.repeat.x = shown;
  tex.offset.x = (1 - shown) / 2;
}

// A world point's place in the video frame: along the ray from the lens down to the floor,
// then the floor-to-frame homography. s runs from the east end of the picture (0) to the west
// (1), t from the north side (0) to the south (1), the orientation the video had on the floor
// before (river.json "projector", _note).
const f7 = (v) => v.toFixed(7);
const M = PJ.floorToFrame;
const projUV = /* glsl */ `
  vec2 letItFlowUV(vec3 w) {
    vec3 L = vec3(${PJ.position.map(f7).join(', ')});
    vec2 f = L.xz + (w.xz - L.xz) * (L.y / max(L.y - w.y, 1e-3));
    vec3 q = mat3(${[0, 1, 2].map((c) => [0, 1, 2].map((r) => f7(M[r][c])).join(', ')).join(', ')}) * vec3(f, 1.0);
    return q.xy / q.z;
  }
  // 1 inside the picture, 0 outside; the edge softened over half a percent of the frame
  float letItFlowIn(vec2 uv) {
    vec2 e = smoothstep(0.0, 0.005, uv) * smoothstep(0.0, 0.005, 1.0 - uv);
    return e.x * e.y;
  }
`;

export function buildLetItFlow(manager) {
  const group = new THREE.Group();
  group.name = 'let-it-flow';
  const loader = new THREE.TextureLoader(manager);
  const srgb = (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  // ---------------------------------------------------------------- wall projection
  const wallVideo = createVideo('video/w16-projection.mp4', {
    pos: new THREE.Vector3(WALL_X, 1.2, (Z0 + Z1) / 2),
    sound: true,
    near: 4.5,
    work: 'w16-let-it-flow',
  });
  for (const tex of wallVideo.textures) coverWall(tex, VIDEO_ASPECT);
  // The video's first frame stands in until it plays. Either is added as light over the wall
  // (a projector cannot darken), so the brick shows through.
  const projMat = new THREE.MeshBasicMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  loader.load(`${BASE}video/w16-projection.webp`, (t) => {
    coverWall(srgb(t), VIDEO_ASPECT);
    if (!projMat.map) {
      projMat.map = t;
      projMat.needsUpdate = true;
    }
  });
  const proj = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0, TOP), projMat);
  proj.rotation.y = -Math.PI / 2;
  proj.position.set(WALL_X - 0.005, TOP / 2, (Z0 + Z1) / 2);
  group.add(proj);

  // ---------------------------------------------------------------- floor projection
  const floorVideo = createVideo('video/w16-floor.mp4');
  // Only the projector's picture is lit: no mirrored strips beside it and no fade at its west
  // end (until 17 November 2026 the frame was a 7.0 × 3.94 m rectangle, its specks mirrored out
  // to the side walls and faded over its last 1.4 m; the photographs and the documentation
  // video show neither).
  const floorMat = new THREE.MeshBasicMaterial({
    color: FLOOR_TINT,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    opacity: 0,
  });
  // Whatever the video's brightness, the dark floor only rises so far: the river of light
  // that misses the plastic stays as faint as the specks, as in the photos.
  // The picture's place in the frame comes from the projector, per pixel (projective texture
  // mapping), so its keystone is the projector's.
  floorMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLifPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvLifPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLifPos;\n${projUV}`)
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec2 lifUV = letItFlowUV(vLifPos);
          vec4 lifTex = texture2D(map, clamp(lifUV, 0.0, 1.0));
          #ifdef DECODE_VIDEO_TEXTURE
            lifTex = sRGBTransferEOTF(lifTex); // as three's own map_fragment does for video
          #endif
          diffuseColor *= lifTex * letItFlowIn(lifUV);
        #endif
        diffuseColor.rgb = ${FLOOR_PEAK.toFixed(2)} * (1.0 - exp(-diffuseColor.rgb / ${FLOOR_PEAK.toFixed(2)}));`,
      );
  };
  {
    // a plane over the lit area's bounding box, cut to the room
    const xs = PJ.quad.map((q) => q[0]);
    const x0 = Math.max(Math.min(...xs) - 0.05, 15.9);
    const x1 = Math.min(Math.max(...xs) + 0.05, WALL_X);
    const geo = new THREE.PlaneGeometry(x1 - x0, Z1 - Z0);
    geo.rotateX(-Math.PI / 2);
    const floorProj = new THREE.Mesh(geo, floorMat);
    floorProj.position.set((x0 + x1) / 2, 0.004, (Z0 + Z1) / 2);
    floorProj.renderOrder = 2;
    group.add(floorProj);
  }

  // ---------------------------------------------------------------- the river
  const riverMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(AMBIENT, AMBIENT, AMBIENT),
    normalScale: new THREE.Vector2(1, 1),
    roughness: 0.34,
    metalness: 0,
    alphaTest: 0.5,
  });
  photoTexture('river', srgb).into(riverMat, 'map');
  photoTexture('river-normal', () => {}).into(riverMat, 'normalMap');
  const projUniform = { value: null };
  const projStrength = { value: 0 };
  // The floor projection lands on the plastic: its light takes the plastic's colour, falls
  // off over the folds as they turn from the lamp, and glints on the melted, glossy surface.
  riverMat.onBeforeCompile = (sh) => {
    sh.uniforms.lifProj = projUniform;
    sh.uniforms.lifStrength = projStrength;
    sh.uniforms.lifLamp = { value: LAMP };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLifPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvLifPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLifPos;\nuniform sampler2D lifProj;\nuniform float lifStrength;\nuniform vec3 lifLamp;\n${projUV}`)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // the plastic shows its own colours, as in the artist's composite (PLANE javított.png)
        totalEmissiveRadiance += diffuseColor.rgb / ${AMBIENT.toFixed(3)} * 0.62 * (0.55 + 0.45 * max(dot(normal, normalize((viewMatrix * vec4(lifLamp, 1.0)).xyz + vViewPosition)), 0.0));
        if (lifStrength > 0.0) {
          // the brightest of the light just around each point: the plastic follows the video's
          // river closely but not to the centimetre, and in the room the light reaches all of it
          vec3 lifLight = vec3(0.1, 0.11, 0.14);
          for (int i = 0; i < 8; i++) {
            float a = float(i) * 0.7854;
            vec2 q = letItFlowUV(vLifPos + vec3(cos(a), 0.0, sin(a)) * 0.06);
            lifLight = max(lifLight, texture2D(lifProj, clamp(q, 0.0, 1.0)).rgb * letItFlowIn(q));
          }
          vec2 q0 = letItFlowUV(vLifPos);
          lifLight = max(lifLight, texture2D(lifProj, clamp(q0, 0.0, 1.0)).rgb * letItFlowIn(q0)) * vec3(0.92, 0.96, 1.1) * lifStrength;
          vec3 lifL = normalize((viewMatrix * vec4(lifLamp, 1.0)).xyz + vViewPosition);
          vec3 lifH = normalize(lifL + normalize(vViewPosition));
          float lifDiff = 0.22 + 0.78 * max(dot(normal, lifL), 0.0);
          float lifSpec = pow(max(dot(normal, lifH), 0.0), 42.0);
          totalEmissiveRadiance += lifLight * (diffuseColor.rgb / ${AMBIENT.toFixed(3)} * lifDiff * 0.45 + 0.25 * lifSpec);
        }`,
      );
  };
  // relief mesh from the height grid (0 = no plastic), built once the image is in
  new THREE.ImageLoader(manager).load(`${BASE}tex/river-height.png`, (img) => {
    const [gw, gh] = RIVER.grid;
    const c = document.createElement('canvas');
    c.width = gw;
    c.height = gh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, gw, gh).data;
    const h = (i, j) => px[(j * gw + i) * 4];
    // only the grid points the plastic touches become vertices
    const slot = new Int32Array(gw * gh).fill(-1);
    const positions = [];
    const uvs = [];
    const vertex = (i, j) => {
      const k = j * gw + i;
      if (slot[k] < 0) {
        const u = i / (gw - 1);
        const v = j / (gh - 1);
        const val = h(i, j);
        slot[k] = positions.length / 3;
        positions.push(RIVER.xTop + DX - v * RIVER.lengthM, val ? ((val - 1) / 254) * RIVER.hmax + 0.002 : 0, RIVER.zLeft + u * RIVER.widthM);
        uvs.push(u, 1 - v);
      }
      return slot[k];
    };
    const index = [];
    for (let j = 0; j < gh - 1; j++) {
      for (let i = 0; i < gw - 1; i++) {
        if (!(h(i, j) || h(i + 1, j) || h(i, j + 1) || h(i + 1, j + 1))) continue;
        const a = vertex(i, j);
        const b = vertex(i + 1, j);
        const c2 = vertex(i, j + 1);
        const d = vertex(i + 1, j + 1);
        index.push(a, c2, b, b, c2, d); // counter-clockwise seen from above
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    const river = new THREE.Mesh(geo, riverMat);
    river.name = 'plastic-river';
    group.add(river);
  });
  // keep visitors off the installation
  for (const [x0, x1, z0, z1] of RIVER.obstacles) OBSTACLES.push({ x0: x0 + DX, x1: x1 + DX, z0, z1 });

  // Videos play from Room 3 on, so they are running before the end wall comes into view
  // (on phones and low-power devices they go by room, with a light version from Rooms 1 to
  // 3: main.js, video.js); the projector lamp breathes a little.
  const update = (t, light, camPos) => {
    if (!BY_ROOM) {
      const on = !camPos || camPos.x > 9.85;
      wallVideo.want(on);
      floorVideo.want(on);
    }
    const wallTex = wallVideo.shown();
    if (wallTex && projMat.map !== wallTex) {
      projMat.map = wallTex;
      projMat.needsUpdate = true;
    }
    const floorTex = floorVideo.shown();
    if (floorTex && floorMat.map !== floorTex) {
      floorMat.map = floorTex;
      floorMat.opacity = 1;
      floorMat.needsUpdate = true;
      projUniform.value = floorTex;
      projStrength.value = 1;
    }
    const f = 0.97 + 0.02 * Math.sin(t * 0.9) + 0.01 * Math.sin(t * 2.3);
    projMat.color.copy(WALL_TINT).multiplyScalar(WALL_GAIN * f);
    if (light) light.intensity = light.userData.base * f;
  };

  return { group, update };
}
