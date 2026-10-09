import { material } from '../../engine/materials.js';
import { kit, taperTop } from '../../parts/kit.js';
import { faceted } from '../world.js';

// Pyramid Desert: a fast, flowing circuit between the pyramids.

const stone = material('#dcb46c', { spec: 0.05 });
const stoneDark = material('#b98d52', { spec: 0.05 });
const gold = material('#ffd65c', { spec: 0.7, shine: 40 });
const trunk = material('#8c633a', { spec: 0.05 });
const leaf = material('#3fae53', { spec: 0.15 });
const coconut = material('#5a3f26', { spec: 0.1 });
const cactusGreen = material('#4fa35c', { spec: 0.12 });
const rock = material('#b99a76', { spec: 0.05 });

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
  faceted(k.lathe(gold, [[0, 1.3], [0.7, 0]], { seg: 4, axis: 'y' }, { at: [0, 9.55, 0], rot: [0, QUARTER, 0] }));
  return k.node;
}

function palm() {
  const k = kit();
  k.cyl(trunk, { r: 0.2, r2: 0.34, len: 5.2, seg: 5, caps: 'none', axis: 'y' }, { at: [0.3, 2.6, 0], rot: [0, 0, -0.12] });
  const crown = [0.62, 5.1, 0];
  for (let i = 0; i < 5; i++) {
    const frond = k.sub({ at: crown, rot: [0, (i / 5) * Math.PI * 2, -0.38] });
    frond.prism(leaf, [[0, -0.28], [1.5, -0.5], [2.8, 0], [1.5, 0.5], [0, 0.28]], { depth: 0.07, axis: 'y' });
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
  return k.node;
}

function boulder() {
  const k = kit();
  faceted(k.ball(rock, { r: 1, seg: 5, rings: 3, squash: [1.3, 0.8, 1] }, { at: [0, 0.5, 0] }));
  return k.node;
}

function column() {
  const k = kit();
  k.cyl(stone, { r: 0.6, len: 5, seg: 6, caps: 'start', axis: 'y' }, { at: [0, 2.5, 0] });
  k.slab(stoneDark, [1.7, 0.45, 1.7], { at: [0, 5.2, 0] });
  k.slab(stoneDark, [1.7, 0.45, 1.7], { at: [0, 0.22, 0] });
  return k.node;
}

export const desert = {
  id: 'desert',
  name: 'Pyramid Desert',
  seed: 11,

  layout: {
    points: [
      [-115, -80], [-25, -98], [80, -90], [145, -50], [150, 20], [100, 60],
      [40, 35], [-10, 60], [-15, 115], [-80, 130], [-145, 90], [-155, 0],
    ],
    halfWidth: 10.5,
    shoulder: 5,
  },
  surface: { grip: 6, offroad: 0.5 },
  hazard: 'mummy', // see race/hazards.js

  sky: { top: '#2f8de8', disc: { color: '#fff6cf', size: 6 } },
  fog: { color: '#f8dfa9', density: 0.0042 },
  light: [-0.5, 0.74, 0.45],
  lighting: { sun: [1.0, 0.96, 0.86], sky: [1.0, 0.98, 0.92], bounce: [0.62, 0.5, 0.36] },
  shadow: 0.3,

  ground: material('#e8c27a'),
  road: {
    surface: material('#70605a'),
    shoulder: material('#d3a962'),
    kerbA: material('#e4463a'),
    kerbB: material('#f6f1e4'),
    line: material('#f3e2b4'),
    chequerDark: material('#2b2a33'),
    chequerLight: material('#f6f1e4'),
  },
  preview: { ground: '#e8c27a', road: '#70605a', accent: '#e4463a' },

  paintGround({ paint, random }) {
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
  },

  marker() {
    const k = kit();
    k.box(stoneDark, [0.9, 1.0, 0.9], { at: [0, 0.5, 0], r: 0.14 });
    return k.node;
  },

  decorate({ place, beside, across, landmark, track }) {
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

    beside(60, palm(), { from: track.limit + 3, to: track.limit + 22, scale: [0.9, 1.5] });
    beside(18, column(), { from: track.limit + 3, to: track.limit + 12, scale: [0.8, 1.1] });
    across(70, cactus(), { clear: track.limit + 3, reach: 230, scale: [0.8, 1.5] });
    across(130, boulder(), { clear: track.limit + 2, reach: 260, scale: [0.6, 2.6] });
  },
};
