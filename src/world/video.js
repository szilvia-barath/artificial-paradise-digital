import * as THREE from 'three';
import { videosByRoom, planAt, lightFile, soundFile, LIGHT_WITH_SOUND } from './videoPlan.js';

// Video textures that only decode while the visitor is near: one looping <video> per
// screen or projection, started when wanted and paused otherwise. Until its first frame
// has arrived, `ready` is false and the caller keeps showing the photographed still.
// Videos with a sound track (`sound`) stay muted until enableVideoSound(): from then on
// audio/ambience.js plays their sound from `pos`, their place in the rooms, at full level
// within `near` metres (a wall-sized projection fills more of the room than a screen);
// `work` is the id of the artwork they belong to.
//
// On phones and low-power devices (videoPlan.js) a screen has up to three files, each in
// an element of its own: its normal loop, a light version for when it is seen from another
// room, and for some its sound alone. Which of them plays goes by the visitor's room
// (scheduleByRoom); the others are paused, not unloaded. Laptops and desktops have the
// normal loop only and the nearest-screens rule (scheduleVideos).

const BASE = import.meta.env.BASE_URL;

// Every video element in the 3D view, for the sound mix.
export const VIDEOS = [];
// The screens, where they are played by room: [] on laptops and desktops.
const SCREENS = [];
export const BY_ROOM = videosByRoom();
let soundOn = false;

function play(v) {
  v.el.muted = !(v.sound && soundOn);
  v.el.play().catch(() => {
    // The browser wants a fresh click before playing sound: play muted until then.
    if (!v.el.muted) {
      v.el.muted = true;
      v.el.play().catch(() => {});
    }
  });
}

// The video elements sit in the page, invisible: phone browsers (iOS Safari above all)
// may not decode a video that is not in the document, and the screen stays black.
let shelf = null;
function shelve(el) {
  if (!shelf) {
    shelf = document.createElement('div');
    shelf.setAttribute('aria-hidden', 'true');
    shelf.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1';
    document.body.appendChild(shelf);
  }
  el.style.cssText = 'width:2px;height:2px';
  shelf.appendChild(el);
}

// One file in one element. `main` is the screen's normal loop where this is its light
// version or its sound; picture: false for a file with sound only.
function createElement(src, { pos = null, sound = false, near = 1.2, work = null, main = null, picture = true } = {}) {
  const el = document.createElement('video');
  el.muted = true;
  el.loop = true;
  el.playsInline = true;
  el.preload = 'none';
  el.setAttribute('muted', '');
  el.setAttribute('playsinline', '');
  shelve(el);
  let tex = null;
  if (picture) {
    tex = new THREE.VideoTexture(el);
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  const v = { el, tex, pos, sound, near, work, main, file: src, ready: false, wanted: false };
  el.addEventListener('loadeddata', () => { v.ready = true; });
  v.want = (on) => {
    if (on === v.wanted) return;
    v.wanted = on;
    if (on) {
      if (!el.src) el.src = `${BASE}${src}`;
      play(v);
    } else {
      el.pause();
    }
  };
  VIDEOS.push(v);
  return v;
}

export function createVideo(src, opts = {}) {
  const v = createElement(src, opts);
  v.textures = [v.tex];
  // The picture to put on the screen, or null while there is none yet.
  v.shown = () => (v.ready ? v.tex : null);
  if (BY_ROOM) {
    const key = src.replace(/^.*\//, '').replace(/\.mp4$/, '');
    v.key = key;
    v.pic = null; // 'normal', 'light' or null: what the visitor's room asks of this screen
    v.voice = null; // the element whose sound is heard now
    v.light = createElement(lightFile(key), { ...opts, sound: !!opts.sound && LIGHT_WITH_SOUND.has(key), main: v });
    v.textures.push(v.light.tex);
    v.soundOnly = opts.sound && !v.light.sound ? createElement(soundFile(key), { ...opts, main: v, picture: false }) : null;
    v.files = [v, v.light, v.soundOnly].filter(Boolean);
    // The file asked for, as soon as it has a frame; until then the other one, so a screen
    // that was playing does not fall back to its still while the next file arrives.
    v.shown = () => {
      const [a, b] = v.pic === 'light' ? [v.light, v] : [v, v.light];
      return a.ready ? a.tex : b.ready ? b.tex : null;
    };
    SCREENS.push(v);
  }
  return v;
}

// Called (from the Enter click) once Web Audio has taken over the videos' output.
export function enableVideoSound() {
  soundOn = true;
  for (const v of VIDEOS) if (v.sound && v.wanted) v.el.muted = false;
}

// A video the browser kept muted gets its sound back on the visitor's next click or key.
const unmute = () => {
  if (!soundOn) return;
  for (const v of VIDEOS) if (v.sound && v.wanted && v.el.muted) v.el.muted = false;
};
window.addEventListener('pointerdown', unmute, true);
window.addEventListener('keydown', unmute, true);

// Plays the `budget` nearest videos within `range` metres and pauses the rest.
// items: [{ video, pos: Vector3 }]
export function scheduleVideos(items, camPos, budget, range) {
  const near = items
    .map((it) => ({ it, d: it.pos.distanceTo(camPos) }))
    .filter((e) => e.d < range)
    .sort((a, b) => a.d - b.d)
    .slice(0, budget);
  for (const it of items) it.video.want(near.some((e) => e.it === it));
}

// Phones and low-power devices: plays what the visitor's room asks for (videoPlan.js) and
// pauses the rest, every 0.4 s by the clock (a slow frame rate does not slow it down).
// x, z: where the visitor stands.
let tick = -Infinity;
export function scheduleByRoom(x, z) {
  if (!BY_ROOM) return;
  const now = performance.now();
  if (now - tick < 400) return;
  tick = now;
  const plan = planAt(x, z);
  for (const v of SCREENS) {
    const { pic, snd } = plan[v.key];
    v.pic = pic;
    const picture = pic === 'normal' ? v : pic === 'light' ? v.light : null;
    // Whose sound is heard here: the normal loop's own in its room; elsewhere, if the sound
    // reaches this room, the light version's where it has one, or else the sound file.
    const voice = !v.sound ? null : picture === v ? v : !snd ? null : picture && picture.sound ? picture : v.soundOnly;
    if (voice !== v.voice) {
      const from = v.voice;
      if (!voice || !from || !from.wanted || from.el.paused) {
        v.voice = voice;
        v.handover = null;
      } else {
        // The sound goes from one file to the other without a gap: the new one starts
        // unheard (`hush`: audio/ambience.js keeps it out of the mix), is set to the place
        // the old one has reached, and takes over once it is playing.
        if (!v.handover || v.handover.to !== voice) v.handover = { to: voice, synced: false };
        voice.hush = true;
        voice.want(true);
        const el = voice.el;
        if (!v.handover.synced && el.readyState >= 1) {
          el.currentTime = Math.min(from.el.currentTime, Math.max(0, (el.duration || 0) - 0.1));
          v.handover.synced = true;
        } else if (v.handover.synced && el.readyState >= 3 && !el.paused && !el.seeking) {
          v.voice = voice;
          v.handover = null;
        }
      }
    } else {
      v.handover = null;
    }
    const next = v.handover && v.handover.to;
    // A picture that is playing stays until the one asked for has its first frame.
    const held = picture && !picture.ready ? v.files.find((f) => f.tex && f !== picture && f.wanted && f.ready) : null;
    for (const f of v.files) {
      f.hush = f.sound && f !== v.voice;
      f.want(f === picture || f === v.voice || f === next || f === held);
      // a file the browser refused to start, or stopped in the background, is tried again
      if (f.wanted && f.el.paused) play(f);
    }
  }
}

// For the tests: each screen's files and what they are doing.
export function videoState() {
  return VIDEOS.filter((v) => !v.main).map((v) => ({
    key: v.key || v.file.replace(/^.*\//, '').replace(/\.mp4$/, ''),
    work: v.work,
    pos: v.pos ? [v.pos.x, v.pos.y, v.pos.z] : null,
    pic: v.pic ?? null,
    voice: v.voice ? v.voice.file : null,
    shown: v.shown() ? VIDEOS.find((f) => f.tex === v.shown()).file : null,
    files: (v.files || [v]).map((f) => ({
      file: f.file,
      kind: f === v ? 'normal' : f.tex ? 'light' : 'sound',
      src: f.el.getAttribute('src'),
      wanted: f.wanted,
      playing: !!f.el.getAttribute('src') && !f.el.paused,
      ready: f.ready,
      readyState: f.el.readyState,
      sound: f.sound,
      muted: f.el.muted,
      hush: !!f.hush,
      time: f.el.currentTime,
      duration: f.el.duration,
    })),
  }));
}
