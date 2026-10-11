import { kit } from './kit.js';

// Optional add-ons. Each is modelled around its own attachment point (the
// origin) and names the body mount it uses in `slot`:
//   rearTop  origin on the top of the tail; the part rises from it
//   rear     origin on the back face; the part extends toward -z
//   side     origin on the +x flank; the part extends toward +x and is
//            mirrored onto the other side, so `unit()` is one side only

const TAU = Math.PI * 2;

function spoiler() {
  const k = kit();
  for (const side of [1, -1]) {
    k.slab('dark', [0.08, 0.42, 0.14], { at: [side * 0.32, 0.2, -0.02], rot: [-0.15, 0, 0] });
    k.prism(
      'accent',
      [[-0.3, -0.12], [0.22, -0.12], [0.26, 0.04], [0.06, 0.18], [-0.3, 0.18]],
      { depth: 0.06, axis: 'x' },
      { at: [side * 0.76, 0.44, -0.1] },
    );
  }
  k.box('paint', [1.5, 0.08, 0.44], { at: [0, 0.44, -0.1], rot: [0.12, 0, 0], r: 0.04 });
  // A stripe across the middle of the wing.
  k.slab('white', [0.34, 0.09, 0.45], { at: [0, 0.44, -0.1], rot: [0.12, 0, 0] });
  return k.node;
}

function gliderWing() {
  const k = kit();
  k.box('dark', [0.14, 0.2, 0.8], { at: [0.05, 0, 0.04], r: 0.06 });
  // The wing itself tilts up a little toward the tip.
  const wing = k.sub({ rot: [0, 0, 0.14] });
  wing.prism(
    'white',
    [[0, 0.4], [0.55, 0.32], [1.15, 0.02], [1.32, -0.2], [1.28, -0.42], [1.05, -0.46], [0, -0.3]],
    { depth: 0.09, axis: 'y', smooth: 50 },
  );
  wing.prism(
    'paint',
    [[-0.46, 0], [-0.14, 0], [-0.3, 0.34], [-0.5, 0.34]],
    { depth: 0.06, axis: 'x' },
    { at: [1.27, 0.04, 0] },
  );
  // A stripe along the wing, standing proud on both faces.
  wing.slab('paint', [0.9, 0.1, 0.1], { at: [0.55, 0, 0.08] });
  wing.cyl('metal', { r: 0.11, len: 0.45, axis: 'z' }, { at: [0.6, -0.1, 0] });
  wing.lathe('red', [[0, 0.14], [0.08, 0]], { seg: 6, axis: 'z' }, { at: [0.6, -0.1, 0.225] });
  return k.node;
}

function booster() {
  const k = kit();
  const y = 0.1;
  k.slab('dark', [0.3, 0.2, 0.1], { at: [0, y, 0] });
  k.lathe(
    'white',
    [[0, 0.02], [0.16, -0.02], [0.25, -0.16], [0.25, -0.66], [0.17, -0.74]],
    { seg: 10, axis: 'z' },
    { at: [0, y, 0] },
  );
  k.cyl('red', { r: 0.26, len: 0.12, seg: 10, caps: 'none', axis: 'z' }, { at: [0, y, -0.36] });
  k.cyl('accent', { r: 0.258, len: 0.05, seg: 10, caps: 'none', axis: 'z' }, { at: [0, y, -0.56] });
  // Nozzle bell with a glowing throat.
  k.lathe('dark', [[0.15, -0.72], [0.23, -0.94]], { seg: 10, axis: 'z' }, { at: [0, y, 0] });
  k.lathe('hot', [[0.21, -0.9], [0, -0.86]], { seg: 10, axis: 'z' }, { at: [0, y, 0] });
  const flame = k.sub({ at: [0, y, -0.9], motion: { type: 'flicker' } });
  flame.lathe('hot', [[0.14, 0], [0, -0.42]], { seg: 8, axis: 'z' });
  for (let i = 0; i < 3; i++) {
    const fin = k.sub({ at: [0, y, 0], rot: [0, 0, (i * TAU) / 3] });
    fin.prism('red', [[-0.42, 0.22], [-0.74, 0.22], [-0.86, 0.46], [-0.72, 0.46]], { depth: 0.05, axis: 'x' });
  }
  return k.node;
}

function sharkFin() {
  const k = kit();
  k.box('dark', [0.3, 0.1, 0.95], { at: [0, 0.03, 0.2], r: 0.05 });
  k.prism(
    'paint',
    [[0.52, 0], [0.3, 0.26], [0.02, 0.56], [-0.3, 0.74], [-0.2, 0.46], [-0.24, 0.2], [-0.3, 0]],
    { depth: 0.14, axis: 'x', smooth: 50 },
    { at: [0, 0.04, 0.1] },
  );
  // Gills: three slits that show on both sides.
  for (const z of [0.12, 0.26, 0.4]) k.slab('dark', [0.16, 0.2, 0.03], { at: [0, 0.2, z], rot: [0.5, 0, 0] });
  return k.node;
}

function sidePipe() {
  const k = kit();
  k.cyl('metal', { r: 0.08, len: 1.3, caps: 'none', axis: 'z' }, { at: [0.12, 0, -0.05] });
  k.ball('metal', { r: 0.085, seg: 6, rings: 3 }, { at: [0.12, 0, 0.6] });
  // Flared tail pipe.
  k.cyl('metal', { r: 0.08, r2: 0.13, len: 0.3, caps: 'none', axis: 'z' }, { at: [0.12, 0, -0.84] });
  k.disc('dark', { r: 0.12, axis: 'z' }, { at: [0.12, 0, -0.97], rot: [0, Math.PI, 0] });
  k.box('dark', [0.06, 0.22, 0.75], { at: [0.2, 0, -0.05], r: 0.03 });
  for (const z of [-0.45, 0.35]) {
    k.slab('dark', [0.14, 0.06, 0.08], { at: [0.05, 0, z] });
  }
  // Heat bands.
  for (const z of [-0.6, 0.2]) k.cyl('accent', { r: 0.09, len: 0.06, caps: 'none', axis: 'z' }, { at: [0.12, 0, z] });
  return k.node;
}

/** Premium: a winner's wing. Two decks of gold, and a star on top. */
function championWing() {
  const k = kit();
  for (const side of [1, -1]) {
    k.slab('dark', [0.08, 0.64, 0.16], { at: [side * 0.36, 0.3, -0.02], rot: [-0.15, 0, 0] });
    k.prism('gold', [[-0.34, -0.3], [0.22, -0.3], [0.3, 0.02], [0.06, 0.2], [-0.34, 0.2]], { depth: 0.06, axis: 'x' }, { at: [side * 0.8, 0.52, -0.1] });
  }
  k.box('gold', [1.56, 0.08, 0.46], { at: [0, 0.64, -0.12], rot: [0.14, 0, 0], r: 0.04 });
  k.slab('gold', [1.5, 0.06, 0.32], { at: [0, 0.36, -0.06], rot: [0.1, 0, 0] });
  k.slab('red', [0.3, 0.09, 0.47], { at: [0, 0.64, -0.12], rot: [0.14, 0, 0] });
  const star = [];
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i / 10) * TAU;
    const radius = i % 2 ? 0.09 : 0.22;
    star.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  k.prism('accent', star, { depth: 0.07, axis: 'z' }, { at: [0, 0.92, -0.16] });
  return k.node;
}

/** The villain's: a top hat with a gold band, and a brass horn to go with his name. */
function topHat() {
  const k = kit();
  const felt = 'dark';
  k.cyl(felt, { r: 0.62, len: 0.07, seg: 12, axis: 'y' }, { at: [0, 0.035, 0] });
  k.cyl(felt, { r: 0.44, r2: 0.4, len: 0.78, seg: 12, caps: 'start', axis: 'y' }, { at: [0, 0.46, 0] });
  k.cyl('gold', { r: 0.425, len: 0.16, seg: 12, caps: 'none', axis: 'y' }, { at: [0, 0.17, 0] });
  // The horn: a brass bell on a stalk, with a rubber bulb.
  k.cyl('gold', { r: 0.05, len: 0.5, seg: 6, caps: 'none', axis: 'z' }, { at: [0.6, 0.22, 0.2] });
  k.lathe('gold', [[0.05, 0], [0.12, 0.14], [0.26, 0.24]], { seg: 10, axis: 'z' }, { at: [0.6, 0.22, 0.45] });
  k.ball('red', { r: 0.14, seg: 6, rings: 4 }, { at: [0.6, 0.22, -0.1] });
  return k.node;
}

// Parts that are not for sale: they belong to somebody (race/grid.js).
export const SPECIAL_EXTRAS = [{ id: 'top-hat', name: 'Top Hat', slot: 'top', unit: topHat }];

export const EXTRAS = [
  { id: 'spoiler', name: 'Spoiler', slot: 'rearTop', unit: spoiler },
  { id: 'glider-wings', name: 'Glider Wings', slot: 'side', unit: gliderWing },
  { id: 'booster', name: 'Rocket Booster', slot: 'rear', unit: booster },
  { id: 'shark-fin', name: 'Shark Fin', slot: 'rearTop', unit: sharkFin },
  { id: 'side-pipes', name: 'Side Pipes', slot: 'side', unit: sidePipe },
  { id: 'champion-wing', name: 'Champion Wing', slot: 'rearTop', unit: championWing },
];
