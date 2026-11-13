import * as THREE from 'three';
import data from './data/exhibition.json';
import { ROOMS, EYE, roomAt, roomById } from './world/layout.js';
import { DOORS, visitOrder } from './world/route.js';
import { createMaterials } from './world/materials.js';
import { buildArchitecture } from './world/architecture.js';
import { buildProps } from './world/props.js';
import { buildLights } from './world/lights.js';
import { buildGallery } from './world/gallery.js';
import { buildParadiseFactory } from './world/paradiseFactory.js';
import { buildLetItFlow } from './world/letItFlow.js';
import { VIDEOS, enableVideoSound } from './world/video.js';
import { applyPlanAO } from './world/ao.js';
import { createPost } from './fx/post.js';
import { Ambience } from './audio/ambience.js';
import { FirstPersonControls, LETTER_KEYS } from './controls.js';
import { Tour } from './tour.js';
import { setupPanels } from './ui/panels.js';
import { setupViewer } from './ui/viewer.js';
import { setupMinimap } from './ui/minimap.js';
import { setupKeypad } from './ui/keypad.js';
import { focusDialog } from './ui/dialog.js';
import { localize, onLangChange, setText, t } from './i18n.js';
import { announce, unannounce } from './ui/announce.js';
import { reducedMotion, onMotionChange } from './motion.js';

localize(data);

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const lowPower = isTouch || (navigator.hardwareConcurrency || 8) <= 4;
document.body.classList.toggle('touch', isTouch);

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false, // MSAA happens in the composer (desktop), cheaper than a full AA backbuffer
  powerPreference: 'high-performance',
  stencil: false,
  depth: false,
});
// Full resolution up to 2x on desktop; adapt() steps it down if frames get slow.
const MAX_DPR = isTouch ? 1.5 : 2;
let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050506);
scene.fog = new THREE.Fog(0x050506, 18, 40);

const camera = new THREE.PerspectiveCamera(isTouch ? 72 : 66, window.innerWidth / window.innerHeight, 0.05, 60);

// ---------------------------------------------------------------- loading
const manager = new THREE.LoadingManager();
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const enterBtn = document.getElementById('enter');
let worldReady = false;
manager.onProgress = (_url, loaded, total) => {
  const p = total ? loaded / total : 1;
  // Late files after the 12 s safety net must not overwrite "Ready".
  if (worldReady) return;
  progressBar.style.width = `${Math.round(p * 100)}%`;
  progressBar.parentElement.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  setText(progressLabel, 'loader.loading', { loaded, total });
};

// ---------------------------------------------------------------- world
const materials = createMaterials(renderer, manager, { lowPower });
const arch = buildArchitecture(materials);
scene.add(arch.group);
const props = buildProps(materials);
scene.add(props.group);
scene.add(buildParadiseFactory(materials, manager));
const letItFlow = buildLetItFlow(manager);
scene.add(letItFlow.group);
applyPlanAO(materials, arch.segments, { lowPower }); // after props and installations add their footprints
const lights = buildLights(scene);
const gallery = buildGallery(data, materials, manager, renderer, { hdBudget: lowPower ? 3 : 8, videoBudget: lowPower ? 5 : 8 });
scene.add(gallery.group);

const controls = new FirstPersonControls(camera, canvas, arch.segments);
const r1 = roomById('r1');
controls.setPose(r1.spawn.x, r1.spawn.z, 0);
controls.lookAt(r1.spawn.look.x, r1.spawn.look.z);

// Stand at a work's viewing point, facing it.
function poseAtWork(w) {
  const f = w._focus;
  const d = Math.hypot(f.look[0] - f.x, f.look[2] - f.z);
  controls.setPose(f.x, f.z, 0);
  controls.lookAt(f.look[0], f.look[2]);
  // setPose again, so the camera itself turns now and not at the next frame
  controls.setPose(f.x, f.z, controls.yaw, Math.atan2(f.look[1] - EYE, d) * 0.8);
}
// A link to a work (?work=<id>, as the text edition's links carry): the walk opens at
// that work instead of at the foot of the stairs. An unknown id is ignored.
const linkedId = new URLSearchParams(location.search).get('work');
let linkedWork = (linkedId && data.works.find((w) => w.id === linkedId && w._focus)) || null;
if (linkedWork) poseAtWork(linkedWork);

const post = createPost(renderer, scene, camera, { lowPower });
// prefers-reduced-motion switches the moving effects off, also when it changes mid-visit
post.setCalm(reducedMotion());
onMotionChange((on) => post.setCalm(on));
const audio = new Ambience();

// ---------------------------------------------------------------- UI
let entered = false;
const blockers = { panel: false, viewer: false };
const syncEnabled = () => {
  controls.enabled = entered && !blockers.panel && !blockers.viewer && !tour.active;
  controls.zoomEnabled = entered && !blockers.panel && !blockers.viewer;
  document.body.classList.toggle('overlay', blockers.panel || blockers.viewer);
};

// Where keyboard focus goes when a dialog closes and the control that opened it is gone:
// the 3D view once inside, the Enter button on the title screen.
// A dialog closed with the mouse goes to the 3D view only once inside; on the title screen
// it goes back to its opener like a keyboard close.
const focusFallback = (why) => (entered ? canvas : why === 'mouse' || enterBtn.disabled ? null : enterBtn);
// Never while the sound question is open: it is a modal dialog and keeps focus.
const focusScene = () => {
  if (entered && document.getElementById('sound-ask').hidden) canvas.focus({ preventScroll: true });
};
const soundAsking = () => !document.getElementById('sound-ask').hidden;

const ui = setupPanels(data, {
  onOpenWork: (w) => { ui.close(); viewer.open(w); },
  onOpenPanel: () => { blockers.panel = true; syncEnabled(); },
  onClosePanel: () => { blockers.panel = false; syncEnabled(); },
  onJumpRoom: (id) => jumpToRoom(id),
  focusFallback,
});

const viewer = setupViewer(data, {
  onOpen: () => { blockers.viewer = true; if (tour.active) tour.stop(); syncEnabled(); },
  onClose: () => { blockers.viewer = false; audio.setFocus(1); syncEnabled(); },
  onGoto: (w) => { gotoWork(w); focusScene(); },
  focusFallback,
  // the viewer plays a video's sound itself, so the walk's mix steps aside
  onMedia: (isVideo) => audio.setFocus(isVideo ? 0 : 0.4),
  isMuted: () => audio.muted,
});

// Guided tour: the works in catalogue order, routed through the doorways.
function buildTourStops() {
  const r1 = roomById('r1');
  const stops = [{ x: r1.spawn.x, z: r1.spawn.z, look: [r1.spawn.look.x, 1.5, r1.spawn.look.z], intro: true, dwell: 4 }];
  let room = 'r1';
  for (const w of data.works) {
    if (!w._focus) continue;
    if (w.room !== room) {
      for (const [x, z] of DOORS[`${room}>${w.room}`] || []) stops.push({ x, z, look: null, dwell: 0 });
      room = w.room;
    }
    // a little longer at the videos with sound, to hear them
    stops.push({ x: w._focus.x, z: w._focus.z, look: w._focus.look, work: w.id, dwell: w.video?.sound ? 14 : 5 });
  }
  return stops;
}
data.tour = buildTourStops();
const tour = new Tour(data, controls, document.getElementById('tour-caption'));
const tourBtn = document.querySelector('[data-action="tour"]');
const syncTourBtn = () => {
  tourBtn.classList.toggle('on', tour.active);
  tourBtn.setAttribute('aria-pressed', String(tour.active));
  setText(tourBtn.querySelector('.lbl'), tour.active ? 'hud.stop' : 'hud.tour');
  tourBtn.querySelector('.ico').textContent = tour.active ? '■' : '▶';
};
syncTourBtn();
tour.onEnd = () => {
  document.body.classList.remove('touring');
  syncTourBtn();
  syncEnabled();
  announce(t('announce.tourStopped'), 'tour');
};
tour.onCaption = (text) => announce(text, 'tour');
function toggleTour() {
  if (tour.active) { tour.stop(); return; }
  viewer.close();
  ui.close();
  document.body.classList.add('touring');
  tour.start();
  syncTourBtn();
  syncEnabled();
}

const soundBtn = document.querySelector('[data-action="sound"]');
function toggleSound() {
  setSound(audio.muted);
}

function teleport(x, z, lookX, lookZ, pitch = 0) {
  if (tour.active) tour.stop();
  controls.resetZoom(true);
  controls.setPose(x, z, 0);
  controls.lookAt(lookX, lookZ);
  controls.setPose(x, z, controls.yaw, pitch);
}
function jumpToRoom(id) {
  const r = roomById(id);
  teleport(r.spawn.x, r.spawn.z, r.spawn.look.x, r.spawn.look.z);
  if (entered) announceRoom(id);
}
function gotoWork(w) {
  const f = w._focus;
  if (!f) return;
  if (!entered && worldReady) enter();
  if (tour.active) tour.stop();
  controls.resetZoom(true);
  poseAtWork(w);
}

document.getElementById('toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  const a = b.dataset.action;
  if (a === 'rooms') ui.toggleRooms();
  else if (a === 'tour') toggleTour();
  else if (a === 'sound') toggleSound();
});
// Navbar sections open as panels, on the title screen as well as in the exhibition.
for (const bar of ['site-nav', 'site-foot']) {
  document.getElementById(bar).addEventListener('click', (e) => {
    const b = e.target.closest('[data-nav]');
    if (!b) {
      // EN / HU opens nothing: a mouse click on it hands focus back to the view (boot.js
      // has already switched the language); a keyboard press leaves focus on the button.
      if (e.detail > 0 && e.target.closest('[data-lang]')) focusScene();
      return;
    }
    viewer.close();
    ui.show(b.dataset.nav);
  });
}
window.addEventListener('keydown', (e) => {
  if (!entered || viewer.isOpen() || ui.isOpen() || soundAsking()) return;
  // T, M (and E, W/A/S/D below and in controls.js) type a character, so they work only
  // while the 3D view has focus (WCAG 2.1.4). A click on the view, or Tab, gives it focus.
  const inView = document.activeElement === canvas;
  if (e.code === 'KeyT' && inView) toggleTour();
  else if (e.code === 'KeyM' && inView) toggleSound();
  else if (tour.active && ((LETTER_KEYS.has(e.code) && inView) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.code))) tour.stop();
});
// A mouse click on the toolbar hands focus back to the view afterwards, so the letter keys
// go on working (a keyboard press leaves focus on the button, where it was put).
// Opening the rooms menu leaves focus by it; closing it with the mouse, like any other
// mouse click on the toolbar, sends focus back to the view. (The listener that toggles the
// menu runs first, so aria-expanded already shows the new state.)
document.getElementById('toolbar').addEventListener('click', (e) => {
  if (e.detail > 0 && !e.target.closest('[data-action="rooms"][aria-expanded="true"]')) focusScene();
});
// Touching the joystick ends the tour on mobile; the wheel or an on-screen key on desktop
document.getElementById('joystick').addEventListener('touchstart', () => tour.stop(), { passive: true });
controls.onManualMove = () => tour.stop();
const updateKeypad = setupKeypad(document.getElementById('hud'), controls);

// Zoom readout: shows the magnification while zoomed in; click (or 0) to reset.
const zoomLevel = document.getElementById('zoom-level');
zoomLevel.addEventListener('click', () => {
  controls.resetZoom();
  focusScene(); // the readout hides itself on the next frame, so focus goes back to the view
});
document.getElementById('rooms-menu').addEventListener('click', (e) => { if (e.detail > 0) focusScene(); });
let shownZoom = 1;
function updateZoom() {
  const fov = baseFov / controls.zoom;
  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  const z = Math.round(controls.zoomTarget * 10) / 10;
  if (z !== shownZoom) {
    shownZoom = z;
    zoomLevel.hidden = z <= 1;
    zoomLevel.firstElementChild.textContent = `${z.toFixed(1)}×`;
  }
}

const minimapEl = document.getElementById('minimap');
const minimap = setupMinimap(minimapEl, arch.segments, data.works, (id) => jumpToRoom(id));
// The map can only be clicked and cannot take focus itself: a click on it hands focus back
// to the view, like the toolbar, so the letter keys go on working.
minimapEl.addEventListener('click', focusScene);

// ---------------------------------------------------------------- picking
const raycaster = new THREE.Raycaster();
raycaster.far = 7.5;
const ndc = new THREE.Vector2();
const tmpV2 = new THREE.Vector2();
const promptEl = document.getElementById('prompt');
const crosshair = document.getElementById('crosshair');
let hovered = null;
let mouseInside = false;
// Is the visitor walking by keyboard? Set by the walking and turning keys, cleared by the
// mouse, the wheel or a touch on the view. While it is set, the work in the middle of the
// view (the one Enter opens) is named on screen and to screen readers.
let keyNav = false;
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
window.addEventListener('keydown', (e) => { if (MOVE_KEYS.has(e.code) && (!LETTER_KEYS.has(e.code) || document.activeElement === canvas)) keyNav = true; });
for (const type of ['pointerdown', 'wheel']) canvas.addEventListener(type, () => { keyNav = false; }, { passive: true });
canvas.addEventListener('mousemove', (e) => {
  mouseInside = true;
  keyNav = false;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});
canvas.addEventListener('mouseleave', () => { mouseInside = false; });

function pick(x, y) {
  raycaster.far = 7.5 * controls.zoom; // zoomed in, works further away can be opened
  camera.updateMatrixWorld(); // the pose may have changed since the last frame was drawn (a jump to a work)
  raycaster.setFromCamera(tmpV2.set(x, y), camera);
  const hit = raycaster.intersectObjects(gallery.hitMeshes, false)[0];
  return hit ? hit.object.userData : null;
}
// The work (or text sheet) in the middle of the view, looked up a few times a second
// while walking by keyboard, and announced when it changes.
let front = null;
let frontAcc = 0;
function announceFront(target) {
  if (target === 'text') announce(t('announce.text'), 'work');
  else announce(t('announce.work', { no: target.no, title: target.title }), 'work');
}
function updateFront(dt) {
  frontAcc += dt;
  if (frontAcc < 0.2) return;
  frontAcc = 0;
  // While a panel, the viewer or the tour has the controls, the work in front stays what
  // it was: coming back to the same work is not a change and is not announced again.
  if (!controls.enabled && keyNav) return;
  const ud = keyNav ? pick(0, 0) : null;
  const target = (ud && (ud.work || ud.text)) || null;
  if (target === front) return;
  front = target;
  if (target) announceFront(target);
  else unannounce('work');
}
let hoveredByKey = false;
function updateHover() {
  let ud = null;
  let byKey = false;
  if (controls.enabled && !isTouch) {
    if (keyNav) byKey = true;
    else if (mouseInside) ud = pick(ndc.x, ndc.y);
  }
  const target = byKey ? front : ud && (ud.work || ud.text || null);
  if (target !== hovered || byKey !== hoveredByKey) {
    hovered = target;
    hoveredByKey = byKey;
    crosshair.classList.toggle('active', !!hovered);
    promptEl.classList.toggle('show', !!hovered);
    canvas.style.cursor = hovered && !byKey ? 'pointer' : '';
    if (hovered === 'text') setText(promptEl, byKey ? 'hud.promptTextKey' : 'hud.promptText');
    else if (hovered) setText(promptEl, byKey ? 'hud.promptWorkKey' : 'hud.promptWork', { no: hovered.no, title: hovered.title });
  }
}
function activate(ud) {
  if (!ud) return false;
  if (ud.work) { viewer.open(ud.work); return true; }
  if (ud.text) { ui.about(); return true; }
  return false;
}
controls.onTap = (x, y) => activate(pick((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1));
window.addEventListener('keydown', (e) => {
  if (!entered || viewer.isOpen() || ui.isOpen() || soundAsking()) return;
  // Enter on a focused button or link belongs to that control, not to the work in view.
  if (e.code === 'Enter' && e.target.closest?.('button, a, summary, video, iframe')) return;
  // preventDefault: opening moves focus to the dialog's Close button, and without it the
  // same Enter press would go on to click that button and shut the dialog again.
  if (e.code === 'KeyE' && document.activeElement !== canvas) return; // E is a character key: only in the 3D view
  if ((e.code === 'KeyE' || e.code === 'Enter') && activate(pick(0, 0))) e.preventDefault();
});
// During the tour (controls disabled) a click / tap opens the work in view
canvas.addEventListener('pointerup', (e) => {
  if (!tour.active) return;
  const ud = pick((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1) || pick(0, 0);
  if (ud && ud.work) viewer.open(ud.work);
});

// ---------------------------------------------------------------- rooms
const roomName = document.querySelector('#room-label .room-name');
const roomSub = document.querySelector('#room-label .room-sub');
let currentRoom = null;
let currentRoomId = 'r1';
function updateRoom() {
  const r = roomAt(controls.pos.x, controls.pos.y);
  const key = r ? r.id : null;
  if (key && key !== currentRoom) {
    const first = currentRoom === null;
    currentRoom = key;
    currentRoomId = r.id;
    setText(roomName, `rooms.${r.id}.name`);
    setText(roomSub, `rooms.${r.id}.subtitle`);
    if (!first && entered) announceRoom();
  }
}
let roomSaid = null;
function announceRoom(id = currentRoomId) {
  if (id === roomSaid) return; // already said for this entry (a jump announces it ahead of the frame that notices it)
  roomSaid = id;
  const r = data.rooms[id];
  announce(t('announce.room', { name: r.name, subtitle: r.subtitle.replaceAll(' · ', ', ') }), 'room');
}

// Page Down / Page Up: on to the next / back to the previous work in visiting order (the
// tour's order), with the same jump as "Walk to this work", and the work is announced.
// Counted from the work in front of you, else from the last one reached this way; from
// nowhere, Page Down starts at no. 1 and Page Up at the last work. Past either end it
// carries on round. Not character keys, so they clash with no typed shortcut (WCAG 2.1.4)
// and sit in the same place on every keyboard layout.
const visit = visitOrder(data.works);
let visitAt = -1;
function stepWork(d) {
  const here = front && front !== 'text' ? visit.indexOf(front) : -1;
  const base = here >= 0 ? here : visitAt;
  visitAt = base < 0 ? (d > 0 ? 0 : visit.length - 1) : (base + d + visit.length) % visit.length;
  const w = visit[visitAt];
  announceRoom(w.room);
  gotoWork(w);
  keyNav = true;
  front = w;
  announceFront(w);
  focusScene();
}
window.addEventListener('keydown', (e) => {
  if (e.code !== 'PageDown' && e.code !== 'PageUp') return;
  if (!entered || viewer.isOpen() || ui.isOpen() || soundAsking() || e.ctrlKey || e.metaKey || e.altKey) return;
  e.preventDefault();
  // One jump for each press. A held key repeats about thirty times a second, and cutting
  // from view to view that fast would flash (WCAG 2.3.1).
  if (e.repeat) return;
  stepWork(e.code === 'PageDown' ? 1 : -1);
});
// On coming in: the room, and the work a link brought you to.
function announceArrival() {
  announceRoom();
  if (!linkedWork) return;
  front = linkedWork;
  keyNav = true;
  visitAt = visit.indexOf(linkedWork);
  announceFront(linkedWork);
  linkedWork = null;
}

// ---------------------------------------------------------------- enter
// The walk starts without sound; a pop-up after entering offers to switch it on.
const soundAsk = document.getElementById('sound-ask');
// The sound question was opened by the Enter button, which is gone by the time it is
// answered, so focus goes on to the 3D view.
const soundDialog = focusDialog(soundAsk, { initial: () => soundAsk.querySelector('[data-sound="off"]'), fallback: () => canvas });
function setSound(on) {
  audio.setMuted(!on);
  soundBtn.classList.toggle('muted', !on);
  soundBtn.setAttribute('aria-pressed', String(on));
}
soundAsk.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sound]');
  if (!b && e.target !== soundAsk) return;
  setSound(b ? b.dataset.sound === 'on' : false);
  soundAsk.hidden = true;
  blockers.panel = false;
  syncEnabled();
  soundDialog.closed();
  announceArrival();
});
soundAsk.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') soundAsk.click();
});
function enter(ask = true) {
  entered = true;
  setSound(false);
  document.body.classList.add('entered');
  const loader = document.getElementById('loader');
  loader.classList.add('gone');
  loader.inert = true; // nothing on the title screen can be reached any more
  document.getElementById('hud').hidden = false;
  canvas.tabIndex = 0; // the 3D view takes keyboard focus once you are inside
  canvas.removeAttribute('aria-hidden');
  audio.start();
  audio.setMuted(true);
  // the videos' own sound, played from their screens
  if (audio.attachVideos(VIDEOS)) enableVideoSound();
  if (ask) {
    soundAsk.hidden = false;
    blockers.panel = true;
    soundDialog.opened();
  } else {
    focusScene();
    announceArrival();
  }
  syncEnabled();
}
enterBtn.addEventListener('click', () => enter());
// the "drag to look" hint goes once the visitor has looked around
controls.onLook = () => document.body.classList.add('looked');

// ---------------------------------------------------------------- resize
// Field of view before zoom (updateZoom divides it by the magnification).
let baseFov = 66;
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  baseFov = w < h ? 78 : isTouch ? 72 : 66;
  camera.fov = baseFov / controls.zoom;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  post.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- adaptive resolution
// Drop the pixel ratio if frames are slow for a while; raise it again when there's headroom.
let perfAcc = 0;
let perfFrames = 0;
function adapt(dt) {
  perfAcc += dt;
  perfFrames++;
  if (perfAcc < 2) return;
  const avg = perfAcc / perfFrames;
  perfAcc = 0;
  perfFrames = 0;
  const max = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  let next = dpr;
  if (avg > 1 / 45 && dpr > 0.75) next = Math.max(0.75, dpr - 0.25);
  else if (avg < 1 / 58 && dpr < max) next = Math.min(max, dpr + 0.125);
  if (next !== dpr) {
    dpr = next;
    renderer.setPixelRatio(dpr);
    resize();
  }
}

// ---------------------------------------------------------------- loop
const timer = new THREE.Timer();
timer.connect(document);
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  if (tour.active) tour.update(dt);
  controls.update(dt);
  updateZoom();
  updateRoom();
  audio.spotlight = tour.work;
  audio.update(controls.pos.x, controls.pos.y, controls.yaw, dt, t);
  for (const fn of props.anim) fn(t, dt);
  gallery.update(t, dt, camera, controls.zoom);
  letItFlow.update(t, lights.proj, camera.position);
  updateFront(dt);
  updateHover();
  if (entered) {
    minimap(controls.pos.x, controls.pos.y, controls.yaw, currentRoomId, t);
    updateKeypad();
  }
  post.update();
  post.render(dt);
  if (entered && !window.__apNoAdapt) adapt(dt);
}

// Compile shaders up-front so the first steps don't stutter, then reveal Enter.
renderer.compile(scene, camera);
renderer.setAnimationLoop(frame);
function markReady() {
  if (worldReady) return;
  worldReady = true;
  document.body.dataset.state = 'ready';
  progressLabel.classList.remove('error');
  progressBar.style.width = '100%';
  progressBar.parentElement.setAttribute('aria-valuenow', '100');
  setText(progressLabel, 'loader.ready');
  announce(t('loader.ready'), 'loader');
  enterBtn.disabled = false;
  // Enter gets focus when loading is done, unless the visitor has already tabbed
  // somewhere (to the skip link, the navbar, a panel): then focus stays where it is.
  if (document.activeElement === document.body || !document.activeElement) enterBtn.focus({ preventScroll: true });
}
manager.onLoad = markReady;
// Safety net: never block the Enter button for more than 12 s on a slow network.
setTimeout(markReady, 12000);

// ---------------------------------------------------------------- language
// Static markup is re-translated by i18n.js; here everything built from the data.
onLangChange(() => {
  localize(data);
  ui.refresh();
  viewer.refresh();
  tour.refresh();
  gallery.relabel();
  hovered = null;
  front = null;
});

// Debug handle for screenshots / tinkering in the console.
window.__ap = { scene, camera, controls, renderer, lights, jumpToRoom, gotoWork, ROOMS, ui, viewer, tour, post, audio, data, visit };
