// WCAG 2.3.1 (three flashes): how often does the picture flash when the view jumps?
// The glitch pulse that used to fire on a room change or a jump was measured with an
// earlier version of this script on 14 November 2026 and removed (see PROGRESS.md and
// docs/accessibility/findings.md). What is left to flash is the cut itself: a jump to
// another work shows another picture. This script presses Page Down as a visitor could.
// The test stops the render loop and draws the frames itself at a fixed step (60 a
// second), so the count does not depend on how fast this machine renders. Each frame is
// read back, cut into a 16 x 12 grid, and the relative luminance of every cell is followed.
// A flash is a pair of opposing changes of at least 10% of full luminance where the darker
// state is below 0.80 (the WCAG general flash definition). Reported: the most flashes in
// any cell within one second, and the share of the screen whose cells flash more than three
// times in a second (WCAG allows that only on a small area, about a quarter of a 341 x 256
// px block; here any cell is 40 x 30 px of a 640 x 360 window, small so the software renderer keeps up).
// Usage: npm run build && npm run preview &   then   node tests/a11y/flash.mjs
import { launch, openWalk } from './lib.mjs';

const browser = await launch();
const { page, ctx } = await openWalk(browser, { viewport: { width: 640, height: 360 } });
await page.evaluate(() => document.getElementById('enter').click());
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('[data-sound="off"]').click());
await page.waitForTimeout(3000);
const scenarios = [
  ['one press of Page Down (one jump to the next work)', 60, 1, false],
  ['Page Down held for a second (the keyboard repeats it about 30 times a second)', 60, 30, true],
  ['Page Down pressed three times a second', 60, 3, false],
  ['Page Down pressed six times a second, about as fast as a finger goes', 60, 6, false],
];
let worst = 0;
for (const [name, fps, rate, held] of scenarios) {
  const r = await page.evaluate(async ({ fps, rate, held }) => {
    const { post, renderer } = window.__ap;
    renderer.setAnimationLoop(null);
    const press = (repeat) => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'PageDown', key: 'PageDown', repeat, bubbles: true, cancelable: true }));
    const src = renderer.domElement;
    const c = document.createElement('canvas');
    const GX = 16, GY = 12;
    c.width = GX * 4; c.height = GY * 4;
    const g = c.getContext('2d', { willReadFrequently: true });
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const frames = [];
    const dt = 1 / fps;
    const total = Math.round(fps * 1.5);
    const trials = 3;
    let maxFlashes = 0, areaOver = 0;
    for (let trial = 0; trial < trials; trial++) {
      frames.length = 0;
      let pressed = 0;
      for (let f = 0; f < total; f++) {
        const tsec = f * dt;
        // presses spread over the first second; a held key sends one press, then repeats
        if (tsec < 1 && Math.floor(tsec * rate) + 1 > pressed) { press(held && pressed > 0); pressed++; }
        post.update(dt, null);
        post.render(dt);
        g.drawImage(src, 0, 0, c.width, c.height);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const cells = new Float32Array(GX * GY);
        for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
          const k = (y * c.width + x) * 4;
          cells[(y >> 2) * GX + (x >> 2)] += (0.2126 * lin(d[k]) + 0.7152 * lin(d[k + 1]) + 0.0722 * lin(d[k + 2])) / 16;
        }
        frames.push(cells);
      }
      // flashes per cell in the first second
      let over = 0;
      for (let cell = 0; cell < GX * GY; cell++) {
        let ref = frames[0][cell], dir = 0, changes = 0;
        for (let f = 1; f < fps; f++) {
          const v = frames[f][cell];
          const delta = v - ref;
          if (Math.abs(delta) >= 0.1 && Math.min(v, ref) < 0.8) {
            const nd = Math.sign(delta);
            if (nd !== dir) { changes++; dir = nd; }
            ref = v;
          } else if (dir && Math.sign(delta) === dir) ref = v; // keep following the same swing
        }
        const flashes = Math.floor(changes / 2);
        maxFlashes = Math.max(maxFlashes, flashes);
        if (flashes > 3) over++;
      }
      areaOver = Math.max(areaOver, over / (GX * GY));
    }
    return { maxFlashes, areaOver };
  }, { fps, rate, held });
  worst = Math.max(worst, r.maxFlashes);
  console.log(`${name}: most flashes in one cell within a second: ${r.maxFlashes}; share of the screen flashing more than 3 times a second: ${(r.areaOver * 100).toFixed(0)}%`);
}
console.log(worst > 3 ? 'RESULT: more than three flashes a second are possible.' : 'RESULT: no more than three flashes a second in these runs.');
await ctx.close();
await browser.close();
