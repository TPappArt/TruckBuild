import { material } from '../../engine/materials.js';
import { kit } from '../../parts/kit.js';
import { bunting, fence, hayBale, signPost, tuft } from '../dressing.js';
import { faceted } from '../world.js';

// Snowy Mountains: a long circuit with a hairpin, on packed snow. Grip is
// low, so cars slide wide if they carry too much speed into a corner.
// Avalanche Pass is where the snowballs and the wind are.

const rock = material('#7c8ba3', { spec: 0.05 });
const snow = material('#f6faff', { spec: 0.2, shine: 20 });
const snowShade = material('#d5e6f6', { spec: 0.1 });
const pine = material('#2f7d5b', { spec: 0.08 });
const pineDark = material('#256a4d', { spec: 0.08 });
const trunk = material('#6b4a33', { spec: 0.05 });
const log = material('#8a5f3c', { spec: 0.05 });
const logDark = material('#5f4126', { spec: 0.05 });
const ice = material('#9fdcff', { spec: 0.9, shine: 70 });
const coal = material('#2b2f3a', { spec: 0.2 });
const carrot = material('#ff8a2a', { spec: 0.2 });
const pole = material('#ff7a2e', { spec: 0.2 });
const scarf = material('#e4463a', { spec: 0.2 });
const blue = material('#2f7df2', { spec: 0.2 });
const yellow = material('#ffc928', { spec: 0.2 });
const windowGlow = material('#ffd27a', { glow: 1 });
const pond = material('#bfe3fb');
const pondEdge = material('#e2f2ff');
const pondCrack = material('#8fbfe0');
const frostGrass = material('#9bb7a8', { spec: 0 });

function mountain(radius, height) {
  const k = kit();
  faceted(k.lathe(rock, [[0, height], [radius * 0.5, height * 0.5], [radius, 0]], { seg: 7, axis: 'y' }));
  // Snow cap, sitting just proud of the rock.
  faceted(k.lathe(snow, [[0, height + 0.6], [radius * 0.36, height * 0.66], [radius * 0.3, height * 0.6]], { seg: 7, axis: 'y' }));
  return k.node;
}

function pineTree() {
  const k = kit();
  k.cyl(trunk, { r: 0.22, r2: 0.3, len: 1.4, seg: 5, caps: 'none', axis: 'y' }, { at: [0, 0.7, 0] });
  k.lathe(pineDark, [[0, 3.0], [1.5, 1.0]], { seg: 6, axis: 'y' });
  k.lathe(pine, [[0, 4.1], [1.15, 2.2]], { seg: 6, axis: 'y' });
  k.lathe(snow, [[0, 5.1], [0.8, 3.4]], { seg: 6, axis: 'y' });
  // Snow lying on the lower boughs.
  k.lathe(snow, [[0.5, 3.0], [1.0, 2.4]], { seg: 6, axis: 'y' });
  return k.node;
}

function snowman() {
  const k = kit();
  k.ball(snow, { r: 0.8, seg: 6, rings: 3 }, { at: [0, 0.7, 0] });
  k.ball(snow, { r: 0.58, seg: 6, rings: 3 }, { at: [0, 1.75, 0] });
  k.ball(snow, { r: 0.42, seg: 6, rings: 3 }, { at: [0, 2.55, 0] });
  k.cyl(scarf, { r: 0.46, len: 0.16, seg: 6, caps: 'none', axis: 'y' }, { at: [0, 2.2, 0] });
  k.slab(scarf, [0.16, 0.6, 0.08], { at: [0.25, 1.9, 0.42], rot: [0, 0, 0.2] });
  k.lathe(carrot, [[0, 0.5], [0.09, 0]], { seg: 4, axis: 'z' }, { at: [0, 2.55, 0.38] });
  k.cyl(coal, { r: 0.3, len: 0.5, seg: 6, caps: 'start', axis: 'y' }, { at: [0, 3.1, 0] });
  k.cyl(coal, { r: 0.46, len: 0.06, seg: 6, axis: 'y' }, { at: [0, 2.88, 0] });
  // Buttons, eyes and stick arms.
  for (const y of [1.55, 1.85]) k.slab(coal, [0.1, 0.1, 0.06], { at: [0, y, 0.56] });
  for (const side of [1, -1]) {
    k.slab(coal, [0.08, 0.08, 0.05], { at: [side * 0.15, 2.66, 0.38] });
    k.slab(trunk, [0.9, 0.06, 0.06], { at: [side * 0.9, 1.95, 0], rot: [0, 0, side * 0.5] });
  }
  return k.node;
}

function crystal() {
  const k = kit();
  for (const [x, z, height, lean] of [[0, 0, 3.2, 0], [0.7, 0.2, 2.0, 0.35], [-0.5, 0.4, 1.6, -0.4], [0.1, -0.6, 1.2, 0.2]]) {
    faceted(
      k.lathe(ice, [[0, height], [0.42, height * 0.72], [0.34, 0]], { seg: 5, axis: 'y' }, { at: [x, 0, z], rot: [0, 0, lean] }),
    );
  }
  return k.node;
}

function drift() {
  const k = kit();
  k.dome(snow, { r: 1, seg: 7, rings: 2, squash: [1.6, 0.5, 1] });
  return k.node;
}

/** A log cabin with snow on the roof and a light on. Door faces +z. About 170 triangles. */
function cabin() {
  const k = kit();
  k.slab(log, [5, 2.6, 4], { at: [0, 1.3, 0] });
  // Logs: bands a finger proud of the walls.
  for (const y of [0.45, 1.3, 2.15]) k.slab(logDark, [5.14, 0.12, 4.14], { at: [0, y, 0] });
  for (const x of [-2.5, 2.5]) for (const z of [-2, 2]) k.slab(logDark, [0.36, 2.8, 0.36], { at: [x, 1.4, z] });
  k.prism(logDark, [[-2.4, 0], [2.4, 0], [0, 2.0]], { depth: 5.6, axis: 'x' }, { at: [0, 2.6, 0] });
  k.prism(snow, [[-2.6, 0], [2.6, 0], [0, 2.2]], { depth: 5.3, axis: 'x' }, { at: [0, 2.74, 0] });
  k.slab(logDark, [1.1, 1.9, 0.12], { at: [-0.9, 0.95, 2.02] });
  k.slab(windowGlow, [1.2, 0.9, 0.12], { at: [1.1, 1.5, 2.02] });
  k.slab(logDark, [1.3, 0.1, 0.16], { at: [1.1, 1.5, 2.02] });
  k.slab(logDark, [0.1, 1.0, 0.16], { at: [1.1, 1.5, 2.02] });
  k.slab(rock, [0.8, 2.4, 0.8], { at: [1.6, 4, -1] });
  k.slab(snow, [0.9, 0.2, 0.9], { at: [1.6, 5.25, -1] });
  return k.node;
}

/** A pile of split logs. About 60 triangles. */
function woodpile() {
  const k = kit();
  for (const [x, y] of [[-0.5, 0.25], [0, 0.25], [0.5, 0.25], [-0.25, 0.68], [0.25, 0.68]]) {
    k.cyl(y > 0.5 ? log : logDark, { r: 0.25, len: 1.6, seg: 5, caps: 'both', axis: 'z' }, { at: [x, y, 0] });
  }
  k.dome(snow, { r: 1, seg: 5, rings: 2, squash: [0.75, 0.2, 0.85] }, { at: [0, 0.9, 0] });
  return k.node;
}

/** A slalom gate: a pole with a flag. 24 triangles. */
function slalom(colour) {
  const k = kit();
  k.slab(coal, [0.1, 2.2, 0.1], { at: [0, 1.1, 0], rot: [0, 0, 0.08] });
  k.slab(colour, [0.7, 0.5, 0.06], { at: [0.28, 1.9, 0] });
  return k.node;
}

/** A block of packed snow, for building walls with. 12 triangles. */
function snowBlock() {
  const k = kit();
  k.slab(snowShade, [1.3, 0.7, 0.8], { at: [0, 0.35, 0] });
  return k.node;
}

export const snowy = {
  id: 'snow',
  name: 'Snowy Mountains',
  blurb: 'Snowballs in Avalanche Pass',
  seed: 37,
  price: 400,

  layout: {
    points: [
      [-130, -40], [-65, -105], [25, -110], [115, -85], [155, -15], [125, 55], [60, 40],
      [28, 88], [85, 126], [35, 176], [-60, 140], [-85, 60], [-155, 25],
    ],
    halfWidth: 15.75,
    shoulder: 5,
  },
  surface: { grip: 5, offroad: 0.55, slide: 0.75 },
  hazard: 'storm', // see race/hazards.js
  feature: 'pass', // see race/features.js

  sky: {
    top: '#4f9eea',
    disc: { color: '#ffffff', size: 5, halo: '#eaf4ff' },
    clouds: { count: 9, color: '#ffffff', shade: '#d5e6f6' },
  },
  fog: { color: '#e6f1fb', density: 0.0045 },
  light: [0.48, 0.72, 0.5],
  lighting: { sun: [1.0, 0.98, 0.95], sky: [0.92, 0.97, 1.0], bounce: [0.7, 0.8, 0.95] },
  shadow: 0.24,

  // The air: snow falling everywhere, harder in the pass.
  air: { color: '#ffffff', count: 90, size: [0.05, 0.1], glow: 1, fall: 3.5, wind: [2, 1] },
  mist: { strength: 0.2, scale: 0.012, drift: [0.02, 0.008] },
  grain: 0.1,
  cinematic: { eye: [10, -78, 9], target: [-2, -10, 7], fov: 0.95, cars: -40 },

  ground: material('#f1f6fc'),
  road: {
    surface: material('#627184'),
    shoulder: material('#dbe8f5'),
    wear: material('#c5d6e8'),
    patch: material('#6b7b8f'),
    scuff: material('#52607a'),
    edge: material('#e9f4ff'),
    kerbA: material('#2f7df2'),
    kerbB: material('#ffffff'),
    line: material('#e9f4ff'),
    chequerDark: material('#232838'),
    chequerLight: material('#ffffff'),
  },
  preview: { ground: '#e6f0fa', road: '#627184', accent: '#2f7df2' },

  paintGround({ paint, random, track }) {
    const tones = [material('#e2edf8'), material('#fbfdff'), material('#d5e6f6')];
    for (let i = 0; i < 90; i++) {
      paint.blob(random.range(-330, 330), random.range(-330, 330), random.range(14, 44), random.range(8, 22), random.range(0, Math.PI), random.pick(tones));
    }
    // Frozen ponds, with a pale rim and a crack or two.
    for (let i = 0; i < 16; i++) {
      const x = random.range(-260, 260);
      const z = random.range(-260, 260);
      const rx = random.range(10, 24);
      const rz = random.range(8, 16);
      const turn = random.range(0, Math.PI);
      paint.blob(x, z, rx + 1, rz + 1, turn, pondEdge, 9);
      paint.blob(x, z, rx, rz, turn, pond, 9);
      paint.blob(x, z, rx * 0.8, 0.12, turn + 0.4, pondCrack, 4);
      paint.blob(x + 2, z + 1, rx * 0.4, 0.1, turn - 0.7, pondCrack, 4);
    }
    // Wind-blown streaks in the snow, and grass poking through near the road.
    const streak = material('#dbe8f5');
    for (let i = 0; i < 220; i++) {
      paint.blob(random.range(-260, 260), random.range(-260, 260), random.range(3, 10), random.range(0.2, 0.5), 0.3 + random.range(-0.15, 0.15), streak, 6);
    }
    for (let i = 0; i < 200; i++) {
      const p = track.pointAt(random() * track.count, (random() < 0.5 ? 1 : -1) * (track.limit + 1 + random() * random() * 22));
      paint.strands(p.x, p.z, 3 + Math.floor(random() * 4), 0.8, frostGrass, random);
    }
  },

  marker() {
    const k = kit();
    k.slab(pole, [0.2, 1.7, 0.2], { at: [0, 0.85, 0] });
    k.slab(snow, [0.26, 0.3, 0.26], { at: [0, 1.25, 0] });
    k.dome(snow, { r: 1, seg: 5, rings: 2, squash: [0.5, 0.18, 0.5] });
    return k.node;
  },

  decorate({ random, beside, across, landmark, spots, track }) {
    // A ring of peaks around the valley, and a few that crowd in closer.
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + random.range(-0.1, 0.1);
      const distance = random.range(270, 360);
      const radius = random.range(55, 95);
      landmark(mountain(radius, radius * random.range(0.9, 1.35)), Math.cos(angle) * distance, 20 + Math.sin(angle) * distance, {
        clear: radius + track.limit,
        turn: random() * 6,
      });
    }
    for (const [x, z, radius, height] of [[-20, 10, 34, 44], [95, -25, 24, 30], [-5, 95, 14, 20], [215, 70, 40, 60], [-215, -60, 42, 58]]) {
      landmark(mountain(radius, height), x, z, { clear: radius + track.limit + 2, turn: random() * 6 });
    }

    const tree = pineTree();
    const man = snowman();
    const shard = crystal();
    const mound = drift();
    const block = snowBlock();
    const rail = fence(8, logDark, log, 1.1);
    const grass = tuft(frostGrass, 5, 0.6);
    const bale = hayBale();
    const flags = bunting(14, [scarf, yellow, blue, snow], { flags: 14, height: 3.8 });
    const gates = [slalom(scarf), slalom(blue)];
    const pointer = signPost(blue, snow);

    const scenes = [
      // A snowman family behind a wall of snow blocks.
      (at) => {
        for (let i = 0; i < 7; i++) at.put(block, 1.5 + Math.abs(i - 3) * 0.35, (i - 3) * 1.4, { turn: (i - 3) * 0.1 });
        for (let i = 1; i < 6; i += 2) at.put(block, 1.6 + Math.abs(i - 3) * 0.35, (i - 3) * 1.4 + 0.7, { y: 0.7 });
        at.put(man, 5, -2.4, { turn: at.inward, scale: 1.5 });
        at.put(man, 4.6, 0.6, { turn: at.inward + 0.2, scale: 1.15 });
        at.put(man, 4.2, 2.6, { turn: at.inward - 0.2, scale: 0.8 });
        at.put(mound, 8, 0, { scale: 3 });
        at.put(tree, 9, -6, { scale: 1.6 });
        at.put(tree, 10, 5, { scale: 1.3 });
      },
      // A cabin in the trees: logs stacked outside, a fence, and a light on.
      (at) => {
        at.put(cabin(), 9, 0, { turn: at.inward });
        at.put(woodpile(), 5, 4.6, { turn: 0.3 });
        at.put(rail, 3, -1, { turn: 0 });
        at.put(pointer, 1.2, 5, { turn: at.inward });
        for (const [out, down, scale] of [[14, -5, 1.9], [15, 3, 2.2], [9, -7.5, 1.4], [8, 8, 1.5], [16, -1, 1.6]]) at.put(tree, out, down, { scale });
        at.put(mound, 4, -5.5, { scale: 2 });
      },
      // A frozen pond with a ring of ice crystals round it.
      (at) => {
        at.blob(8, 0, 6.8, 8.4, pondEdge, 10);
        at.blob(8, 0, 6, 7.6, pond, 10);
        at.blob(8, 0, 0.14, 6, pondCrack, 4);
        at.blob(9, 1.5, 3.4, 0.12, pondCrack, 4);
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          at.put(shard, 8 + Math.cos(angle) * 7.4, Math.sin(angle) * 9, { scale: 1 + (i % 3) * 0.6, turn: angle });
        }
        at.put(grass, 1.4, -3, { scale: 1.3 });
        at.put(grass, 1, 4, { scale: 1.2 });
      },
      // A slalom course: gates in a zigzag, flags overhead, bales at the bottom.
      (at) => {
        for (let i = 0; i < 6; i++) at.put(gates[i % 2], 4 + (i % 2) * 4.5, (i - 2.5) * 2.6);
        at.put(flags, 2, 0);
        for (const [out, down, turn] of [[1.2, -8, 0], [1.2, -5.9, 0.1], [1.4, 8, -0.1], [1.2, -6.9, 0]]) at.put(bale, out, down, { turn, y: down === -6.9 ? 0.9 : 0 });
        at.put(mound, 10, 3, { scale: 2.6 });
        at.put(tree, 12, -5, { scale: 1.7 });
      },
      // A stand of pines, tallest in the middle, with drifts between.
      (at) => {
        for (const [out, down, scale] of [[8, 0, 2.6], [5, -3.5, 1.7], [5.5, 3.6, 1.9], [11, -4, 2.0], [11.5, 4, 1.8], [3, 0.5, 1.2], [14, 0, 2.2], [7.5, -8, 1.4], [8, 8, 1.5]]) {
          at.put(tree, out, down, { scale });
        }
        for (const [out, down] of [[2, -5], [2.4, 5.4], [6, 0]]) at.put(mound, out, down, { scale: 1.8 });
        at.put(shard, 1.6, 2, { scale: 0.9 });
      },
    ];
    spots(12).forEach((at, i) => scenes[i % scenes.length](at));

    // A thinner scatter between the scenes.
    beside(40, tree, { from: track.limit + 3, to: track.limit + 32, scale: [0.8, 1.9] });
    across(110, tree, { clear: track.limit + 3, reach: 250, scale: [0.9, 2.2] });
    beside(12, shard, { from: track.limit + 2, to: track.limit + 16, scale: [0.7, 1.8] });
    across(70, mound, { clear: track.limit + 1, reach: 260, scale: [1, 3.5] });
    beside(50, grass, { from: track.limit + 1.5, to: track.limit + 10, scale: [0.9, 1.6] });
  },
};
