// Frame-rate overlay for the digital exhibition, to run on a real laptop or phone.
// It is not part of the site: paste it into the browser console, or run it as a
// bookmarklet (node tests/perf/bookmarklet.mjs prints one). It stores nothing and sends
// nothing. Run it again to close it.
//
// It shows, over the last 5 seconds: frames per second, the median and the 95th-percentile
// frame time (a high p95 means stutter even when the average is fine), the pixel ratio and
// drawing-buffer size, and, when the page's debug handle window.__ap is there, the draw
// calls and triangles of one frame and the room you are in.
(() => {
  const ID = 'ap-fps-overlay';
  const old = document.getElementById(ID);
  if (old) { old.remove(); window.__apFpsStop = true; return; }
  window.__apFpsStop = false;
  const box = document.createElement('pre');
  box.id = ID;
  box.setAttribute('aria-live', 'off');
  box.style.cssText = 'position:fixed;left:8px;top:50px;z-index:99999;margin:0;padding:8px 10px;background:rgba(0,0,0,.82);color:#fff;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;border:1px solid #fff;pointer-events:none;white-space:pre';
  document.body.appendChild(box);
  const times = [];
  let last = performance.now();
  let info = '';
  const sample = () => {
    const ap = window.__ap;
    if (!ap || !ap.renderer) return;
    const r = ap.renderer;
    r.info.autoReset = false;
    requestAnimationFrame(() => {
      r.info.reset();
      requestAnimationFrame(() => {
        info = `draw calls ${r.info.render.calls}  triangles ${r.info.render.triangles}`;
        r.info.autoReset = true;
      });
    });
  };
  const tick = (now) => {
    if (window.__apFpsStop) return;
    times.push([now, now - last]);
    last = now;
    while (times.length && now - times[0][0] > 5000) times.shift();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const draw = () => {
    if (window.__apFpsStop) return;
    const ms = times.map((t) => t[1]).sort((a, b) => a - b);
    if (ms.length > 10) {
      const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
      const p = (q) => ms[Math.min(ms.length - 1, Math.floor(ms.length * q))].toFixed(1);
      const c = document.querySelector('canvas#scene');
      const room = document.querySelector('#room-label .room-name')?.textContent || '';
      box.textContent = [
        `fps ${(1000 / avg).toFixed(1)}   frame ms median ${p(0.5)}  p95 ${p(0.95)}`,
        `pixel ratio ${window.__ap?.renderer?.getPixelRatio?.() ?? devicePixelRatio}  buffer ${c ? `${c.width}x${c.height}` : '-'}  window ${innerWidth}x${innerHeight}`,
        info,
        room,
      ].filter(Boolean).join('\n');
    }
    sample();
    setTimeout(draw, 1000);
  };
  draw();
})();
