import { material } from '../engine/materials.js';
import { kit } from '../parts/kit.js';

// Trackside furniture shared by every track: the things a real circuit is
// cluttered with. Themes pass in their own colours.
//
// These are built to look busier than they are. Stripes are separate little
// slabs of colour rather than textures, a "plank" is one slab, a railing is
// a slab that pokes out a finger's width either side of its posts. Every
// prop stays well under the 200 triangle budget.

const steel = material('#39404f', { spec: 0.3, tex: 'metal' });
const wood = material('#8c633a', { spec: 0.05, tex: 'planks' });
const woodDark = material('#5f4126', { spec: 0.05, tex: 'planks' });
const rubber = material('#22252d', { spec: 0.1 });
const white = material('#f4f1e6', { spec: 0.1 });
const lampGlow = material('#ffe9a8', { glow: 1 });

/**
 * An arrow board for the outside of a bend. Faces +z; the arrows point
 * toward +x for `way` = 1 and -x for -1. About 80 triangles.
 */
export function cornerSign(road, way = 1) {
  const k = kit();
  for (const x of [-1.5, 1.5]) k.slab(steel, [0.16, 1.5, 0.16], { at: [x, 0.75, -0.1] });
  k.slab(road.chequerDark, [4.2, 1.4, 0.14], { at: [0, 1.9, 0] });
  k.slab(road.kerbA, [4.4, 0.14, 0.2], { at: [0, 2.67, 0] });
  k.slab(road.kerbA, [4.4, 0.14, 0.2], { at: [0, 1.13, 0] });
  for (const x of [-1.25, 0, 1.25]) {
    // A chevron: ">" as six points, just proud of the board on both faces.
    k.prism(
      road.kerbB,
      [[-0.4, 0.52], [0.05, 0.52], [0.5, 0], [0.05, -0.52], [-0.4, -0.52], [0.05, 0]].map(([px, py]) => [px * way, py]),
      { depth: 0.2, axis: 'z' },
      { at: [x * way, 1.9, 0] },
    );
  }
  return k.node;
}

/**
 * A striped barrier on trestle legs, with a warning lamp. Faces +z.
 * `a` and `b` are the stripe colours. About 150 triangles.
 */
export function barricade(a, b) {
  const k = kit();
  for (const x of [-1.5, 1.5]) {
    // A-frame legs.
    k.slab(steel, [0.14, 1.7, 0.14], { at: [x, 0.8, 0.32], rot: [0.38, 0, 0] });
    k.slab(steel, [0.14, 1.7, 0.14], { at: [x, 0.8, -0.32], rot: [-0.38, 0, 0] });
  }
  // Two boards of stripes.
  for (const y of [1.3, 0.72]) {
    for (let i = 0; i < 6; i++) {
      k.slab(i % 2 ? a : b, [0.6, 0.36, 0.1], { at: [-1.5 + i * 0.6, y, 0] });
    }
  }
  k.ball(lampGlow, { r: 0.2, seg: 5, rings: 3 }, { at: [1.5, 1.82, 0] });
  k.slab(steel, [0.16, 0.2, 0.16], { at: [1.5, 1.6, 0] });
  return k.node;
}

/** A stack of tyres, the top one a bright colour. About 110 triangles. */
export function tyreStack(top = white, height = 3) {
  const k = kit();
  for (let i = 0; i < height; i++) {
    k.cyl(i === height - 1 ? top : rubber, { r: 0.62, len: 0.36, seg: 8, caps: i === height - 1 ? 'start' : 'none', axis: 'y' }, { at: [0, 0.18 + i * 0.38, 0] });
  }
  k.cyl(rubber, { r: 0.34, len: 0.02, seg: 8, caps: 'start', axis: 'y' }, { at: [0, height * 0.38 + 0.01, 0] });
  return k.node;
}

/** A crate with a darker frame on every face. 60 triangles. */
export function crate(size = 1.2, body = wood, frame = woodDark) {
  const k = kit();
  k.slab(body, [size, size, size], { at: [0, size / 2, 0] });
  // Three bands, each a finger proud of the box, read as a frame.
  const proud = size + 0.06;
  const band = size * 0.14;
  k.slab(frame, [proud, band, proud], { at: [0, band / 2, 0] });
  k.slab(frame, [proud, band, proud], { at: [0, size - band / 2, 0] });
  k.slab(frame, [band, proud, proud], { at: [0, size / 2, 0], rot: [0, 0, 0.78] });
  k.slab(frame, [proud, proud, band], { at: [0, size / 2, 0], rot: [0.78, 0, 0] });
  return k.node;
}

/** A traffic cone with a white band. 40 triangles. */
export function cone(colour) {
  const k = kit();
  k.slab(colour, [0.7, 0.08, 0.7], { at: [0, 0.04, 0] });
  k.cyl(colour, { r: 0.07, r2: 0.28, len: 0.9, seg: 6, caps: 'start', axis: 'y' }, { at: [0, 0.53, 0] });
  k.cyl(white, { r: 0.155, r2: 0.2, len: 0.2, seg: 6, caps: 'none', axis: 'y' }, { at: [0, 0.56, 0] });
  return k.node;
}

/** An oil drum with two rolled hoops. About 60 triangles. */
export function drum(colour, hoop = steel) {
  const k = kit();
  k.cyl(colour, { r: 0.5, len: 1.3, seg: 8, caps: 'start', axis: 'y' }, { at: [0, 0.65, 0] });
  k.cyl(hoop, { r: 0.54, len: 0.1, seg: 8, caps: 'none', axis: 'y' }, { at: [0, 0.42, 0] });
  k.cyl(hoop, { r: 0.54, len: 0.1, seg: 8, caps: 'none', axis: 'y' }, { at: [0, 0.92, 0] });
  return k.node;
}

/** A lamp post leaning over the road. Faces +z. About 60 triangles. */
export function lampPost(post = steel, glow = lampGlow, height = 6) {
  const k = kit();
  k.slab(post, [0.5, 0.5, 0.5], { at: [0, 0.25, 0] });
  k.slab(post, [0.2, height, 0.2], { at: [0, height / 2, 0] });
  k.slab(post, [0.16, 0.16, 1.8], { at: [0, height - 0.1, 0.8] });
  k.slab(post, [0.5, 0.18, 0.8], { at: [0, height - 0.24, 1.5] });
  k.slab(glow, [0.36, 0.1, 0.62], { at: [0, height - 0.36, 1.5] });
  return k.node;
}

/**
 * A stretch of fence: posts with two rails, none of them quite straight.
 * Runs along x, `length` metres. 12 triangles a post, 24 for the rails.
 */
export function fence(length, post = wood, rail = woodDark, height = 1.2) {
  const k = kit();
  const posts = Math.max(2, Math.round(length / 2) + 1);
  for (let i = 0; i < posts; i++) {
    const x = -length / 2 + (i * length) / (posts - 1);
    k.slab(post, [0.16, height + 0.2, 0.16], { at: [x, (height + 0.2) / 2, 0], rot: [0, 0, i % 3 === 1 ? 0.06 : -0.03] });
  }
  k.slab(rail, [length, 0.12, 0.08], { at: [0, height * 0.9, 0] });
  k.slab(rail, [length, 0.12, 0.08], { at: [0, height * 0.5, 0], rot: [0, 0, 0.02] });
  return k.node;
}

/**
 * A clump of standing grass: a few thin blades leaning apart. Each blade is
 * a three-sided spike, so 3 triangles a blade. `tip` is an optional second
 * colour for alternate blades.
 */
export function tuft(look, blades = 5, height = 0.7, tip = null) {
  const k = kit();
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2 + i * 1.3;
    const lean = 0.18 + (i % 3) * 0.14;
    const tall = height * (0.6 + ((i * 7) % 5) / 6);
    const blade = k.sub({ at: [Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12], rot: [Math.cos(angle) * lean, 0, Math.sin(angle) * lean] });
    blade.lathe(i % 2 && tip ? tip : look, [[0, tall], [0.07, 0]], { seg: 3, axis: 'y' });
  }
  return k.node;
}

/** A sign on a post with a coloured board. Faces +z. 36 triangles. */
export function signPost(board, band = white) {
  const k = kit();
  k.slab(steel, [0.14, 2.4, 0.14], { at: [0, 1.2, 0] });
  k.slab(board, [1.5, 0.9, 0.1], { at: [0, 2.2, 0.06] });
  k.slab(band, [1.2, 0.16, 0.14], { at: [0, 2.2, 0.06] });
  return k.node;
}

/**
 * A line of little flags strung between two poles. Runs along x. The
 * flags are alternate colours from `looks`. About 12 triangles a flag.
 */
export function bunting(length, looks, { flags = 12, height = 4, poles = true } = {}) {
  const k = kit();
  if (poles) {
    for (const side of [1, -1]) k.slab(steel, [0.16, height + 0.4, 0.16], { at: [(side * length) / 2, (height + 0.4) / 2, 0] });
  }
  for (let i = 0; i < flags; i++) {
    const t = (i + 0.5) / flags;
    const sag = 4 * t * (1 - t) * length * 0.07;
    k.slab(looks[i % looks.length], [(length / flags) * 0.62, 0.5, 0.05], {
      at: [-length / 2 + t * length, height - sag - 0.25, 0],
      rot: [0, 0, (0.5 - t) * 0.28],
    });
  }
  return k.node;
}

/** A hay bale with two bands of twine. 36 triangles. */
export function hayBale(straw = material('#e2c46a', { spec: 0, tex: 'grass' }), twine = material('#a9823a', { spec: 0 })) {
  const k = kit();
  k.slab(straw, [1.9, 0.9, 1.0], { at: [0, 0.45, 0] });
  for (const x of [-0.5, 0.5]) k.slab(twine, [0.1, 0.94, 1.04], { at: [x, 0.45, 0] });
  return k.node;
}
