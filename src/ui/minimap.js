import { ROOMS } from '../world/layout.js';
import { t } from '../i18n.js';
import { reducedMotion } from '../motion.js';

// Corner minimap: walls (from the collision segments), works, current room highlight
// and the visitor as a view cone. Click a room on the map to jump there.

// Unit vector pointing to true north in plan coordinates (x right, z down).
const NORTH = [0.559, -0.829];

// The works on the map, in four groups by their `type` in exhibition.json. Each group has its
// own shape and colour, so none is told by colour alone (A4): the map's magenta and cyan, the
// light of text on glass, and an orange of its own for the other works (not the accent blue,
// which is the visitor's dot), and a yellow hexagon for the prints, which have a group of their
// own in the key (the reconstructor, 18 November 2026, second batch); a type not listed goes to
// "Other works" (none at present). The key under the map (#map-key) is drawn from this table
// with the same outlines; a group with no works on the map is left out of it.
export const MAP_GROUPS = [
  { id: 'paintings', types: ['painting'], shape: 'circle', colour: '#ff80c0' }, // lighter than the accent magenta #ff4fa3, so it is 3:1 on the map's 70% glass over white (3.24:1; the reconstructor, 21 November 2026)
  { id: 'prints', types: ['print'], shape: 'hexagon', colour: '#ffe14d' },
  { id: 'videos', types: ['video', 'projection'], shape: 'square', colour: '#5fe7ff' },
  { id: 'installations', types: ['installation'], shape: 'triangle', colour: '#f2f1ed' },
  { id: 'other', types: [], shape: 'diamond', colour: '#ff9f40' },
];
export const groupOf = (type) => MAP_GROUPS.find((g) => g.types.includes(type)) || MAP_GROUPS[MAP_GROUPS.length - 1];
// the 1 px dark edge round every mark
export const MARK_EDGE = 'rgba(11,12,14,0.9)';
// A mark's outline round 0,0 in px, as an SVG path (the canvas draws it through Path2D): about
// 5 px of colour, of about the same area for every shape, inside the 1 px edge.
export function markPath(shape) {
  if (shape === 'square') return 'M-2.5 -2.5H2.5V2.5H-2.5Z';
  if (shape === 'triangle') return 'M0 -3.6L3.3 2.2H-3.3Z';
  if (shape === 'diamond') return 'M0 -3.2L3.2 0L0 3.2L-3.2 0Z';
  if (shape === 'hexagon') return 'M0 -3L2.6 -1.5V1.5L0 3L-2.6 1.5V-1.5Z';
  return 'M2.5 0A2.5 2.5 0 1 1 -2.5 0A2.5 2.5 0 1 1 2.5 0Z';
}
// The edge is a 2 px stroke under the fill: 1 px of it shows outside the colour all round.
const SVG_NS = 'http://www.w3.org/2000/svg';
function drawKey(works) {
  for (const svg of document.querySelectorAll('#map-key svg[data-group]')) {
    const g = MAP_GROUPS.find((x) => x.id === svg.dataset.group);
    if (!g) continue;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', markPath(g.shape));
    path.setAttribute('fill', g.colour);
    path.setAttribute('stroke', MARK_EDGE);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('paint-order', 'stroke');
    svg.dataset.shape = g.shape;
    svg.replaceChildren(path);
    svg.closest('.mk-item').hidden = !works.some((w) => groupOf(w.type) === g);
  }
}

export function setupMinimap(canvas, segments, works, onJump) {
  const ctx = canvas.getContext('2d');
  drawKey(works);
  const paths = Object.fromEntries(MAP_GROUPS.map((g) => [g.shape, new Path2D(markPath(g.shape))]));
  const bounds = { x0: -1.0, x1: 26.4, z0: -0.6, z1: 7.6 };
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
    // works: about 5 px marks with a 1 px dark edge, in four groups told apart by shape as
    // well as colour (MAP_GROUPS): paintings and prints round, videos square, installations a
    // triangle, other works a diamond
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = MARK_EDGE;
    for (const w of works) {
      const f = w._pin;
      if (!f) continue;
      const g = groupOf(w.type);
      ctx.save();
      ctx.translate(Math.round(X(f.x)), Math.round(Y(f.z)));
      ctx.stroke(paths[g.shape]);
      ctx.fillStyle = g.colour;
      ctx.fill(paths[g.shape]);
      ctx.restore();
    }
    // room numbers, over the marks so a work hung in a corner never covers one
    for (const r of ROOMS) {
      // the room the visitor is in: its number bold and fully light on the accent tint, so not
      // by colour alone (the accent as 11 px text on that tint would be 4.06:1 over a white wall)
      ctx.font = `${r.id === roomId ? 'bold ' : ''}12px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = r.id === roomId ? '#f2f1ed' : 'rgba(255,255,255,0.85)';
      ctx.fillText(r.id.replace('r', ''), X(r.x0) + 3, Y(r.z0) + 13);
    }
    // compass: true north in plan coordinates (the rooms run from the Murányi utca front
    // towards bearing 56°, parallel to Damjanich utca: the OpenStreetMap outline of no. 39 and
    // Street View; corrected 19 November 2026, it was drawn for bearing 146°)
    {
      const cx = W - 16;
      const cy = H - 16;
      ctx.lineWidth = 1;
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
  // for the checks: the groups, and which group a work's type falls in
  draw.groups = MAP_GROUPS;
  draw.groupOf = groupOf;
  return draw;
}
