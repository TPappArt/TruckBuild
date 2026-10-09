import { material } from '../../engine/materials.js';
import { kit } from '../../parts/kit.js';
import { faceted } from '../world.js';

// Snowy Mountains: a long circuit with a hairpin, on packed snow. Grip is
// low, so cars slide wide if they carry too much speed into a corner.

const rock = material('#7c8ba3', { spec: 0.05 });
const snow = material('#f6faff', { spec: 0.2, shine: 20 });
const pine = material('#2f7d5b', { spec: 0.08 });
const pineDark = material('#256a4d', { spec: 0.08 });
const trunk = material('#6b4a33', { spec: 0.05 });
const ice = material('#9fdcff', { spec: 0.9, shine: 70 });
const coal = material('#2b2f3a', { spec: 0.2 });
const carrot = material('#ff8a2a', { spec: 0.2 });
const pole = material('#ff7a2e', { spec: 0.2 });
const scarf = material('#e4463a', { spec: 0.2 });

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
  return k.node;
}

function snowman() {
  const k = kit();
  k.ball(snow, { r: 0.8, seg: 6, rings: 3 }, { at: [0, 0.7, 0] });
  k.ball(snow, { r: 0.58, seg: 6, rings: 3 }, { at: [0, 1.75, 0] });
  k.ball(snow, { r: 0.42, seg: 6, rings: 3 }, { at: [0, 2.55, 0] });
  k.cyl(scarf, { r: 0.46, len: 0.16, seg: 6, caps: 'none', axis: 'y' }, { at: [0, 2.2, 0] });
  k.lathe(carrot, [[0, 0.5], [0.09, 0]], { seg: 4, axis: 'z' }, { at: [0, 2.55, 0.38] });
  k.cyl(coal, { r: 0.3, len: 0.5, seg: 6, caps: 'start', axis: 'y' }, { at: [0, 3.1, 0] });
  k.cyl(coal, { r: 0.46, len: 0.06, seg: 6, axis: 'y' }, { at: [0, 2.88, 0] });
  return k.node;
}

function crystal() {
  const k = kit();
  for (const [x, z, height, lean] of [[0, 0, 3.2, 0], [0.7, 0.2, 2.0, 0.35], [-0.5, 0.4, 1.6, -0.4]]) {
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

export const snowy = {
  id: 'snow',
  name: 'Snowy Mountains',
  seed: 37,

  layout: {
    points: [
      [-130, -40], [-65, -105], [25, -110], [115, -85], [155, -15], [125, 55], [60, 40],
      [28, 88], [85, 126], [35, 176], [-60, 140], [-85, 60], [-155, 25],
    ],
    halfWidth: 7,
    shoulder: 5,
  },
  surface: { grip: 3, offroad: 0.55 },

  sky: { top: '#4f9eea', disc: { color: '#ffffff', size: 5 } },
  fog: { color: '#e6f1fb', density: 0.0045 },
  light: [0.48, 0.72, 0.5],
  lighting: { sun: [1.0, 0.98, 0.95], sky: [0.92, 0.97, 1.0], bounce: [0.7, 0.8, 0.95] },
  shadow: 0.24,

  ground: material('#f1f6fc'),
  road: {
    surface: material('#627184'),
    shoulder: material('#dbe8f5'),
    kerbA: material('#2f7df2'),
    kerbB: material('#ffffff'),
    line: material('#e9f4ff'),
    chequerDark: material('#232838'),
    chequerLight: material('#ffffff'),
  },
  preview: { ground: '#e6f0fa', road: '#627184', accent: '#2f7df2' },

  paintGround({ paint, random }) {
    const tones = [material('#e2edf8'), material('#fbfdff'), material('#d5e6f6')];
    for (let i = 0; i < 90; i++) {
      paint.blob(random.range(-330, 330), random.range(-330, 330), random.range(14, 44), random.range(8, 22), random.range(0, Math.PI), random.pick(tones));
    }
    // Frozen ponds.
    const pond = material('#bfe3fb');
    for (let i = 0; i < 16; i++) {
      paint.blob(random.range(-260, 260), random.range(-260, 260), random.range(10, 24), random.range(8, 16), random.range(0, Math.PI), pond);
    }
  },

  marker() {
    const k = kit();
    k.slab(pole, [0.2, 1.7, 0.2], { at: [0, 0.85, 0] });
    k.slab(snow, [0.26, 0.3, 0.26], { at: [0, 1.25, 0] });
    return k.node;
  },

  decorate({ random, beside, across, landmark, track }) {
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

    beside(110, pineTree(), { from: track.limit + 3, to: track.limit + 32, scale: [0.8, 1.9] });
    across(140, pineTree(), { clear: track.limit + 3, reach: 250, scale: [0.9, 2.2] });
    beside(14, snowman(), { from: track.limit + 2.5, to: track.limit + 7, scale: [0.9, 1.3] });
    beside(34, crystal(), { from: track.limit + 2, to: track.limit + 16, scale: [0.7, 1.8] });
    across(90, drift(), { clear: track.limit + 1, reach: 260, scale: [1, 3.5] });
  },
};
