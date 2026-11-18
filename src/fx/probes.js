import { LightProbeGridWebGL } from 'three/examples/jsm/lighting/LightProbeGridWebGL.js';
import { ROOMS } from '../world/layout.js';

// Switch "probes" (src/fx/switches.js, off; docs/design/rendering-proposal.md, option 11).
// One grid of light probes over the four rooms, baked in the browser from the scene itself
// (its 7 lights and the surfaces they light, one bounce), in place of the hemisphere light,
// an invented sky fill shared by all four rooms. Nothing comes from outside the model: no
// downloaded HDR, no RoomEnvironment. Probes stand every 0.75 m across the plan and at four
// heights; the grid cannot be saved yet in three r186, so it is baked at every load, once the
// textures are in (a few seconds on a GPU, behind the title screen).
const SPACING = 0.75;
const LEVELS = [0.3, 1.1, 1.9, 2.6];

export function setupProbes(renderer, scene, lights) {
  const x0 = Math.min(...ROOMS.map((r) => r.x0));
  const x1 = Math.max(...ROOMS.map((r) => r.x1));
  const z0 = Math.min(...ROOMS.map((r) => r.z0));
  const z1 = Math.max(...ROOMS.map((r) => r.z1));
  const nx = Math.round((x1 - x0) / SPACING) + 1;
  const nz = Math.round((z1 - z0) / SPACING) + 1;
  const y0 = LEVELS[0];
  const y1 = LEVELS[LEVELS.length - 1];
  const grid = new LightProbeGridWebGL(x1 - x0, y1 - y0, z1 - z0, nx, LEVELS.length, nz);
  grid.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  grid.name = 'probe-grid';

  let baked = false;
  const bake = () => {
    if (baked) return;
    baked = true;
    const t0 = performance.now();
    lights.hemi.visible = false;
    scene.add(grid);
    grid.bake(renderer, scene, { cubemapSize: 8, near: 0.05, far: 30, bounces: 1 });
    grid.userData.bakeMs = Math.round(performance.now() - t0);
    console.info(`Light probes: ${nx} x ${LEVELS.length} x ${nz} baked in ${grid.userData.bakeMs} ms`);
  };
  // bake once everything has loaded (the title screen says "Ready")
  const wait = () => (document.body.dataset.state === 'ready' ? bake() : setTimeout(wait, 250));
  wait();
  return grid;
}
