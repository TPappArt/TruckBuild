import { tileOf } from './atlas.js';

// Shared materials, looked up by role. Parts never pick raw colours: they say
// what a surface is ("paint", "rubber", "glass") and the look is decided here,
// which keeps every part in one palette and lets the player repaint a vehicle
// by changing a single entry.

/** '#rrggbb' in sRGB to linear [r, g, b], the space lighting is computed in. */
export function linear(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => Math.pow(c / 255, 2.2));
}

/**
 * Makes a material. Scenery uses this directly for one-off colours.
 *
 * `tex` lays a repeating pattern from the atlas over it (see atlas.js for
 * the names): 'grass', 'brick', 'asphalt'... `metres` is how much ground one
 * repeat covers and `strength` how strongly it shows, each defaulting to
 * what suits the pattern.
 */
export const material = (hex, { spec = 0.25, shine = 30, glow = 0, tex = null, metres, strength } = {}) => {
  const tile = tex ? tileOf(tex) : null;
  return {
    color: linear(hex),
    spec, // highlight strength
    shine, // highlight tightness
    glow, // 0 = fully lit by the scene, 1 = self-lit
    tex: tile ? [tile.id, metres ?? tile.metres, strength ?? tile.strength, 0] : null,
  };
};

/** The same material with a pattern laid over it (see `material`). */
export const textured = (look, tex, { metres, strength } = {}) => {
  const tile = tileOf(tex);
  return { ...look, tex: [tile.id, metres ?? tile.metres, strength ?? tile.strength, 0] };
};

const NO_TEX = [0, 0, 0, 0];
/** What a vertex of a surface in `look` says about textures: four numbers (see renderer.js). */
export const texOf = (look) => look.tex || NO_TEX;

export const materials = {
  paint: material('#f23a2f', { spec: 0.5, shine: 45 }),
  white: material('#f4f6fb', { spec: 0.35, shine: 40 }),
  dark: material('#343a48', { spec: 0.2, shine: 20 }),
  rubber: material('#262a33', { spec: 0.08, shine: 8 }),
  metal: material('#b4bfce', { spec: 0.7, shine: 60 }),
  glass: material('#6fc8ff', { spec: 0.9, shine: 90 }),
  accent: material('#ffc928', { spec: 0.45, shine: 40 }),
  red: material('#f2443a', { spec: 0.45, shine: 40 }),
  // Polished gold, for the parts that cost golden things rather than coins.
  gold: material('#ffbf1f', { spec: 1.0, shine: 55, glow: 0.18 }),
  hot: material('#ff9a2e', { glow: 1 }),
  light: material('#fff3bf', { glow: 0.85 }),

  // Garage set dressing.
  floor: material('#eef2fb', { spec: 0 }),
  checkDark: material('#2b3350', { spec: 0 }),
  checkLight: material('#ffffff', { spec: 0 }),
  sky: material('#ffffff', { spec: 0 }),
};

/** A mesh's `role` is either a name from the table above or a material itself. */
export function resolveMaterial(role) {
  return (typeof role === 'string' ? materials[role] : role) || materials.dark;
}

export function setPaint(hex) {
  materials.paint.color = linear(hex);
}
