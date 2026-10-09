import { material } from '../../engine/materials.js';
import { kit, taperTop } from '../../parts/kit.js';

// Electric Swamp: a twisty night circuit through a bog wired with pylons.
// The road edges, the gates you drive under and most of the plant life glow.

const bark = material('#3b3340', { spec: 0.05 });
const iron = material('#4a5266', { spec: 0.4, shine: 30 });
const ironDark = material('#2f3545', { spec: 0.3 });
const stem = material('#c9d8c2', { spec: 0.1 });
const volt = material('#66f4ff', { glow: 1 });
const lime = material('#b6ff5c', { glow: 1 });
const pink = material('#ff6fe0', { glow: 1 });
const violet = material('#a98bff', { glow: 1 });
const ember = material('#ffe98a', { glow: 1 });
const reed = material('#3f6b45', { spec: 0.05 });

function pylon() {
  const k = kit();
  k.box(ironDark, [1.8, 0.8, 1.8], { at: [0, 0.4, 0], r: 0.15 });
  k.box(iron, [1.1, 7.4, 1.1], { at: [0, 4.4, 0], r: 0.14, deform: taperTop(7.4, 0.42, 0.42) });
  // Coil rings and the live ball on top.
  k.cyl(volt, { r: 0.62, len: 0.22, caps: 'none', axis: 'y' }, { at: [0, 3.2, 0] });
  k.cyl(volt, { r: 0.5, len: 0.22, caps: 'none', axis: 'y' }, { at: [0, 5.2, 0] });
  k.ball(volt, { r: 0.62, seg: 6, rings: 4 }, { at: [0, 8.5, 0] });
  return k.node;
}

/** Two pylons with a crackling arc between them, spanning the road. */
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
  return k.node;
}

function deadTree() {
  const k = kit();
  k.cyl(bark, { r: 0.12, r2: 0.42, len: 6.4, seg: 5, caps: 'none', axis: 'y' }, { at: [0, 3.2, 0] });
  for (const [height, turn, lean, length] of [[3.3, 0.4, 0.95, 2.8], [4.4, 2.6, -0.85, 2.2], [5.3, 4.4, 0.7, 1.6]]) {
    const branch = k.sub({ at: [0, height, 0], rot: [0, turn, lean] });
    branch.cyl(bark, { r: 0.05, r2: 0.16, len: length, seg: 4, caps: 'none', axis: 'y' }, { at: [0, length / 2, 0] });
  }
  return k.node;
}

function reeds() {
  const k = kit();
  for (const [x, z, height] of [[0, 0, 2.2], [0.35, 0.2, 1.6], [-0.25, 0.3, 1.9]]) {
    k.lathe(reed, [[0, height], [0.09, 0]], { seg: 3, axis: 'y' }, { at: [x, 0, z] });
    k.ball(lime, { r: 0.11, seg: 4, rings: 2 }, { at: [x, height, z] });
  }
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
  seed: 23,

  layout: {
    points: [
      [-110, -70], [-40, -95], [25, -65], [85, -95], [140, -55], [135, 20], [90, 55],
      [95, 110], [30, 128], [-22, 90], [-75, 118], [-135, 80], [-112, 20], [-138, -28],
    ],
    halfWidth: 10.5,
    shoulder: 5,
  },
  surface: { grip: 5.5, offroad: 0.42 },
  hazard: 'lightning', // see race/hazards.js

  sky: { top: '#0a0f2e', disc: { color: '#d8f6ff', size: 4.5 } },
  fog: { color: '#1b4a48', density: 0.0062 },
  light: [0.42, 0.78, -0.46],
  lighting: { sun: [0.62, 0.84, 0.92], sky: [0.62, 0.82, 0.95], bounce: [0.2, 0.42, 0.34] },
  shadow: 0.34,

  /** The whole place flickers a little, as if the supply were unsteady. */
  pulse: (time) => 0.9 + 0.1 * Math.sin(time * 23) * Math.sin(time * 7.3),

  ground: material('#27462f'),
  road: {
    surface: material('#3d3340'),
    shoulder: material('#2f5a3a'),
    // Live rails instead of kerbs.
    kerbA: volt,
    kerbB: volt,
    kerbWidth: 0.4,
    line: lime,
    chequerDark: material('#1d1f2b'),
    chequerLight: material('#e8f6f2'),
  },
  preview: { ground: '#1f3f33', road: '#4a3f52', accent: '#66f4ff' },

  paintGround({ paint, random }) {
    const moss = [material('#2f5a36'), material('#21402b'), material('#35633a')];
    for (let i = 0; i < 80; i++) {
      paint.blob(random.range(-300, 300), random.range(-300, 300), random.range(12, 40), random.range(8, 20), random.range(0, Math.PI), random.pick(moss));
    }
    // Pools, faintly lit from below.
    const pools = [material('#1c8f8c', { glow: 0.45 }), material('#176f7c', { glow: 0.35 })];
    for (let i = 0; i < 46; i++) {
      paint.blob(random.range(-260, 260), random.range(-260, 260), random.range(6, 20), random.range(5, 13), random.range(0, Math.PI), random.pick(pools));
    }
  },

  marker() {
    const k = kit();
    k.slab(ironDark, [0.34, 1.3, 0.34], { at: [0, 0.65, 0] });
    k.slab(volt, [0.42, 0.22, 0.42], { at: [0, 1.38, 0] });
    return k.node;
  },

  decorate({ place, beside, across, landmark, track }) {
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
    beside(90, caps, { from: track.limit + 2, to: track.limit + 20, scale: [0.6, 3.4] });
    across(70, caps, { clear: track.limit + 2, reach: 220, scale: [1, 4.5] });
    beside(70, deadTree(), { from: track.limit + 3, to: track.limit + 30, scale: [0.8, 1.7] });
    across(60, deadTree(), { clear: track.limit + 3, reach: 240, scale: [1, 2.2] });
    beside(120, reeds(), { from: track.limit + 1.5, to: track.limit + 14, scale: [0.8, 1.6] });
    // Drifting sparks and fireflies.
    beside(150, [spark(ember), spark(volt), spark(lime)], { from: track.limit + 1, to: track.limit + 24, y: [0.8, 5] });
  },
};
