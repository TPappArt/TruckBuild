import { material } from '../engine/materials.js';
import { kit } from './kit.js';

// Weapons. Each is modelled around its own attachment point (the origin) and
// names the body mount it uses in `slot`:
//   top    origin on the deck; the weapon sits on it and aims toward +z
//   front  origin on the nose; the weapon reaches forward toward +z
//
// `attack` says what the weapon does in a race (see race/combat.js):
//   { type: 'shot', shot }   fired with the fire button, then reloads
//                            (`reload` seconds, if not the usual)
//   { type: 'melee', reach } always on: knocks any car that comes within
//                            `reach` metres of the front of this one
// Either way, a hit does what a bomb does.

const TAU = Math.PI * 2;

function blaster() {
  const k = kit();
  k.cyl('dark', { r: 0.24, len: 0.12, seg: 10, caps: 'start', axis: 'y' }, { at: [0, 0.06, 0] });
  k.box('metal', [0.5, 0.3, 0.62], { at: [0, 0.3, 0], r: 0.1 });
  for (const side of [1, -1]) {
    k.cyl('dark', { r: 0.07, len: 0.6, seg: 6, caps: 'start', axis: 'z' }, { at: [side * 0.13, 0.32, 0.58] });
    k.cyl('accent', { r: 0.1, len: 0.14, seg: 6, axis: 'z' }, { at: [side * 0.13, 0.32, 0.78] });
  }
  // Ammo drum.
  k.cyl('accent', { r: 0.17, len: 0.2 }, { at: [0.34, 0.3, -0.08] });
  return k.node;
}

function cannon() {
  const k = kit();
  k.cyl('dark', { r: 0.38, len: 0.1, seg: 10, caps: 'start', axis: 'y' }, { at: [0, 0.05, 0] });
  k.dome('metal', { r: 1, seg: 8, rings: 3, squash: [0.34, 0.32, 0.34] }, { at: [0, 0.1, 0] });
  // Barrel assembly, raised a little.
  const gun = k.sub({ at: [0, 0.26, 0.1], rot: [-0.14, 0, 0] });
  gun.box('dark', [0.32, 0.26, 0.3], { at: [0, 0, 0.2], r: 0.08 });
  gun.cyl('metal', { r: 0.1, len: 0.8, caps: 'none', axis: 'z' }, { at: [0, 0, 0.7] });
  gun.cyl('accent', { r: 0.115, len: 0.08, caps: 'none', axis: 'z' }, { at: [0, 0, 0.5] });
  gun.cyl('red', { r: 0.15, len: 0.22, axis: 'z' }, { at: [0, 0, 1.12] });
  gun.disc('dark', { r: 0.08, axis: 'z' }, { at: [0, 0, 1.235] });
  return k.node;
}

const bottleGlass = material('#1f7a45', { spec: 0.9, shine: 80 });
const corkWood = material('#d9a866', { spec: 0.1 });

/** Premium: a bottle of fizz on a cradle, shaken and ready. It fires its cork. */
function fizzCannon() {
  const k = kit();
  k.slab('dark', [0.5, 0.12, 0.6], { at: [0, 0.06, 0.05] });
  k.slab('gold', [0.12, 0.2, 0.5], { at: [0, 0.2, 0.05] });
  const bottle = k.sub({ at: [0, 0.42, 0.05], rot: [-0.22, 0, 0] });
  bottle.lathe(bottleGlass, [[0, -0.45], [0.2, -0.45], [0.2, 0.2], [0.08, 0.5], [0.08, 0.78]], { seg: 10, axis: 'z' });
  bottle.cyl('white', { r: 0.205, len: 0.3, seg: 10, caps: 'none', axis: 'z' }, { at: [0, 0, -0.1] });
  bottle.cyl('gold', { r: 0.09, len: 0.26, seg: 10, caps: 'none', axis: 'z' }, { at: [0, 0, 0.62] });
  bottle.cyl(corkWood, { r: 0.1, r2: 0.075, len: 0.16, seg: 8, axis: 'z' }, { at: [0, 0, 0.86] });
  return k.node;
}

function flipper() {
  const k = kit();
  const depth = 0.95;
  // A slab squeezed into a wedge: full height at the hinge, a thin lip ahead.
  k.box('accent', [1.3, 0.3, depth], {
    at: [0, -0.1, 0.55],
    r: 0.06,
    deform: (p) => {
      const t = p[2] / depth + 0.5;
      p[1] = -0.15 + (p[1] + 0.15) * (1 - 0.8 * t) - 0.12 * t;
    },
  });
  k.slab('dark', [1.3, 0.05, 0.1], { at: [0, -0.34, 1.0] });
  // Warning stripes up the ramp.
  for (const x of [-0.36, 0.36]) k.slab('dark', [0.2, 0.03, 0.8], { at: [x, -0.165, 0.55], rot: [0.31, 0, 0] });
  for (const side of [1, -1]) {
    k.cyl('dark', { r: 0.12, len: 0.22 }, { at: [side * 0.42, 0.02, 0.06] });
    k.cyl('metal', { r: 0.045, len: 0.5, seg: 6, caps: 'none', axis: 'z' }, { at: [side * 0.42, 0, 0.3], rot: [0.35, 0, 0] });
  }
  return k.node;
}

function hammer() {
  const k = kit();
  k.box('dark', [0.44, 0.3, 0.5], { at: [0, 0.15, -0.05], r: 0.09 });
  k.cyl('accent', { r: 0.15, len: 0.56 }, { at: [0, 0.34, -0.05] });
  const arm = k.sub({ at: [0, 0.34, -0.05], rot: [-0.75, 0, 0], motion: { type: 'swing', amount: 0.1, speed: 1.6, raceAmount: 0.6, raceSpeed: 7 } });
  arm.box('metal', [0.12, 0.12, 1.0], { at: [0, 0, 0.55], r: 0.05 });
  arm.cyl('red', { r: 0.2, len: 0.5, axis: 'y' }, { at: [0, 0, 1.1] });
  arm.cyl('white', { r: 0.215, len: 0.12, caps: 'none', axis: 'y' }, { at: [0, 0, 1.1] });
  return k.node;
}

function buzzSaw() {
  const k = kit();
  k.box('dark', [0.34, 0.26, 0.3], { at: [0, 0.02, 0.12], r: 0.08 });
  k.box('metal', [0.1, 0.12, 0.75], { at: [0.14, 0.02, 0.55], r: 0.04 });
  // Ten raked teeth.
  const teeth = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * TAU;
    const dip = angle + (0.75 * TAU) / 10;
    teeth.push([0.44 * Math.cos(angle), 0.44 * Math.sin(angle)], [0.33 * Math.cos(dip), 0.33 * Math.sin(dip)]);
  }
  const blade = k.sub({ at: [0, 0.02, 0.92], motion: { type: 'spin', speed: 9 } });
  blade.prism('white', teeth, { depth: 0.035, axis: 'x' });
  blade.cyl('red', { r: 0.11, len: 0.1, seg: 6 });
  return k.node;
}

export const WEAPONS = [
  { id: 'blaster', name: 'Twin Blaster', slot: 'top', unit: blaster, attack: { type: 'shot', shot: 'bolts' } },
  { id: 'cannon', name: 'Cannon', slot: 'top', unit: cannon, attack: { type: 'shot', shot: 'shell' } },
  { id: 'fizz-cannon', name: 'Fizz Cannon', slot: 'top', unit: fizzCannon, attack: { type: 'shot', shot: 'cork', reload: 7 } },
  { id: 'flipper', name: 'Flipper', slot: 'front', unit: flipper, attack: { type: 'melee', reach: 3.8 } },
  { id: 'hammer', name: 'Hammer', slot: 'top', unit: hammer, attack: { type: 'melee', reach: 3.4 } },
  { id: 'buzz-saw', name: 'Buzz Saw', slot: 'front', unit: buzzSaw, attack: { type: 'melee', reach: 3.6 } },
];
