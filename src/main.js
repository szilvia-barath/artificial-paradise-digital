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
import { VIDEOS, enableVideoSound, scheduleByRoom, videoState, BY_ROOM } from './world/video.js';
import { applyPlanAO } from './world/ao.js';
import { createPost } from './fx/post.js';
import { MAX_DPR, pixelCapFor, baseFovFor } from './fx/resolution.js';
import { isOn } from './fx/switches.js';
import { Ambience } from './audio/ambience.js';
import { FirstPersonControls, LETTER_KEYS } from './controls.js';
import { Tour } from './tour.js';
import { setupPanels } from './ui/panels.js';
import { setupViewer } from './ui/viewer.js';
import { setupMinimap } from './ui/minimap.js';
import { setupKeypad } from './ui/keypad.js';
import { focusDialog, BEHIND } from './ui/dialog.js';
import { localize, onLangChange, setLang, setText, t, titleLang } from './i18n.js';
import { announce, unannounce, setForeign } from './ui/announce.js';
import { reducedMotion, onMotionChange } from './motion.js';
import { isTouch, lowPower } from './device.js';

localize(data);
// The live region marks the English work titles on the Hungarian page, in every message
// (the work in front, a room's subtitle, the tour, the viewer's Previous and Next).
const markTitles = () => setForeign(data.works.filter(titleLang).map((w) => ({ text: w.title, lang: titleLang(w) })));
markTitles();

// isTouch (device.js): a phone or a tablet, a touch screen with no mouse or trackpad. A laptop
// with a touch screen is a computer here (D10): it keeps the keycaps, the footer, the mouse
// and the computer's words, picture quality and field of view, and touch works on it as well.
// lowPower (device.js) is a phone or tablet, or a device reporting 4 threads or fewer.
document.body.classList.toggle('touch', isTouch);
// On a phone or tablet the sound question names the Sound button at the bottom, not the M key,
// and the hint inside says how to move by touch (the desktop words stay as they are).
// That hint is hidden from screen readers there: with VoiceOver or TalkBack on, a drag moves
// the screen reader's focus and does not look round, so its gestures are not theirs.
if (isTouch) {
  setText(document.getElementById('sound-ask-hint'), 'soundAsk.hintTouch');
  setText(document.getElementById('click-to-look'), 'hud.touchHint');
  document.getElementById('click-to-look').setAttribute('aria-hidden', 'true');
}

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false, // MSAA happens in the composer (desktop), cheaper than a full AA backbuffer
  powerPreference: 'high-performance',
  stencil: false,
  depth: false,
});
// Full resolution up to 2x on desktop (MAX_DPR, src/fx/resolution.js); adapt() steps it down
// if frames get slow. `dpr` is the pixel ratio wanted (the screen's, then adapt()'s); the one
// drawn is capped so the drawing buffer never holds more than MAX_PIXELS (about 1920 x 1080).
// A 1440 x 900 laptop at 2x would otherwise draw 5.2 million pixels, and the post-processing
// buffers grow with them (docs/design/rendering-proposal.md, option 1). Only sharpness
// changes, nothing in the rooms.
let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
const pixelCap = () => pixelCapFor(window.innerWidth, window.innerHeight);
const drawnRatio = () => Math.min(dpr, pixelCap());
renderer.setPixelRatio(drawnRatio());
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
  // Late files after the 12 s safety net must not overwrite "Ready", and after a
  // start-up failure (boot.js) they must not overwrite the failure line.
  if (worldReady || document.body.dataset.state === 'failed') return;
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
// switch, off (src/fx/switches.js); loaded only when on, so the bundle does not grow
if (isOn('probes')) import('./fx/probes.js').then(({ setupProbes }) => setupProbes(renderer, scene, lights));
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
// A link to a work (?work=<id>, as the accessible version's "Open No. …" links carry): the
// visitor goes straight to that work, never to the title card. The 3D view stands at the
// work, the sound question opens over it at once (the files go on loading behind it), and
// once it is answered the work opens in the viewer. With ?sound=off, which the accessible
// version hands on when the visitor had come from inside without sound, there is no question.
// The title card is hidden before the first paint by index.html (html.direct); an unknown id
// brings it back and the walk opens at the foot of the stairs as before.
// (#work=<id> as well: the accessible version's link when it found this tab open but the tab
// has since gone, so the browser opened a new one with that address.)
const linkParams = new URLSearchParams(location.search);
const hashParams = new URLSearchParams(location.hash.slice(1));
const linkedId = linkParams.get('work') || hashParams.get('work');
if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
let linkedWork = (linkedId && data.works.find((w) => w.id === linkedId && w._focus)) || null;
const linkedSoundOff = linkParams.get('sound') === 'off';
if (linkedWork) poseAtWork(linkedWork);
else document.documentElement.classList.remove('direct');

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
  controls.tapOnly = tour.active; // a tap during the tour goes through controls.onTap, as outside it
  controls.zoomEnabled = entered && !blockers.panel && !blockers.viewer;
  document.body.classList.toggle('overlay', blockers.panel || blockers.viewer);
};

// Where keyboard focus goes when a dialog closes and the control that opened it is gone:
// the 3D view once inside, the Enter button on the title screen.
// A dialog closed with the mouse goes to the 3D view only once inside; on the title screen
// it goes back to its opener like a keyboard close.
const focusFallback = (why) => (entered ? canvas : why === 'mouse' || enterBtn.disabled ? null : enterBtn);
// Never while the sound question, a panel or the viewer is open: they are modal dialogs
// and keep focus (a mouse click on EN / HU over one leaves focus in it).
const focusScene = () => {
  if (entered && document.getElementById('sound-ask').hidden && !ui.isOpen() && !viewer.isOpen()) canvas.focus({ preventScroll: true });
};
const soundAsking = () => !document.getElementById('sound-ask').hidden;

const ui = setupPanels(data, {
  // A work opened from the works list: focus goes from the list straight into the viewer,
  // and closing the viewer reopens the list with focus on the work last shown. The list
  // keeps the control that first opened it, for Esc there.
  onOpenWork: (w) => {
    const opener = ui.opener();
    ui.close({ refocus: false });
    viewer.open(w, { opener, back: (last) => ui.works({ opener, work: last }) });
  },
  // a panel stops the tour, as the viewer does: its captions are not read over the panel
  onOpenPanel: () => { blockers.panel = true; if (tour.active) tour.stop(); syncEnabled(); },
  // walking stays locked while the sound question is still open (it holds blockers.panel too)
  onClosePanel: () => { blockers.panel = soundAsking(); syncEnabled(); },
  // a work's link on the Concept page: the panel has closed; go to the work, focus on the 3D view
  onGotoWork: (w) => { gotoWork(w); focusScene(); },
  onJumpRoom: (id) => jumpToRoom(id),
  inside: () => entered,
  isTouch,
  focusFallback,
});

const viewer = setupViewer(data, {
  onOpen: () => { blockers.viewer = true; if (tour.active) tour.stop(); syncEnabled(); },
  onClose: () => { blockers.viewer = false; audio.setFocus(1); syncEnabled(); },
  onGoto: (w) => { gotoWork(w); focusScene(); },
  focusFallback,
  connections: (w) => ui.connections(w),
  // a theme in the viewer's Connections line: the viewer closes (focus goes back to what
  // opened it, which then counts as the panel's opener) and the Concept page opens there
  onTheme: (id) => { viewer.close(); ui.show('concept', { theme: id }); },
  // the viewer plays a video's sound itself, so the walk's mix steps aside
  onMedia: (isVideo) => audio.setFocus(isVideo ? 0 : 0.4),
  isMuted: () => audio.muted,
});

// Guided tour: the works in catalogue order, routed through the doorways. It starts at the
// first work; there is no opening stop with a line of its own.
function buildTourStops() {
  const stops = [];
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
  // the name stays "Tour" and aria-pressed carries the state; only the hidden glyph changes
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
  retireHint();
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
  retireHint();
  controls.resetZoom(true);
  controls.setPose(x, z, 0);
  controls.lookAt(lookX, lookZ);
  controls.setPose(x, z, controls.yaw, pitch);
  minimap.pulse(); // the map's dot swells for a moment after a jump
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
  retireHint();
  controls.resetZoom(true);
  poseAtWork(w);
  minimap.pulse();
}

document.getElementById('toolbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  const a = b.dataset.action;
  if (a === 'tour') toggleTour();
  else if (a === 'sound') toggleSound();
  // Next work: the same jump as Page Down. Focus stays on the button (a mouse click or a tap
  // then hands it to the view, below), so pressed again it goes on to the next work. Only
  // after a mouse click does Enter open the work: from the keyboard Enter presses the button
  // again, and a phone has no Enter key, so there the work is said without "Press Enter"
  // (a laptop with a touch screen has one: there a tap on the button counts as a click).
  else if (a === 'next') stepWork(1, { focus: false, enter: e.detail > 0 && !isTouch });
  // Previous work: the same jump as Page Up, in the same way
  else if (a === 'prev') stepWork(-1, { focus: false, enter: e.detail > 0 && !isTouch });
});
// One jump for each press, as with Page Down: a held Enter repeats, and its repeats would click
// the button again and cut from view to view that fast (WCAG 2.3.1).
for (const b of document.querySelectorAll('[data-action="next"], [data-action="prev"]')) b.addEventListener('keydown', (e) => {
  if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
});
// Navbar sections open as panels, on the title screen as well as in the exhibition.
// Not while the sound question is open: it lies over the navbar and footer, and a click
// that reaches them anyway (a screen reader's, say) opens nothing.
for (const bar of ['site-nav', 'site-foot']) {
  const el = document.getElementById(bar);
  el.addEventListener('click', (e) => {
    if (soundAsking()) return;
    const b = e.target.closest('[data-nav]');
    if (!b) {
      // EN / HU opens nothing: a mouse click on it hands focus back to the view (boot.js
      // has already switched the language); a keyboard press leaves focus on the button.
      // The same for a link that opens a new tab or leaves the page (Instagram, the MAMŰ
      // logo, the accessible version): coming back, the letter keys work at once.
      if (e.detail > 0 && e.target.closest('[data-lang], a[href]')) focusScene();
      return;
    }
    viewer.close();
    ui.show(b.dataset.nav);
  });
  // a link opened in a new tab with the middle button
  el.addEventListener('auxclick', (e) => { if (e.target.closest('a[href]')) focusScene(); });
  // A mouse press on EN / HU while a panel or the viewer is open does not take focus out of
  // the dialog: focus stays on the control in it that had it (the language switch then
  // rebuilds the dialog's text; if that took the control, focus goes to its Close button).
  el.addEventListener('mousedown', (e) => {
    if (e.target.closest('[data-lang]') && (ui.isOpen() || viewer.isOpen())) e.preventDefault();
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
  if (e.detail > 0) focusScene();
});
// Touching the joystick ends the tour on mobile; the wheel or an on-screen key on desktop
document.getElementById('joystick').addEventListener('touchstart', () => { tour.stop(); retireHintInRoom(); }, { passive: true });
// On a touch screen the hint goes at the first touch on the 3D view or the stick, once the
// visitor is in the room (a touch that answers the sound question does not count).
const retireHintInRoom = () => { if (document.body.classList.contains('in-room')) retireHint(); };
canvas.addEventListener('touchstart', retireHintInRoom, { passive: true });
controls.onManualMove = () => { retireHint(); tour.stop(); };
// The toolbar's height, for what is placed just above it (the tour caption).
const toolbarEl = document.getElementById('toolbar');
if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    if (toolbarEl.offsetHeight) document.documentElement.style.setProperty('--bar-h', `${toolbarEl.offsetHeight}px`);
  }).observe(toolbarEl);
}
// Pinch-zoom of the page (a panel or the viewer enlarged with two fingers): while the page
// is zoomed in, the 3D view lets touches through to the browser, so the visitor can pan and
// zoom back out; at scale 1 the view takes its gestures back (style.css, controls.js).
if (window.visualViewport) {
  const syncPageZoom = () => document.body.classList.toggle('page-zoomed', window.visualViewport.scale > 1.01);
  window.visualViewport.addEventListener('resize', syncPageZoom);
  syncPageZoom();
}
const updateKeypad = setupKeypad(document.getElementById('hud'), controls);

// Zoom readout: shows the magnification while zoomed in; click (or 0) to reset.
const zoomLevel = document.getElementById('zoom-level');
zoomLevel.addEventListener('click', () => {
  controls.resetZoom();
  focusScene(); // the readout hides itself on the next frame, so focus goes back to the view
});
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
    zoomLevel.querySelector('.val').textContent = `${z.toFixed(1)}×`;
  }
}

const minimapEl = document.getElementById('minimap');
const minimap = setupMinimap(minimapEl, arch.segments, data.works, (id) => jumpToRoom(id));
// The map's name says where you are, at each change of room and of language.
const nameMap = () => minimapEl.setAttribute('aria-label', t('hud.minimapHere', { room: data.rooms[currentRoomId].name }));
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
window.addEventListener('keydown', (e) => {
  if (!MOVE_KEYS.has(e.code) || (LETTER_KEYS.has(e.code) && document.activeElement !== canvas)) return;
  keyNav = true;
  if (controls.enabled) retireHint();
});
for (const type of ['pointerdown', 'wheel']) canvas.addEventListener(type, () => { keyNav = false; }, { passive: true });
// The aim under the mouse follows the mouse (or a pen), not a finger: on a laptop with a touch
// screen a touch on the view ends it until the mouse moves again, since a finger leaves no
// cursor behind. Pointer events say which it was; the mouse events a browser sends after a
// tap do not (D10).
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') mouseInside = false; }, { passive: true });
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
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
function announceFront(target, enter = true) {
  if (target === 'text') announce(t('announce.text'), 'work');
  else announce(t(enter ? 'announce.work' : 'announce.workNext', { no: target.no, title: target.title }), 'work');
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
controls.onTap = (x, y) => {
  const ud = pick((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  // During the tour a tap opens the work under the finger, or else the work in view (as the
  // pointerup below does for the mouse). True tells controls.js to cancel the touchend, so
  // the browser sends no mouse click after the tap onto the viewer that has just opened.
  if (tour.active) {
    const w = (ud || pick(0, 0))?.work;
    if (w) viewer.open(w);
    return !!w;
  }
  return activate(ud);
};
window.addEventListener('keydown', (e) => {
  if (!entered || viewer.isOpen() || ui.isOpen() || soundAsking()) return;
  // Enter on a focused button or link belongs to that control, not to the work in view.
  if (e.code === 'Enter' && e.target.closest?.('button, a, summary, video, iframe')) return;
  // preventDefault: opening moves focus to the dialog's Close button, and without it the
  // same Enter press would go on to click that button and shut the dialog again.
  if (e.code === 'KeyE' && document.activeElement !== canvas) return; // E is a character key: only in the 3D view
  if ((e.code === 'KeyE' || e.code === 'Enter') && activate(pick(0, 0))) e.preventDefault();
});
// During the tour (controls disabled) a click opens the work in view. A finger's tap goes
// through controls.onTap above: opened from here, the browser's mouse click after the tap
// landed on the viewer under the finger (on a button or a link in it, or beside the picture,
// which closes it again).
canvas.addEventListener('pointerup', (e) => {
  if (!tour.active || e.pointerType === 'touch') return;
  const ud = pick((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1) || pick(0, 0);
  if (ud && ud.work) viewer.open(ud.work);
});

// ---------------------------------------------------------------- rooms
const roomName = document.querySelector('#room-label .room-name');
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
    nameMap();
    ui.setRoom(r.id); // the rooms menu marks it (aria-current)
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
// focus false: from the toolbar's Next work button, where focus stays. enter false: Enter
// would not open the work, so the message leaves out "Press Enter to open".
function stepWork(d, { focus = true, enter = true } = {}) {
  const here = front && front !== 'text' ? visit.indexOf(front) : -1;
  const base = here >= 0 ? here : visitAt;
  visitAt = base < 0 ? (d > 0 ? 0 : visit.length - 1) : (base + d + visit.length) % visit.length;
  const w = visit[visitAt];
  retireHint();
  announceRoom(w.room);
  gotoWork(w);
  keyNav = true;
  front = w;
  announceFront(w, enter);
  if (focus) focusScene();
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
// On coming in: the room; or, from a link to a work, that work opened in the viewer. Its
// title names the viewer, and Close (or Esc) leaves focus on the 3D view in front of it, from
// where Page Down and Page Up go on. The room is not said over the viewer (the viewer says it).
function announceArrival() {
  if (!linkedWork) { announceRoom(); return; }
  const w = linkedWork;
  linkedWork = null;
  roomSaid = w.room;
  front = w;
  keyNav = true;
  visitAt = visit.indexOf(w);
  viewer.open(w);
}

// ---------------------------------------------------------------- enter
// The walk starts without sound; a pop-up after entering offers to switch it on.
const soundAsk = document.getElementById('sound-ask');
// The sound question was opened by the Enter button, which is gone by the time it is
// answered, so focus goes on to the 3D view. While it is open the navbar is inert as well,
// unlike behind a panel or the viewer: it lies under the question and does nothing then.
const soundDialog = focusDialog(soundAsk, { initial: () => soundAsk.querySelector('[data-sound="off"]'), fallback: () => canvas, behind: [...BEHIND, '#site-nav'] });
function setSound(on) {
  // switched on by the visitor's own click or key: the sound may start (from a link to a work
  // the mix was set up before any click, so the browser holds it until now)
  if (on) audio.start();
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
  startHintTimer();
  showGuide();
  announceArrival();
});
soundAsk.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') soundAsk.click();
});
// "Without sound" has focus from the opening, given by the page, so the browser shows the
// keyboard frame (:focus-visible) on it, and carries the frame on to the 3D view when the
// click hands focus there. A mouse press on the button that has focus lets go of it first,
// as controls.js does, so the press focuses it again as a mouse focus and no frame follows.
// A press anywhere else on the question (the backdrop, which answers "without sound", or the
// card's text) focuses the question itself, which has tabindex -1 for that, as a mouse focus.
soundAsk.addEventListener('mousedown', (e) => {
  const b = e.target.closest('[data-sound]');
  if (!b || e.button !== 0 || document.activeElement !== b) return;
  b.blur();
  // Safari, and Firefox on macOS, do not focus a button on a press. If no click follows
  // (the press dragged off the button) and focus is outside the question that is still
  // open, it goes back to the button. After a click the question is closed by then.
  window.addEventListener('mouseup', () => setTimeout(() => {
    if (soundAsking() && !soundAsk.contains(document.activeElement)) b.focus({ preventScroll: true });
  }), { once: true, capture: true });
});
function enter(ask = true) {
  entered = true;
  sayHere();
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
    // No opener: whatever has focus when enter() runs (Enter, or after "Walk to this work"
    // on the title screen the Works button or the Menu button the viewer closed onto) is
    // not where focus goes once the question is answered. It goes on to the 3D view.
    soundDialog.opened({ opener: null });
  } else {
    focusScene();
    startHintTimer();
    showGuide();
    announceArrival();
  }
  syncEnabled();
}
enterBtn.addEventListener('click', () => enter());
// The links to the accessible version: from inside, with the sound off, they carry ?sound=off,
// and its links to a work hand it back, so coming back to a work does not ask again. Nothing is
// stored; the choice travels in the address only. With the sound on, the question has to come
// again (a browser starts sound only after a click or key on the page itself).
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[data-i18n-attr~="href:textEdition.href"]');
  if (!a) return;
  const u = new URL(a.getAttribute('href'), location.href);
  if (entered && audio.muted) u.searchParams.set('sound', 'off');
  else u.searchParams.delete('sound');
  a.setAttribute('href', u.pathname + u.search + u.hash);
}, true);
// The "drag to look" hint goes at the first look or move of any kind: a drag, a walking or
// turning key, the wheel, an on-screen key, Page Down or Page Up, the tour, and on a touch
// screen the first touch on the 3D view or the stick. Left alone, it goes about 8 seconds
// after the visitor is in the room (the sound question answered). Nothing is stored: it
// shows again on the next visit.
const HINT_SECONDS = 8;
let hintTimer = 0;
function retireHint() {
  clearTimeout(hintTimer);
  document.body.classList.add('looked');
}
const startHintTimer = () => {
  hintTimer = setTimeout(retireHint, HINT_SECONDS * 1000);
  // the visitor is in the room: the little mouse by the keys rolls its wheel three times
  document.body.classList.add('in-room');
};
controls.onLook = retireHint;

// The short help (a computer): on the left, by the keys, once the visitor is in the room; it
// hides itself after 10 seconds. It takes the place of the hint in the middle, which says the
// same, so that one does not show with it and goes with it. Not on a touch screen (CSS).
// Nothing is stored: it shows again on the next visit.
const guide = document.getElementById('guide');
const GUIDE_SECONDS = 10;
let guideTimer = 0;
function showGuide() {
  if (isTouch) return;
  guide.hidden = false;
  // In a narrow or short window (a computer's window at phone size, or a laptop at 400%) the
  // card can lie over the map, its key or the room label, or above the top of the window: then
  // it is not shown, and the hint in the middle stays as it was.
  if (!guideFits()) { guide.hidden = true; return; }
  document.body.classList.add('guiding');
  clearTimeout(guideTimer);
  guideTimer = setTimeout(hideGuide, GUIDE_SECONDS * 1000);
}
function guideFits() {
  // not laid out at all (the compact control layer of a very small window hides it, E2): it
  // does not fit, rather than an empty box at 0,0 that seems to
  if (!guide.getClientRects().length) return false;
  const g = guide.getBoundingClientRect();
  if (g.top < 0 || g.left < 0 || g.right > window.innerWidth || g.bottom > window.innerHeight) return false;
  return ['minimap', 'map-key', 'room-label'].every((id) => {
    const e = document.getElementById(id);
    if (!e || !e.getClientRects().length) return true;
    const r = e.getBoundingClientRect();
    return g.bottom <= r.top || r.bottom <= g.top || g.right <= r.left || r.right <= g.left;
  });
}
function hideGuide() {
  if (guide.hidden) return;
  guide.hidden = true;
  document.body.classList.remove('guiding');
  retireHint();
}

// ---------------------------------------------------------------- resize
// Field of view before zoom (updateZoom divides it by the magnification).
let baseFov = 66;
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  baseFov = baseFovFor(w, h);
  camera.fov = baseFov / controls.zoom;
  camera.updateProjectionMatrix();
  const ratio = drawnRatio();
  if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  post.setSize(w, h, ratio);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- adaptive resolution
// Drop the pixel ratio if frames are slow for a while; raise it again when there's headroom.
// Every change reallocates the post-processing buffers, so it may change at most once in 4 s,
// it rises only after two fast spells in a row, and not within 10 s of a step down (so it does
// not see-saw between two ratios). Under the pixel cap a rise that would draw no more pixels
// is not made.
let perfAcc = 0;
let perfFrames = 0;
let adaptClock = 0;
let lastChange = -Infinity;
let lastDown = -Infinity;
let fastSpells = 0;
function adapt(dt) {
  adaptClock += dt;
  perfAcc += dt;
  perfFrames++;
  if (perfAcc < 2) return;
  const avg = perfAcc / perfFrames;
  perfAcc = 0;
  perfFrames = 0;
  const max = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const slow = avg > 1 / 45;
  fastSpells = avg < 1 / 58 ? fastSpells + 1 : 0;
  if (adaptClock - lastChange < 4) return;
  const cur = drawnRatio();
  let next = dpr;
  if (slow && cur > 0.75) next = Math.max(0.75, cur - 0.25);
  else if (fastSpells >= 2 && dpr < max && cur < pixelCap() && adaptClock - lastDown >= 10) next = Math.min(max, dpr + 0.125);
  if (next !== dpr) {
    if (next < dpr) lastDown = adaptClock;
    dpr = next;
    lastChange = adaptClock;
    fastSpells = 0;
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
  scheduleByRoom(controls.pos.x, controls.pos.y); // phones and low-power devices only
  gallery.update(t, dt, camera, controls.zoom);
  letItFlow.update(t, lights.proj, camera.position);
  updateFront(dt);
  updateHover();
  if (entered) {
    minimap(controls.pos.x, controls.pos.y, controls.yaw, currentRoomId);
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
  // after a start-up failure (boot.js) the title screen keeps saying so: no "Ready"
  if (worldReady || document.body.dataset.state === 'failed') return;
  worldReady = true;
  document.body.dataset.state = 'ready';
  progressLabel.classList.remove('error');
  progressBar.style.width = '100%';
  progressBar.parentElement.setAttribute('aria-valuenow', '100');
  setText(progressLabel, 'loader.ready');
  enterBtn.disabled = false;
  // Arrived from a link to a work: already inside, the title card was never shown.
  if (entered) return;
  announce(t('loader.ready'), 'loader');
  // Enter gets focus when loading is done, unless the visitor has already tabbed
  // somewhere (to the skip link, the navbar, a panel): then focus stays where it is.
  if (document.activeElement === document.body || !document.activeElement) {
    enterBtn.focus({ preventScroll: true });
    showEnter();
  }
}
// In a short window (200% zoom) Enter, or the lines under it, can be below the fold or
// under the footer when Enter takes focus. The title card's own scroller (#loader, never
// the page) is then set, in one step and with no animation, so that the card's last line
// (the link to the accessible version) stands 12 px above the footer. Where the window is
// too short for that, the scroll stops where Enter would leave the navbar's edge (12 px
// under it), so Enter itself always stays in view.
function showEnter() {
  const loader = document.getElementById('loader');
  const top = document.getElementById('site-nav').offsetHeight + 12;
  const bottom = window.innerHeight - document.getElementById('site-foot').offsetHeight - 12;
  const shown = [...document.querySelectorAll('.loader-card > *')].filter((el) => el.getClientRects().length);
  const last = shown[shown.length - 1] || enterBtn;
  const r = enterBtn.getBoundingClientRect();
  const lastBottom = Math.max(r.bottom, last.getBoundingClientRect().bottom);
  if (lastBottom > bottom) loader.scrollTop += Math.max(0, Math.min(lastBottom - bottom, r.top - top));
}
manager.onLoad = markReady;
// Safety net: never block the Enter button for more than 12 s on a slow network.
setTimeout(markReady, 12000);
// ---------------------------------------------------------------- the accessible version's tab
// The exhibition's links to the accessible version open it in a tab of its own (target
// "ap-text"). This tab is named "ap-exhibition" and says on a BroadcastChannel that it is open
// (its address, whether the visitor is inside); the accessible version then points its links
// to a work at this tab, with the work in the address's fragment (#work=<id>&lang=…), so that
// following one is a same-document navigation here: no reload, the place, the sound and the
// language kept, the browser brings this tab to the front. Same-origin messages only; nothing
// is stored. Without this tab, or without BroadcastChannel, those links load the exhibition at
// the work as before.
window.name = 'ap-exhibition';
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('ap-exhibition') : null;
// (after pagehide this tab is going: it no longer answers, not even a question asked meanwhile)
let leaving = false;
const sayHere = () => { if (!leaving) channel?.postMessage({ type: 'here', href: location.href.split('#')[0], entered }); };
if (channel) {
  channel.onmessage = (e) => { if (e.data?.type === 'who') sayHere(); };
  addEventListener('pagehide', () => { leaving = true; channel.postMessage({ type: 'gone' }); });
  addEventListener('pageshow', (e) => { if (e.persisted) { leaving = false; sayHere(); } });
  sayHere();
}
// #work=<id>: go to that work here. Inside, whatever is open closes and the work opens in the
// viewer, focus on its Close button (the sound stays as the visitor set it). Not inside yet:
// straight in at the work, as from a link to a work (the sound question over it, then the
// viewer). #exhibition (the accessible version's "Go to the digital exhibition"): this tab only
// comes to the front; on the title card focus goes to Enter once it is ready. The fragment is
// taken off again, so the same link works a second time.
function fromHash() {
  if (!location.hash) return;
  const h = new URLSearchParams(location.hash.slice(1));
  history.replaceState(history.state, '', location.pathname + location.search);
  const l = h.get('lang');
  if (l === 'en' || l === 'hu') setLang(l);
  const w = data.works.find((x) => x.id === h.get('work') && x._focus);
  if (!w) {
    if (!entered) {
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      if (worldReady) enterBtn.focus({ preventScroll: true });
    }
    sayHere();
    return;
  }
  if (!entered) {
    document.documentElement.classList.add('direct');
    linkedWork = w;
    poseAtWork(w);
    enter();
  } else if (soundAsking()) {
    // the sound question is still open: answering it opens this work
    linkedWork = w;
    poseAtWork(w);
  } else {
    if (tour.active) tour.stop();
    ui.close({ refocus: false });
    viewer.close();
    gotoWork(w);
    roomSaid = w.room;
    front = w;
    keyNav = true;
    visitAt = visit.indexOf(w);
    viewer.open(w, { opener: canvas });
  }
  sayHere();
}
addEventListener('hashchange', fromHash);

// From a link to a work: straight in, at the work (see linkedWork above).
if (linkedWork) enter(!linkedSoundOff);

// ---------------------------------------------------------------- language
// Static markup is re-translated by i18n.js; here everything built from the data.
onLangChange(() => {
  sayHere();
  localize(data);
  markTitles();
  nameMap();
  ui.refresh();
  viewer.refresh();
  tour.refresh();
  gallery.relabel();
  hovered = null;
  front = null;
});

// Debug handle for screenshots / tinkering in the console.
window.__ap = { scene, camera, controls, renderer, lights, jumpToRoom, gotoWork, ROOMS, ui, viewer, tour, post, audio, data, visit, minimap, videoState, videosByRoom: BY_ROOM, lowPower };
