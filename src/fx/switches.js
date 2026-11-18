// Rendering changes that would change how the works or the rooms look
// (docs/design/rendering-proposal.md, options 4, 7, 8 and 11). Each is built and OFF: it is a
// reconstruction decision, and stays off until the reconstructor says yes (then set it to
// true here and log it in PROGRESS.md).
//
// For a comparison, any of them can be turned on for one page load from the address:
//   ?render=tone          screens out of the tone mapping, dithering, FXAA on the dark rooms
//   ?render=geoao         ambient occlusion baked from the 3D geometry in place of the plan AO
//   ?render=probes        a light-probe grid baked from the scene in place of the hemisphere light
//   ?render=ktx2art       the paintings' and prints' images as KTX2 UASTC (needs img/ktx2/, not in git)
//   ?render=tone,geoao    several at once
// Nothing is stored; the next page load without the parameter is as before.
export const SWITCHES = {
  tone: false,
  geoao: false,
  probes: false,
  ktx2art: false,
};

const asked = new Set(
  (new URLSearchParams(window.location.search).get('render') || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s in SWITCHES),
);

export const isOn = (name) => SWITCHES[name] === true || asked.has(name);
