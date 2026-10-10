import { material } from '../../engine/materials.js';
import { kit, taperTop } from '../../parts/kit.js';
import { barricade, bunting, cone, crate, signPost, tuft } from '../dressing.js';
import { faceted } from '../world.js';

// Pyramid Desert: a fast, flowing circuit between the pyramids.
// The road runs through the Great Pyramid, where the mummies are.

const stone = material('#dcb46c', { spec: 0.05 });
const stoneDark = material('#b98d52', { spec: 0.05 });
const gold = material('#ffd65c', { spec: 0.7, shine: 40 });
const trunk = material('#8c633a', { spec: 0.05 });
const trunkRing = material('#6f4c2a', { spec: 0.05 });
const leaf = material('#3fae53', { spec: 0.15 });
const leafDark = material('#2f8f45', { spec: 0.15 });
const coconut = material('#5a3f26', { spec: 0.1 });
const cactusGreen = material('#4fa35c', { spec: 0.12 });
const cactusFlower = material('#ff6fae', { spec: 0.2 });
const rock = material('#b99a76', { spec: 0.05 });
const dryGrass = material('#c9a24e', { spec: 0 });
const dryGrassPale = material('#e0c477', { spec: 0 });
const water = material('#3fb7d9', { glow: 0.25 });
const waterRim = material('#7fcf8a');
const paving = material('#cfa868', { spec: 0 });
const pit = material('#7a5a34', { spec: 0 });
const pitDeep = material('#4a3520', { spec: 0 });
const clay = material('#c9653a', { spec: 0.2 });
const red = material('#e4463a', { spec: 0.2 });
const cream = material('#f6f1e4', { spec: 0.1 });
const teal = material('#2fa6a0', { spec: 0.2 });

const QUARTER = Math.PI / 4;

function pyramid(size) {
  const k = kit();
  const height = size * 0.95;
  faceted(k.lathe(stone, [[0, height], [size, 0]], { seg: 4, axis: 'y' }, { rot: [0, QUARTER, 0] }));
  // Gilded capstone, a touch proud of the stone so it never flickers.
  faceted(
    k.lathe(gold, [[0, height + 0.4], [size * 0.19, height * 0.82]], { seg: 4, axis: 'y' }, { rot: [0, QUARTER, 0] }),
  );
  return k.node;
}

function obelisk() {
  const k = kit();
  k.box(stoneDark, [2.4, 0.7, 2.4], { at: [0, 0.35, 0], r: 0.12 });
  k.box(stone, [1.6, 9, 1.6], { at: [0, 5.1, 0], r: 0.12, deform: taperTop(9, 0.6, 0.6) });
  // Carved bands.
  for (const y of [2.2, 4.4, 6.4]) k.slab(stoneDark, [1.5 - y * 0.06, 0.16, 1.5 - y * 0.06], { at: [0, y, 0] });
  faceted(k.lathe(gold, [[0, 1.3], [0.7, 0]], { seg: 4, axis: 'y' }, { at: [0, 9.55, 0], rot: [0, QUARTER, 0] }));
  return k.node;
}

function palm() {
  const k = kit();
  k.cyl(trunk, { r: 0.2, r2: 0.34, len: 5.2, seg: 5, caps: 'none', axis: 'y' }, { at: [0.3, 2.6, 0], rot: [0, 0, -0.12] });
  // Rings up the trunk.
  for (const y of [1.2, 2.4, 3.6]) k.cyl(trunkRing, { r: 0.3 - y * 0.02, len: 0.14, seg: 5, caps: 'none', axis: 'y' }, { at: [0.14 + y * 0.115, y, 0] });
  const crown = [0.62, 5.1, 0];
  for (let i = 0; i < 6; i++) {
    const frond = k.sub({ at: crown, rot: [0, (i / 6) * Math.PI * 2, -0.38 - (i % 2) * 0.22] });
    frond.prism(i % 2 ? leafDark : leaf, [[0, -0.28], [1.5, -0.5], [2.8, 0], [1.5, 0.5], [0, 0.28]], { depth: 0.07, axis: 'y' });
  }
  k.ball(coconut, { r: 0.2, seg: 4, rings: 2 }, { at: [0.78, 4.85, 0.12] });
  k.ball(coconut, { r: 0.2, seg: 4, rings: 2 }, { at: [0.5, 4.85, -0.14] });
  return k.node;
}

function cactus() {
  const k = kit();
  const limb = (r, len, axis, at) => k.cyl(cactusGreen, { r, r2: r, len, seg: 6, caps: 'start', axis }, { at });
  limb(0.4, 3, 'y', [0, 1.5, 0]);
  limb(0.24, 0.9, 'x', [0.6, 1.5, 0]);
  limb(0.24, 1.1, 'y', [0.95, 2.0, 0]);
  k.cyl(cactusGreen, { r: 0.22, len: 0.8, seg: 6, caps: 'end', axis: 'x' }, { at: [-0.55, 1.0, 0] });
  limb(0.22, 0.9, 'y', [-0.85, 1.4, 0]);
  // In flower.
  k.ball(cactusFlower, { r: 0.16, seg: 4, rings: 2 }, { at: [0, 3.08, 0] });
  k.ball(cactusFlower, { r: 0.12, seg: 4, rings: 2 }, { at: [0.95, 2.62, 0] });
  return k.node;
}

function boulder() {
  const k = kit();
  faceted(k.ball(rock, { r: 1, seg: 5, rings: 3, squash: [1.3, 0.8, 1] }, { at: [0, 0.5, 0] }));
  return k.node;
}

/** A column: whole, or broken off at `height`. */
function column(height = 5) {
  const k = kit();
  k.cyl(stone, { r: 0.6, len: height, seg: 6, caps: 'start', axis: 'y' }, { at: [0, height / 2, 0] });
  k.slab(stoneDark, [1.7, 0.45, 1.7], { at: [0, 0.22, 0] });
  if (height >= 5) k.slab(stoneDark, [1.7, 0.45, 1.7], { at: [0, height + 0.2, 0] });
  // Fluting: bands that read as carving.
  for (let y = 1.1; y < height - 0.3; y += 1.3) k.cyl(stoneDark, { r: 0.64, len: 0.12, seg: 6, caps: 'none', axis: 'y' }, { at: [0, y, 0] });
  return k.node;
}

function fallenColumn() {
  const k = kit();
  k.cyl(stone, { r: 0.6, len: 4.2, seg: 6, caps: 'both', axis: 'x' }, { at: [0, 0.55, 0], rot: [0, 0, 0.04] });
  k.cyl(stoneDark, { r: 0.64, len: 0.12, seg: 6, caps: 'none', axis: 'x' }, { at: [0.8, 0.58, 0] });
  k.cyl(stoneDark, { r: 0.64, len: 0.12, seg: 6, caps: 'none', axis: 'x' }, { at: [-0.9, 0.52, 0] });
  return k.node;
}

/** A striped tent, open at the front (+z). About 40 triangles. */
function tent(a, b) {
  const k = kit();
  for (let i = 0; i < 4; i++) {
    k.prism(i % 2 ? a : b, [[-2.2, 0], [2.2, 0], [0, 2.6]], { depth: 1.05, axis: 'z' }, { at: [0, 0, -1.6 + i * 1.05] });
  }
  k.slab(trunk, [0.12, 3.1, 0.12], { at: [0, 1.55, 2.1] });
  return k.node;
}

/** A tall clay jar. 30 triangles. */
function urn() {
  const k = kit();
  k.lathe(clay, [[0.2, 1.3], [0.28, 1.15], [0.5, 0.75], [0.3, 0]], { seg: 6, axis: 'y' });
  return k.node;
}

export const desert = {
  id: 'desert',
  name: 'Pyramid Desert',
  blurb: 'Mummies in the Great Pyramid',
  seed: 11,
  price: 0,

  layout: {
    points: [
      [-115, -80], [-25, -98], [80, -90], [145, -50], [150, 20], [100, 60],
      [40, 35], [-10, 60], [-15, 115], [-80, 130], [-145, 90], [-155, 0],
    ],
    halfWidth: 15.75,
    shoulder: 5,
    // Where the road leaves the flat: see race/track.js.
    sections: [
      { kind: 'split', around: 0.125, metres: 100 },
      { kind: 'fork', around: 0.631, metres: 150 },
    ],
  },
  surface: { grip: 9, offroad: 0.5 },
  hazard: 'mummy', // see race/hazards.js
  feature: 'pyramid', // see race/features.js

  sky: {
    top: '#2f8de8',
    disc: { color: '#fff6cf', size: 6, halo: '#ffe9a6' },
    clouds: { count: 7, color: '#fff7e0', shade: '#f3ddb0' },
  },
  fog: { color: '#f8dfa9', density: 0.0042 },
  light: [-0.5, 0.74, 0.45],
  lighting: { sun: [1.0, 0.96, 0.86], sky: [1.0, 0.98, 0.92], bounce: [0.62, 0.5, 0.36] },
  shadow: 0.3,

  // The air: dust on the wind, and a low haze off the sand.
  air: { color: '#fff1c9', count: 60, size: [0.03, 0.06], glow: 0.8, fall: 0.25, wind: [3.2, 1.2] },
  mist: { strength: 0.2, scale: 0.011, drift: [0.012, 0.004] },
  grain: 0.16,
  // Where the picture of the track is taken from, relative to the landmark:
  // [metres right of the road, metres along it, metres up], and what it looks at.
  cinematic: { eye: [-34, -82, 13], target: [4, -20, 7], fov: 0.95, cars: -58 },

  ground: material('#e8c27a'),
  road: {
    surface: material('#70605a'),
    shoulder: material('#d3a962'),
    wear: material('#e2bd78'),
    patch: material('#796962'),
    scuff: material('#5b4d48'),
    edge: material('#f3e2b4'),
    kerbA: material('#e4463a'),
    kerbB: material('#f6f1e4'),
    line: material('#f3e2b4'),
    chequerDark: material('#2b2a33'),
    chequerLight: material('#f6f1e4'),
  },
  preview: { ground: '#e8c27a', road: '#70605a', accent: '#e4463a' },

  // Viaducts, cuttings and islands: sandstone, with torches in the tunnels
  // and palms down the middle.
  works: {
    wall: material('#cfa35f', { spec: 0.05 }),
    wallDark: stoneDark,
    trim: gold,
    roof: material('#6f5536', { spec: 0.05 }),
    lamp: material('#ffb347', { glow: 1 }),
    island: material('#e8c27a', { spec: 0 }),
    arch: material('#7a5d3a', { spec: 0 }),
  },
  // Small palms: a full-size one would hang its fronds over the lanes.
  median: () => palm(),
  medianScale: 0.7,

  paintGround({ paint, random, track }) {
    const tones = [material('#f1d08d'), material('#dfb46c'), material('#ecc884')];
    for (let i = 0; i < 90; i++) {
      paint.blob(
        random.range(-330, 330),
        random.range(-330, 330),
        random.range(14, 46),
        random.range(8, 22),
        random.range(0, Math.PI),
        random.pick(tones),
      );
    }
    // Ripples in the sand: long thin crescents, all lying the same way.
    const ripple = material('#d9b168');
    for (let i = 0; i < 260; i++) {
      paint.blob(random.range(-260, 260), random.range(-260, 260), random.range(3, 9), random.range(0.18, 0.4), 0.5 + random.range(-0.2, 0.2), ripple, 6);
    }
    // Dry grass near the road, in clumps.
    for (let i = 0; i < 240; i++) {
      const p = track.pointAt(random() * track.count, (random() < 0.5 ? 1 : -1) * (track.limit + 1 + random() * random() * 26));
      paint.strands(p.x, p.z, 4 + Math.floor(random() * 5), 0.9, random() < 0.5 ? dryGrass : dryGrassPale, random);
    }
  },

  marker() {
    const k = kit();
    k.box(stoneDark, [0.9, 1.0, 0.9], { at: [0, 0.5, 0], r: 0.14 });
    k.slab(gold, [0.96, 0.14, 0.96], { at: [0, 0.78, 0] });
    return k.node;
  },

  decorate({ place, beside, across, landmark, spots, track }) {
    // The great pyramids: two inside the circuit, the rest on the horizon.
    for (const [x, z, size] of [
      [-72, 18, 36], [82, -22, 28], [215, 95, 46], [-55, -200, 42], [70, 205, 50], [-255, 60, 44], [250, -120, 38],
    ]) {
      landmark(pyramid(size), x, z, { clear: size * 0.72 + track.limit + 4, turn: 0.3 });
    }

    // An avenue of obelisks either side of the start.
    const tall = obelisk();
    for (const i of [-16, 12]) {
      for (const side of [1, -1]) {
        const p = track.pointAt(i, side * (track.limit + 4));
        place(tall, p.x, p.z, { turn: p.heading });
      }
    }

    // Places of interest round the lap. Each is a little composition.
    const tree = palm();
    const whole = column(5);
    const stump = column(2.1);
    const fallen = fallenColumn();
    const stoneRock = boulder();
    const grass = tuft(dryGrass, 5, 0.8, dryGrassPale);
    const reed = tuft(leaf, 6, 1.3, leafDark);
    const fenceBoard = barricade(red, cream);
    const box = crate(1.2);
    const pot = urn();
    const pointer = signPost(red, cream);
    const marker = cone(material('#ff7a2e', { spec: 0.2 }));
    const flags = bunting(12, [red, cream, teal, gold], { flags: 12, height: 3.6 });

    const scenes = [
      // A ruined colonnade: a row of columns, some broken, one fallen, on a paved floor.
      (spot) => {
        spot.blob(5, 0, 5.5, 12, paving, 8);
        [-9, -4.5, 0, 4.5, 9].forEach((down, i) => spot.put(i === 1 || i === 4 ? stump : whole, 5, down));
        spot.put(fallen, 1.5, 7.5, { turn: 0.5 });
        spot.put(stoneRock, 0.5, -6, { scale: 0.8 });
        spot.put(stoneRock, 8.5, 3, { scale: 1.6, turn: 1 });
        for (const [out, down] of [[2, -2], [3, 3.5], [7.5, -7], [1, 10]]) spot.put(grass, out, down, { scale: 1.3 });
      },
      // An oasis: a pool ringed with palms and reeds.
      (spot) => {
        spot.blob(8, 0, 7, 9, waterRim, 9);
        spot.blob(8, 0, 5.6, 7.6, water, 9);
        for (let i = 0; i < 7; i++) {
          const angle = (i / 7) * Math.PI * 2 + 0.3;
          spot.put(tree, 8 + Math.cos(angle) * 7.5, Math.sin(angle) * 9.5, { turn: angle, scale: 1 + (i % 3) * 0.22 });
          spot.put(reed, 8 + Math.cos(angle + 0.4) * 6, Math.sin(angle + 0.4) * 8, { scale: 1.2 });
        }
        spot.put(stoneRock, 1.5, 5, { scale: 0.9 });
      },
      // A dig: a pit fenced off with barriers, crates of finds and a signpost.
      (spot) => {
        spot.blob(7, 0, 4.5, 6, pit, 8);
        spot.blob(7, 0, 3, 4.4, pitDeep, 8);
        spot.put(fenceBoard, 1.8, -3, { turn: spot.inward });
        spot.put(fenceBoard, 1.8, 3, { turn: spot.inward + 0.15 });
        spot.put(fenceBoard, 7, -7.4, { turn: 0.2 });
        spot.put(box, 3, 7.5, { turn: 0.3 });
        spot.put(box, 4.4, 8, { turn: 1.1 });
        spot.put(box, 3.6, 7.8, { turn: 0.7, scale: 0.8, y: 1.2 });
        spot.put(pot, 2.4, 9.4);
        spot.put(pot, 12, 2, { scale: 1.3 });
        spot.put(pointer, 0.6, -6.5, { turn: spot.inward });
        for (const down of [-1.2, 0, 1.2]) spot.put(marker, 0.4, down);
      },
      // A camp: two tents, a line of flags, jars and a palm for shade.
      (spot) => {
        spot.put(tent(red, cream), 7, -4, { turn: spot.inward });
        spot.put(tent(teal, cream), 8, 4.5, { turn: spot.inward + 0.25, scale: 0.85 });
        spot.put(flags, 2.4, 0, { turn: 0 });
        spot.put(tree, 12, 0.5, { scale: 1.3 });
        for (const [out, down, scale] of [[3.6, -1, 1], [4.2, 0, 0.8], [3.4, 1, 1.2]]) spot.put(pot, out, down, { scale });
        spot.put(box, 4, 8.4, { turn: 0.4 });
        spot.put(grass, 1, -7, { scale: 1.4 });
      },
      // Standing stones: boulders in a ring with cactus between.
      (spot) => {
        const prickly = cactus();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          spot.put(stoneRock, 7 + Math.cos(angle) * 5, Math.sin(angle) * 6, { scale: 1.4 + (i % 2) * 0.9, turn: angle });
          spot.put(i % 2 ? prickly : grass, 7 + Math.cos(angle + 0.5) * 7.5, Math.sin(angle + 0.5) * 8.5, { scale: 1.2 });
        }
        spot.put(whole, 7, 0);
      },
    ];
    spots(11).forEach((spot, i) => scenes[i % scenes.length](spot));

    // A thin scatter to fill the gaps, mostly out in the distance.
    beside(22, tree, { from: track.limit + 4, to: track.limit + 24, scale: [0.9, 1.5] });
    across(40, cactus(), { clear: track.limit + 3, reach: 230, scale: [0.8, 1.5] });
    across(80, stoneRock, { clear: track.limit + 2, reach: 260, scale: [0.6, 2.6] });
    beside(70, grass, { from: track.limit + 1.5, to: track.limit + 12, scale: [0.9, 1.8] });
  },
};
