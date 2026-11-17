// Videos by room (PROGRESS.md, "Videos by room", 16 November 2026). On a phone or a low-power
// device the visitor's own room plays its normal loops, a screen seen from another room
// plays its light version, a video heard from another room has its sound there, and the
// rest is paused, not unloaded. A laptop or desktop is as before: the normal loops only,
// the nearest screens within 16 m, Let it Flow from the Room 2 | Room 3 doorway on.
// The table below is the rule as decided, written out again here on purpose: the test does
// not read src/world/videoPlan.js.
// Usage: npm run build && npm run preview &   then   node tests/a11y/videos-by-room.mjs
import { launch, openWalk, TOUCH_LAPTOP } from './lib.mjs';

const FILE = {
  w03: 'w03-screen',
  w06: 'w06-artificial-paradise-singapore',
  w07: 'w07-artificial-paradise-eden-project',
  w08: 'w08-wiena-wrong-landscape-i',
  w15: 'w15-wiena-wrong-landscape-ii',
  w17: 'w17-natural-life',
  wall: 'w16-projection',
  floor: 'w16-floor',
};
const HAS_SOUND = ['w06', 'w07', 'w17', 'wall'];
// N normal loop, L light version, Ls light version and its sound, s sound only, - nothing
const RULE = {
  r1: { w03: 'N', w06: 's', w07: 'Ls', w08: 'L', w15: '-', w17: '-', wall: 'L', floor: 'L' },
  r2: { w03: 'L', w06: 'N', w07: 'N', w08: 'L', w15: 'L', w17: 'L', wall: 'L', floor: 'L' },
  r3: { w03: 'L', w06: 'Ls', w07: 'Ls', w08: 'N', w15: 'L', w17: 'Ls', wall: 'Ls', floor: 'L' },
  r4: { w03: 'L', w06: 'L', w07: 'L', w08: 'L', w15: 'N', w17: 'N', wall: 'N', floor: 'N' },
};
// in a doorway: the better of the two rooms for each screen
const rank = { N: 3, L: 2, s: 1, '-': 0 };
const union = (a, b) => Object.fromEntries(Object.keys(FILE).map((k) => {
  const [x, y] = [RULE[a][k], RULE[b][k]];
  const pic = rank[x[0]] >= rank[y[0]] ? x[0] : y[0];
  const snd = pic !== 'N' && (x.endsWith('s') || y.endsWith('s'));
  return [k, pic === 'N' ? 'N' : pic === 'L' ? (snd ? 'Ls' : 'L') : snd ? 's' : '-'];
}));

const base = (s) => (s || '').split('/').pop();
// what a screen should be doing under a code: the files playing, and the one file heard
function expected(k, code) {
  const n = `${FILE[k]}.mp4`;
  const l = `${FILE[k]}-light.mp4`;
  const s = `${FILE[k]}-sound.m4a`;
  const sound = HAS_SOUND.includes(k);
  const lightHasSound = k === 'wall';
  if (code === 'N') return { playing: [n], heard: sound ? n : null };
  if (code === 'L') return { playing: [l], heard: null };
  if (code === 'Ls') return lightHasSound ? { playing: [l], heard: l } : { playing: [l, s].sort(), heard: s };
  if (code === 's') return { playing: [s], heard: s };
  return { playing: [], heard: null };
}
function compare(state, rule, { soundOn }) {
  const wrong = [];
  for (const k of Object.keys(FILE)) {
    const scr = state.find((x) => x.key === FILE[k]);
    if (!scr) { wrong.push(`${k}: no such screen`); continue; }
    const exp = expected(k, rule[k]);
    const playing = scr.files.filter((f) => f.playing).map((f) => base(f.src)).sort();
    const heard = scr.files.filter((f) => f.sound && f.playing && !f.muted && !f.hush).map((f) => base(f.src));
    const open = scr.files.filter((f) => f.sound && f.playing && !f.hush).map((f) => base(f.src));
    if (playing.join() !== exp.playing.join()) wrong.push(`${k} (${rule[k]}): playing [${playing.join(', ')}], expected [${exp.playing.join(', ')}]`);
    const got = soundOn ? heard : open;
    if (got.join() !== (exp.heard ? [exp.heard] : []).join()) wrong.push(`${k} (${rule[k]}): sound from [${got.join(', ')}], expected [${exp.heard || ''}]`);
    if (!soundOn && scr.files.some((f) => !f.muted)) wrong.push(`${k}: a file is not muted before Enter`);
    // the picture on the screen comes from the file asked for
    const pic = rule[k][0] === 'N' ? `${FILE[k]}.mp4` : rule[k][0] === 'L' ? `${FILE[k]}-light.mp4` : null;
    if (pic && base(scr.shown) !== pic) wrong.push(`${k} (${rule[k]}): the screen shows ${base(scr.shown) || 'its still'}, expected ${pic}`);
  }
  return wrong;
}
const videoState = (page) => page.evaluate(() => window.__ap.videoState());
// waits until the screens are as the rule says (the videos have to arrive and start)
async function settle(page, rule, opts, ms = 90000) {
  const end = Date.now() + ms;
  let wrong;
  do {
    await page.waitForTimeout(1000);
    wrong = compare(await videoState(page), rule, opts);
  } while (wrong.length && Date.now() < end);
  return wrong;
}
const enter = async (page, sound) => {
  await page.focus('#enter');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  await page.focus(`[data-sound="${sound ? 'on' : 'off'}"]`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
};
// the mix at a standing point: each video's level and place as audio/ambience.js set them
const POSES = { 'Room 1 by the doorway': [4.4, 4.1, -1.2], 'doorway 1|2': [5.35, 4.1, -1.57], 'Room 2': [7.6, 3.6, 0.6], 'Room 3 by the doorway': [10.9, 3.4, 1.4], 'Room 3 by the opening': [15.0, 3.8, -1.57], 'Room 4': [19.5, 3.8, -1.2] };
async function mix(page) {
  const out = {};
  for (const [name, [x, z, yaw]] of Object.entries(POSES)) {
    await page.evaluate(([x, z, yaw]) => window.__ap.controls.setPose(x, z, yaw), [x, z, yaw]);
    // every video with sound that should be heard here has to be playing before the levels are read
    await page.waitForFunction(() => {
      const a = window.__ap.audio;
      return a.videos.every((s) => {
        const d = Math.hypot(window.__ap.controls.pos.x - s.v.pos.x, window.__ap.controls.pos.y - s.v.pos.z);
        return d >= s.v.near + 7.8 || s.files.some(({ f }) => f.wanted && !f.hush && !f.el.paused && !f.el.muted && f.el.readyState >= 3);
      });
    }, null, { timeout: 90000, polling: 1000 }).catch(() => {});
    await page.waitForTimeout(6000);
    out[name] = await page.evaluate(() => Object.fromEntries(window.__ap.audio.videos.map((s) => [s.v.file.split('/').pop(), { level: +s.gain.gain.value.toFixed(3), pan: +s.pan.pan.value.toFixed(3) }])));
  }
  return out;
}

const browser = await launch();
const checks = [];
const check = (name, ok, detail = '') => { checks.push([name, !!ok, detail]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n      ${detail}`}`); };
const requests = (page) => {
  const list = [];
  page.on('request', (r) => { const f = base(new URL(r.url()).pathname); if (/\.(mp4|m4a)$/.test(f)) list.push(f); });
  return list;
};
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, threads: 8 };

// ---------------------------------------------------------------- phone
let phoneMix = null;
{
  const { page, errors, ctx } = await openWalk(browser, PHONE);
  const wanted = await page.evaluate(() => ({ byRoom: window.__ap.videosByRoom, coarse: matchMedia('(pointer: coarse)').matches, anyFine: matchMedia('(any-pointer: fine)').matches }));
  check('phone: a coarse pointer and no fine one gets videos by room', wanted.byRoom === true && wanted.coarse && !wanted.anyFine, JSON.stringify(wanted));
  // before Enter: Room 1, what is seen from Room 1 (light), and the sound heard in Room 1
  let wrong = await settle(page, RULE.r1, { soundOn: false });
  check('phone, title screen: Room 1 and what is seen and heard from it are playing, muted', wrong.length === 0, wrong.join('; '));
  const loadedAtTitle = (await videoState(page)).flatMap((s) => s.files).filter((f) => f.src).map((f) => base(f.src)).sort();
  const expectedAtTitle = Object.keys(FILE).flatMap((k) => expected(k, RULE.r1[k]).playing).sort();
  check('phone, title screen: no other video file has been asked for', loadedAtTitle.join() === expectedAtTitle.join(), `loaded: ${loadedAtTitle.join(', ')}`);
  const els = await page.evaluate(() => [...document.querySelectorAll('video')].filter((v) => v.id !== 'viewer-video').length);
  check('phone: 19 elements (8 loops, 8 light versions, 3 sound files)', els === 19, `${els}`);

  await enter(page, true);
  const ctxState = await page.evaluate(() => window.__ap.audio.ctx && window.__ap.audio.ctx.state);
  check('phone: the sound is running after Enter with sound', ctxState === 'running', String(ctxState));
  for (const [where, rule, pose] of [
    ['Room 1', RULE.r1, 'r1'],
    ['Room 2', RULE.r2, 'r2'],
    ['the Room 2 | Room 3 doorway', union('r2', 'r3'), [10.02, 3.3, -1.57]],
    ['Room 3', RULE.r3, 'r3'],
    ['Room 4', RULE.r4, 'r4'],
    ['Room 3 again', RULE.r3, 'r3'],
  ]) {
    const before = await videoState(page);
    if (typeof pose === 'string') await page.evaluate((r) => window.__ap.jumpToRoom(r), pose);
    else await page.evaluate((p) => window.__ap.controls.setPose(...p), pose);
    wrong = await settle(page, rule, { soundOn: true });
    check(`phone, ${where}: each screen plays what the rule says, and the sound comes from the right file`, wrong.length === 0, wrong.join('; '));
    // whatever stopped playing is paused where it was, with its file still loaded
    const after = await videoState(page);
    const dropped = [];
    for (const s of before) for (const f of s.files) {
      const now = after.find((x) => x.key === s.key).files.find((x) => x.file === f.file);
      if (f.playing && !now.playing && (!now.src || now.readyState < 2)) dropped.push(base(f.file));
    }
    check(`phone, ${where}: what stopped is paused, not unloaded`, dropped.length === 0, dropped.join(', '));
  }
  // leaving and coming back: Room 4's floor video goes on from where it paused
  const floorPaused = (await videoState(page)).find((s) => s.key === FILE.floor).files.find((f) => f.kind === 'normal');
  const t0 = Date.now();
  await page.evaluate(() => window.__ap.jumpToRoom('r4'));
  await page.waitForFunction((k) => window.__ap.videoState().find((s) => s.key === k).files[0].playing, FILE.floor, { timeout: 60000 });
  const floorNow = (await videoState(page)).find((s) => s.key === FILE.floor).files.find((f) => f.kind === 'normal');
  const ran = (floorNow.time - floorPaused.time + floorNow.duration) % floorNow.duration;
  check('phone: back in Room 4 the floor video resumes where it paused', floorPaused.time > 0 && !floorPaused.playing && ran <= (Date.now() - t0) / 1000 + 1.5, `paused at ${floorPaused.time.toFixed(1)} s, now ${floorNow.time.toFixed(1)} s`);
  // the viewer plays the normal loop
  await page.evaluate(() => window.__ap.viewer.open(window.__ap.data.works.find((w) => w.video && /singapore/.test(w.video.loop))));
  await page.waitForTimeout(1500);
  const viewerSrc = await page.evaluate(() => document.getElementById('viewer-video').getAttribute('src'));
  check('phone: the viewer plays the normal loop', base(viewerSrc) === `${FILE.w06}.mp4`, String(viewerSrc));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  phoneMix = await mix(page);
  check('phone: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------------------------------------------------------------- laptop or desktop
{
  const { page, errors, ctx } = await openWalk(browser, { threads: 8 });
  const asked = requests(page);
  const info = await page.evaluate(() => ({ byRoom: window.__ap.videosByRoom, els: [...document.querySelectorAll('video')].filter((v) => v.id !== 'viewer-video').length }));
  check('desktop: not by room, and 8 video elements as before', info.byRoom === false && info.els === 8, JSON.stringify(info));
  await enter(page, true);
  // the rule as it was: the six wall screens within 16 m of the camera, Let it Flow's two
  // projections east of x = 9.85
  const old = () => page.evaluate(() => {
    const cam = window.__ap.camera.position;
    return window.__ap.videoState().map((s) => ({
      file: s.key,
      files: s.files.length,
      playing: s.files[0].playing,
      muted: s.files[0].muted,
      sound: s.files[0].sound,
      should: /^w16-/.test(s.key) ? cam.x > 9.85 : Math.hypot(s.pos[0] - cam.x, s.pos[1] - cam.y, s.pos[2] - cam.z) < 16,
    }));
  });
  for (const id of ['r1', 'r2', 'r3', 'r4']) {
    await page.evaluate((r) => window.__ap.jumpToRoom(r), id);
    let st;
    const end = Date.now() + 60000;
    do { await page.waitForTimeout(1000); st = await old(); } while (st.some((s) => s.playing !== s.should) && Date.now() < end);
    const wrong = st.filter((s) => s.playing !== s.should || s.files !== 1 || (s.playing && s.sound && s.muted)).map((s) => `${s.file}: playing ${s.playing}, should ${s.should}`);
    check(`desktop, ${id}: the nearest screens within 16 m play their normal loops, with sound, as before (${st.filter((s) => s.playing).length} playing)`, wrong.length === 0, wrong.join('; '));
  }
  // the Wiena loops are 16:9 and fill their 16:9 screens whole: not cut again in the
  // shader, not stretched (the artist, 17 November 2026)
  await page.evaluate(() => window.__ap.jumpToRoom('r3'));
  await page.waitForFunction(() => window.__ap.videoState().filter((s) => /wiena/.test(s.key)).every((s) => s.files[0].readyState >= 2), null, { timeout: 90000 }).catch(() => {});
  const wiena = await page.evaluate(() => [...document.querySelectorAll('video')].filter((v) => /wiena/.test(v.getAttribute('src') || '')).map((v) => ({ file: v.getAttribute('src').split('/').pop(), w: v.videoWidth, h: v.videoHeight })));
  const wienaData = await page.evaluate(() => window.__ap.data.works.filter((w) => /wiena/.test(w.id)).map((w) => ({ id: w.id, mediaAspect: w.video.mediaAspect ?? null, cropTop: w.video.cropTop ?? null, screen: w.hang.w / w.hang.h })));
  check('Wiena loops: 16:9 files, no crop in the shader, on 16:9 screens', wiena.length === 2 && wiena.every((v) => Math.abs(v.w / v.h - 16 / 9) < 0.01) && wienaData.every((w) => w.mediaAspect === null && w.cropTop === null && Math.abs(w.screen - 16 / 9) < 0.02), JSON.stringify({ wiena, wienaData }));
  const deskMix = await mix(page);
  check('desktop: no light version and no sound file is asked for', !asked.some((f) => /-light\.mp4$|-sound\.m4a$/.test(f)), asked.join(', '));
  check('desktop: no console errors', errors.length === 0, errors.join(' | '));
  // the same levels and places on the phone as on the desktop, at the same standing points
  const diffs = [];
  let audible = 0;
  for (const [pose, vids] of Object.entries(deskMix)) for (const [file, d] of Object.entries(vids)) {
    const p = phoneMix[pose][file];
    if (d.level > 0.01) audible++;
    if (!p || Math.abs(p.level - d.level) > 0.015 || (d.level > 0.01 && Math.abs(p.pan - d.pan) > 0.03)) diffs.push(`${pose}, ${file}: desktop level ${d.level} pan ${d.pan}, phone ${p ? `level ${p.level} pan ${p.pan}` : 'none'}`);
  }
  console.log('      levels, desktop:', JSON.stringify(deskMix));
  console.log('      levels, phone:  ', JSON.stringify(phoneMix));
  check(`sound: level and place of each video are the same on the phone as on the desktop at ${Object.keys(POSES).length} standing points (${audible} audible cases)`, diffs.length === 0 && audible >= 6, diffs.join('; '));
  await ctx.close();
}

// ---------------------------------------------------------------- who gets the rule
{
  // a laptop with a touch screen has a mouse or trackpad too: a computer (D10)
  const { page, ctx } = await openWalk(browser, { ...TOUCH_LAPTOP, threads: 8 });
  const asked = requests(page);
  const info = await page.evaluate(() => ({ byRoom: window.__ap.videosByRoom, touch: 'ontouchstart' in window, coarse: matchMedia('(pointer: coarse)').matches, anyFine: matchMedia('(any-pointer: fine)').matches, els: [...document.querySelectorAll('video')].filter((v) => v.id !== 'viewer-video').length }));
  await page.waitForTimeout(3000);
  check('laptop with a touch screen: not by room, no light version asked for', info.byRoom === false && info.els === 8 && !asked.some((f) => /-light|-sound/.test(f)), JSON.stringify(info));
  await ctx.close();
}
{
  // a computer that reports 4 threads is low-power: by room
  const { page, ctx } = await openWalk(browser, { threads: 4 });
  const byRoom = await page.evaluate(() => window.__ap.videosByRoom);
  const wrong = await settle(page, RULE.r1, { soundOn: false });
  check('computer reporting 4 threads: videos by room', byRoom === true && wrong.length === 0, wrong.join('; '));
  await ctx.close();
}
{
  // reduced motion never stopped the videos in the 3D view, and does not now
  const { page, ctx } = await openWalk(browser, { ...PHONE, reducedMotion: 'reduce' });
  const wrong = await settle(page, RULE.r1, { soundOn: false });
  check('phone with reduced motion: the videos play by room all the same', wrong.length === 0, wrong.join('; '));
  await ctx.close();
}
await browser.close();
const failed = checks.filter(([, ok]) => !ok).length;
console.log(`\n${checks.length - failed} of ${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
