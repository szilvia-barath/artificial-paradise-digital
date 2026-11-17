import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Bake every plain (non-instanced) mesh into one merged mesh per material: a few
// hundred small meshes of furniture become a couple of dozen draw calls. Meshes are kept
// apart by `userData.status` as well (measured, inferred, invented), so a merged mesh never
// mixes statuses, for the planned "measured or guessed" view. The geometry is baked relative
// to `group`, which may stand anywhere. With `strict`, transparent meshes (their drawing
// order is sorted per mesh), meshes with several materials and meshes drawn in a set order
// are left alone; props.js keeps its old, looser rule.
export function mergeStatic(group, { strict = false } = {}) {
  group.updateMatrixWorld(true);
  const toGroup = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map(); // material -> status -> meshes
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    if (strict && (Array.isArray(o.material) || o.material.transparent || o.renderOrder !== 0 || !o.visible)) return;
    if (!byMat.has(o.material)) byMat.set(o.material, new Map());
    const byStatus = byMat.get(o.material);
    const status = o.userData.status;
    if (!byStatus.has(status)) byStatus.set(status, []);
    byStatus.get(status).push(o);
  });
  const buckets = [...byMat].flatMap(([mat, byStatus]) => [...byStatus].map(([status, meshes]) => ({ mat, status, meshes })));
  const m4 = new THREE.Matrix4();
  for (const { mat, status, meshes } of buckets) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
      geo.applyMatrix4(m4.multiplyMatrices(toGroup, m.matrixWorld));
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
      geo.morphAttributes = {};
      geo.clearGroups();
      return geo;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    for (const m of meshes) m.parent.remove(m);
    const mesh = new THREE.Mesh(merged, mat);
    if (status !== undefined) mesh.userData.status = status;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
}
