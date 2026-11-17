// Measures the built digital exhibition: download (total, by kind, and per room), JS and CSS
// bundle sizes (raw, gzip, brotli), draw calls and triangles per frame, textures and an
// estimate of GPU memory, time to first frame, and frame rate per room.
// It changes nothing in the site: it reads window.__ap (the debug handle in src/main.js)
// and the browser's own network and timing records.
//
// Usage: npm run build && npm run preview &   then   node tests/perf/measure.mjs [out.json] [--no-cache] [--desktop | --phone]
// AP_URL names the address if it is not http://localhost:4173/, AP_DIST the built folder if
// it is not dist (for a build of an earlier commit kept elsewhere).
//
// --phone is the phone profile: an upright 390 x 844 screen with touch and a coarse pointer,
// pixel ratio 2, and 4 processor threads reported, so the site takes its phone and low-power
// path (videos by room, src/world/videoPlan.js) whatever this machine has.
//
// Memory, per room: the JavaScript heap in use, and the memory the operating system counts
// for the browser's processes. Neither is a phone's memory: see README.md for what each
// number is and is not.
//
// Here it runs in headless Chromium with SwiftShader, i.e. WebGL drawn by the CPU. Download
// sizes, draw calls, triangles and texture counts are the same as on a real device. Frame
// rate and time to first frame are not: they show this machine's CPU, not a GPU. For real
// frame rates use tests/perf/fps-overlay.js on the laptop and the phone (see README.md).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = process.env.AP_URL || 'http://localhost:4173/';
const DIST = process.env.AP_DIST || 'dist';
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--'));
const KB = (n) => Math.round(n / 1024);

// ---------------------------------------------------------------- bundle
const bundle = [];
for (const f of readdirSync(join(DIST, 'assets'))) {
  const buf = readFileSync(join(DIST, 'assets', f));
  const text = /\.(js|css)$/.test(f);
  bundle.push({
    file: f,
    raw: buf.length,
    gzip: text ? gzipSync(buf, { level: 9 }).length : null,
    brotli: text ? brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length : null,
  });
}
const folderSize = (dir) => readdirSync(dir).reduce((s, f) => s + statSync(join(dir, f)).size, 0);
const folders = Object.fromEntries(['img', 'tex', 'video', 'models', 'basis', 'brand'].map((d) => [d, folderSize(join(DIST, d))]));

// ---------------------------------------------------------------- browser
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const DESKTOP = process.argv.includes('--desktop');
const PHONE = process.argv.includes('--phone');
const VIEWPORT = PHONE ? { width: 390, height: 844 } : { width: 1366, height: 768 };
const ctx = await browser.newContext(PHONE ? { viewport: VIEWPORT, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: VIEWPORT });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Performance.enable');
// The browser cache stays on, as for a visitor (videos would otherwise be fetched again at
// every loop). --no-cache turns it off.
if (process.argv.includes('--no-cache')) await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
let phase = 'load';
const urls = new Map();
const bytes = []; // { phase, kind, path, bytes }
const kindOf = (p) => (/\.mp4$/.test(p) ? 'video' : /\.m4a$/.test(p) ? 'video sound' : /\.ktx2$/.test(p) ? 'texture (KTX2)' : /\/img\//.test(p) ? 'artwork image (WebP)' : /\.(glb)$/.test(p) ? 'model (glb)' : /\.(wasm)$/.test(p) ? 'wasm' : /\.js$/.test(p) ? 'JS' : /\.css$/.test(p) ? 'CSS' : /\/brand\//.test(p) ? 'title screen images' : /\.(webp|png|jpg|avif)$/.test(p) ? 'other image' : 'HTML and other');
cdp.on('Network.requestWillBeSent', (e) => urls.set(e.requestId, new URL(e.request.url).pathname));
// bytes on the wire: each chunk's encodedDataLength (its dataLength is the decoded size and
// would count the same data again)
cdp.on('Network.dataReceived', (e) => {
  const path = urls.get(e.requestId);
  if (path && e.encodedDataLength) bytes.push({ phase, kind: kindOf(path), path, bytes: e.encodedDataLength });
});
// The site treats a machine with 4 or fewer CPU threads, or a touch screen, as low power
// (no MSAA, smaller text sheets, fewer HD images and videos). --desktop reports 8 threads, so
// the desktop path is measured, as on a mid-range laptop; --phone reports 4.
if (DESKTOP || PHONE) await page.addInitScript((n) => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => n }), PHONE ? 4 : 8);
await page.addInitScript(() => {
  window.__apNoAdapt = true; // keep the pixel ratio fixed while measuring
  window.__perf = { firstDraw: null };
  for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) {
    for (const fn of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const orig = C.prototype[fn];
      if (!orig) continue;
      C.prototype[fn] = function (...a) {
        if (window.__perf.firstDraw === null) window.__perf.firstDraw = performance.now();
        return orig.apply(this, a);
      };
    }
  }
});
const t0 = Date.now();
await page.goto(`${BASE}?lang=en`);
await page.waitForFunction(() => document.body.dataset.state === 'ready', null, { timeout: 120000 });
const timing = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  return {
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    firstContentfulPaint: fcp ? Math.round(fcp.startTime) : null,
    firstWebGLDraw: Math.round(window.__perf.firstDraw),
    ready: Math.round(performance.now()),
  };
});
timing.wallClockToReady = Date.now() - t0;

// ---------------------------------------------------------------- memory and videos
// The browser's processes as the operating system counts them: working set (the memory in
// RAM now) and private bytes, for the page's own process (renderer) and the GPU process,
// where SwiftShader draws and keeps the textures here. Chromium's own figure for a page,
// performance.measureUserAgentSpecificMemory(), needs a cross-origin isolated page, which
// the preview server does not serve: it is tried and its absence recorded.
const browserCdp = await browser.newBrowserCDPSession();
const processMemory = async () => {
  try {
    const { processInfo } = await browserCdp.send('SystemInfo.getProcessInfo');
    const ids = processInfo.map((p) => p.id);
    let rows;
    if (process.platform === 'win32') {
      const ps = `Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | ForEach-Object { '{0} {1} {2}' -f $_.Id, $_.WorkingSet64, $_.PrivateMemorySize64 }`;
      const out = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
      rows = out.trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/).map(Number));
    } else {
      const out = execFileSync('ps', ['-o', 'pid=,rss=', '-p', ids.join(',')], { encoding: 'utf8' });
      rows = out.trim().split('\n').map((l) => l.trim().split(/\s+/).map(Number)).map(([pid, kb]) => [pid, kb * 1024, null]);
    }
    const byType = {};
    for (const [pid, ws, priv] of rows) {
      const type = processInfo.find((p) => p.id === pid)?.type || 'other';
      byType[type] ??= { processes: 0, workingSet: 0, privateBytes: 0 };
      byType[type].processes++;
      byType[type].workingSet += ws;
      byType[type].privateBytes += priv || 0;
    }
    return byType;
  } catch (e) {
    return { error: String(e).slice(0, 200) };
  }
};
const memory = async () => {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
  const uasm = await page.evaluate(async () => {
    if (!performance.measureUserAgentSpecificMemory) return 'not offered by this browser';
    if (!window.crossOriginIsolated) return 'not available: the page is not cross-origin isolated';
    try { return (await performance.measureUserAgentSpecificMemory()).bytes; } catch (e) { return `failed: ${e.message}`; }
  });
  return { jsHeapUsed: m.JSHeapUsedSize, jsHeapTotal: m.JSHeapTotalSize, domNodes: m.Nodes, measureUserAgentSpecificMemory: uasm, processes: await processMemory() };
};
// The video and sound elements of the 3D view (the viewer's own player is left out): which
// have a file, which are playing, and the size of one decoded picture of each that has
// loaded (width x height x 4 bytes, as the 3D view uploads it).
const videoElements = () => page.evaluate(() => [...document.querySelectorAll('video')].filter((v) => v.id !== 'viewer-video').map((v) => ({
  file: (v.getAttribute('src') || '').split('/').pop() || null,
  playing: !!v.getAttribute('src') && !v.paused,
  readyState: v.readyState,
  width: v.videoWidth,
  height: v.videoHeight,
  frameBytes: v.videoWidth * v.videoHeight * 4,
})));
const videoSummary = (list) => {
  const loaded = list.filter((v) => v.file);
  const playing = loaded.filter((v) => v.playing);
  const size = (v) => { try { return statSync(join(DIST, 'video', v.file)).size; } catch { return 0; } };
  return {
    elements: list.length,
    loaded: loaded.length,
    playing: playing.length,
    playingFiles: playing.map((v) => v.file).sort(),
    pausedFiles: loaded.filter((v) => !v.playing).map((v) => v.file).sort(),
    playingFileBytes: playing.reduce((s, v) => s + size(v), 0),
    loadedFileBytes: loaded.reduce((s, v) => s + size(v), 0),
    playingFrameBytes: playing.reduce((s, v) => s + v.frameBytes, 0),
    loadedFrameBytes: loaded.reduce((s, v) => s + v.frameBytes, 0),
  };
};
// at the title screen, before Enter, once what loads there has had time to arrive
await page.waitForTimeout(8000);
const atTitle = { memory: await memory(), videos: videoSummary(await videoElements()) };
// enter, without sound
phase = 'enter';
await page.evaluate(() => document.getElementById('enter').click());
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('[data-sound="off"]').click());

// one frame's renderer.info: reset in one animation frame, read in the next
const frameInfo = () => page.evaluate(() => new Promise((res) => {
  const r = window.__ap.renderer;
  r.info.autoReset = false;
  requestAnimationFrame(() => {
    r.info.reset();
    requestAnimationFrame(() => {
      const i = r.info;
      res({ calls: i.render.calls, triangles: i.render.triangles, lines: i.render.lines, points: i.render.points, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? null });
      r.info.autoReset = true;
    });
  });
}));
// frame times over a while, in ms
const frames = (ms) => page.evaluate((ms) => new Promise((res) => {
  const t = [];
  let last = performance.now();
  const end = last + ms;
  const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(t); };
  requestAnimationFrame(f);
}), ms);
const stats = (t) => {
  const s = [...t].sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  return { frames: s.length, fps: +(1000 / avg).toFixed(1), msMedian: +s[Math.floor(s.length / 2)].toFixed(1), msP95: +s[Math.floor(s.length * 0.95)].toFixed(1) };
};
// textures in use and an estimate of their GPU memory
const textureReport = () => page.evaluate(() => {
  const { scene, renderer, post } = window.__ap;
  const seen = new Set();
  const list = [];
  const add = (t, where) => {
    if (!t || !t.isTexture || seen.has(t)) return;
    seen.add(t);
    const img = t.image || {};
    const w = t.isCompressedTexture ? t.mipmaps?.[0]?.width : img.videoWidth || img.width || img.naturalWidth;
    const h = t.isCompressedTexture ? t.mipmaps?.[0]?.height : img.videoHeight || img.height || img.naturalHeight;
    const kind = t.isVideoTexture ? 'video' : t.isCompressedTexture ? 'KTX2' : t.isCanvasTexture || img instanceof HTMLCanvasElement ? 'canvas' : t.isDataTexture ? 'data' : 'image';
    const mips = t.isCompressedTexture ? (t.mipmaps?.length > 1) : t.generateMipmaps && t.minFilter !== 1006 && t.minFilter !== 1003;
    // bytes per texel as uploaded here: three uploads RGBA8 for images, canvases and videos;
    // a KTX2 texture is transcoded to whatever the GPU takes (on SwiftShader: RGBA8)
    const bpp = t.type === 1016 || t.type === 1015 ? (t.type === 1015 ? 16 : 8) : 4;
    const bytes = w && h ? w * h * bpp * (mips ? 4 / 3 : 1) : 0;
    list.push({ name: t.name || (img.src ? img.src.split('/').pop() : img.currentSrc ? img.currentSrc.split('/').pop() : ''), kind, w, h, bytes: Math.round(bytes), where });
  };
  scene.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const k of ['map', 'emissiveMap', 'normalMap', 'bumpMap', 'aoMap', 'lightMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'envMap', 'displacementMap']) add(m[k], k);
      if (m.uniforms) for (const [k, u] of Object.entries(m.uniforms)) add(u?.value, `uniform ${k}`);
      if (m.userData?.surface) for (const v of Object.values(m.userData)) if (v?.isTexture) add(v, 'userData');
    }
  });
  // render targets of the post-processing chain (HalfFloat RGBA = 8 bytes a pixel)
  const c = renderer.domElement;
  const px = c.width * c.height;
  const samples = post.composer.multisampling || 0;
  const targets = {
    drawingBuffer: c.width + ' x ' + c.height,
    pixelRatio: renderer.getPixelRatio(),
    msaaSamples: samples,
    // the composer's input and output buffers are alike (outputBuffer = inputBuffer.clone()):
    // each has, with MSAA, a multisampled RGBA16F colour (8 B x samples) and depth (4 B x
    // samples) renderbuffer, a resolve texture (8 B) and a depth buffer (4 B); without MSAA
    // only the last two. Plus bloom's mip chain, about a third of one RGBA16F buffer.
    estimateBytes: Math.round(px * 2 * (samples ? samples * (8 + 4) + 8 + 4 : 8 + 4) + px * 8 / 3),
  };
  const total = list.reduce((s, t) => s + t.bytes, 0);
  return { count: list.length, byKind: list.reduce((m, t) => ((m[t.kind] = (m[t.kind] || 0) + t.bytes), m), {}), textureBytes: total, largest: list.sort((a, b) => b.bytes - a.bytes).slice(0, 12), renderTargets: targets, rendererInfoTextures: renderer.info.memory.textures };
});
const sceneReport = () => page.evaluate(() => {
  let meshes = 0, instanced = 0, instances = 0, tris = 0, lights = 0;
  const mats = new Set();
  window.__ap.scene.traverse((o) => {
    if (o.isLight) lights++;
    if (!o.isMesh) return;
    meshes++;
    for (const m of [].concat(o.material)) mats.add(m);
    const g = o.geometry;
    const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    if (o.isInstancedMesh) { instanced++; instances += o.count; tris += n * o.count; } else tris += n;
  });
  return { meshes, instancedMeshes: instanced, instances, materials: mats.size, lights, trianglesInScene: Math.round(tris) };
});

const rooms = {};
for (const id of ['r1', 'r2', 'r3', 'r4']) {
  phase = `room ${id.slice(1)}`;
  await page.evaluate((r) => window.__ap.jumpToRoom(r), id);
  // stand still while the room's works swap to their larger images and the videos start
  await page.waitForTimeout(12000);
  const info = await frameInfo();
  const t = stats(await frames(6000));
  rooms[id] = { ...info, ...t, memory: await memory(), videos: videoSummary(await videoElements()) };
}
const scene = await sceneReport();
const textures = await textureReport();
// which path the site took, by its own account (videosByRoom is not there before the
// commit that added videos by room)
const sitePath = await page.evaluate(() => ({ lowPower: window.__ap.lowPower ?? null, videosByRoom: window.__ap.videosByRoom ?? null, touchClass: document.body.classList.contains('touch'), pointerCoarse: matchMedia('(pointer: coarse)').matches, anyPointerFine: matchMedia('(any-pointer: fine)').matches, threads: navigator.hardwareConcurrency }));
await browser.close();

// ---------------------------------------------------------------- tally
const sum = (f) => bytes.filter(f).reduce((s, b) => s + b.bytes, 0);
const phases = [...new Set(bytes.map((b) => b.phase))];
const kinds = [...new Set(bytes.map((b) => b.kind))];
const download = {
  total: sum(() => true),
  byPhase: Object.fromEntries(phases.map((p) => [p, sum((b) => b.phase === p)])),
  byKind: Object.fromEntries(kinds.map((k) => [k, sum((b) => b.kind === k)])),
  byPhaseAndKind: Object.fromEntries(phases.map((p) => [p, Object.fromEntries(kinds.map((k) => [k, sum((b) => b.phase === p && b.kind === k)]).filter(([, v]) => v))])),
};
// per file: bytes transferred and how many times it was requested (a file fetched more than once
// shows how the browser handles looping videos and range requests)
const files = {};
for (const x of bytes) { files[x.path] ??= { bytes: 0, phases: new Set() }; files[x.path].bytes += x.bytes; files[x.path].phases.add(x.phase); }
const requests = {};
for (const p of urls.values()) requests[p] = (requests[p] || 0) + 1;
const perFile = Object.entries(files).map(([path, v]) => ({ path, bytes: v.bytes, requests: requests[path] || 0, phases: [...v.phases].join(', '), fileSize: (() => { try { return statSync(join(DIST, path)).size; } catch { return null; } })() })).sort((a, b) => b.bytes - a.bytes);
const result = { date: new Date().toISOString(), url: BASE, path: DESKTOP ? 'desktop (8 threads reported)' : PHONE ? 'phone (touch, coarse pointer, 4 threads reported)' : 'as detected', sitePath, renderer: 'headless Chromium, SwiftShader (software WebGL): frame rates are CPU-bound and not representative', viewport: `${VIEWPORT.width} x ${VIEWPORT.height}`, bundle, folders, timing, download, perFile, scene, atTitle, rooms, textures };
if (OUT) writeFileSync(OUT, JSON.stringify(result, null, 2));

console.log('\nBundle (dist/assets)');
for (const b of bundle) console.log(`  ${b.file.padEnd(40)} ${String(KB(b.raw)).padStart(6)} KB${b.gzip ? `  gzip ${KB(b.gzip)} KB  brotli ${KB(b.brotli)} KB` : ''}`);
console.log('\nFolders in dist/ (KB):', Object.fromEntries(Object.entries(folders).map(([k, v]) => [k, KB(v)])));
console.log('\nTiming (ms from navigation):', timing);
console.log('\nDownload (KB on the wire; the preview server gzips JS and CSS, Netlify sends brotli):');
console.log('  total', KB(download.total));
for (const [p, v] of Object.entries(download.byPhase)) console.log(`  ${p.padEnd(10)} ${String(KB(v)).padStart(7)}  ${Object.entries(download.byPhaseAndKind[p]).map(([k, n]) => `${k} ${KB(n)}`).join(', ')}`);
console.log('\nLargest transfers (transferred / file size, requests, phases):');
for (const f of perFile.slice(0, 14)) console.log(`  ${f.path.padEnd(48)} ${String(KB(f.bytes)).padStart(6)} KB / ${f.fileSize ? KB(f.fileSize) : '-'} KB  ${f.requests} req  ${f.phases}`);
console.log('\nScene:', scene);
console.log('\nPer room (one frame, incl. post-processing passes; then frame rate over 6 s):');
for (const [r, { memory: _m, videos: _v, ...v }] of Object.entries(rooms)) console.log(`  ${r}`, v);
const MB = (n) => +(n / 1048576).toFixed(1);
console.log('\nThe site took:', sitePath);
console.log("\nMemory and videos (MB). JS heap: the page's JavaScript objects only. Renderer and GPU: working set of those browser processes, as the operating system counts it, here with software drawing; a phone's GPU and video-decoder memory is in none of these.");
for (const [r, v] of [['title', atTitle], ...Object.entries(rooms)]) {
  const p = v.memory.processes;
  console.log(`  ${r.padEnd(6)} JS heap ${MB(v.memory.jsHeapUsed)}  renderer ${p.renderer ? MB(p.renderer.workingSet) : '-'}  GPU ${p.GPU ? MB(p.GPU.workingSet) : '-'}  | playing ${v.videos.playing} (${MB(v.videos.playingFileBytes)} MB of files, ${MB(v.videos.playingFrameBytes)} MB a frame), loaded ${v.videos.loaded} (${MB(v.videos.loadedFileBytes)} MB of files, ${MB(v.videos.loadedFrameBytes)} MB a frame)`);
  console.log(`         playing: ${v.videos.playingFiles.join(', ') || 'none'}`);
}
console.log('  performance.measureUserAgentSpecificMemory():', atTitle.memory.measureUserAgentSpecificMemory);
console.log('\nTextures:', { count: textures.count, rendererInfoTextures: textures.rendererInfoTextures, MB: +(textures.textureBytes / 1048576).toFixed(1), byKindMB: Object.fromEntries(Object.entries(textures.byKind).map(([k, v]) => [k, +(v / 1048576).toFixed(1)])) });
console.log('  largest:', textures.largest.map((t) => `${t.name || t.where} ${t.kind} ${t.w}x${t.h} ${(t.bytes / 1048576).toFixed(1)} MB`).join('; '));
console.log('  render targets:', textures.renderTargets, `${(textures.renderTargets.estimateBytes / 1048576).toFixed(1)} MB`);
