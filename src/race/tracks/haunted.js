import { material } from '../../engine/materials.js';
import { kit } from '../../parts/kit.js';
import { fence, hayBale, signPost, tuft } from '../dressing.js';
import { ghost, gnarledTree, gravestones, jackOLantern } from '../setpieces.js';
import { faceted } from '../world.js';

// Haunted Hollow: a night circuit round the grounds of an old manor.
// The road cuts through its graveyard, where the skeletons are restless
// and a werewolf hunts.

const earth = material('#2b2a3a', { spec: 0 });
const wall = material('#4c4460', { spec: 0.05 });
const wallDark = material('#352f47', { spec: 0.05 });
const roof = material('#231f33', { spec: 0.1 });
const wood = material('#5a4335', { spec: 0.05 });
const woodDark = material('#3a2a22', { spec: 0.05 });
const iron = material('#1c1a26', { spec: 0.3 });
const pumpkin = material('#ff8a1f', { spec: 0.2 });
const candle = material('#ffb347', { glow: 1 });
const brew = material('#9dff4a', { glow: 1 });
const windowGlow = material('#ffc24a', { glow: 1 });
const straw = material('#c9a24e', { spec: 0 });
const strawDark = material('#8a6a2e', { spec: 0 });
const rag = material('#6b3a5c', { spec: 0.05 });
const hat = material('#1c1a26', { spec: 0.1 });
const deadGrass = material('#5a5a3a', { spec: 0 });
const deadGrassPale = material('#7a744a', { spec: 0 });
const stone = material('#8d8aa0', { spec: 0.05 });
const stoneDark = material('#6a6780', { spec: 0.05 });
const hill = material('#1d1b2b', { spec: 0 });
const web = material('#d9d6e8', { spec: 0 });
const soil = material('#3a2a22', { spec: 0 });
const soilRow = material('#4a362b', { spec: 0 });
const puddle = material('#3a2f6b', { glow: 0.25 });

/** A lantern on a crooked post. About 50 triangles. */
function lantern() {
  const k = kit();
  k.slab(woodDark, [0.18, 3.2, 0.18], { at: [0, 1.6, 0], rot: [0, 0, 0.06] });
  k.slab(woodDark, [0.9, 0.14, 0.14], { at: [0.25, 3.1, 0] });
  k.slab(iron, [0.4, 0.1, 0.4], { at: [0.6, 2.95, 0] });
  k.slab(candle, [0.3, 0.44, 0.3], { at: [0.6, 2.68, 0] });
  k.slab(iron, [0.4, 0.08, 0.4], { at: [0.6, 2.44, 0] });
  return k.node;
}

/** A scarecrow with a pumpkin for a head. Faces +z. About 130 triangles. */
function scarecrow() {
  const k = kit();
  k.slab(woodDark, [0.16, 3.2, 0.16], { at: [0, 1.6, 0] });
  k.slab(woodDark, [2.6, 0.14, 0.14], { at: [0, 2.3, 0], rot: [0, 0, 0.06] });
  k.slab(rag, [1.0, 1.3, 0.5], { at: [0, 1.9, 0], rot: [0, 0, 0.04] });
  k.slab(rag, [1.0, 0.24, 0.3], { at: [0.75, 2.26, 0], rot: [0, 0, 0.1] });
  k.slab(rag, [1.0, 0.24, 0.3], { at: [-0.75, 2.2, 0], rot: [0, 0, 0.02] });
  for (const x of [-1.3, 1.3]) k.slab(straw, [0.3, 0.3, 0.2], { at: [x, 2.22 + x * 0.05, 0] });
  k.slab(straw, [1.1, 0.2, 0.56], { at: [0, 1.2, 0] });
  const head = jackOLantern();
  head.position = [0, 2.7, 0];
  head.scale = [0.9, 0.9, 0.9];
  k.node.add(head);
  k.lathe(hat, [[0, 1.4], [0.5, 0.2], [0.95, 0.12], [0.95, 0.04]], { seg: 6, axis: 'y' }, { at: [0, 3.5, 0], rot: [0, 0, 0.14] });
  return k.node;
}

/** A cauldron over a fire, bubbling. About 90 triangles. */
function cauldron() {
  const k = kit();
  k.lathe(iron, [[1.0, 1.5], [1.15, 1.3], [1.2, 0.8], [0.7, 0.3]], { seg: 8, axis: 'y' });
  k.disc(brew, { r: 0.98, seg: 8, axis: 'y' }, { at: [0, 1.4, 0] });
  for (const [x, y, z, r] of [[0.3, 1.5, 0.2, 0.2], [-0.4, 1.46, -0.2, 0.14], [0, 1.9, 0, 0.12], [-0.2, 2.4, 0.3, 0.09]]) k.ball(brew, { r, seg: 4, rings: 2 }, { at: [x, y, z] });
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    k.slab(woodDark, [0.16, 0.16, 1.5], { at: [Math.cos(angle) * 0.6, 0.12, Math.sin(angle) * 0.6], rot: [0, -angle + Math.PI / 2, 0] });
  }
  k.lathe(candle, [[0, 0.7], [0.5, 0.1]], { seg: 5, axis: 'y' });
  return k.node;
}

/** A small stone tomb with a lit doorway. Door faces +z. About 110 triangles. */
function crypt() {
  const k = kit();
  k.slab(stoneDark, [5, 0.4, 6], { at: [0, 0.2, 0] });
  k.slab(stone, [4.2, 3.4, 5.2], { at: [0, 2.1, 0] });
  k.prism(stoneDark, [[-2.5, 0], [2.5, 0], [0, 1.7]], { depth: 5.8, axis: 'z' }, { at: [0, 3.8, 0] });
  k.slab(stoneDark, [4.4, 0.3, 5.4], { at: [0, 3.65, 0] });
  for (const x of [-1.5, 1.5]) k.cyl(stone, { r: 0.3, len: 3.2, seg: 5, caps: 'none', axis: 'y' }, { at: [x, 2, 2.9] });
  k.slab(iron, [1.4, 2.4, 0.1], { at: [0, 1.6, 2.62] });
  k.slab(brew, [1.0, 0.3, 0.14], { at: [0, 0.6, 2.62] });
  k.slab(stone, [0.3, 1.2, 0.3], { at: [0, 5.9, 0] });
  k.slab(stone, [0.9, 0.3, 0.3], { at: [0, 6.1, 0] });
  return k.node;
}

/** A well with a little roof and a bucket. About 110 triangles. */
function well() {
  const k = kit();
  k.cyl(stone, { r: 1.3, len: 1.1, seg: 8, caps: 'none', axis: 'y' }, { at: [0, 0.55, 0] });
  k.cyl(stoneDark, { r: 1.4, len: 0.2, seg: 8, caps: 'none', axis: 'y' }, { at: [0, 1.1, 0] });
  k.disc(brew, { r: 1.2, seg: 8, axis: 'y' }, { at: [0, 0.5, 0] });
  for (const x of [-1.1, 1.1]) k.slab(woodDark, [0.18, 2.6, 0.18], { at: [x, 2.2, 0] });
  k.prism(roof, [[-1.3, 0], [1.3, 0], [0, 1.0]], { depth: 3.0, axis: 'x' }, { at: [0, 3.4, 0] });
  k.slab(woodDark, [2.2, 0.12, 0.12], { at: [0, 2.9, 0] });
  k.slab(iron, [0.05, 0.9, 0.05], { at: [0.2, 2.4, 0] });
  k.slab(wood, [0.4, 0.4, 0.4], { at: [0.2, 1.8, 0] });
  return k.node;
}

/** A tumbledown shack with a light in the window. Door faces +z. About 110 triangles. */
function shack() {
  const k = kit();
  k.slab(wall, [4.4, 3, 3.6], { at: [0, 1.5, 0], rot: [0, 0, 0.04] });
  for (const y of [0.7, 1.5, 2.3]) k.slab(wallDark, [4.52, 0.1, 3.72], { at: [0, y, 0], rot: [0, 0, 0.04] });
  k.prism(roof, [[-2.3, 0], [2.3, 0], [0.3, 2.2]], { depth: 5.2, axis: 'x' }, { at: [-0.1, 3, 0], rot: [0, 0, 0.04] });
  k.slab(woodDark, [1, 1.9, 0.12], { at: [-0.9, 0.95, 1.82] });
  k.slab(windowGlow, [1.0, 0.9, 0.12], { at: [1.0, 1.7, 1.82] });
  k.slab(wallDark, [0.12, 1.0, 0.16], { at: [1.0, 1.7, 1.82] });
  k.slab(wallDark, [0.6, 2.0, 0.6], { at: [1.5, 4.2, -0.8], rot: [0, 0, -0.08] });
  return k.node;
}

/** A bat with its wings out. 12 triangles. */
function bat() {
  const k = kit();
  k.prism(iron, [[0, 0.1], [0.35, 0.4], [1.3, 0.2], [0.9, -0.05], [0.5, 0.05], [0, -0.3], [-0.5, 0.05], [-0.9, -0.05], [-1.3, 0.2], [-0.35, 0.4]], { depth: 0.06, axis: 'z' });
  return k.node;
}

function barrow(radius) {
  const k = kit();
  faceted(k.dome(hill, { r: 1, seg: 9, rings: 4, squash: [radius, radius * 0.36, radius * 0.8] }));
  return k.node;
}

export const haunted = {
  id: 'haunted',
  name: 'Haunted Hollow',
  blurb: 'Skeletons in the manor graveyard',
  seed: 53,
  price: 500,

  layout: {
    points: [
      [-125, -70], [-45, -105], [40, -100], [85, -45], [150, -40], [168, 30], [115, 80],
      [45, 62], [0, 112], [-65, 135], [-138, 104], [-112, 28], [-158, -18],
    ],
    halfWidth: 15.75,
    shoulder: 5,
    // Where the road leaves the flat: see race/track.js.
    sections: [
      { kind: 'split', around: 0.13, metres: 100 },
      { kind: 'under', around: 0.355, metres: 124 },
    ],
  },
  surface: { grip: 8, offroad: 0.45 },
  hazard: 'werewolf', // see race/hazards.js
  feature: 'graveyard', // see race/features.js

  sky: {
    top: '#150f3a',
    disc: { color: '#ffe9a8', size: 9, halo: '#8a5cc9' },
    stars: { count: 90, color: '#e8d8ff' },
    clouds: { count: 8, color: '#3a2f6b', shade: '#2a2250' },
  },
  fog: { color: '#3a2a5c', density: 0.0058 },
  light: [-0.5, 0.44, -0.74],
  lighting: { sun: [0.82, 0.74, 0.98], sky: [0.66, 0.6, 0.95], bounce: [0.34, 0.24, 0.4] },
  shadow: 0.36,

  /** Candle light: everything that glows gutters a little. */
  pulse: (time) => 0.92 + 0.08 * Math.sin(time * 11) * Math.sin(time * 4.1),

  // The air: dead leaves blowing through, and a thick ground mist.
  air: { color: '#ff9a3a', count: 44, size: [0.05, 0.1], glow: 0.9, fall: 1.1, wind: [2.2, 0.6] },
  mist: { strength: 0.62, scale: 0.013, drift: [0.008, 0.012] },
  grain: 0.2,
  cinematic: { eye: [-27, -30, 12], target: [18, 10, 7], fov: 0.98, cars: -24 },

  ground: earth,
  road: {
    surface: material('#3f3a4c'),
    shoulder: material('#33304a'),
    wear: material('#2b2a3a'),
    patch: material('#474255'),
    scuff: material('#2c2836'),
    edge: material('#8d8aa0'),
    kerbA: material('#ff8a1f'),
    kerbB: material('#231f33'),
    line: material('#ffb347', { glow: 0.5 }),
    chequerDark: material('#1c1a26'),
    chequerLight: material('#f1e9ff'),
  },
  preview: { ground: '#2b2a3a', road: '#4a4560', accent: '#ff8a1f' },

  // Viaducts, cuttings and islands: old stone, candle-lit, with lanterns
  // down the middle.
  works: {
    wall,
    wallDark,
    trim: material('#ff8a1f', { spec: 0.2 }),
    roof: material('#1c1a26', { spec: 0.05 }),
    lamp: candle,
    island: material('#30283a', { spec: 0 }),
    arch: roof,
  },
  median: () => lantern(),

  paintGround({ paint, random, track }) {
    const tones = [material('#33304a'), material('#262437'), material('#2f3540'), material('#3a3350')];
    for (let i = 0; i < 90; i++) {
      paint.blob(random.range(-330, 330), random.range(-330, 330), random.range(14, 44), random.range(8, 22), random.range(0, Math.PI), random.pick(tones));
    }
    // Pools of something that glows faintly.
    for (let i = 0; i < 22; i++) {
      paint.blob(random.range(-260, 260), random.range(-260, 260), random.range(4, 11), random.range(3, 7), random.range(0, Math.PI), puddle, 8);
    }
    // Dead grass, and drifts of leaves.
    const leaves = [material('#c9651c'), material('#8a3f16'), material('#d9a21c')];
    for (let i = 0; i < 300; i++) {
      const p = track.pointAt(random() * track.count, (random() < 0.5 ? 1 : -1) * (track.limit + 0.8 + random() * random() * 26));
      if (i % 3) paint.strands(p.x, p.z, 4 + Math.floor(random() * 5), 0.9, random() < 0.5 ? deadGrass : deadGrassPale, random);
      else paint.strands(p.x, p.z, 5, 1.4, random.pick(leaves), random);
    }
  },

  marker() {
    const k = kit();
    k.slab(woodDark, [0.22, 1.5, 0.22], { at: [0, 0.75, 0], rot: [0, 0, 0.05] });
    k.slab(candle, [0.3, 0.3, 0.3], { at: [0.04, 1.6, 0] });
    k.slab(iron, [0.36, 0.08, 0.36], { at: [0.04, 1.8, 0] });
    return k.node;
  },

  decorate({ random, beside, across, landmark, spots, track, place }) {
    // Dark hills all round, and a few bats against the moon.
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + random.range(-0.15, 0.15);
      const distance = random.range(290, 350);
      const radius = random.range(45, 80);
      landmark(barrow(radius), Math.cos(angle) * distance, 15 + Math.sin(angle) * distance, { clear: radius + track.limit, turn: random() * 6 });
    }
    const flyer = bat();
    for (let i = 0; i < 26; i++) {
      const copy = place(flyer, random.range(-200, 200), random.range(-200, 200), { turn: random() * 6, scale: 0.8 + random() * 1.4 });
      if (copy) {
        copy.position[1] = 9 + random() * 16;
        copy.rotation[0] = -0.5 + random() * 0.4;
      }
    }

    const tree = gnarledTree();
    const stones = gravestones();
    const spirit = ghost();
    const squash = jackOLantern();
    const lamp = lantern();
    const grass = tuft(deadGrass, 5, 0.8, deadGrassPale);
    const rail = fence(8, woodDark, wood, 1.2);
    const bale = hayBale(straw, strawDark);
    const pointer = signPost(woodDark, candle);
    const cobweb = (() => {
      const k = kit();
      for (let i = 0; i < 4; i++) k.slab(web, [2.6, 0.04, 0.04], { at: [0, 0, 0], rot: [0, 0, (i / 4) * Math.PI] });
      for (const r of [0.5, 0.95]) for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        k.slab(web, [r * 0.8, 0.03, 0.03], { at: [Math.cos(angle) * r * 0.92, Math.sin(angle) * r * 0.92, 0], rot: [0, 0, angle + Math.PI / 2] });
      }
      return k.node;
    })();

    const scenes = [
      // A pumpkin patch: pumpkins in rows on turned earth, a scarecrow and a fence.
      (at) => {
        at.blob(6.5, 0, 5.5, 9.5, soil, 8);
        for (let row = 0; row < 4; row++) {
          at.blob(3 + row * 2.4, 0, 0.5, 8.6, soilRow, 6);
          for (let i = 0; i < 6; i++) {
            if ((row * 5 + i * 3) % 7 === 0) continue;
            at.put(squash, 3 + row * 2.4, (i - 2.5) * 2.9 + (row % 2) * 1.2, { turn: at.inward + ((i * 7 + row) % 5) * 0.3 - 0.6, scale: 0.8 + ((i + row * 2) % 4) * 0.3 });
          }
        }
        at.put(scarecrow(), 7, 0, { turn: at.inward, scale: 1.2 });
        at.put(rail, 1.2, -4.6);
        at.put(rail, 1.2, 4.6);
        at.put(bale, 2, 0, { turn: 0.2 });
      },
      // A witch's camp: a cauldron on the boil, a shack, a web in a dead tree.
      (at) => {
        at.blob(5, 0, 3.4, 3.4, soil, 8);
        at.put(cauldron(), 5, 0, { scale: 1.3 });
        at.put(shack(), 11, 4, { turn: at.inward - 0.3 });
        at.put(tree, 9, -7, { scale: 1.6 });
        at.put(cobweb, 8.2, -5.6, { y: 4.6, turn: at.inward + 0.6, scale: 1.4 });
        at.put(lamp, 2, -4, { turn: at.inward });
        for (const [out, down, scale] of [[3, 3, 1], [3.8, 4, 0.7], [2.6, 4.4, 1.3]]) at.put(squash, out, down, { turn: at.inward, scale });
        at.put(spirit, 7, 2.4, { turn: at.inward, y: 1.2 });
      },
      // A family plot: a crypt with graves ranked in front of it, inside a fence.
      (at) => {
        at.blob(8, 0, 8, 9, material('#30283a'), 8);
        at.put(crypt(), 12, 0, { turn: at.inward });
        for (const out of [3.5, 6.5]) {
          for (let i = 0; i < 5; i++) at.put(stones[(i + out) % 4 | 0], out, (i - 2) * 3, { turn: at.inward + (i % 3 - 1) * 0.2 });
        }
        at.put(rail, 1.2, -4.6);
        at.put(rail, 1.2, 4.6);
        at.put(spirit, 5, -1.5, { turn: at.inward, y: 0.8, scale: 1.2 });
        at.put(lamp, 2, 0, { turn: at.inward });
      },
      // A wishing well that nobody should wish at, with lanterns and a signpost.
      (at) => {
        at.blob(6, 0, 4.2, 4.2, material('#30283a'), 9);
        at.put(well(), 6, 0, { turn: at.inward, scale: 1.3 });
        at.put(lamp, 2.2, -4, { turn: at.inward });
        at.put(lamp, 2.2, 4, { turn: at.inward + Math.PI });
        at.put(pointer, 1.2, 0, { turn: at.inward });
        at.put(tree, 12, -3, { scale: 2 });
        at.put(tree, 11, 6, { scale: 1.5 });
        for (const [out, down] of [[3, 2], [9, 1.5], [4, -6]]) at.put(grass, out, down, { scale: 1.4 });
        at.put(spirit, 8.5, -1, { y: 2.2 });
      },
      // A dead wood: gnarled trees close together, with ghosts between the trunks.
      (at) => {
        for (const [out, down, scale] of [[4, -6, 1.3], [5, 0, 1.8], [4.5, 6.5, 1.2], [9, -3.5, 2.1], [10, 3.5, 1.7], [14, -7, 1.6], [15, 0.5, 2.3], [13, 8, 1.4]]) {
          at.put(tree, out, down, { scale, turn: out * down });
        }
        for (const [out, down, y] of [[7, -1.6, 1.5], [12, 1.6, 2.4], [7.5, 5, 0.9]]) at.put(spirit, out, down, { turn: at.inward, y });
        at.put(cobweb, 4.6, -3, { y: 4.2, turn: 0, scale: 1.6 });
        for (const [out, down] of [[2, -2], [2.4, 3], [6.5, -6]]) at.put(squash, out, down, { turn: at.inward });
      },
    ];
    spots(12).forEach((at, i) => scenes[i % scenes.length](at));

    // A thinner scatter between the scenes.
    beside(30, tree, { from: track.limit + 4, to: track.limit + 30, scale: [0.9, 1.9] });
    across(90, tree, { clear: track.limit + 4, reach: 250, scale: [1, 2.4] });
    beside(26, squash, { from: track.limit + 1.5, to: track.limit + 7, scale: [0.8, 1.6] });
    beside(60, grass, { from: track.limit + 1.5, to: track.limit + 12, scale: [0.9, 1.7] });
    across(50, stones, { clear: track.limit + 3, reach: 220, scale: [1, 1.8] });
  },
};
