import * as THREE from 'three';
import { wallFrame, ROOMS } from './layout.js';
import { PLANT, PIPE } from './paradiseFactory.js';
import RIVER from '../data/river.json';
import { t } from '../i18n.js';
import { createVideo, scheduleVideos, BY_ROOM } from './video.js';
import { isTouch } from '../device.js';
import { MAX_DPR, pixelCapFor, baseFovFor } from '../fx/resolution.js';
import { isOn } from '../fx/switches.js';
import { lazyKTX2 } from './textures.js';

// Hangs the works from exhibition.json: prints as thin mounted panels, videos as flat
// screens playing the artist's videos (short loops, with the videos' sound where they
// have one; the photographed frames stand in until a loop has loaded), installations as clickable volumes. Fake spotlights = additive light pools on the wall.
// Textures load lazily: 512px thumbs first, 1024px versions once you get close, and the
// 1600px detail image for the paintings and prints you stand at or zoom in on.

const BASE = import.meta.env.BASE_URL;
const url = (p) => `${BASE}${p}`;

function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size * 0.42, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.45, inner.replace(/[\d.]+\)$/, '0.45)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The in-world texts are canvases redrawn on a language switch (see relabel()).
function canvasTexture(w, h, draw, anisotropy) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.redraw = () => {
    draw(c.getContext('2d'), c);
    tex.needsUpdate = true;
  };
  tex.redraw();
  return tex;
}

// The text sheets are shown unlit, a little under white so the bloom doesn't haze over
// the letters.
const TEXT_TINT = new THREE.Color(0.8, 0.8, 0.8);

const screenVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const screenFrag = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D mapB;
  uniform float mixB;
  uniform float brightness;
  uniform vec4 uvRect;
  varying vec2 vUv;
  void main() {
    // The part of the texture on the screen: all of it, or the band of a loop of another
    // shape (uvRect: scale xy, offset zw).
    vec2 uv = vUv * uvRect.xy + uvRect.zw;
    // The frames are shown as photographed; only a slow crossfade between them.
    vec3 col = mix(texture2D(map, uv).rgb, texture2D(mapB, uv).rgb, mixB);
    // faint LCD falloff at the panel edges
    vec2 d = abs(vUv - 0.5) * 2.0;
    col *= 1.0 - 0.1 * pow(max(d.x, d.y), 8.0);
    #ifdef SCREEN_UNTONED
      // Switch "tone" (src/fx/switches.js, off): the screen shows the video's own values. The
      // composer's tone mapping (PBR Neutral at the renderer's exposure) is undone here in
      // advance, so after it each pixel is the file's value (brightness is not applied).
      // The curve's last few per cent cannot be reached, so the target stops at 0.97.
      gl_FragColor = vec4(untone(min(col, vec3(0.97))), 1.0);
    #else
      gl_FragColor = vec4(col * brightness, 1.0);
    #endif
    #include <colorspace_fragment>
  }
`;

// The inverse of three.js's PBR Neutral tone mapping (r186, tonemapping_pars_fragment), for
// the screens under the "tone" switch. It ignores the curve's small desaturation of very
// bright colours, so near-white saturated colours come out a little paler than in the file.
const UNTONE = /* glsl */ `
  uniform float toneExposure;
  vec3 untone(vec3 t) {
    const float start = 0.8 - 0.04;
    const float d = 1.0 - start;
    float peakT = max(t.r, max(t.g, t.b));
    vec3 c = t;
    if (peakT >= start) {
      float peak = d * d / (1.0 - peakT) + start - d;
      c *= peak / peakT;
    }
    float m = min(c.r, min(c.g, c.b));
    float x = m >= 0.04 ? m + 0.04 : sqrt(max(m, 0.0) / 6.25);
    return (c + (x - m)) / toneExposure;
  }
`;

// Clickable volumes for the installations: [cx, cy, cz, sx, sy, sz, rotY]
const PIPE_LEN = Math.hypot(PIPE.b.x - PIPE.a.x, PIPE.b.z - PIPE.a.z);
const HIT_BOXES = {
  'w03-paradise-factory': [
    [PLANT.x + 0.05, 1.3, PLANT.z, 0.9, 2.6, 1.0], // plant, tank and LED bars
    // the hydroponic line, a box turned along its diagonal
    [(PIPE.a.x + PIPE.b.x) / 2, 1.1, (PIPE.a.z + PIPE.b.z) / 2, 0.35, 0.6, PIPE_LEN, Math.atan2(PIPE.b.x - PIPE.a.x, PIPE.b.z - PIPE.a.z)],
  ],
  'w16-let-it-flow': [
    [25.33, 1.15, 3.73, 0.12, 2.3, 4.0], // projection on the end wall
    // the melted plastic river
    [RIVER.xTop - RIVER.lengthM / 2, 0.06, RIVER.zLeft + RIVER.widthM / 2, RIVER.lengthM, 0.14, RIVER.widthM],
  ],
};

function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const wd of words) {
    const test = line ? `${line} ${wd}` : wd;
    if (g.measureText(test).width > maxW) { g.fillText(line, x, y); y += lh; line = wd; } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}

// How sharp to draw the text sheets (rendering proposal, option 5): no sharper than this
// screen can show them from the nearest point a visitor can stand (0.27 m in front of the
// sheet: the walking radius, 0.28 m from the wall), with the field of view and the capped pixel ratio main.js uses.
// A phone or tablet is measured both upright and on its side. The result is a scale of the
// sheet's 512 x 724 layout, never above the tier's old fixed scale (4 on a computer, 2.5 on
// low power), so no screen gets a softer sheet than it can show at that distance. Zoomed in
// further than that, the letters soften a little. SHEET_HEIGHT is the sheets' height in
// metres: keep it equal to the PlaneGeometry in buildGallery.
const SHEET_HEIGHT = 0.707;
const NEAREST = 0.27;
function sheetScale(tierMax) {
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const a = window.screen.width || window.innerWidth;
  const b = window.screen.height || window.innerHeight;
  const views = isTouch ? [[Math.min(a, b), Math.max(a, b)], [Math.max(a, b), Math.min(a, b)]] : [[a, b]];
  let need = 0;
  for (const [w, h] of views) {
    const px = h * Math.min(ratio, pixelCapFor(w, h)); // drawing-buffer height
    const seen = 2 * NEAREST * Math.tan(THREE.MathUtils.degToRad(baseFovFor(w, h) / 2)); // metres of wall in view
    need = Math.max(need, (SHEET_HEIGHT / seen) * px);
  }
  return Math.max(1, Math.min(tierMax, need / 724));
}

// The exhibition text sheet. The type shrinks until the text fits the page, since the
// Hungarian text runs longer than the English.
function drawTextSheet(g, data) {
  g.fillStyle = '#fbfaf7';
  g.fillRect(0, 0, 512, 724);
  g.fillStyle = '#111';
  g.font = '300 40px Helvetica, Arial, sans-serif';
  g.fillText('ARTIFICIAL', 36, 78);
  g.fillText('PARADISE', 36, 122);
  g.font = '15px Helvetica, Arial, sans-serif';
  g.fillStyle = '#444';
  g.fillText(t('wall.sheetMeta'), 36, 160);
  let size = 16;
  const lines = (sz) => {
    g.font = `500 ${sz}px Helvetica, Arial, sans-serif`;
    let n = 0;
    for (const p of data.text) {
      let line = '';
      for (const wd of p.split(' ')) {
        const test = line ? `${line} ${wd}` : wd;
        if (g.measureText(test).width > 440) { n++; line = wd; } else line = test;
      }
      n++;
    }
    return 200 + n * sz * 1.36 + data.text.length * 10 + 60;
  };
  while (size > 10 && lines(size) > 712) size -= 0.5;
  g.fillStyle = '#000';
  g.font = `500 ${size}px Helvetica, Arial, sans-serif`;
  let y = 200;
  for (const p of data.text) y = wrapText(g, p, 36, y, 440, size * 1.36) + 10;
  g.fillStyle = '#666';
  g.font = `italic ${size - 1}px Helvetica, Arial, sans-serif`;
  wrapText(g, data.textCredit, 36, y + 4, 440, (size - 1) * 1.3);
}

// Shortens text with an ellipsis until it fits maxW at the current font.
function fit(g, text, maxW) {
  if (g.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && g.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

// The room sheet beside the toilet corridor (DSC_0047 to DSC_0049): the heading, the plan with
// the numbered places, the works list in two columns and the exhibition text in small type,
// on an A4 page. Drawing code first written for the bar pillar's sheet (removed 9 November
// 2026), now adjusted to A4 and to the text's length.
function drawRoomSheet(g, data) {
  g.fillStyle = '#fbfaf7';
  g.fillRect(0, 0, 512, 724);
  g.fillStyle = '#222';
  g.font = '20px "Courier New", monospace';
  g.fillText('|Artificial Paradise|KristofLab|', 26, 38);
  const x0 = Math.min(...ROOMS.map((r) => r.x0));
  const z0 = Math.min(...ROOMS.map((r) => r.z0));
  const x1 = Math.max(...ROOMS.map((r) => r.x1));
  const s = 460 / (x1 - x0);
  const ox = 26 - x0 * s;
  const oy = 56 - z0 * s;
  g.strokeStyle = '#333';
  g.lineWidth = 1.5;
  for (const r of ROOMS) g.strokeRect(ox + r.x0 * s, oy + r.z0 * s, (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
  g.font = 'bold 9px Helvetica, Arial, sans-serif';
  g.fillStyle = '#111';
  for (const w of data.works) {
    const p = w.hang ? { x: w.hang.face.includes('x') ? w.hang.at : w.hang.along, z: w.hang.face.includes('z') ? w.hang.at : w.hang.along } : w.anchor;
    if (!p || w.id.endsWith('-screen')) continue;
    g.fillText(String(w.no), ox + p.x * s - 3, oy + p.z * s + 3);
  }
  const list = data.works.filter((w) => !w.id.endsWith('-screen'));
  g.font = '8px Helvetica, Arial, sans-serif';
  g.fillStyle = '#222';
  let y = oy + Math.max(...ROOMS.map((r) => r.z1)) * s + 20;
  const half = Math.ceil(list.length / 2);
  list.forEach((w, i) => {
    const bits = [w.title, w.size, (w.medium || '').split(':')[0], w.year].filter(Boolean);
    g.fillText(fit(g, `${w.no} · ${bits.join(', ')}`, 228), i < half ? 26 : 262, y + (i % half) * 11);
  });
  y += half * 11 + 12;
  let size = 8;
  const count = (sz) => {
    g.font = `${sz}px Helvetica, Arial, sans-serif`;
    let n = 0;
    for (const p of data.text) {
      let line = '';
      for (const wd of p.split(' ')) {
        const test = line ? `${line} ${wd}` : wd;
        if (g.measureText(test).width > 460) { n++; line = wd; } else line = test;
      }
      n++;
    }
    return n * sz * 1.3 + data.text.length * 5;
  };
  while (size > 4 && y + count(size) > 700) size -= 0.25;
  g.fillStyle = '#111';
  g.font = `${size}px Helvetica, Arial, sans-serif`;
  for (const p of data.text) y = wrapText(g, p, 26, y, 460, size * 1.3) + 5;
}

export function buildGallery(data, materials, manager, renderer, { hdBudget = 6, videoBudget = 3 } = {}) {
  const group = new THREE.Group();
  group.name = 'gallery';
  const hitMeshes = [];
  const screens = [];
  const videos = []; // { video, pos } for scheduleVideos
  const lazy = []; // { work, material(s), loaded, pos }
  const loader = new THREE.TextureLoader(manager);
  const lazyLoader = new THREE.TextureLoader();
  const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const poolTex = radialTexture('rgba(255,250,240,1)');
  const shadowTex = radialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)');
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.6 });
  const wallTexts = [];
  // the sheets are drawn at up to 4x (2.5x on low power), as sharp as the screen can show
  // them up close (sheetScale)
  const SHEET_SCALE = sheetScale(hdBudget > 3 ? 4 : 2.5);
  const wallText = (w, h, draw, anisotropy) => {
    const tex = canvasTexture(w, h, draw, anisotropy);
    wallTexts.push(tex);
    return tex;
  };
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.35, metalness: 0.4 });
  const untoned = isOn('tone'); // screens out of the tone mapping (switch, off)

  const prepTex = (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    if (t.isCompressedTexture) return t; // KTX2 brings its own mipmaps
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  // Switch "ktx2art" (src/fx/switches.js, off): the 1024 px and 1600 px images of the
  // paintings and prints as KTX2 UASTC (scripts/make_art_ktx2.mjs, img/ktx2/), which the GPU
  // keeps compressed; the WebP if a KTX2 is missing or cannot be transcoded.
  const artKTX2 = isOn('ktx2art');
  const loadArt = (name, onLoad, onError) => {
    const webp = () => lazyLoader.load(url(`${name}.webp`), onLoad, undefined, onError);
    if (!artKTX2) return webp();
    lazyKTX2().load(url(`img/ktx2/${name.replace(/^img\//, '')}.ktx2`), onLoad, undefined, webp);
  };

  for (const work of data.works) {
    if (work.hang) {
      const hg = work.hang;
      const f = wallFrame(hg.face, hg.at, hg.along);
      const w = hg.w;
      const h = hg.h;
      const holder = new THREE.Group();
      holder.position.set(f.x, hg.y, f.z);
      holder.rotation.y = f.rotY;
      holder.userData.work = work;
      holder.userData.paradata = work.id; // its part in the paradata view (paradata-scene.json)
      const isScreen = work.type === 'video';

      // light pool (fake spotlight wash), additive, so it brightens the brick behind
      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 2.0 + 0.6, h * 1.7 + 0.8),
        new THREE.MeshBasicMaterial({
          map: poolTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: isScreen ? 0.0 : 0.26,
          color: isScreen ? 0xc8d8ee : 0xfff6e8,
          toneMapped: false,
        }),
      );
      pool.position.set(0, 0.12, 0.004);
      pool.renderOrder = 1;
      pool.userData.paradata = `${work.room}-light-pools`;
      holder.add(pool);

      if (isScreen) {
        // slim-bezel flat screen, or the bare panel in its photographed frame
        const bez = new THREE.Mesh(new THREE.BoxGeometry(w + (work.monitor ? 0 : 0.024), h + (work.monitor ? 0 : 0.024), 0.04), bezelMat);
        bez.position.z = 0.022;
        holder.add(bez);
        if (work.monitor) {
          // monitor.png: 2238 x 3217 px, its opening (the screen) 1863 x 2243 px, centred
          // 16 px left of and 9.5 px above the image's centre; the opening is fitted to the
          // screen (the photographed panel is a little narrower than the drawing)
          const kx = w / 1863;
          const k = h / 2243;
          const frame = new THREE.Mesh(
            new THREE.PlaneGeometry(2238 * kx, 3217 * k),
            new THREE.MeshStandardMaterial({ map: prepTex(loader.load(url(`${work.monitor}.webp`))), transparent: true, alphaTest: 0.4, roughness: 0.4, metalness: 0.5 }),
          );
          frame.position.set(16 * kx, -9.5 * k, 0.045);
          holder.add(frame);
        }
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: null },
            mapB: { value: null },
            mixB: { value: 0 },
            brightness: { value: 1.1 },
            uvRect: { value: new THREE.Vector4(1, 1, 0, 0) },
            // read at each upload: post.js sets the exposure after the gallery is built
            toneExposure: { get value() { return renderer.toneMappingExposure; } },
          },
          defines: untoned ? { SCREEN_UNTONED: '' } : {},
          vertexShader: screenVert,
          fragmentShader: untoned ? UNTONE + screenFrag : screenFrag,
        });
        const screenGeo = new THREE.PlaneGeometry(w, h);
        // footage of another shape is cropped to the screen, not stretched
        if (work.mediaAspect) {
          const s = w / h / work.mediaAspect;
          const uv = screenGeo.attributes.uv;
          for (let i = 0; i < uv.count; i++) {
            if (s < 1) uv.setX(i, 0.5 + (uv.getX(i) - 0.5) * s);
            else uv.setY(i, 0.5 + (uv.getY(i) - 0.5) / s);
          }
        }
        const screen = new THREE.Mesh(screenGeo, mat);
        screen.position.z = 0.0425;
        screen.userData.work = work;
        holder.add(screen);
        hitMeshes.push(screen);
        // screen glow on the wall
        pool.material.opacity = work.room === 'r4' ? 0.035 : 0.08;
        const frames = work.frames && work.frames.length ? work.frames : [work.image];
        const entry = { work, mat, frames, textures: [], idx: 0, t: Math.random() * 6 };
        // A loop of another shape than the screen (video.mediaAspect) is cropped to it, in the
        // shader and for the loop only: the photographed stills shown until it plays already
        // have the screen's shape. Footage taller than the screen keeps its full width and the
        // band from video.cropTop down (a fraction of the frame's height from the top; centred
        // if not given); wider footage keeps its full height, centred.
        const vm = work.video && work.video.mediaAspect;
        if (vm) {
          const s = w / h / vm;
          if (s >= 1) {
            const band = 1 / s;
            const top = work.video.cropTop ?? (1 - band) / 2;
            // the video texture keeps flipY, so v = 1 is the frame's top row
            entry.uvRect = new THREE.Vector4(1, band, 0, 1 - top - band);
          } else {
            entry.uvRect = new THREE.Vector4(s, 1, (1 - s) / 2, 0);
          }
        }
        screens.push(entry);
        frames.forEach((fr, i) => {
          loader.load(url(`${fr}-thumb.webp`), (t) => {
            entry.textures[i] = prepTex(t);
            if (i === 0) { mat.uniforms.map.value = t; mat.uniforms.mapB.value = t; }
          });
        });
        lazy.push({ work, entry, pos: new THREE.Vector3(f.x, hg.y, f.z), loaded: false });
        if (work.video) {
          const pos = new THREE.Vector3(f.x, hg.y, f.z);
          entry.video = createVideo(work.video.loop, { pos, sound: !!work.video.sound, work: work.id });
          videos.push({ video: entry.video, pos });
        }
      } else {
        // Canvas on a stretcher (paintings) or a thin mounted print
        const depth = work.type === 'painting' ? 0.035 : 0.012;
        const front = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.16 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), sideMat);
        body.position.z = depth / 2;
        holder.add(body);
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), front);
        panel.position.z = depth + 0.0005;
        panel.userData.work = work;
        holder.add(panel);
        hitMeshes.push(panel);
        // soft contact shadow
        const sh = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 1.1 + 0.06, h * 1.08 + 0.08),
          new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
        );
        sh.position.set(0.015, -0.03, 0.002);
        holder.add(sh);
        loader.load(url(`${work.image}-thumb.webp`), (t) => {
          prepTex(t);
          front.map = t;
          front.emissiveMap = t;
          front.needsUpdate = true;
        });
        lazy.push({ work, front, pos: new THREE.Vector3(f.x, hg.y, f.z), loaded: false });
      }

      group.add(holder);
      const back = Math.max(1.5, Math.max(w, h) * 1.35);
      work._pin = { x: f.x, z: f.z };
      work._focus = work.view
        ? { x: work.view.x, z: work.view.z, look: [f.x, hg.y, f.z] }
        : { x: f.x + f.nx * back, z: f.z + f.nz * back, look: [f.x, hg.y, f.z] };
    } else if (work.anchor) {
      // Installations: invisible but clickable volumes around the real objects
      const a = work.anchor;
      for (const [cx, cy, cz, sx, sy, sz, rotY = 0] of HIT_BOXES[work.id] || [[a.x, a.y, a.z, 1, 2, 1]]) {
        const hit = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.set(cx, cy, cz);
        hit.rotation.y = rotY;
        hit.userData.work = work;
        group.add(hit);
        hitMeshes.push(hit);
      }
      work._pin = { x: a.x, z: a.z };
      work._focus = { x: work.view.x, z: work.view.z, look: [a.x, a.y, a.z] };
    }
  }

  // Exhibition texts, pinned up as in the photos: A4 sheets (21 x 29.7 cm) drawn at 4x on desktop
  // so their small type stays sharp
  for (const sh of data.sheets || []) {
    const k = SHEET_SCALE;
    const tex = wallText(Math.round(512 * k), Math.round(724 * k), (g) => {
      g.setTransform(k, 0, 0, k, 0, 0);
      if (sh.draw === 'plan') drawRoomSheet(g, data);
      else drawTextSheet(g, data);
    }, 16);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshBasicMaterial({ map: tex, color: TEXT_TINT }));
    const f = wallFrame(sh.face, sh.at, sh.along, 0.006);
    panel.position.set(f.x, sh.y, f.z);
    panel.rotation.y = f.rotY;
    panel.userData.text = sh.kind;
    panel.userData.paradata = sh.id;
    group.add(panel);
    hitMeshes.push(panel);
  }

  const setMap = (mat, t) => {
    mat.map = t;
    mat.emissiveMap = t;
    mat.needsUpdate = true;
  };
  const fwd = new THREE.Vector3();
  const toWork = new THREE.Vector3();

  // Progressive upgrade to 1024 px textures for works near the visitor (or near the view
  // when zoomed in), then to the 1600 px detail image for the nearest few paintings and
  // prints you stand at or zoom in on. Detail images beyond the budget are released.
  const upgrade = (camera, zoom) => {
    const camPos = camera.position;
    camera.getWorldDirection(fwd);
    const cosView = Math.cos(THREE.MathUtils.degToRad(camera.fov * 0.7));
    for (const l of lazy) {
      l.dist = l.pos.distanceTo(camPos);
      if (l.front) {
        toWork.copy(l.pos).sub(camPos).normalize();
        const inView = toWork.dot(fwd) > cosView;
        const near = l.hd ? 3.6 : 2.8; // hysteresis so it doesn't flip at the edge
        l.wantHD = !!l.texMap && (l.dist < near || (zoom > 1.4 && inView && l.dist < near * zoom));
      }
      if (l.loaded || l.dist > 7.5 * zoom) continue;
      l.loaded = true;
      if (l.front) {
        loadArt(`${l.work.image}-tex`, (t) => {
          prepTex(t);
          const old = l.front.map;
          l.texMap = t;
          if (!l.hd) setMap(l.front, t);
          if (old) old.dispose();
        });
      } else if (l.entry) {
        l.entry.frames.forEach((fr, i) => {
          loadArt(`${fr}-tex`, (t) => {
            prepTex(t);
            const old = l.entry.textures[i];
            l.entry.textures[i] = t;
            if (old) old.dispose();
          });
        });
      }
    }
    const hd = lazy.filter((l) => l.wantHD).sort((a, b) => a.dist - b.dist).slice(0, hdBudget);
    for (const l of lazy) {
      if (!l.front) continue;
      const want = hd.includes(l);
      if (want && !l.hd && !l.hdLoading) {
        l.hdLoading = true;
        loadArt(l.work.image, (t) => {
          l.hdLoading = false;
          prepTex(t);
          if (!l.wantHD) { t.dispose(); return; }
          l.hd = t;
          setMap(l.front, t);
        }, undefined, () => { l.hdLoading = false; });
      } else if (!want && l.hd) {
        setMap(l.front, l.texMap);
        l.hd.dispose();
        l.hd = null;
      }
    }
  };

  let upgradeTimer = 0;
  const update = (t, dt, camera, zoom = 1) => {
    upgradeTimer -= dt;
    if (upgradeTimer <= 0) {
      upgradeTimer = 0.4;
      upgrade(camera, zoom);
      // phones and low-power devices play the videos by room instead (main.js, video.js)
      if (!BY_ROOM) scheduleVideos(videos, camera.position, videoBudget, 16);
    }
    for (const s of screens) {
      const u = s.mat.uniforms;
      const playing = s.video && s.video.shown();
      if (playing && s.uvRect) u.uvRect.value.copy(s.uvRect);
      else u.uvRect.value.set(1, 1, 0, 0);
      if (playing) {
        u.map.value = playing;
        u.mapB.value = playing;
        u.mixB.value = 0;
      } else if (s.frames.length > 1) {
        s.t += dt;
        const period = 7;
        const phase = s.t % period;
        const n = s.frames.length;
        const cur = Math.floor(s.t / period) % n;
        const next = (cur + 1) % n;
        u.map.value = s.textures[cur] || u.map.value;
        u.mapB.value = s.textures[next] || u.map.value;
        u.mixB.value = THREE.MathUtils.smoothstep(phase, period - 1.2, period);
      } else if (s.textures[0]) {
        u.map.value = s.textures[0];
        u.mapB.value = s.textures[0];
      }
    }
  };

  // Redraw the sheets in the current language.
  const relabel = () => {
    for (const tex of wallTexts) tex.redraw();
  };

  return { group, hitMeshes, update, relabel };
}
