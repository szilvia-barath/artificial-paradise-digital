import * as THREE from 'three';
import sceneMap from '../data/paradata-scene.json';

// The parts of the scene the paradata view tells apart (src/data/paradata-scene.json). An
// object names its part with userData.paradata; the merged meshes of the architecture and the
// furniture carry it per vertex instead, as the attribute `pdel` (the part's index), so merging
// keeps its few draw calls.
export const PD_ELEMENTS = sceneMap.elements;
const INDEX = new Map(PD_ELEMENTS.map((e, i) => [e.id, i]));

export function pdIndex(id) {
  const i = INDEX.get(id);
  if (i === undefined) throw new Error(`paradata: no part named ${id} in paradata-scene.json`);
  return i;
}

// Gives every vertex of a geometry the index of its part.
export function tagGeometry(geo, id) {
  const i = pdIndex(id);
  geo.setAttribute('pdel', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(i), 1));
  return geo;
}

// The part an object belongs to: its own tag or its nearest tagged parent's.
export function pdOf(o) {
  for (let p = o; p; p = p.parent) if (p.userData && p.userData.paradata) return p.userData.paradata;
  return null;
}
