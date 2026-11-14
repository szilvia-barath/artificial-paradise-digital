# Rendering proposal: a more realistic scene that is also lighter

14 November 2026, branch `wip/a11y-pilot`. A proposal only: nothing in `src/` changed for it. The measurement scripts are in `tests/perf/`. Every version, date and browser fact below was checked on its source on 14 November 2026 and carries a link; figures marked *estimate* are worked out from source code or byte sizes, not timed.

## Summary

- **The download is mostly video.** A visit through all four rooms downloads about 50 MB, of which about 44 MB is video. About 20 MB of it starts at once, most of it for screens in other rooms: on a phone when you press Enter, on a laptop already while the title screen waits.
- **On desktops, GPU memory is mostly render targets, not textures.** With MSAA 4 and half-float buffers the post-processing chain needs about 123 bytes per screen pixel: about 254 MB at 1920 × 1080, about 636 MB on a 1440 × 900 laptop at pixel ratio 2 (*estimate* from the three.js and postprocessing source). The textures come to about 140 MB as this machine uploads them, and less on a real GPU.
- **The cheapest wins change nothing a visitor sees:**
  - loading only the videos of the room you are in;
  - capping the number of pixels drawn, not only the pixel ratio;
  - letting Netlify compress the plant model;
  - drawing the two exhibition-text sheets at a size that fits the device;
  - merging a few dozen small meshes.
- **Options that change light, shadow or material are reconstruction decisions.** That covers tone mapping, ambient occlusion, light probes, baked light and re-encoded textures and videos. Each needs your decision and a PROGRESS.md entry.
- **One tone-mapping finding is new and changes what the log says.** The exposure of 1.35 is not logged anywhere. Under Khronos PBR Neutral at that exposure, dark tones of the artworks come out darker than in the files: sRGB 50 becomes 28. So "Neutral so the artworks keep their colours" (PROGRESS.md, M3) is too strong.
- **Leave for now:** moving to WebGPURenderer, Gaussian splats, real-time path tracing, and baking the direct light.

## a. The present build, measured

### How

`node tests/perf/measure.mjs` (see `tests/perf/README.md`) runs against `npm run preview`, with the browser cache on, in a 1366 × 768 window, and walks from the title screen into each room in turn.

**This machine renders in software.** Headless Chromium draws WebGL with SwiftShader on 4 CPU threads, so:

- **Same as on a real device:** download sizes, draw calls, triangles, texture counts and the memory estimates.
- **Not like a real device:** frame rate and time to first frame. They show this CPU, not a GPU.

**The site takes its low-power path here.** It treats 4 or fewer CPU threads, or a touch screen, as low power: no MSAA, exhibition-text sheets at 2.5×, at most 3 high-resolution artwork images and 5 videos. A mid-range laptop with 8 threads takes the desktop path: MSAA 4, sheets at 4×, 8 images, 8 videos. `--desktop` measures that path by reporting 8 threads.

**Measuring on your own devices:** `tests/perf/fps-overlay.js` shows frames per second, median and 95th-percentile frame time, pixel ratio, buffer size, draw calls and triangles. Paste it into the browser console on the laptop. On the phone, run it as a bookmarklet; `node tests/perf/bookmarklet.mjs` prints one, and the README says how to add it in Chrome on Android and Safari on iPhone.

### JavaScript and CSS

| File | Raw | gzip | brotli |
|---|---|---|---|
| `main-*.js` (three.js, postprocessing, the world) | 907 KB | 247 KB | 204 KB |
| `index-*.js` (boot, i18n, the title screen) | 77 KB | 30 KB | 25 KB |
| `basis_transcoder.js` | 56 KB | 15 KB | 13 KB |
| `basis_transcoder.wasm` | 515 KB | (Netlify sends it brotli) | |
| `index-*.css` | 20 KB | 5 KB | 5 KB |

### Download, low-power path, cache on

| Moment | On the wire | What |
|---|---|---|
| Page load to "Ready" | 4.5 MB | JS 0.29 MB (gzip), artwork thumbnails and first images 1.4 MB, brick and river KTX2 0.98 MB, plant model 0.98 MB, Basis transcoder 0.52 MB, title screen 0.17 MB |
| Pressing Enter (still in Room 1) | 19.7 MB | video only: the loops of screens up to 16 m away start at once, including Room 2's and Room 3's (on the desktop path this starts before Enter, see below) |
| Room 1 | 5.6 MB | video |
| Room 2 | 2.8 MB | artwork images 1.0 MB, video 1.8 MB |
| Room 3 | 13.7 MB | video, almost all of it Let it Flow's floor projection (10.7 MB) from Room 4, which is within 16 m |
| Room 4 | 3.8 MB | artwork images 2.3 MB, video 1.5 MB |
| **All four rooms** | **50.2 MB** | of which video about 44 MB |

Each file was fetched once. The largest single file is `w16-floor.mp4` at 10.7 MB.

On the live site, Netlify serves the plant model and the KTX2 files as `application/octet-stream` with no compression, while it does compress the `.wasm`. gzip would take the model from 1,005 KB to 428 KB; the KTX2 files gain under 1% ([live headers, model](https://artificial-paradise.netlify.app/models/paradise-factory-plant.glb), [wasm](https://artificial-paradise.netlify.app/basis/basis_transcoder.wasm), [Netlify headers docs](https://docs.netlify.com/manage/routing/headers/)).

### Per frame, low-power path

Counted with `renderer.info.autoReset = false` over one whole frame, post-processing passes included. With the default setting the counter shows only the last full-screen pass ([three.js WebGLRenderer docs](https://threejs.org/docs/pages/WebGLRenderer.html)).

| Room | Draw calls | Triangles | Shader programs |
|---|---|---|---|
| 1 | 100 | 121,000 | 62 |
| 2 | 84 | 60,000 | 72 |
| 3 | 74 | 59,000 | 74 |
| 4 | 44 | 57,000 | 74 |

- **The whole scene:** 179 meshes, 11 of them instanced (1,635 instances), 126 materials, 8 lights, 170,000 triangles.
- **The plant model's main mesh:** 57,500 triangles. It is stored unwelded, 3 vertices per triangle.

### GPU memory, low-power path (*estimate*)

**Textures:** 45 in use, about 140 MB as uploaded here.

| Kind | Size here | Note |
|---|---|---|
| Artwork images (WebP) | 57 MB | |
| The two exhibition-text sheets | 31 MB | Canvases of 1280 × 1810 at 2.5× here. On the desktop path they are 2048 × 2896, about 31 MB each. |
| Brick and river textures (KTX2) | 30 MB | SwiftShader takes no compressed formats, so they arrive as RGBA8. On a real GPU they are about 4 MB as ETC2 or BC1 and 8 MB as BC7 ([KTX2Loader r186](https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/jsm/loaders/KTX2Loader.js), [block sizes](https://raw.githubusercontent.com/KhronosGroup/WebGL/main/extensions/WEBGL_compressed_texture_etc/extension.xml)). |
| Video frames | 22 MB | |

**Render targets** (the post-processing buffers):

| Path and screen | Bytes per pixel | Total |
|---|---|---|
| Low-power, 1366 × 768, pixel ratio 1, no MSAA | about 27 | about 27 MB |
| Desktop, MSAA 4, half-float | about 123 | about 129 MB at 1366 × 768, pixel ratio 1 |
| Desktop, MSAA 4, half-float | about 123 | about 254 MB at 1920 × 1080, pixel ratio 1 |
| Desktop, MSAA 4, half-float | about 123 | about 636 MB at 1440 × 900, pixel ratio 2 |

On the desktop path each MSAA buffer holds a multisampled colour and depth buffer, a resolve texture and a depth buffer ([postprocessing EffectComposer](https://raw.githubusercontent.com/pmndrs/postprocessing/v6.39.6/src/core/EffectComposer.js), [three r186 WebGLTextures](https://raw.githubusercontent.com/mrdoob/three.js/r186/src/renderers/webgl/WebGLTextures.js)). Drivers may compress or allocate lazily, so take these as upper bounds. Even so, they are the largest item.

### Desktop path

Measured with `--desktop` (8 threads reported), same window, cache on:

- **Download**, 50.2 MB through all four rooms, as on the low-power path. But **18.6 MB of video starts downloading while the visitor is still on the title screen**, before Enter: the desktop video budget (8) lets the screens near Room 1's starting point load during the wait. The low-power path loaded no video before Enter.

  | Moment | On the wire |
  |---|---|
  | Load, before Enter | 23.0 MB, of which video 18.6 MB |
  | Room 1 | 7.7 MB |
  | Room 2 | 3.4 MB |
  | Room 3 | 12.7 MB |
  | Room 4 | 3.3 MB |

- **Per frame:**

  | Room | Draw calls | Triangles |
  |---|---|---|
  | 1 | 99 | 121,000 |
  | 2 | 83 | 60,000 |
  | 3 | 73 | 59,000 |
  | 4 | 43 | 57,000 |

  61 to 73 shader programs.
- **Textures:** about 177 MB as uploaded here. The two exhibition-text sheets are 2048 × 2896 canvases, **30 MB each, 60 MB together**. The rest is as on the low-power path.
- **Render targets, MSAA 4:** about 123 bytes per pixel, so 129 MB at 1366 × 768 and pixel ratio 1 (*estimate*). That rises to about 254 MB at 1920 × 1080 and about 636 MB on a 1440 × 900 laptop at pixel ratio 2.

### Time and frame rate

These are this machine's CPU, not a guide to devices.

| Event | Time |
|---|---|
| First text on screen | 0.3 s |
| First WebGL draw | 2.0 s |
| "Ready" | 8.6 s |

Frame rate here was 0.3 to 1.1 frames a second. On your devices, use the overlay.

## b. The options

Each option below gives: what it improves, what it costs in download and frame time, how it fits Vite + three.js r186 + postprocessing 6.39.5 + KTX2 + meshopt, its risk, and (part c) what it would need in PROGRESS.md and how it sits with the planned "measured or guessed" view.

Versions now:

| Package | Project | Latest |
|---|---|---|
| three.js | 0.186.1 (r186) | 0.187.0 (r187, 30 Oct 2026) |
| postprocessing | 6.39.5 (three below 0.187) | 6.39.6 (three below 0.188) |

So three and postprocessing move together ([npm three](https://registry.npmjs.org/three), [npm postprocessing](https://registry.npmjs.org/postprocessing)).

### 1. Pixel-count cap, MSAA rule and steadier adaptive resolution

- **Improves.** Frame time and GPU memory on high-density laptops and big monitors. No change to the picture beyond sharpness.
- **How:**
  - cap the drawing buffer by pixel count, for example 2.1 million pixels, as well as by pixel ratio;
  - switch MSAA off, or to 2, when the pixel ratio is 1.75 or more;
  - give `adapt()` hysteresis and a limit on how often it may switch.
- **Why:**
  - every change of pixel ratio reallocates the composer buffers;
  - three.js has no adaptive resolution of its own, and drei's PerformanceMonitor shows the pattern but is for React ([drei PerformanceMonitor](https://drei.docs.pmnd.rs/performances/performance-monitor), [three.js forum on fractional scaling](https://discourse.threejs.org/t/hidpi-fractional-scaling-performance-pitfalls-and-best-practices/87114));
  - three.js has merged a manual chapter on limiting internal resolution ([PR #31942](https://github.com/mrdoob/three.js/pull/31942)).
- **Costs.** Nothing to download. A few lines in `main.js` and `post.js`.
- **Fit.** `setPixelRatio`, `setDrawingBufferSize`, and postprocessing's `composer.multisampling` setter.
- **Risk.** Low. It touches the adaptive-resolution code, which every frame passes through, so test it on the phone and laptop with the overlay. Browser signals for tiers are coarse:
  - `navigator.deviceMemory` exists only in Chromium, and its value set changed in Chrome 147;
  - Safari reports 4 or 8 for `hardwareConcurrency` whatever the machine has ([MDN compat data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json), [WebKit bug 233381](https://bugs.webkit.org/show_bug.cgi?id=233381)).

  The present test `hardwareConcurrency <= 4` therefore puts some Macs on the low-power path. A pixel cap does not depend on those signals.

### 2. Load only the videos of the room you are in

- **Improves.** The first download, from about 20 MB to the 1 to 3 loops of Room 1, and memory. Today a screen's video starts when the camera is within 16 m, on a laptop already behind the title screen, and never unloads.
- **How:** choose by room, not by distance: the current room, plus the screen visible through an open doorway. Unload when you leave. Keep the photographed still as the poster frame.
- **Costs.** Nothing to download; less downloaded. A change in `video.js` and `gallery.js`.
- **Risk.** Low. A screen may show its still for a moment longer when you enter a room.
- **Re-encoding the videos** is a separate, lossy step. Measured on three clips with AV1 (SVT-AV1, CRF 38 to 40), the results were uneven:

  | Clip | Size | Change |
  |---|---|---|
  | w08 | 6.25 → 2.74 MB | 56% smaller |
  | w16-floor | 11.0 → 9.1 MB | 17% smaller |
  | w07 | | larger |

  Safari plays AV1 only where the device has an AV1 hardware decoder, so H.264 must stay as a fallback ([caniuse AV1](https://caniuse.com/av1), [WebKit, Safari 17](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)). Any re-encode starts from the artist's originals on Drive, never from the site's copies.

### 3. Compression and caching on Netlify

- **Improves.** About 0.58 MB less for the plant model, and repeat visits.
- **How:** in `netlify.toml`, give `.glb` the type `model/gltf-binary`, then check whether Netlify then compresses it. Netlify's docs do not list the types it compresses. Give `/video/*` a cache lifetime of a day or more ([Netlify headers](https://docs.netlify.com/manage/routing/headers/)).
- **Risk.** Low, but `netlify.toml` goes live on a push to `main`, so try it on a branch deploy first.

### 4. Texture sizes per device, and artworks as KTX2 or AVIF

- **Improves.** GPU memory for the artworks: about a quarter as KTX2 UASTC, which the GPU keeps compressed. AVIF downloads 12 to 35% smaller on two paintings tested, with no gain on the fine print w11.
- **Download cost.** AVIF a few hundred KB less over the 2.1 MB of in-room images. UASTC larger than WebP.
- **Fit.** KTX2Loader is already in the build and picks ASTC, BC7 or ETC2 per GPU ([KTX2Loader r186](https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/jsm/loaders/KTX2Loader.js)). The Khronos artist guide advises UASTC, not ETC1S, for detailed colour images ([KTX Artist Guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md)). AVIF is supported in about 97% of browsers ([caniuse AVIF](https://caniuse.com/avif)).
- **Risk.** Medium. Both are lossy re-encodes of reproductions of In Copyright works; they change grain and colour slightly and must start from the originals.

### 5. The exhibition-text sheets by device

- **Improves.** About 60 MB of GPU memory on the desktop path. The two sheets are canvases drawn at 4×, 2048 × 2896 each.
- **How:** draw them at the size the screen can show from the nearest viewing point, by tier.
- **Costs.** None.
- **Risk.** Low. The text may be a little softer when zoomed in to 4×. Check by eye.

### 6. Merge the remaining small meshes

- **Improves.** Draw calls, about 20 to 30 fewer (*estimate*). `props.js` already merges static props and instances repeats. `paradiseFactory.js` does not: its 12 corner joints, chains, caps and LED housings are separate draws, and so is each of the 4 radiators ([mergeGeometries r186](https://raw.githubusercontent.com/mrdoob/three.js/r186/examples/jsm/utils/BufferGeometryUtils.js)).
- **Costs.** Nothing to download. A few milliseconds more at load.
- **Fit.** Already used. BatchedMesh is a poor fit: Firefox has no `WEBGL_multi_draw` and falls back to one call per object ([caniuse](https://caniuse.com/wf-webgl-multi-draw), [Mozilla bug 1536673](https://bugzilla.mozilla.org/show_bug.cgi?id=1536673)).
- **Risk.**
  - **Shader bug, latent.** `ao.js` reads the plan AO at `modelMatrix * position`, which ignores `instanceMatrix`. Fix it before any patched material goes onto instances.
  - **Status identity.** Merging per material loses which part is which. The "measured or guessed" view needs that, so merge per material and status, or keep a per-vertex status attribute.

### 7. Tone mapping and colour management

- **Wiring: correct.**
  - `renderer.toneMapping` is off and `ToneMappingEffect(NEUTRAL)` runs inside the composer, as the postprocessing README asks ([README](https://cdn.jsdelivr.net/npm/postprocessing@6.39.5/README.md)).
  - Colour textures are sRGB and the bump, normal and AO data are linear ([three.js colour management](https://threejs.org/manual/pages/color-management.html)).
- **What it does to the picture** (computed from the r186 shader, [tonemapping chunk](https://raw.githubusercontent.com/mrdoob/three.js/r186/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js)): at exposure 1.35, a surface whose lit value equals its texture comes out as:

  | sRGB in | 50 | 128 | 200 | 255 |
  |---|---|---|---|---|
  | Artworks and walls, out | 28 | 137 | 223 | 247 |
  | Video screens (brightness 1.1), out | 31 | 144 | 232 | |

  Darks are crushed and highlights compressed; hue is kept. PBR Neutral gives back a base colour exactly only for a shiny surface under unit white light; with no environment map here its 4% subtraction only darkens ([Khronos PBR Neutral](https://github.com/KhronosGroup/ToneMapping/blob/main/PBR_Neutral/README.md)).
- **Two smaller things:**
  - `toneMapped: false` on the light pools, the projection and the floor video does nothing inside the composer, because three applies a material's tone mapping only when it draws straight to the screen ([WebGLPrograms r186](https://raw.githubusercontent.com/mrdoob/three.js/r186/src/renderers/webgl/WebGLPrograms.js)). Those surfaces get the same exposure and curve.
  - On phones, FXAA runs on linear values, so its edge threshold misses most edges in the dark rooms.
- **Options:**
  - log the display transform as it is (no change to the picture);
  - adjust exposure against a test chart drawn in code;
  - exclude the screens and projections from tone mapping;
  - add dithering in the last pass.
- **Costs.** Nothing to download; a few operations per pixel.
- **Not worth it:** Display P3 output, because the WebP files are sRGB ([MDN drawingBufferColorSpace](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/drawingBufferColorSpace)); and an HDR canvas, which needs WebGPU with extended tone mapping, found only in Chromium ([MDN configure](https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure)).
- **Risk.** Any change of exposure or curve changes every room. Compare with the photographs and log it.

### 8. Ambient occlusion baked from the geometry

- **Improves.** Darkening in corners, door reveals, under lintels, the Room 2 recess and between the Room 4 vault beams, computed from the real 3D shapes. Today's `ao.js` works from 2D distance to the nearest wall.
- **How:**
  - `architecture.js` builds the rooms in code, so no geometry has to travel. It gives each visible face a second UV set at a fixed size; `potpack` is already in three.
  - Bake ambient occlusion once, offline: in Blender with Cycles ([Blender 5.3](https://developer.blender.org/docs/release_notes/5.3/)), or with a small Node script that casts rays against the layout's boxes.
  - Encode it with the existing KTX2 script.
- **Download cost** (*estimate*, about 490 m² of visible surface):

  | Texel size | Atlas | KTX2 (ETC1S) | UASTC, at most |
  |---|---|---|---|
  | 4 cm | 1024 × 512 | about 50 to 190 KB | 0.7 MB |
  | 2 cm | 2048 × 1024 | about 180 to 740 KB | 2.8 MB |

- **Frame cost.** One texture fetch, which replaces today's plan-AO fetch, so the net cost is none. It also removes the bake that `ao.js` runs at every load.
- **Fit.** Existing tools only: `uv1` and `Texture.channel` have been in three since r151 and r152 ([migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)). three r187's new `LightMapper` is WebGPU only, so it is not for the live site ([LightMapper r187](https://raw.githubusercontent.com/mrdoob/three.js/r187/examples/jsm/lighting/LightMapper.js)).
- **Risk.** Medium:
  - Any change to `layout.js` makes the bake stale. Store a hash of the layout with it and warn when they differ.
  - Status: AO from the geometry is *inferred* (computed from the measured plan). Its distance and strength are *invented*. It would replace an entry that today calls the plan AO *invented*.

### 9. Baked light (lightmaps)

- **Do not bake the direct light.** It would freeze the inferred light positions and the by-eye intensities into the walls. In WebGLRenderer it would not save the cost of the 7 live lights, which still light the artworks and props. It cannot cover Room 4, lit by its projection.
- **If you ever want bounce light:** bake the indirect light only, one grey channel per room (Room 1 track lights, Room 2 pendants, Room 3 rail), with colour and strength kept as live settings. Each room's share can then be switched off or tinted in the "measured or guessed" view.
- **Path tracing.** three-gpu-pathtracer 0.0.28 needs three r187 and WebGPU, and its baking is still an open pull request, so it is only useful as a reference renderer on your own machine ([releases](https://github.com/gkjohnson/three-gpu-pathtracer/releases), [PR #949](https://github.com/gkjohnson/three-gpu-pathtracer/pull/949)).

### 10. Real-time ambient occlusion (N8AO)

- **What it would be.** N8AO 2.0.2 is the only real-time AO that drops into our postprocessing chain, as `N8AOPostPass` ([npm](https://registry.npmjs.org/n8ao), [repo](https://github.com/N8python/n8ao)). It would be a new dependency, about 80 to 90 KB gzipped (*estimate*). Its README says hardware MSAA does not work with it ([README](https://raw.githubusercontent.com/N8python/n8ao/master/README.md)).
- **Costs.** No published timings. *Estimate*: 1 to 3 ms at half resolution on an integrated GPU. Too much for phones.
- **Risk.**
  - It darkens the lit artworks too.
  - It adds to the plan AO, so corners get darker twice.
  - It is view-dependent: the darkening changes with where you look from.
  - Status: *invented*.
- **Recommendation.** Not now; the bake in option 8 does more for nothing per frame. three's own GTAOPass is for three's EffectComposer, not ours ([GTAOPass](https://threejs.org/docs/pages/GTAOPass.html)).

### 11. Environment lighting and light probes

- **Improves.** Room 2 picks up its warm pendants, Room 4 stays dark from its own light, and Rooms 3 and 4 blend without a jump. Today all four rooms share one hemisphere light, which is why Room 4's materials had to be darkened.
- **How:**
  - three r186 has `LightProbeGridWebGL`, which bakes a grid of probes from the scene itself on the GPU ([docs](https://threejs.org/docs/pages/LightProbeGridWebGL.html), [r186 notes](https://github.com/mrdoob/three.js/releases/tag/r186)). It cannot save a baked grid yet; that is planned for r188 ([PR #33658](https://github.com/mrdoob/three.js/pull/33658)).
  - For the metals and glass, one environment map captured from the model at eye height with `PMREMGenerator.fromScene` ([PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html)).
- **Costs.** No download if baked in the browser. *Estimate*: a few seconds of bake behind the loading screen, 7 texture fetches per lit pixel, and about 6 to 12 MB for the environment map.
- **Risk.** Medium.
  - The grid's float texture is not filterable on about half of iOS devices, so store it as half float ([web3dsurvey](https://web3dsurvey.com/webgl2/extensions/OES_texture_float_linear)).
  - Light leaks through the 30 to 35 cm walls.
  - The API has been renamed twice since spring.
  - A downloaded HDR or `RoomEnvironment` would be an invented light environment, so do not use one.
  - The grid inherits the "inferred, set by eye" status of the 7 lights.

### 12. The plant model

- **Improves.** Download, if welding the mesh shrinks it. The plant mesh (57,500 triangles) is effectively unwelded, so welding with gltf-transform may make it smaller ([gltf-transform CLI](https://gltf-transform.dev/cli)). Not tested yet.
- **Fit.** The existing `make_plant.mjs`. If the toolchain is updated: meshoptimizer 1.x writes v1 vertex data by default, but EXT_meshopt_compression still needs v0 ([meshoptimizer releases](https://github.com/zeux/meshoptimizer/releases)).
- **Status.** A weld keeps every position, but it is a change to the artist's model file, so log it with the triangle counts before and after.

### 13. WebGPURenderer

- **Status of the renderer.** The three.js manual still calls it experimental. It does not support `ShaderMaterial`, `onBeforeCompile` or `EffectComposer` ([manual](https://threejs.org/manual/pages/webgpurenderer.html)).
- **What a move would mean here:**
  - rewriting every custom shader (`ao.js`, `surface.js`, `letItFlow.js`, the screen shader) in TSL;
  - replacing the whole postprocessing chain, which has no WebGPU path ([postprocessing](https://github.com/pmndrs/postprocessing)).
- **Browser support** ([gpuweb implementation status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status), [caniuse WebGPU](https://caniuse.com/webgpu)):
  - Chrome and Edge on desktop;
  - Android 12+ with most GPUs;
  - Safari 26 on macOS 26, iOS and iPadOS;
  - Firefox 141+ on Windows and 145+ on Apple-silicon Macs;
  - not yet Firefox on Linux or Android.

  Visitors without WebGPU would get its WebGL 2 backend.
- **Costs.** More JS: *estimate* 100 to 250 KB gzipped. The look of bloom, grain and vignette would drift.
- **Gain.** No clear gain for four rooms with 8 lights.
- **Recommendation.** Leave it.

### 14. Gaussian splats

- **What exists:**
  - three r186 ships native splats, for WebGPURenderer only ([GaussianSplat](https://threejs.org/docs/pages/GaussianSplat.html));
  - Spark 2.4.0 runs on our WebGLRenderer, but its library is about 1 MB gzipped ([npm](https://www.npmjs.com/package/@sparkjsdev/spark), [performance](https://sparkjs.dev/docs/performance/));
  - GaussianSplats3D is no longer developed ([repo](https://github.com/mkkellogg/GaussianSplats3D)).
- **Costs.** A room-scale capture of 1 to 3 million splats is about 20 to 75 MB (*estimate*, [SPZ](https://github.com/nianticlabs/spz)).
- **Recommendation.** Out, for the rights reason in part c. Even a clean capture bakes in the day's light, cannot be relit by our lights, and shows the basement as it is now, not as in January 2025.

## c. Rights and method

**Nothing from the photographs.** The photographs and the works are In Copyright, so no splat, photogrammetry or model may be made from the exhibition photographs. Masking the works afterwards does not fix that.

What would be needed instead, if a capture is ever wanted:

- **Permissions:**
  - MAMŰ's written permission to capture the empty basement and publish what is made from it;
  - a licence from whoever captures it (or your own capture) that covers derived 3D models, web display and a Zenodo deposit;
  - no artworks, of any show, and no people in frame.
- **Use:** offline, as measurement evidence, to check wall lengths, vault heights and brick courses. It would be logged with its date, device, the lighting on the day, the software, and a scale check against tape measurements. It shows the room's state on the day of capture: geometry *measured* for that date, and only *inferred* for January 2025.
- **Light and colour:** for the exhibition they stay *inferred*, from the photo numbers, as now.

**Tape and laser measurements of the empty rooms need none of this** and would firm up the same numbers.

### What each option needs in PROGRESS.md

| Option | Changes what is seen | Status to log | What to record |
|---|---|---|---|
| 1 Pixel cap, MSAA rule | Sharpness only | Not a reconstruction decision | One line: "Rendering tiers vary resolution and antialiasing by device; no light, colour, geometry or sound varies by tier." Today the floor-tile bump is off on low power, a tier-dependent material detail to log with it |
| 2 Video by room | No | Not a reconstruction decision | Changelog note |
| 3 Netlify compression | No (lossless) | Not a reconstruction decision | Changelog note |
| 4 KTX2 or AVIF artworks, AV1 video | Grain and colour, slightly | Status of the work unchanged ("measured": the artist's file); add "lossy encoding" to the uncertainty | Source file, codec and settings, and a fidelity figure (SSIM) against the previous derivative |
| 5 Text sheets by device | Sharpness | Not a reconstruction decision | One line |
| 6 Merging | No, if done right | Not a reconstruction decision | Technical entry, with A/B screenshots from fixed viewpoints (neutral panels) |
| 7 Tone mapping | Yes, every pixel | *Invented* (a display transform, not evidence): tone mapper, exposure 1.35, bloom threshold, vignette, grain, colour fringes | The table of tones in and out. Correct "so the artworks keep their colours" |
| 8 AO from geometry | Yes, shadow | AO *inferred* from the measured geometry; its distance and strength *invented* | Texel size, rays, layout hash; replaces the plan-AO entry |
| 9 Indirect light bake | Yes, light and colour | Light positions *inferred* (± to be set by you); intensities and colours *inferred by eye*; surface albedo *invented* unless measured | One entry per bake, with what was hidden and the settings |
| 10 N8AO | Yes, shadow | *Invented* | Library, version, radius, strength, devices |
| 11 Probe grid, environment map | Yes, light and reflections | *Inferred, computed* from the 7 lights (inherits their status); removing the hemisphere light ends an *invented* sky fill | Grid bounds and spacing, what was hidden during the bake; separate entry if Room 4's materials are lightened afterwards |
| 12 Plant weld | No (positions kept) | Change to the artist's model | Triangle and vertex counts before and after |
| 13 WebGPU | Bloom, grain, vignette and fringes drift | *Invented* presentation layer | A/B screenshots with neutral panels |
| 14 Splats | Everything | Out | |

### With the "measured or guessed" view

A more realistic picture must not make guesses look like facts. Four rules keep the two apart:

1. **Keep each element's status in the scene.** Merging (option 6) must keep it: merge per material and status, or keep a per-vertex status attribute the view can read.
2. **Presentation layers switch off in that view.** Tone mapping, bloom, grain, colour fringes and any screen-space AO: the view shows the reconstruction, not the display transform. They are drawn in one place (`post.js`), so this is one switch.
3. **Baked data carries its own status.** AO from geometry shows as *inferred*. A light bake keeps one channel per room so each room's light can be shown as *inferred* and turned off or tinted. Light probes and an environment captured from the model inherit the lights' status.
4. **No baked look from outside the evidence.** No downloaded HDR, no `RoomEnvironment`, no splat from another time.

## d. Ranked list

**First, cheap wins with no visible change to the reconstruction.** These are not reconstruction decisions, but say if you want any held back.

| Order | Change | Size | What it saves |
|---|---|---|---|
| 1 | Load only the current room's videos, unload on leaving, and none before Enter (option 2) | Small | About 15 to 20 MB at the start; memory |
| 2 | Pixel-count cap, MSAA off at pixel ratio 1.75 or more, steadier `adapt()` (option 1) | Small | Hundreds of MB of GPU memory on high-density laptops; frame time |
| 3 | Netlify: `.glb` type to allow compression, cache lifetime for `/video/*`, tried on a branch deploy (option 3) | Small | About 0.6 MB; repeat visits |
| 4 | Exhibition-text sheets drawn by device (option 5) | Small | About 60 MB GPU memory on the desktop path |
| 5 | Merge `paradiseFactory.js` small meshes and the radiators, keeping status identity; fix the instancing bug in `ao.js` first (option 6) | Small | 20 to 30 draw calls |
| 6 | Log the display transform as it is: exposure 1.35, the tone table, "toneMapped has no effect under the composer" (option 7, logging only) | Small | Nothing; it makes the record true |

**Then, changes that need your decision.**

| Order | Change | Size |
|---|---|---|
| 7 | Tone mapping: exposure against a test chart, screens and projections out of tone mapping, dithering, FXAA threshold (option 7) | Medium |
| 8 | AO baked from the geometry, replacing the plan AO (option 8) | Medium |
| 9 | Artwork textures as UASTC KTX2 for GPU memory, or AVIF for download, from the originals (option 4) | Medium |
| 10 | Video re-encoding clip by clip from the Drive originals, with H.264 fallback (option 2, second part) | Medium |
| 11 | Light probe grid in place of the hemisphere light (option 11) | Medium to large |
| 12 | Plant weld (option 12) | Small |
| 13 | Upgrade three to r187 with postprocessing 6.39.6, if a later step needs it | Small, with a full retest |

**Leave:**

- N8AO (option 10);
- baking the direct light (option 9);
- WebGPURenderer (option 13);
- Gaussian splats (option 14);
- runtime path tracing;
- GPU detection libraries such as detect-gpu, which reads the GPU string, a fingerprinting surface, and needs its data self-hosted ([detect-gpu](https://github.com/pmndrs/detect-gpu)).
