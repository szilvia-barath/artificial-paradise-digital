// Reduced motion: with prefers-reduced-motion the walk has no grain, no chromatic
// aberration and no pulses, and the tour jumps from stop to stop. (The glitch transition
// is gone for everyone.) The same
// run without the setting shows the effects are otherwise on, so the test can tell.
// Usage: npm run build && npm run preview &   then   node tests/a11y/reduced-motion.mjs
import { launch, openWalk } from './lib.mjs';

const browser = await launch();
const report = {};
for (const mode of ['reduce', 'no-preference']) {
  const { page, errors, ctx } = await openWalk(browser, { reducedMotion: mode });
  await page.focus('#enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // the sound question: without sound
  await page.waitForTimeout(2500);
  const r = (report[mode] = {});
  r.mediaQuery = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  r.effectsAtRest = await page.evaluate(() => window.__ap.post.state());
  // the glitch pulse on a room change was removed for everyone (WCAG 2.3.1)
  r.glitchPulseExists = await page.evaluate(() => { window.__ap.jumpToRoom('r2'); return typeof window.__ap.post.trigger === 'function' || 'pulse' in window.__ap.post.state(); });
  await page.waitForTimeout(600);
  // interface: does anything animate or ease?
  r.cssAnimatedOrEased = await page.evaluate(() => {
    document.querySelector('#site-nav [data-nav="about"]').click();
    const hit = [];
    for (const el of document.querySelectorAll('body, body *')) {
      const s = getComputedStyle(el);
      const dur = (v) => v.split(',').some((x) => parseFloat(x) > 0);
      if ((s.animationName !== 'none' && dur(s.animationDuration)) || dur(s.transitionDuration)) hit.push(el.id ? `#${el.id}` : el.className ? `.${String(el.className).split(' ')[0]}` : el.tagName.toLowerCase());
    }
    document.querySelector('#panel [data-close]').click();
    return [...new Set(hit)];
  });
  // still picture: on the floor of Room 1 (no video in view) two frames are the same
  // when nothing moves; grain makes them differ
  await page.evaluate(() => { const c = window.__ap.controls; c.setPose(3.4, 5.6, 0); c.pitch = -1.25; });
  await page.waitForTimeout(2500);
  const clip = { x: 400, y: 200, width: 400, height: 250 };
  const a = await page.screenshot({ clip });
  await page.waitForTimeout(1200);
  const b = await page.screenshot({ clip });
  r.twoFramesOfAStillViewIdentical = a.equals(b);
  // the tour: where is the camera, frame by frame? (the test steps the tour's clock itself,
  // 0.1 s at a time, so it does not depend on how fast this machine renders)
  r.tour = await page.evaluate(() => {
    const { tour, controls, data } = window.__ap;
    document.querySelector('[data-action="tour"]').click();
    const stops = data.tour.filter((s) => s.look).map((s) => [s.x, s.z]);
    const at = (p) => stops.some(([x, z]) => Math.abs(p[0] - x) < 1e-6 && Math.abs(p[1] - z) < 1e-6);
    let between = 0;
    let steps = 0;
    const visited = new Set();
    while (tour.active && steps < 6000) {
      tour.update(0.1);
      steps++;
      const p = [controls.pos.x, controls.pos.y];
      if (at(p)) visited.add(p.join(',')); else between++;
    }
    return { stopsToVisit: stops.length, stopsVisited: visited.size, framesBetweenStops: between, framesTotal: steps, finished: !tour.active };
  });
  r.consoleErrors = errors;
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));

const on = report.reduce;
const off = report['no-preference'];
const checks = [
  ['reduced: effects report calm', on.effectsAtRest.calm === true],
  ['reduced: no grain', on.effectsAtRest.grain === 0],
  ['reduced: no chromatic aberration', on.effectsAtRest.aberration.every((v) => v === 0)],
  ['reduced: there is no glitch pulse', on.glitchPulseExists === false],
  ['reduced: no CSS animation or transition', on.cssAnimatedOrEased.length === 0],
  ['reduced: a still view does not change between frames', on.twoFramesOfAStillViewIdentical],
  ['reduced: the tour is never between two stops', on.tour.framesBetweenStops === 0 && on.tour.finished],
  ['reduced: the tour reaches every stop', on.tour.stopsVisited === on.tour.stopsToVisit],
  ['default: grain is on', off.effectsAtRest.grain > 0],
  ['default: chromatic aberration is on', off.effectsAtRest.aberration.some((v) => v > 0)],
  ['default: there is no glitch pulse either (removed for everyone)', off.glitchPulseExists === false],
  ['default: the tour flies between stops', off.tour.framesBetweenStops > 0],
  ['no console errors', on.consoleErrors.length === 0 && off.consoleErrors.length === 0],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
