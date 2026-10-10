import { material } from '../../engine/materials.js';
import { kit } from '../../parts/kit.js';
import { barricade, cone, crate, drum, lampPost, signPost, tuft, tyreStack } from '../dressing.js';
import { fireDrum, jersey, ruin, wreck } from '../setpieces.js';

// Zombie City: a long circuit round what is left of downtown. The road
// through the old high street is full of zombies, and bits of the sky
// keep falling on it.

const asphalt = material('#44454b', { spec: 0.05 });
const concrete = material('#8a8780', { spec: 0.05 });
const concreteDark = material('#5e5c58', { spec: 0.05 });
const brick = material('#7a4a3a', { spec: 0.05 });
const brickDark = material('#56342a', { spec: 0.05 });
const steel = material('#39404f', { spec: 0.3 });
const rust = material('#9a4f2a', { spec: 0.2 });
const hazard = material('#f2c230', { spec: 0.2 });
const hazardDark = material('#23252b', { spec: 0.1 });
const lit = material('#ffc56a', { glow: 0.9 });
const neon = material('#ff5a8a', { glow: 1 });
const toxic = material('#9dff4a', { glow: 0.9 });
const screen = material('#6fe0ff', { glow: 0.8 });
const weed = material('#6f8a3a', { spec: 0 });
const weedPale = material('#9aa85a', { spec: 0 });
const dirt = material('#5a5148', { spec: 0 });
const dirtDark = material('#4a433c', { spec: 0 });
const slick = material('#2c2a30', { spec: 0 });
const paintWhite = material('#d9d6cc', { spec: 0 });
const bark = material('#3a332e', { spec: 0.05 });
const containerLooks = ['#c9534a', '#3f7fbf', '#d9a23a', '#4f9a6a'].map((hex) => material(hex, { spec: 0.2 }));

/** A shipping container, ribbed. Runs along z. 60 triangles. */
function container(look) {
  const k = kit();
  k.slab(look, [2.5, 2.6, 6.2], { at: [0, 1.3, 0] });
  // Ribs: thin frames a finger proud, round the whole box.
  for (const z of [-2.4, -1.2, 0, 1.2, 2.4]) k.slab(look, [2.62, 2.72, 0.16], { at: [0, 1.3, z] });
  k.slab(steel, [2.56, 0.16, 6.26], { at: [0, 0.08, 0] });
  k.slab(steel, [1.8, 2.2, 0.08], { at: [0, 1.3, 3.1] });
  return k.node;
}

/** A petrol station canopy on four posts, with two pumps under it. About 180 triangles. */
function station() {
  const k = kit();
  k.slab(concrete, [9, 0.6, 6], { at: [0, 5, 0], rot: [0, 0, 0.03] });
  k.slab(hazard, [9.2, 0.26, 6.2], { at: [0, 5, 0], rot: [0, 0, 0.03] });
  k.slab(neon, [3.2, 0.5, 6.24], { at: [-1.5, 5.4, 0], rot: [0, 0, 0.03] });
  for (const x of [-3.6, 3.6]) for (const z of [-2.2, 2.2]) k.slab(steel, [0.3, 5, 0.3], { at: [x, 2.5, z] });
  k.slab(concreteDark, [6, 0.3, 1.6], { at: [0, 0.15, 0] });
  for (const x of [-1.6, 1.6]) {
    k.box(rust, [0.9, 1.9, 0.7], { at: [x, 1.25, 0], r: 0.12 });
    k.slab(screen, [0.6, 0.4, 0.74], { at: [x, 1.7, 0] });
    k.slab(hazardDark, [0.94, 0.2, 0.74], { at: [x, 0.5, 0] });
    k.slab(hazardDark, [0.08, 0.9, 0.08], { at: [x + 0.55, 1.2, 0.2], rot: [0, 0, 0.25] });
  }
  return k.node;
}

/** A billboard on two legs: a torn poster in blocks of colour. Faces +z. About 130 triangles. */
function billboard() {
  const k = kit();
  for (const x of [-3.4, 3.4]) {
    k.slab(steel, [0.3, 6, 0.3], { at: [x, 3, -0.3] });
    k.slab(steel, [0.16, 3.4, 0.16], { at: [x, 1.8, -1.2], rot: [0.5, 0, 0] });
  }
  k.slab(hazardDark, [9.4, 4.4, 0.24], { at: [0, 7.2, 0], rot: [0, 0, -0.04] });
  // The poster: a sun over stripes, with a corner torn away.
  k.slab(screen, [8.8, 2.4, 0.3], { at: [0, 7.9, 0], rot: [0, 0, -0.04] });
  k.slab(hazard, [8.8, 0.5, 0.32], { at: [0, 6.4, 0], rot: [0, 0, -0.04] });
  k.slab(neon, [8.8, 0.5, 0.32], { at: [0, 5.8, 0], rot: [0, 0, -0.04] });
  k.cyl(hazard, { r: 1.1, len: 0.34, seg: 8, caps: 'both', axis: 'z' }, { at: [-2, 7.8, 0] });
  k.slab(hazardDark, [2.6, 2.2, 0.36], { at: [3.6, 8.4, 0], rot: [0, 0, 0.5] });
  k.slab(lit, [0.5, 0.2, 0.5], { at: [-3, 9.7, 0.6] });
  k.slab(lit, [0.5, 0.2, 0.5], { at: [3, 9.5, 0.6] });
  return k.node;
}

/** A bus on its side of the road, windows smashed. Runs along z. About 110 triangles. */
function bus() {
  const k = kit();
  k.box(hazard, [2.6, 2.6, 9], { at: [0, 1.7, 0], r: 0.3, rot: [0, 0, 0.05] });
  k.slab(hazardDark, [2.66, 0.9, 8.2], { at: [0.04, 2.2, 0], rot: [0, 0, 0.05] });
  k.slab(hazardDark, [2.68, 0.2, 9.04], { at: [-0.04, 0.9, 0], rot: [0, 0, 0.05] });
  for (const z of [-2.8, 2.8]) for (const x of [-1.2, 1.2]) k.cyl(hazardDark, { r: 0.5, len: 0.3, seg: 6, axis: 'x' }, { at: [x, 0.5, z] });
  k.slab(lit, [0.5, 0.3, 0.1], { at: [0.7, 1.1, 4.52] });
  return k.node;
}

function deadTree() {
  const k = kit();
  k.cyl(bark, { r: 0.1, r2: 0.36, len: 5, seg: 5, caps: 'none', axis: 'y' }, { at: [0, 2.5, 0], rot: [0, 0, 0.06] });
  for (const [height, turn, lean, length] of [[2.6, 0.4, 0.95, 2.2], [3.5, 2.6, -0.85, 1.8], [4.3, 4.4, 0.7, 1.3]]) {
    const branch = k.sub({ at: [0, height, 0], rot: [0, turn, lean] });
    branch.cyl(bark, { r: 0.04, r2: 0.13, len: length, seg: 4, caps: 'none', axis: 'y' }, { at: [0, length / 2, 0] });
  }
  return k.node;
}

/** A length of chain-link fence, sagging. Runs along x. About 100 triangles. */
function chainLink() {
  const k = kit();
  for (const x of [-3, 0, 3]) k.slab(steel, [0.12, 2.6, 0.12], { at: [x, 1.3, 0], rot: [0, 0, x * 0.02] });
  k.slab(steel, [6.2, 0.08, 0.08], { at: [0, 2.5, 0] });
  k.slab(steel, [6.2, 0.08, 0.08], { at: [0, 0.2, 0] });
  // The mesh: a lattice of thin diagonals.
  for (let i = 0; i < 5; i++) {
    for (const way of [1, -1]) k.slab(steel, [0.04, 3.2, 0.04], { at: [-2.4 + i * 1.2, 1.35, 0], rot: [0, 0, way * 0.78] });
  }
  return k.node;
}

export const city = {
  id: 'city',
  name: 'Zombie City',
  blurb: 'Zombies on the high street',
  seed: 71,
  price: 600,

  layout: {
    points: [
      [-140, -80], [-38, -92], [70, -85], [140, -52], [142, 18], [76, 34], [58, 92],
      [120, 116], [92, 166], [-10, 150], [-42, 76], [-116, 58], [-152, 0],
    ],
    halfWidth: 15.75,
    shoulder: 5,
  },
  surface: { grip: 8.5, offroad: 0.5 },
  hazard: 'meteor', // see race/hazards.js
  feature: 'street', // see race/features.js

  sky: {
    top: '#5a3a4a',
    disc: { color: '#ff7a4a', size: 8, halo: '#c9534a' },
    clouds: { count: 10, color: '#6b4a4a', shade: '#4a3438' },
  },
  fog: { color: '#c98a5a', density: 0.005 },
  light: [0.62, 0.42, 0.55],
  lighting: { sun: [1.0, 0.8, 0.62], sky: [0.86, 0.72, 0.7], bounce: [0.5, 0.4, 0.34] },
  shadow: 0.34,

  pulse: (time) => 0.93 + 0.07 * Math.sin(time * 13) * Math.sin(time * 3.7),

  // The air: ash coming down, and smoke lying in the streets.
  air: { color: '#e8dccb', count: 70, size: [0.04, 0.08], glow: 0.7, fall: 0.9, wind: [1.2, 2.4] },
  mist: { strength: 0.42, scale: 0.012, drift: [0.01, 0.014] },
  grain: 0.22,
  cinematic: { eye: [10, -70, 6], target: [-2, -6, 8], fov: 1.0, cars: -42 },

  ground: material('#6a6058'),
  road: {
    surface: asphalt,
    shoulder: material('#77736c'),
    wear: material('#6a6058'),
    patch: material('#3a3b40'),
    scuff: material('#2f3034'),
    edge: material('#d9d6cc'),
    kerbA: hazard,
    kerbB: hazardDark,
    line: hazard,
    chequerDark: material('#1d1e22'),
    chequerLight: material('#f1efe6'),
  },
  preview: { ground: '#6a6058', road: '#3a3b40', accent: '#f2c230' },

  paintGround({ paint, random, track }) {
    const tones = [dirt, dirtDark, material('#736a5e'), material('#625c54')];
    for (let i = 0; i < 90; i++) {
      paint.blob(random.range(-330, 330), random.range(-330, 330), random.range(14, 44), random.range(8, 22), random.range(0, Math.PI), random.pick(tones));
    }
    // City blocks: slabs of old pavement and car park, with faded bays.
    for (let i = 0; i < 26; i++) {
      const x = random.range(-240, 240);
      const z = random.range(-240, 240);
      const turn = random.pick([0, Math.PI / 2]) + random.range(-0.1, 0.1);
      const w = random.range(14, 30);
      const d = random.range(10, 22);
      const corner = (a, b) => [x + a * Math.cos(turn) - b * Math.sin(turn), z + a * Math.sin(turn) + b * Math.cos(turn)];
      paint.polygon([corner(-w, -d), corner(w, -d), corner(w, d), corner(-w, d)], random() < 0.5 ? material('#5a5855') : material('#6e6c68'));
      for (let bay = -w + 3; bay < w - 2; bay += 3.2) {
        paint.polygon([corner(bay, -d + 1), corner(bay + 0.2, -d + 1), corner(bay + 0.2, -d + 6), corner(bay, -d + 6)], paintWhite);
      }
    }
    // Oil stains, puddles of something green, and weeds coming up everywhere.
    for (let i = 0; i < 60; i++) paint.blob(random.range(-250, 250), random.range(-250, 250), random.range(2, 6), random.range(1.5, 4), random.range(0, Math.PI), slick, 7);
    for (let i = 0; i < 18; i++) paint.blob(random.range(-240, 240), random.range(-240, 240), random.range(2, 5), random.range(1.5, 3.5), random.range(0, Math.PI), toxic, 7);
    for (let i = 0; i < 300; i++) {
      const p = track.pointAt(random() * track.count, (random() < 0.5 ? 1 : -1) * (track.limit + 0.6 + random() * random() * 24));
      paint.strands(p.x, p.z, 3 + Math.floor(random() * 5), 0.9, random() < 0.5 ? weed : weedPale, random);
    }
  },

  marker() {
    const k = kit();
    k.slab(concrete, [0.5, 1.0, 0.5], { at: [0, 0.5, 0] });
    k.slab(hazard, [0.54, 0.22, 0.54], { at: [0, 0.78, 0] });
    k.slab(hazardDark, [0.54, 0.1, 0.54], { at: [0, 0.56, 0] });
    return k.node;
  },

  decorate({ random, beside, across, landmark, spots, track, place }) {
    // The skyline: gutted towers at a distance, all the way round.
    const towers = [
      ruin(16, 14, 9, concrete, concreteDark, 5),
      ruin(14, 12, 6, brick, brickDark, 2),
      ruin(18, 14, 12, concreteDark, concrete, 8),
      ruin(12, 12, 4, concrete, brickDark, 1),
    ];
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2 + random.range(-0.1, 0.1);
      const distance = random.range(215, 300);
      landmark(towers[i % towers.length], Math.cos(angle) * distance, 30 + Math.sin(angle) * distance, { clear: track.limit + 20, turn: random.pick([0, 0.4, 1.57]), scale: 1.4 + random() * 1.3 });
    }
    // A few inside the circuit and close outside it.
    for (const [x, z, kind, scale] of [[-30, -20, 0, 1.6], [20, 10, 2, 1.4], [-70, 20, 1, 1.5], [40, -40, 3, 1.8], [100, -10, 0, 1.2], [-20, 110, 1, 1.4], [30, 130, 2, 1.1], [-190, 80, 2, 1.8], [190, 80, 0, 2], [0, -160, 2, 2], [200, -90, 1, 1.9]]) {
      landmark(towers[kind], x, z, { clear: track.limit + 16, turn: (x * z) % 3, scale });
    }

    // Street lamps down one side of the road, most of them still working.
    const lamp = lampPost(concreteDark, lit, 7);
    const lampDead = lampPost(concreteDark, hazardDark, 7);
    for (let i = 8; i < track.count; i += 22) {
      const side = (i / 22) % 2 < 1 ? 1 : -1;
      const p = track.pointAt(i, side * (track.limit + 2.2));
      if (track.distanceTo(p.x, p.z) > track.limit + 1) place(i % 5 ? lamp : lampDead, p.x, p.z, { turn: p.heading - (side * Math.PI) / 2 + (i % 7 === 0 ? 0.2 : 0) });
    }

    const cars = [wreck(rust), wreck(material('#6b7a86', { spec: 0.3 })), wreck(material('#4f9a6a', { spec: 0.3 }))];
    const burning = fireDrum();
    const barrel = drum(material('#3f7fbf', { spec: 0.2 }), steel);
    const leaking = drum(material('#3f6b45', { spec: 0.2 }), toxic);
    const board = barricade(hazard, hazardDark);
    const wallBlock = jersey();
    const box = crate(1.2);
    const tyres = tyreStack(hazard, 3);
    const pylon = cone(material('#ff7a2e', { spec: 0.2 }));
    const tree = deadTree();
    const weeds = tuft(weed, 5, 0.7, weedPale);
    const mesh = chainLink();
    const pointer = signPost(hazard, hazardDark);
    const cans = containerLooks.map(container);

    const scenes = [
      // A petrol station: canopy, pumps, a wreck at the pumps and a fire in a drum.
      (at) => {
        at.blob(8, 0, 7, 8, material('#5a5855'), 4);
        at.put(station(), 8, 0, { turn: at.inward + Math.PI / 2 });
        at.put(cars[0], 6, 1.5, { turn: 0.3 });
        at.put(burning, 2.2, -5.5);
        at.put(pointer, 1.2, 6.5, { turn: at.inward });
        for (const [out, down] of [[3, 5], [3.6, 5.6], [2.6, 5.9]]) at.put(tyres, out, down);
        at.put(weeds, 1.4, -2, { scale: 1.5 });
        at.blob(4, -2, 1.6, 2.6, slick, 7);
      },
      // A roadblock: barriers and boards in a line, cones strewn about, a lamp and drums.
      (at) => {
        for (let i = 0; i < 4; i++) at.put(wallBlock, 2 + i * 0.5, (i - 1.5) * 3.9, { turn: (i % 2 ? 0.14 : -0.1) });
        at.put(board, 4.6, -3, { turn: at.inward + 0.2 });
        at.put(board, 5, 2.4, { turn: at.inward - 0.25 });
        for (const [out, down] of [[1, -1.4], [1.2, 0.8], [0.8, 3], [2.4, -7.6], [1.6, 7.2]]) at.put(pylon, out, down, { turn: out * 3 });
        at.put(burning, 6.4, -6);
        at.put(barrel, 7, 5.6);
        at.put(leaking, 7.8, 6.2);
        at.blob(8.6, 7.2, 1.6, 1.2, toxic, 7);
        at.put(cars[1], 9.5, 0, { turn: 1.2 });
        at.put(mesh, 12, 0, { turn: Math.PI / 2 });
      },
      // A billboard with a dead bus under it.
      (at) => {
        at.put(billboard(), 10, 0, { turn: at.inward, scale: 1.2 });
        at.put(bus(), 5, 1, { turn: 0.16 });
        at.put(tree, 3, -8, { scale: 1.4 });
        at.put(tyres, 2, -4.5);
        at.put(box, 2.2, 7.6, { turn: 0.4 });
        for (const [out, down] of [[1.2, -1], [1.6, 4], [8, -5]]) at.put(weeds, out, down, { scale: 1.6 });
        at.blob(5, 1, 2.4, 5.5, slick, 6);
      },
      // A container yard: boxes stacked two high in a row, drums and a fence.
      (at) => {
        at.blob(8, 0, 7, 11, material('#5a5855'), 4);
        at.put(cans[0], 6, -6.6, { turn: 0.04 });
        at.put(cans[1], 6, 0, { turn: -0.03 });
        at.put(cans[2], 6, 6.6, { turn: 0.02 });
        at.put(cans[3], 6.2, -3.2, { y: 2.62, turn: 0.1 });
        at.put(cans[0], 6, 5, { y: 2.62, turn: -0.2 });
        at.put(cans[1], 10.5, 2, { turn: 1.2 });
        for (const [out, down] of [[2.4, -2], [3, -1.2], [2.2, -0.6], [2.6, 8.4]]) at.put(barrel, out, down);
        at.put(box, 2.6, 3, { turn: 0.5 });
        at.put(mesh, 1.4, -8, {});
      },
      // A crash: three wrecks piled up, with glass and oil all over the road side.
      (at) => {
        at.blob(4.5, 0, 3.6, 7, slick, 8);
        at.put(cars[0], 3.4, -3.4, { turn: 0.5 });
        at.put(cars[1], 4.4, 0.6, { turn: -0.7 });
        at.put(cars[2], 3.6, 4.8, { turn: 2.2 });
        at.put(burning, 6.6, -1);
        at.put(board, 1.6, -7.4, { turn: at.inward });
        at.put(board, 1.6, 8.4, { turn: at.inward });
        for (const [out, down] of [[1, -5], [1.2, -2.5], [1, 0], [1.2, 2.5], [1, 5]]) at.put(pylon, out, down);
        at.put(tree, 9, 4, { scale: 1.5 });
      },
    ];
    spots(13).forEach((at, i) => scenes[i % scenes.length](at));

    // A thinner scatter between the scenes.
    beside(22, cars, { from: track.limit + 3, to: track.limit + 20, scale: [0.9, 1.1] });
    beside(30, tree, { from: track.limit + 3, to: track.limit + 28, scale: [0.9, 1.8] });
    across(50, tree, { clear: track.limit + 3, reach: 230, scale: [1, 2] });
    beside(70, weeds, { from: track.limit + 1.2, to: track.limit + 12, scale: [1, 2] });
    beside(14, [barrel, leaking, tyres], { from: track.limit + 1.6, to: track.limit + 6, scale: [1, 1] });
    across(40, cans, { clear: track.limit + 8, reach: 220, scale: [1, 1] });
  },
};
