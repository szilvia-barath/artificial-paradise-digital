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

It reports download (total, by kind and per room), bundle sizes (raw, gzip, brotli), draw calls and triangles per frame in each room, textures and an estimate of their GPU memory, time to first frame and frame rate per room. In the cloud session it runs in headless Chromium with SwiftShader, which draws WebGL on the CPU: download, draw calls, triangles and textures are the same as on a real device, frame rate and time to first frame are not.

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
