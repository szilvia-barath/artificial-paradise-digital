// The sound of the walk is the videos' own sound: the videos with a sound track play it
// from their screen (attachVideos), louder the closer you stand and quieter from the next
// room. Nothing else is synthesised (the drone, room tone, bar murmur, projector fan and
// the noise burst between rooms, added on 22 Oct 2026, were invented and are gone).
// An AnalyserNode on the master bus exposes bass/mid/high/level; the post chain reads
// only `glitch` from it.

import { roomAt } from '../world/layout.js';

export class Ambience {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bands = { bass: 0, mid: 0, high: 0, level: 0, glitch: 0 };
    this._glitch = 0;
    this.focus = 1; // the whole mix steps back while the artwork viewer is open
    this.videos = []; // { v, gain, pan, room } per video with sound
    this.spotlight = null; // id of the work the guided tour is showing
  }

  _master() {
    return this.muted ? 0 : 0.9 * this.focus;
  }

  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const now = ctx.currentTime;

    this.master = ctx.createGain();
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(this._master(), now + 4);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.75;
    comp.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);

    // Reverb-ish space: a short feedback delay network for "basement" tail
    this.space = ctx.createGain();
    this.space.gain.value = 0.35;
    const d1 = ctx.createDelay(1);
    const d2 = ctx.createDelay(1);
    d1.delayTime.value = 0.113;
    d2.delayTime.value = 0.171;
    const fb = ctx.createGain();
    fb.gain.value = 0.55;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2200;
    this.space.connect(d1);
    d1.connect(d2).connect(damp).connect(fb).connect(d1);
    damp.connect(this.master);
  }

  // Routes the in-world videos with a sound track through the mix (once, after start()).
  attachVideos(videos) {
    if (!this.ctx) return false;
    const ctx = this.ctx;
    for (const v of videos) {
      if (!v.sound || !v.pos || this.videos.some((e) => e.v === v)) continue;
      const src = ctx.createMediaElementSource(v.el);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const pan = ctx.createStereoPanner();
      const send = ctx.createGain();
      send.gain.value = 0.25; // a little of the basement's echo
      src.connect(gain).connect(pan).connect(this.master);
      pan.connect(send).connect(this.space);
      const room = roomAt(v.pos.x, v.pos.z);
      this.videos.push({ v, gain, pan, room: room && room.id });
    }
    return true;
  }

  _applyMaster(tc = 0.25) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this._master(), t, tc);
  }

  setMuted(m) {
    this.muted = m;
    this._applyMaster();
  }

  // 1 = the walk's own mix; less while a work is open in the viewer (0 for a video, whose
  // sound the viewer plays itself).
  setFocus(f) {
    this.focus = f;
    this._applyMaster(0.15);
  }

  // Called every frame with the listener position (x, z) and yaw.
  update(x, z, yaw, dt, t) {
    this._glitch = Math.max(0, this._glitch - dt * 2.5);
    if (!this.ctx) {
      // Silent fallback so the visuals still breathe without audio
      const b = 0.5 + 0.5 * Math.sin(t * 3.8);
      this.bands.bass = Math.pow(b, 6) * 0.6;
      this.bands.mid = 0.3 + 0.2 * Math.sin(t * 0.7);
      this.bands.high = 0.2 + 0.2 * Math.sin(t * 2.3);
      this.bands.level = 0.35;
      this.bands.glitch = Math.random() < 0.004 ? 1 : this.bands.glitch * 0.9;
      return this.bands;
    }
    const ct = this.ctx.currentTime;

    // The videos' sound: full within `near` (1.2 m for a screen), then falling with
    // distance and gone 7.8 m further (by 9 m from a screen, where it stops playing);
    // through a doorway it is quieter still. The one
    // you face leads (the Singapore and Eden project screens share a corner), and on the tour the
    // video of the current stop does.
    const here = roomAt(x, z);
    const lead = this.spotlight && this.videos.some((s) => s.v.work === this.spotlight) ? this.spotlight : null;
    for (const s of this.videos) {
      const { v } = s;
      let level = 0;
      if (v.wanted && !v.el.paused && !v.el.muted) {
        const d = Math.hypot(x - v.pos.x, z - v.pos.z);
        level = Math.min(1, (v.near / Math.max(d, 0.01)) ** 1.4) * Math.min(1, Math.max(0, (v.near + 7.8 - d) / 2.5));
        if (here && s.room && here.id !== s.room) level *= 0.3;
        const a = Math.atan2(-(v.pos.x - x), -(v.pos.z - z)) - yaw;
        if (lead) level *= v.work === lead ? 1 : 0.2;
        else level *= 0.3 + 0.7 * Math.max(0, Math.cos(a));
        s.pan.pan.setTargetAtTime(Math.max(-0.7, Math.min(0.7, -Math.sin(a))) * Math.min(1, d / 1.5), ct, 0.15);
      }
      s.gain.gain.setTargetAtTime(level * 1.2, ct, 0.3);
    }

    // spectrum -> bands
    this.analyser.getByteFrequencyData(this.freq);
    const hz = this.ctx.sampleRate / this.analyser.fftSize;
    const avg = (lo, hi) => {
      let s = 0;
      let n = 0;
      for (let i = Math.floor(lo / hz); i <= Math.min(this.freq.length - 1, Math.ceil(hi / hz)); i++) { s += this.freq[i]; n++; }
      return n ? s / n / 255 : 0;
    };
    const k = Math.min(1, dt * 12);
    this.bands.bass += (Math.min(1, avg(30, 120) * 1.3) - this.bands.bass) * k;
    this.bands.mid += (Math.min(1, avg(250, 2000) * 2.2) - this.bands.mid) * k;
    this.bands.high += (Math.min(1, avg(2500, 9000) * 4) - this.bands.high) * k;
    this.bands.level += (Math.min(1, avg(30, 9000) * 2.2) - this.bands.level) * k;
    this.bands.glitch = this._glitch;
    return this.bands;
  }
}
