import { ROOMS } from '../world/layout.js';
import { t } from '../i18n.js';
import { reducedMotion } from '../motion.js';

// Corner minimap: walls (from the collision segments), works, current room highlight
// and the visitor as a view cone. Click a room on the map to jump there.

// Unit vector pointing to true north in plan coordinates (x right, z down).
const NORTH = [-0.829, -0.56];

export function setupMinimap(canvas, segments, works, onJump) {
  const ctx = canvas.getContext('2d');
  const bounds = { x0: -1.0, x1: 26.2, z0: -0.6, z1: 7.6 };
  let W = 0;
  let H = 0;
  let s = 1;
  let ox = 0;
  let oy = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = 8;
    s = Math.max(0, Math.min((W - pad * 2) / (bounds.x1 - bounds.x0), (H - pad * 2) / (bounds.z1 - bounds.z0)));
    ox = (W - (bounds.x1 - bounds.x0) * s) / 2 - bounds.x0 * s;
    oy = (H - (bounds.z1 - bounds.z0) * s) / 2 - bounds.z0 * s;
  };
  resize();
  window.addEventListener('resize', resize);
  const X = (x) => ox + x * s;
  const Y = (z) => oy + z * s;

  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left - ox) / s;
    const z = (e.clientY - r.top - oy) / s;
    const room = ROOMS.find((rm) => x >= rm.x0 && x <= rm.x1 && z >= rm.z0 && z <= rm.z1);
    if (room) onJump(room.id);
  });

  // The visitor's dot swells three times, over 3 s, after a jump (a room from the rooms
  // menu or the map, Page Down, "Walk to this work"), so the eye finds it; otherwise it is
  // still. With reduced motion it never moves (WCAG 2.2.2).
  const PULSE_SECONDS = 3;
  let pulseFrom = -Infinity;
  const dotRadius = () => {
    const age = (performance.now() - pulseFrom) / 1000;
    if (age < 0 || age >= PULSE_SECONDS || reducedMotion()) return 2.6;
    return 2.6 + 1.2 * Math.sin(Math.PI * age) ** 2;
  };

  const draw = (px, pz, yaw, roomId) => {
    // The HUD starts hidden, so measure lazily once it is on screen.
    if (W < 10 || canvas.getBoundingClientRect().width !== W) resize();
    if (W < 10 || s <= 0) return;
    ctx.clearRect(0, 0, W, H);
    for (const r of ROOMS) {
      ctx.fillStyle = r.id === roomId ? 'rgba(143,168,255,0.12)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(X(r.x0), Y(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [[ax, az], [bx, bz]] of segments) {
      ctx.moveTo(X(ax), Y(az));
      ctx.lineTo(X(bx), Y(bz));
    }
    ctx.stroke();
    // works: 5 px marks with a 1 px dark edge, told apart by shape as well as colour:
    // paintings and prints round, videos square
    for (const w of works) {
      const f = w._pin;
      if (!f) continue;
      const video = w.type === 'video' || w.type === 'projection';
      const cx = Math.round(X(f.x));
      const cy = Math.round(Y(f.z));
      for (const [half, colour] of [[3.5, 'rgba(11,12,14,0.9)'], [2.5, video ? '#5fe7ff' : '#ff4fa3']]) {
        ctx.fillStyle = colour;
        if (video) ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
        else {
          ctx.beginPath();
          ctx.arc(cx, cy, half, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // room numbers, over the marks so a work hung in a corner never covers one
    for (const r of ROOMS) {
      // the room the visitor is in: its number bold and fully light on the accent tint, so not
      // by colour alone (the accent as 11 px text on that tint would be 4.06:1 over a white wall)
      ctx.font = `${r.id === roomId ? 'bold ' : ''}12px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = r.id === roomId ? '#f2f1ed' : 'rgba(255,255,255,0.85)';
      ctx.fillText(r.id.replace('r', ''), X(r.x0) + 3, Y(r.z0) + 13);
    }
    // compass: true north in plan coordinates (the rooms run from the Damjanich utca
    // front towards bearing 146°, measured on the OpenStreetMap outline of no. 39)
    {
      const cx = W - 16;
      const cy = H - 16;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(cx - NORTH[0] * 6, cy - NORTH[1] * 6);
      ctx.lineTo(cx + NORTH[0] * 8, cy + NORTH[1] * 8);
      ctx.stroke();
      ctx.font = '12px ui-monospace, Menlo, monospace';
      ctx.fillText(t('hud.north'), cx + NORTH[0] * 13 - 4, cy + NORTH[1] * 13 + 4);
    }
    // visitor view cone
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const spread = 0.55;
    const len = 2.6;
    const lx = fx * Math.cos(spread) - fz * Math.sin(spread);
    const lz = fx * Math.sin(spread) + fz * Math.cos(spread);
    const rx = fx * Math.cos(-spread) - fz * Math.sin(-spread);
    const rz = fx * Math.sin(-spread) + fz * Math.cos(-spread);
    const g = ctx.createRadialGradient(X(px), Y(pz), 0, X(px), Y(pz), len * s);
    g.addColorStop(0, 'rgba(143,168,255,0.55)');
    g.addColorStop(1, 'rgba(143,168,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(px), Y(pz));
    ctx.lineTo(X(px + lx * len), Y(pz + lz * len));
    ctx.lineTo(X(px + rx * len), Y(pz + rz * len));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8fa8ff';
    ctx.beginPath();
    ctx.arc(X(px), Y(pz), dotRadius(), 0, Math.PI * 2);
    ctx.fill();
  };
  draw.pulse = () => { pulseFrom = performance.now(); };
  return draw;
}
