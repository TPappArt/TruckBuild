import { material } from '../../engine/materials.js';
import { kit, taperTop } from '../../parts/kit.js';
import { barricade, crate, drum, signPost, tuft } from '../dressing.js';

// Electric Swamp: a twisty night circuit through a bog wired with pylons.
// The road edges, the gates you drive under and most of the plant life
// glow. Thunder Bridge crosses the lake, and the lightning likes it.

const bark = material('#3b3340', { spec: 0.05, tex: 'bark' });
const iron = material('#4a5266', { spec: 0.4, shine: 30, tex: 'metal' });
const ironDark = material('#2f3545', { spec: 0.3, tex: 'metal' });
const stem = material('#c9d8c2', { spec: 0.1 });
const volt = material('#66f4ff', { glow: 1 });
const lime = material('#b6ff5c', { glow: 1 });
const pink = material('#ff6fe0', { glow: 1 });
const violet = material('#a98bff', { glow: 1 });
const ember = material('#ffe98a', { glow: 1 });
const reed = material('#3f6b45', { spec: 0.05 });
const reedDark = material('#2c5236', { spec: 0.05 });
const spot = material('#fff6d8', { glow: 0.8 });
const plank = material('#6a4f34', { spec: 0.05, tex: 'planks' });
const plankDark = material('#4a3522', { spec: 0.05, tex: 'planks' });
const pool = material('#1c8f8c', { glow: 0.45 });
const poolDeep = material('#126a72', { glow: 0.3 });
const mud = material('#1c3324', { spec: 0, tex: 'mud' });
const hazardYellow = material('#ffd23f', { spec: 0.2 });

function pylon() {
  const k = kit();
  k.box(ironDark, [1.8, 0.8, 1.8], { at: [0, 0.4, 0], r: 0.15 });
  k.box(iron, [1.1, 7.4, 1.1], { at: [0, 4.4, 0], r: 0.14, deform: taperTop(7.4, 0.42, 0.42) });
  // Cross braces, coil rings and the live ball on top.
  k.slab(ironDark, [1.3, 0.14, 1.3], { at: [0, 1.9, 0] });
  k.slab(ironDark, [0.9, 0.14, 0.9], { at: [0, 6.6, 0] });
  k.cyl(volt, { r: 0.62, len: 0.22, caps: 'none', axis: 'y' }, { at: [0, 3.2, 0] });
  k.cyl(volt, { r: 0.5, len: 0.22, caps: 'none', axis: 'y' }, { at: [0, 5.2, 0] });
  k.ball(volt, { r: 0.62, seg: 6, rings: 4 }, { at: [0, 8.5, 0] });
  return k.node;
}

/** Two pylons with a crackling arc between them, `span` metres either side. */
function gate(span) {
  const k = kit();
  const tower = pylon();
  for (const side of [1, -1]) {
    const copy = tower.clone();
    copy.position = [side * span, 0, 0];
    k.node.add(copy);
  }
  const steps = 9;
  let previous = [-span, 8.5];
  for (let i = 1; i <= steps; i++) {
    const x = -span + (2 * span * i) / steps;
    const y = i === steps ? 8.5 : 8.5 + (i % 2 ? 1.0 : -0.7);
    const length = Math.hypot(x - previous[0], y - previous[1]);
    k.slab(volt, [length, 0.24, 0.24], {
      at: [(x + previous[0]) / 2, (y + previous[1]) / 2, 0],
      rot: [0, 0, Math.atan2(y - previous[1], x - previous[0])],
    });
    previous = [x, y];
  }
  return k.node;
}

function mushroom(cap) {
  const k = kit();
  k.cyl(stem, { r: 0.2, r2: 0.3, len: 1.2, seg: 5, caps: 'none', axis: 'y' }, { at: [0, 0.6, 0] });
  k.dome(cap, { r: 1, seg: 6, rings: 2, squash: [1, 0.62, 1] }, { at: [0, 1.1, 0] });
  k.disc(stem, { r: 1, seg: 6, axis: 'y' }, { at: [0, 1.1, 0], rot: [Math.PI, 0, 0] });
  // Spots on the cap, and a frill under it.
  for (const [x, y, z] of [[0.45, 1.56, 0.2], [-0.3, 1.62, -0.3], [-0.1, 1.5, 0.6]]) k.ball(spot, { r: 0.14, seg: 4, rings: 2 }, { at: [x, y, z] });
  k.cyl(stem, { r: 0.3, r2: 0.5, len: 0.14, seg: 5, caps: 'none', axis: 'y' }, { at: [0, 0.98, 0] });
  return k.node;
}

function deadTree() {
  const k = kit();
  k.cyl(bark, { r: 0.12, r2: 0.42, len: 6.4, seg: 5, caps: 'none', axis: 'y' }, { at: [0, 3.2, 0] });
  for (const [height, turn, lean, length] of [[3.3, 0.4, 0.95, 2.8], [4.4, 2.6, -0.85, 2.2], [5.3, 4.4, 0.7, 1.6]]) {
    const branch = k.sub({ at: [0, height, 0], rot: [0, turn, lean] });
    branch.cyl(bark, { r: 0.05, r2: 0.16, len: length, seg: 4, caps: 'none', axis: 'y' }, { at: [0, length / 2, 0] });
    // A twig, and moss hanging off the end.
    branch.cyl(bark, { r: 0.03, r2: 0.07, len: length * 0.5, seg: 3, caps: 'none', axis: 'y' }, { at: [length * 0.16, length * 0.8, 0], rot: [0, 0, -0.9] });
    branch.slab(reedDark, [0.1, 0.9, 0.1], { at: [0, length * 0.9, 0], rot: [0, 0, -lean] });
  }
  return k.node;
}

function reeds() {
  const k = kit();
  for (const [x, z, height] of [[0, 0, 2.2], [0.35, 0.2, 1.6], [-0.25, 0.3, 1.9], [0.1, -0.3, 1.3]]) {
    k.lathe(reed, [[0, height], [0.09, 0]], { seg: 3, axis: 'y' }, { at: [x, 0, z] });
    k.ball(lime, { r: 0.11, seg: 4, rings: 2 }, { at: [x, height, z] });
  }
  return k.node;
}

/** A jetty of planks on posts, running out along +z. About 110 triangles. */
function jetty() {
  const k = kit();
  for (let i = 0; i < 6; i++) k.slab(i % 2 ? plank : plankDark, [2.2, 0.14, 1.0], { at: [0, 0.7, i * 1.08], rot: [0, (i % 3 - 1) * 0.05, 0] });
  for (const z of [0, 2.7, 5.4]) {
    for (const side of [1, -1]) k.slab(plankDark, [0.2, 1.5 + (z ? 0 : 0.9), 0.2], { at: [side * 1.0, 0.75, z] });
  }
  k.ball(ember, { r: 0.24, seg: 5, rings: 3 }, { at: [1.0, 1.9, 0] });
  return k.node;
}

/** A rowing boat pulled up on the mud. About 50 triangles. */
function boat() {
  const k = kit();
  k.prism(plank, [[-0.9, 0.7], [0.9, 0.7], [0.55, 0], [-0.55, 0]], { depth: 3.2, axis: 'z' }, { rot: [0, 0, 0.16] });
  k.slab(plankDark, [1.7, 0.1, 0.4], { at: [0.05, 0.55, 0.3], rot: [0, 0, 0.16] });
  k.slab(plankDark, [1.9, 0.12, 0.2], { at: [0.1, 0.74, 1.5], rot: [0, 0, 0.16] });
  k.slab(plank, [0.1, 0.1, 2.6], { at: [1.3, 0.2, 0.2], rot: [0, 0.3, 0] });
  return k.node;
}

function stump() {
  const k = kit();
  k.cyl(bark, { r: 0.5, r2: 0.7, len: 0.9, seg: 6, caps: 'start', axis: 'y' }, { at: [0, 0.45, 0] });
  k.ball(lime, { r: 0.14, seg: 4, rings: 2 }, { at: [0.3, 0.96, 0.1] });
  k.ball(pink, { r: 0.1, seg: 4, rings: 2 }, { at: [-0.2, 0.94, -0.2] });
  return k.node;
}

function spark(look) {
  const k = kit();
  k.ball(look, { r: 0.13, seg: 4, rings: 2 });
  return k.node;
}

export const swamp = {
  id: 'swamp',
  name: 'Electric Swamp',
  blurb: 'Lightning on Thunder Bridge',
  seed: 23,
  price: 300,

  layout: {
    points: [
      [-110, -70], [-40, -95], [25, -65], [85, -95], [140, -55], [135, 20], [90, 55],
      [95, 110], [30, 128], [-22, 90], [-75, 118], [-135, 80], [-112, 20], [-138, -28],
    ],
    halfWidth: 15.75,
    shoulder: 5,
    // Where the road leaves the flat: see race/track.js.
    sections: [
      { kind: 'split', around: 0.125, metres: 100 },
      { kind: 'over', around: 0.86, metres: 100 },
    ],
  },
  surface: { grip: 8, offroad: 0.42 },
  hazard: 'lightning', // see race/hazards.js
  feature: 'bridge', // see race/features.js

  sky: {
    top: '#0a0f2e',
    disc: { color: '#d8f6ff', size: 4.5, halo: '#3a7f8f' },
    stars: { count: 70, color: '#c9f8ff' },
    clouds: { count: 6, color: '#1f4a55', shade: '#16363f' },
  },
  fog: { color: '#1b4a48', density: 0.0062 },
  light: [0.42, 0.78, -0.46],
  lighting: { sun: [0.62, 0.84, 0.92], sky: [0.62, 0.82, 0.95], bounce: [0.2, 0.42, 0.34] },
  shadow: 0.34,

  /** The whole place flickers a little, as if the supply were unsteady. */
  pulse: (time) => 0.9 + 0.1 * Math.sin(time * 23) * Math.sin(time * 7.3),

  // The air: fireflies rising, and mist lying on the bog.
  air: { color: '#d8ff7a', count: 46, size: [0.05, 0.09], glow: 1, fall: -0.5, wind: [0.5, 0.3] },
  mist: { strength: 0.55, scale: 0.014, drift: [0.006, 0.01] },
  grain: 0.2,
  cinematic: { eye: [60, 8, 24], target: [0, -2, 3], fov: 0.92, cars: -30 },

  ground: material('#27462f', { tex: 'grass', strength: 0.6 }),
  road: {
    surface: material('#3d3340', { tex: 'asphalt' }),
    shoulder: material('#2f5a3a', { tex: 'grass' }),
    wear: material('#27462f', { tex: 'mud' }),
    patch: material('#453a49', { tex: 'asphalt' }),
    scuff: material('#2c2530'),
    // Live rails instead of kerbs.
    kerbA: volt,
    kerbB: volt,
    kerbWidth: 0.4,
    line: lime,
    chequerDark: material('#1d1f2b'),
    chequerLight: material('#e8f6f2'),
  },
  preview: { ground: '#1f3f33', road: '#4a3f52', accent: '#66f4ff' },
  decals: {
    road: [['puddle', 18, 3.6], ['crack', 10, 3]],
    verge: [['moss', 30, 3.4], ['puddle', 12, 3]],
  },

  // Viaducts, cuttings and islands: iron, edged with live rail, and a row
  // of mushrooms down the middle.
  works: {
    wall: iron,
    wallDark: ironDark,
    trim: volt,
    roof: material('#1d1f2b', { spec: 0.05 }),
    lamp: lime,
    island: material('#2f5a36', { spec: 0, tex: 'grass' }),
    graffiti: ['bolt', 'tagZap', 'moss', 'smiley', 'bolt', 'tagFizz'],
    arch: material('#1d1f2b', { spec: 0 }),
  },
  median: () => mushroom(pink),

  paintGround({ paint, random, track }) {
    const moss = ['#2f5a36', '#21402b', '#35633a'].map((hex) => material(hex, { tex: 'mud' }));
    for (let i = 0; i < 80; i++) {
      paint.blob(random.range(-300, 300), random.range(-300, 300), random.range(12, 40), random.range(8, 20), random.range(0, Math.PI), random.pick(moss));
    }
    // Pools, faintly lit from below, each with a darker bank.
    const pools = [pool, poolDeep];
    for (let i = 0; i < 46; i++) {
      const x = random.range(-260, 260);
      const z = random.range(-260, 260);
      const rx = random.range(6, 20);
      const rz = random.range(5, 13);
      const turn = random.range(0, Math.PI);
      paint.blob(x, z, rx + 1.2, rz + 1.2, turn, mud, 8);
      paint.blob(x, z, rx, rz, turn, random.pick(pools), 8);
    }
    // Rushes near the road, in clumps.
    const blades = [material('#3f7a48'), material('#4f9a52'), material('#2c5236')];
    for (let i = 0; i < 260; i++) {
      const p = track.pointAt(random() * track.count, (random() < 0.5 ? 1 : -1) * (track.limit + 0.8 + random() * random() * 24));
      paint.strands(p.x, p.z, 4 + Math.floor(random() * 6), 1.1, random.pick(blades), random);
    }
  },

  marker() {
    const k = kit();
    k.slab(ironDark, [0.34, 1.3, 0.34], { at: [0, 0.65, 0] });
    k.slab(volt, [0.42, 0.22, 0.42], { at: [0, 1.38, 0] });
    k.slab(ironDark, [0.5, 0.12, 0.5], { at: [0, 0.06, 0] });
    return k.node;
  },

  decorate({ place, beside, across, landmark, spots, track }) {
    // Arc gates over the road, spaced around the lap.
    const arch = gate(track.limit + 1.6);
    const gates = 7;
    for (let i = 1; i <= gates; i++) {
      const p = track.pointAt(Math.round((i * track.count) / (gates + 1)), 0);
      place(arch, p.x, p.z, { turn: p.heading });
    }

    // Giant pylons standing in the bog.
    const tower = pylon();
    for (const [x, z, scale] of [[10, 15, 4.5], [-60, 40, 3.2], [70, -20, 3.4], [200, 60, 5], [-210, -40, 5], [20, 215, 5], [-30, -190, 4.5]]) {
      landmark(tower, x, z, { clear: track.limit + 6, scale });
    }

    const caps = [mushroom(pink), mushroom(lime), mushroom(violet), mushroom(volt)];
    const tree = deadTree();
    const rushes = reeds();
    const sedge = tuft(reed, 6, 1.2, reedDark);
    const log = stump();
    const fly = [spark(ember), spark(volt), spark(lime)];
    const barrel = drum(material('#3f6b45', { spec: 0.2 }), hazardYellow);
    const fenceBoard = barricade(volt, ironDark);
    const box = crate(1.2, ironDark, iron);
    const warning = signPost(hazardYellow, ironDark);

    const scenes = [
      // A fairy ring: one giant mushroom with a ring of small ones round a pool.
      (at) => {
        at.blob(8, 0, 6.5, 7.5, mud, 9);
        at.blob(8, 0, 5.2, 6.2, pool, 9);
        at.put(caps[0], 8, 0, { scale: 5.5 });
        for (let i = 0; i < 9; i++) {
          const angle = (i / 9) * Math.PI * 2;
          at.put(caps[1 + (i % 3)], 8 + Math.cos(angle) * 6.6, Math.sin(angle) * 7.6, { scale: 1.1 + (i % 2) * 0.7 });
        }
        for (const [out, down] of [[1.5, -5], [2, 4], [1, 0]]) at.put(rushes, out, down, { scale: 1.3 });
      },
      // A substation: two pylons with an arc between, drums, a barrier and a warning sign.
      (at) => {
        at.blob(7, 0, 5, 9, mud, 8);
        at.put(gate(4.5), 8, 0, { turn: Math.PI / 2, scale: 0.9 });
        at.put(fenceBoard, 2, -3.2, { turn: at.inward });
        at.put(fenceBoard, 2, 3.2, { turn: at.inward - 0.12 });
        at.put(warning, 1, 0, { turn: at.inward });
        for (const [out, down] of [[4.5, -6.5], [5.4, -7.3], [4.4, -7.8]]) at.put(barrel, out, down);
        at.put(box, 5, 6.6, { turn: 0.4 });
        at.put(box, 5.2, 6.4, { turn: 1, scale: 0.75, y: 1.2 });
      },
      // A landing: a jetty over a pool, a boat on the mud and reeds all round.
      (at) => {
        at.blob(10, 0, 7, 10, mud, 9);
        at.blob(10.5, 0, 5.6, 8.6, poolDeep, 9);
        at.put(jetty(), 2.4, 0, { turn: -at.inward });
        at.put(boat(), 3, 5.5, { turn: 0.5 });
        for (let i = 0; i < 9; i++) {
          const angle = (i / 9) * Math.PI * 2 + 0.2;
          at.put(i % 2 ? rushes : sedge, 10.5 + Math.cos(angle) * 6.6, Math.sin(angle) * 9.6, { scale: 1.2 + (i % 3) * 0.4 });
        }
        at.put(log, 2, -6);
      },
      // A dead grove: bare trees in a ring, stumps, and fireflies caught in it.
      (at) => {
        at.blob(8, 0, 7, 8, mud, 8);
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + 0.5;
          at.put(tree, 8 + Math.cos(angle) * 6, Math.sin(angle) * 7, { scale: 1.1 + (i % 3) * 0.35, turn: angle * 2 });
          at.put(log, 8 + Math.cos(angle + 0.5) * 3, Math.sin(angle + 0.5) * 3.5, { scale: 0.9 });
        }
        for (let i = 0; i < 10; i++) at.put(fly[i % 3], 4 + ((i * 37) % 80) / 10, -5 + ((i * 53) % 100) / 10, { y: 1 + ((i * 29) % 40) / 10 });
        at.put(caps[2], 8, 0, { scale: 2.4 });
      },
    ];
    spots(11).forEach((at, i) => scenes[i % scenes.length](at));

    // A thinner scatter between the scenes.
    beside(40, caps, { from: track.limit + 2, to: track.limit + 20, scale: [0.6, 3.4] });
    across(60, caps, { clear: track.limit + 2, reach: 220, scale: [1, 4.5] });
    beside(34, tree, { from: track.limit + 3, to: track.limit + 30, scale: [0.8, 1.7] });
    across(54, tree, { clear: track.limit + 3, reach: 240, scale: [1, 2.2] });
    beside(70, [rushes, sedge], { from: track.limit + 1.5, to: track.limit + 14, scale: [0.8, 1.6] });
  },
};
