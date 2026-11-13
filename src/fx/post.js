import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  NoiseEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  ToneMappingEffect,
  ToneMappingMode,
  FXAAEffect,
  BlendFunction,
} from 'postprocessing';

// Post chain: bloom + neutral tone mapping (Khronos PBR Neutral keeps the artworks'
// colours true, where ACES shifts hues) + vignette + light film grain, then FXAA on
// low-power devices (no MSAA there) and chromatic aberration, each in its own pass since
// they sample at offset UVs.
// There was a glitch pulse here (blocky band displacement and a colour tear, fired on a
// room change or a jump). It was removed for everyone on 14 November 2026: measured, it
// could flash more than three times a second (WCAG 2.3.1); see PROGRESS.md.

export function createPost(renderer, scene, camera, { lowPower }) {
  renderer.toneMapping = THREE.NoToneMapping;
  // Read by the tone-mapping effect: Neutral is linear in the mid-tones where ACES (as
  // tuned before) brightened them, so lift the exposure to keep the rooms as bright.
  renderer.toneMappingExposure = 1.35;
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: lowPower ? 0 : Math.min(4, renderer.capabilities.maxSamples),
  });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 0.92,
    luminanceSmoothing: 0.2,
    intensity: 0.85,
    radius: 0.72,
  });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL });
  const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.62 });
  const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN });
  noise.blendMode.opacity.value = 0.12;
  composer.addPass(new EffectPass(camera, bloom, tone, vignette, noise));
  if (lowPower) composer.addPass(new EffectPass(camera, new FXAAEffect()));

  const ca = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.00035, 0.00025),
    radialModulation: true,
    modulationOffset: 0.25,
  });
  composer.addPass(new EffectPass(camera, ca));

  let calm = false;
  const baseCA = new THREE.Vector2(0.00035, 0.00025);
  return {
    composer,
    bloom,
    // Reduced motion: no grain, no chromatic aberration. Bloom, tone mapping and the
    // vignette do not move and stay.
    setCalm(on) {
      calm = !!on;
      noise.blendMode.opacity.value = calm ? 0 : 0.12;
      if (calm) ca.offset.set(0, 0);
    },
    get calm() {
      return calm;
    },
    // for the checks: what the effects are doing right now
    state() {
      return { calm, grain: noise.blendMode.opacity.value, aberration: [ca.offset.x, ca.offset.y] };
    },
    // The aberration is a fixed offset. (It used to swell with the glitch pulse and with a
    // random "glitch" band from the sound; both are gone.)
    update() {
      if (calm) return;
      ca.offset.copy(baseCA);
    },
    setSize(w, h) {
      composer.setSize(w, h, false);
    },
    render(dt) {
      composer.render(dt);
    },
  };
}
