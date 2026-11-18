# Performance measurements

## On this machine: `measure.mjs`

```bash
npm run build
```
```bash
npm run preview
```
then, in a second terminal:
```bash
node tests/perf/measure.mjs perf-baseline.json
```

It reports download (total, by kind and per room), bundle sizes (raw, gzip, brotli), draw calls and triangles per frame in each room, textures and an estimate of their GPU memory, time to first frame and frame rate per room. It runs in headless Chromium with SwiftShader, which draws WebGL on the CPU: download, draw calls, triangles and textures are the same as on a real device, frame rate and time to first frame are not.

Switches, after the output file's name:

- `--phone`: the phone profile. An upright 390 × 844 window with touch, a coarse pointer and pixel ratio 2, and 4 processor threads reported, so the site takes its phone and low-power path (`lowPower` in `src/device.js`, which includes the videos by room) whatever this machine has. Without a switch the path is "as detected": this laptop reports 12 threads and has no touch screen, so it measures the desktop path.
- `--desktop`: 8 threads reported, the desktop path, as on a mid-range laptop.
- `--no-cache`: the browser cache off, to see what is fetched again.
- `AP_URL=http://localhost:<port>/` for another port; `AP_DIST=<folder>` for the built folder if it is not `dist` (for a build of an earlier commit kept elsewhere, to measure before and after).

At the title screen (8 s after Ready, before Enter) and in each room (12 s after the jump) it also records:

- **Videos:** which video and sound files the 3D view has loaded and which are playing, the size of those files, and the size of one decoded picture of each (width × height × 4 bytes, as the 3D view uploads it).
- **Memory in use**, three figures, none of them a phone's:
  - **JS heap used** (CDP `Performance.getMetrics`, `JSHeapUsedSize`, after a garbage collection): the page's JavaScript objects. It does not include the decoded video pictures, the media buffers, the textures or the WebGL memory.
  - **Renderer and GPU process working set** (the operating system's count for those Chromium processes, through `SystemInfo.getProcessInfo` and `Get-Process` on Windows, `ps` elsewhere): closer to what the page costs, and it includes the media buffers and, here, SwiftShader's textures, which it keeps in the GPU process's ordinary memory. On a phone the video decoder and the GPU have memory of their own that no figure here sees, and Chromium's process layout differs.
  - **`performance.measureUserAgentSpecificMemory()`**: Chromium's own count for the page. It needs a cross-origin isolated page, which `vite preview` does not serve, so the report says it is not available.

  Compare the figures between two runs on the same machine, not with a phone's limits.

Before and after a change, for example the videos by room:

```bash
git archive <commit before> | tar -x -C <folder>   # then npm run build there, with this node_modules
AP_DIST=<folder>/dist AP_URL=http://localhost:4185/ node tests/perf/measure.mjs perf-before-phone.json --phone
AP_URL=http://localhost:4185/ node tests/perf/measure.mjs perf-after-phone.json --phone
```

with the preview of each build running on that port in turn. The JSON files stay out of the repository.

## On your laptop and phone: `fps-overlay.js`

The overlay shows frames per second, the median and 95th-percentile frame time over the last 5 seconds, the pixel ratio, the drawing-buffer size, and the draw calls and triangles of one frame. It stores and sends nothing. Running it again closes it.

**Laptop (Chrome, Firefox, Safari):** open the digital exhibition, enter, open the developer console (F12, or Cmd+Option+J / Cmd+Option+C on a Mac), paste the whole of `fps-overlay.js`, press Enter.

**Phone:** make a bookmarklet once.

1. Run `node tests/perf/bookmarklet.mjs` and copy the line it prints (it starts with `javascript:`).
2. On the phone, bookmark any page, then edit the bookmark: name it `apfps`, and paste the copied line as its address.
3. Open the digital exhibition, enter, then:
   - Chrome on Android: type `apfps` in the address bar and tap the bookmark that appears (opening it from the bookmarks list does not run it).
   - Safari on iPhone: open the bookmarks and tap `apfps`.

**What to note, per room:** stand still for 10 seconds at the room's starting point (Rooms menu), then read fps and p95. Then walk for 10 seconds and read again. Note the device, the browser and whether it was on battery.
