// The Room 1 stairs, as modelled in Blender on 19 Nov 2026 (R1_stairs_detailed.glb, in the
// private folder artificial-paradise-photos/blender_model/stairs, with README_stairs.md),
// made light for the web:
//  - its 12 JPEG textures become KTX2 (Basis ETC1S, mipmaps, the settings of make_ktx2.mjs):
//    the near wall's own face (albedo and normal map) at 1024 px wide, all the others at 512,
//    aspect kept, each side rounded to a multiple of 4. Albedo is sRGB, normal maps linear in
//    Basis' normal-map mode. They are not flipped: GLTFLoader keeps glTF's UV convention
//    (flipY false), unlike the .webp/.ktx2 in public/tex that go through TextureLoader;
//  - geometry, names and extras stay as delivered (the code finds the materials by name),
//    in the repo's world frame, metres; then prune and meshopt compression.
// The build also writes models/r1-stairs.glb.gz (vite.config.js), as for the plant.
//   node scripts/make_stairs.mjs <source .glb> [public/models/r1-stairs.glb]
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization, KHRTextureBasisu } from '@gltf-transform/extensions';
import { meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';

const [src, out = 'public/models/r1-stairs.glb'] = process.argv.slice(2);
if (!src) throw new Error('usage: node scripts/make_stairs.mjs <source .glb> [output .glb]');

const WIDE = /^T_nearwall_face_/; // 1024 px wide; everything else 512
const mult4 = (v) => Math.max(4, Math.round(v / 4) * 4);

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization, KHRTextureBasisu])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);
const root = doc.getRoot();
doc.createExtension(KHRTextureBasisu).setRequired(true);

// which textures are normal maps, from the material slots
const normalMaps = new Set(root.listMaterials().map((m) => m.getNormalTexture()).filter(Boolean));

for (const tex of root.listTextures()) {
  const name = tex.getName();
  const normal = normalMaps.has(tex);
  const [w0, h0] = tex.getSize();
  const w = WIDE.test(name) ? 1024 : 512;
  const h = mult4((h0 * w) / w0);
  const decode = async (buf) => {
    const data = await sharp(buf).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
    return { width: w, height: h, data: new Uint8Array(data) };
  };
  const ktx2 = await encodeToKTX2(tex.getImage(), {
    imageDecoder: decode,
    generateMipmap: true,
    isUASTC: false,
    isNormalMap: normal,
    isPerceptual: !normal,
    isSetKTX2SRGBTransferFunc: !normal,
    qualityLevel: 230,
    compressionLevel: 4,
    needSupercompression: true,
  });
  tex.setImage(ktx2).setMimeType('image/ktx2');
  if (tex.getURI()) tex.setURI(tex.getURI().replace(/\.\w+$/, '.ktx2'));
  console.log(name, `${w0}x${h0} jpeg ->`, `${w}x${h} ktx2`, `${(ktx2.length / 1024).toFixed(0)} KB`);
}

await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(out, doc);
const tris = root.listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
console.log(`${out}: ${root.listMeshes().length} meshes, ${Math.round(tris)} triangles`);
