import { bake } from '../engine/bake.js';
import { material } from '../engine/materials.js';
import { kit } from '../parts/kit.js';

// What the track events (events.js) look like. Each model is built once,
// merged into a single mesh and shared by every copy on the track.

const cache = new Map();
function once(name, build) {
  if (!cache.has(name)) cache.set(name, bake(build()).children[0].geometry);
  return cache.get(name);
}

const bolt = material('#ffe24a', { glow: 1 });
const halo = material('#fff6c2', { glow: 1 });
const snailBody = material('#86d96f', { spec: 0.3 });
const snailShell = material('#b8683a', { spec: 0.4 });
const snailSwirl = material('#f4c988', { spec: 0.4 });
const eye = material('#ffffff', { spec: 0.5 });
const iron = material('#262833', { spec: 0.9, shine: 50 });
const cap = material('#8b93a6', { spec: 0.6 });
const fuse = material('#c9a36b', { spec: 0.1 });
const spark = material('#ffb02e', { glow: 1 });
const frame = material('#2f7df2', { spec: 0.5 });
const mat = material('#20263a', { spec: 0.3 });
const target = material('#ffd23f', { glow: 0.6 });
const fire = material('#ff9a2e', { glow: 1 });

/** Speed pickup: a lightning bolt in a ring. Floats and spins. */
export const boostGeometry = () =>
  once('boost', () => {
    const k = kit();
    k.prism(
      bolt,
      [[0.1, 1.0], [-0.5, -0.05], [-0.05, -0.05], [-0.3, -1.0], [0.5, 0.15], [0.08, 0.15], [0.5, 1.0]],
      { depth: 0.3, axis: 'z' },
    );
    k.lathe(halo, [[1.2, 0.07], [1.34, 0.07], [1.34, -0.07], [1.2, -0.07], [1.2, 0.07]], { seg: 14, axis: 'z' });
    return k.node;
  });

/** Slow pickup: a snail sitting in the road. */
export const slowGeometry = () =>
  once('slow', () => {
    const k = kit();
    k.box(snailBody, [0.8, 0.4, 2.2], { at: [0, 0.2, 0.1], r: 0.18 });
    k.box(snailBody, [0.55, 0.9, 0.55], { at: [0, 0.65, 0.95], r: 0.22, rot: [0.25, 0, 0] });
    k.cyl(snailShell, { r: 0.85, len: 0.7, seg: 10 }, { at: [0, 1.05, -0.3] });
    k.cyl(snailSwirl, { r: 0.5, len: 0.78 }, { at: [0, 1.05, -0.3] });
    for (const side of [1, -1]) {
      k.cyl(snailBody, { r: 0.06, len: 0.5, seg: 4, caps: 'none', axis: 'y' }, { at: [side * 0.16, 1.3, 1.1] });
      k.ball(eye, { r: 0.14, seg: 5, rings: 3 }, { at: [side * 0.16, 1.6, 1.1] });
    }
    return k.node;
  });

/** Freeze pickup: a big snowflake. Floats and spins. */
export const freezeGeometry = () =>
  once('freeze', () => {
    const k = kit();
    const ice = material('#d9f7ff', { glow: 0.85 });
    // Three bars crossed through the middle, each with a barb near its ends.
    for (let i = 0; i < 3; i++) {
      const arm = k.sub({ rot: [0, 0, (i * Math.PI) / 3] });
      arm.slab(ice, [2.2, 0.2, 0.22]);
      for (const end of [1, -1]) {
        arm.slab(ice, [0.2, 0.6, 0.22], { at: [end * 0.72, 0, 0], rot: [0, 0, end * 0.7] });
        arm.slab(ice, [0.2, 0.6, 0.22], { at: [end * 0.72, 0, 0], rot: [0, 0, -end * 0.7] });
      }
    }
    return k.node;
  });

/** Hazard: a cartoon bomb with a lit fuse. */
export const bombGeometry = () =>
  once('bomb', () => {
    const k = kit();
    k.ball(iron, { r: 0.9, seg: 10, rings: 6 }, { at: [0, 0.95, 0] });
    k.cyl(cap, { r: 0.3, len: 0.26, axis: 'y' }, { at: [0, 1.9, 0] });
    k.cyl(fuse, { r: 0.06, len: 0.5, seg: 4, caps: 'none', axis: 'y' }, { at: [0.1, 2.2, 0], rot: [0, 0, -0.4] });
    k.ball(spark, { r: 0.22, seg: 5, rings: 3 }, { at: [0.22, 2.46, 0] });
    return k.node;
  });

/** Modifier: a trampoline lying flat on the road. */
export const trampolineGeometry = () =>
  once('trampoline', () => {
    const k = kit();
    k.cyl(frame, { r: 2.5, len: 0.5, seg: 14, caps: 'start', axis: 'y' }, { at: [0, 0.25, 0] });
    k.disc(mat, { r: 2.05, seg: 14, axis: 'y' }, { at: [0, 0.55, 0] });
    k.disc(target, { r: 0.9, seg: 10, axis: 'y' }, { at: [0, 0.6, 0] });
    return k.node;
  });

/** A bag of coins, with one big coin leaning on it. Floats and spins. */
export const coinsGeometry = () =>
  once('coins', () => {
    const k = kit();
    const sack = material('#b8824a', { spec: 0.1 });
    const tie = material('#6b4526', { spec: 0.1 });
    const coin = material('#ffd23f', { glow: 0.75 });
    const coinEdge = material('#e8a500', { glow: 0.5 });
    k.ball(sack, { r: 1, seg: 8, rings: 5, squash: [0.8, 0.72, 0.7] }, { at: [0, -0.1, 0] });
    k.cyl(sack, { r: 0.42, r2: 0.26, len: 0.36, seg: 8, caps: 'start', axis: 'y' }, { at: [0, 0.78, 0] });
    k.cyl(tie, { r: 0.3, len: 0.12, seg: 8, caps: 'none', axis: 'y' }, { at: [0, 0.6, 0] });
    for (const side of [1, -1]) {
      k.cyl(coinEdge, { r: 0.46, len: 0.1, seg: 10, caps: 'none', axis: 'z' }, { at: [0, -0.05, side * 0.72] });
      k.disc(coin, { r: 0.46, seg: 10, axis: 'z' }, { at: [0, -0.05, side * 0.77], rot: [0, side > 0 ? 0 : Math.PI, 0] });
      k.slab(coinEdge, [0.12, 0.44, 0.03], { at: [0, -0.05, side * 0.785] });
    }
    return k.node;
  });

// ---------- Halos ----------

// Every event is colour coded so it can be read at a glance, even by someone
// who cannot read yet: green helps, red hurts, blue bounces.
export const HALO_COLOURS = {
  good: '#35f07a',
  bad: '#ff3a2e',
  bounce: '#3aa2ff',
  spark: '#a6f4ff',
  fire: '#ffb347',
  frost: '#7fe6ff',
  gold: '#ffd23f',
  slime: '#9dff4a',
};

/** A plain ball in one of the halo colours. Drawn with the renderer's glow pass. */
export const haloGeometry = (colour) =>
  once(`halo-${colour}`, () => {
    const k = kit();
    k.ball(material(HALO_COLOURS[colour]), { r: 1, seg: 10, rings: 6 });
    return k.node;
  });

/** Which halo each event wears, and how big: [colour, radius, height off the road, squash]. */
export const ITEM_HALOS = {
  boost: ['good', 2.3, 1.7, 1],
  slow: ['bad', 2.5, 1.0, 1],
  bomb: ['bad', 2.4, 1.2, 1],
  oil: ['bad', 3.2, 0.2, 0.35],
  trampoline: ['bounce', 3.3, 0.7, 0.5],
  freeze: ['frost', 2.4, 1.7, 1],
  coins: ['gold', 2.6, 1.7, 1],
};

// ---------- Bangs ----------

const BANG_LOOKS = {
  blast: material('#ff9a2e', { glow: 1 }),
  spark: material('#c9f8ff', { glow: 1 }),
  dust: material('#e2c79a', { spec: 0 }),
  snow: material('#ffffff', { spec: 0 }),
  bone: material('#f2efe2', { spec: 0 }),
  slime: material('#9dff4a', { glow: 0.6 }),
};

/** A ball that the scene swells up over a moment: 'blast', 'spark', 'dust', 'snow', 'bone' or 'slime'. */
export const bangGeometry = (kind) =>
  once(`bang-${kind}`, () => {
    const k = kit();
    k.ball(BANG_LOOKS[kind] || BANG_LOOKS.blast, { r: 1, seg: 8, rings: 5 });
    return k.node;
  });

// ---------- Weapons fire ----------

const shell = material('#2a2d38', { spec: 0.8, shine: 50 });
const tracer = material('#ffe24a', { glow: 1 });

/** A shot in flight, pointing along +z: 'shell' (cannon) or 'bolts' (blaster). */
export const shotGeometry = (kind) =>
  once(`shot-${kind}`, () => {
    const k = kit();
    if (kind === 'shell') {
      k.ball(shell, { r: 0.5, seg: 8, rings: 5 });
      k.lathe(fire, [[0.34, -0.2], [0, -1.3]], { seg: 6, axis: 'z' });
    } else {
      for (const side of [1, -1]) k.slab(tracer, [0.16, 0.16, 1.6], { at: [side * 0.3, 0, 0] });
    }
    return k.node;
  });

// ---------- Track hazards ----------

const bandage = material('#ebe1c6', { spec: 0.1 });
const bandageDark = material('#b9a67f', { spec: 0.1 });
const glare = material('#ff3a2e', { glow: 1 });

/** Pyramid Desert: a mummy, arms out, facing +z. Its feet are at the origin. */
export const mummyGeometry = () =>
  once('mummy', () => {
    const k = kit();
    k.box(bandage, [0.95, 1.3, 0.6], { at: [0, 0.65, 0], r: 0.16 });
    k.box(bandage, [1.2, 1.25, 0.75], { at: [0, 1.85, 0], r: 0.2 });
    k.box(bandage, [0.8, 0.8, 0.75], { at: [0, 2.9, 0], r: 0.24 });
    for (const side of [1, -1]) {
      k.box(bandage, [0.32, 0.32, 1.4], { at: [side * 0.8, 2.3, 0.65], rot: [-0.35, 0, 0], r: 0.1 });
      k.slab(glare, [0.18, 0.13, 0.06], { at: [side * 0.2, 2.98, 0.39] });
    }
    // Loose wrappings.
    k.slab(bandageDark, [1.26, 0.1, 0.8], { at: [0, 1.55, 0], rot: [0, 0, 0.12] });
    k.slab(bandageDark, [1.26, 0.1, 0.8], { at: [0, 2.15, 0], rot: [0, 0, -0.1] });
    k.slab(bandageDark, [0.86, 0.09, 0.8], { at: [0, 2.72, 0], rot: [0, 0, 0.14] });
    k.slab(bandageDark, [1.0, 0.1, 0.66], { at: [0, 0.8, 0], rot: [0, 0, -0.12] });
    return k.node;
  });

/** Electric Swamp: a bolt of lightning from the sky down to the origin. */
export const boltGeometry = () =>
  once('bolt', () => {
    const k = kit();
    const live = material('#e6fbff', { glow: 1 });
    // A fixed zigzag: [x, z] at each step up.
    const kinks = [[0, 0], [1.6, -0.8], [-1.2, 0.9], [1.9, 0.4], [-0.6, -1.5], [1.1, 1.2], [-1.8, -0.3], [0.5, 0.6], [0, 0]];
    const step = 6;
    for (let i = 0; i < kinks.length - 1; i++) {
      const [x0, z0] = kinks[i];
      const [x1, z1] = kinks[i + 1];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const length = Math.hypot(dx, step, dz);
      const piece = k.sub({ at: [(x0 + x1) / 2, i * step + step / 2, (z0 + z1) / 2], rot: [Math.atan2(dz, step), 0, -Math.atan2(dx, Math.hypot(step, dz))] });
      piece.slab(live, [0.8 - i * 0.05, length, 0.8 - i * 0.05]);
    }
    return k.node;
  });

// ---------- Haunted Hollow and Zombie City ----------

const bone = material('#f2efe2', { spec: 0.15 });
const boneDark = material('#2a2433', { spec: 0 });
const boneEye = material('#b6ff5c', { glow: 1 });

/** A skeleton, arms up, facing +z. Its feet are at the origin. 200 triangles. */
export const skeletonGeometry = () =>
  once('skeleton', () => {
    const k = kit();
    for (const side of [1, -1]) {
      k.slab(bone, [0.16, 1.0, 0.16], { at: [side * 0.22, 0.5, 0] });
      k.slab(bone, [0.14, 0.95, 0.14], { at: [side * 0.68, 2.42, 0.12], rot: [0, 0, side * -0.45] });
      k.slab(boneEye, [0.14, 0.14, 0.05], { at: [side * 0.15, 2.62, 0.31] });
    }
    k.slab(bone, [0.7, 0.24, 0.3], { at: [0, 1.05, 0] });
    k.slab(bone, [0.14, 0.95, 0.14], { at: [0, 1.55, -0.05] });
    for (const [y, wide] of [[1.38, 0.74], [1.62, 0.9], [1.86, 0.84]]) k.slab(bone, [wide, 0.11, 0.42], { at: [0, y, 0] });
    k.slab(bone, [1.14, 0.14, 0.2], { at: [0, 2.06, 0] });
    k.box(bone, [0.62, 0.58, 0.6], { at: [0, 2.6, 0], r: 0.2 });
    k.slab(bone, [0.4, 0.16, 0.42], { at: [0, 2.24, 0.04] });
    k.slab(boneDark, [0.3, 0.05, 0.06], { at: [0, 2.26, 0.26] });
    return k.node;
  });

const fur = material('#6b5a4a', { spec: 0.05 });
const furDark = material('#3b3028', { spec: 0.05 });
const wolfEye = material('#ffe24a', { glow: 1 });
const fang = material('#ffffff', { spec: 0.2 });

/** A werewolf at full stretch, running toward +z. About 190 triangles. */
export const werewolfGeometry = () =>
  once('werewolf', () => {
    const k = kit();
    k.box(fur, [1.0, 1.0, 2.0], { at: [0, 1.35, -0.1], r: 0.3, rot: [-0.22, 0, 0] });
    k.slab(furDark, [1.2, 1.05, 0.8], { at: [0, 1.7, 0.7], rot: [-0.22, 0, 0] });
    k.box(fur, [0.66, 0.6, 0.74], { at: [0, 2.05, 1.42], r: 0.2 });
    k.slab(furDark, [0.36, 0.3, 0.56], { at: [0, 1.94, 1.92] });
    k.slab(fang, [0.3, 0.1, 0.4], { at: [0, 1.76, 1.94] });
    for (const side of [1, -1]) {
      k.lathe(furDark, [[0, 0.5], [0.16, 0]], { seg: 4, axis: 'y' }, { at: [side * 0.22, 2.3, 1.22] });
      k.slab(wolfEye, [0.13, 0.09, 0.05], { at: [side * 0.17, 2.14, 1.8] });
      k.slab(fur, [0.26, 0.26, 1.2], { at: [side * 0.58, 1.4, 1.2], rot: [0.45, 0, 0] });
      k.slab(furDark, [0.3, 0.14, 0.4], { at: [side * 0.58, 0.9, 1.84] });
      k.slab(fur, [0.3, 1.0, 0.3], { at: [side * 0.36, 0.62, -0.74], rot: [-0.55, 0, 0] });
    }
    k.slab(furDark, [0.2, 0.2, 0.9], { at: [0, 1.25, -1.3], rot: [0.5, 0, 0] });
    return k.node;
  });

const zombieSkin = material('#8fcf6a', { spec: 0.1 });
const zombieShirts = ['#5b6ee8', '#c9534a', '#d9a23a'].map((hex) => material(hex, { spec: 0.05 }));
const zombieLegs = material('#4a3f52', { spec: 0.05 });
const zombieHair = material('#2b2a33', { spec: 0.05 });
const zombieEye = material('#fff6a8', { glow: 1 });

/** A zombie, arms out, facing +z. Feet at the origin. `shirt` is 0, 1 or 2. About 195 triangles. */
export const zombieGeometry = (shirt = 0) =>
  once(`zombie-${shirt}`, () => {
    const k = kit();
    const top = zombieShirts[shirt];
    for (const side of [1, -1]) {
      k.slab(zombieLegs, [0.3, 0.92, 0.32], { at: [side * 0.22, 0.46, side * 0.1] });
      k.slab(side > 0 ? zombieSkin : top, [0.22, 0.22, 0.95], { at: [side * 0.52, 1.66 + side * 0.08, 0.55], rot: [side * 0.1, 0, 0] });
      k.slab(zombieEye, [0.13, 0.12, 0.05], { at: [side * 0.15, 2.3, 0.31] });
    }
    k.box(top, [0.92, 0.98, 0.5], { at: [0, 1.4, 0], r: 0.14, rot: [0.1, 0, 0.07] });
    k.slab(top, [0.5, 0.2, 0.52], { at: [0.2, 0.86, 0], rot: [0, 0, 0.3] });
    k.box(zombieSkin, [0.62, 0.6, 0.6], { at: [0.04, 2.24, 0.06], r: 0.16, rot: [0, 0, 0.12] });
    k.slab(zombieHair, [0.66, 0.16, 0.64], { at: [0, 2.57, 0.04], rot: [0, 0, 0.12] });
    k.slab(zombieHair, [0.3, 0.08, 0.05], { at: [0.04, 2.06, 0.37] });
    return k.node;
  });

/** A lump of burning wreckage on its way down, nose toward -y. About 60 triangles. */
export const meteorGeometry = () =>
  once('meteor', () => {
    const k = kit();
    const rock = material('#3a2f2c', { spec: 0.1 });
    k.ball(rock, { r: 1, seg: 6, rings: 4, squash: [1, 0.85, 1.1] });
    k.lathe(fire, [[0, 5.2], [0.75, 0.9], [0.9, 0.2]], { seg: 6, axis: 'y' });
    k.lathe(spark, [[0, 3.2], [0.45, 0.6]], { seg: 5, axis: 'y' }, { at: [0.5, 0.4, 0.3] });
    return k.node;
  });

// ---------- Things in the air ----------

// Every track has something drifting in the air: snow, dust, sparks, ash.
// It is a block of specks that repeats in every direction; the scene draws
// the four copies nearest the camera and slides them along. One mesh, four
// draw calls, however thick the weather.
export const MOTE_TILE = 40; // metres across
export const MOTE_HEIGHT = 14; // metres before the pattern repeats upward

/** air: { color, count, size: [low, high], glow } from the track theme. */
export function moteGeometry(name, air) {
  return once(`motes-${name}`, () => {
    const k = kit();
    const speck = material(air.color, { glow: air.glow ?? 1 });
    // A fixed scatter, so the tiles line up.
    let seed = 12345;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const [low, high] = air.size;
    for (let i = 0; i < air.count; i++) {
      const x = (next() - 0.5) * MOTE_TILE;
      const y = next() * MOTE_HEIGHT;
      const z = (next() - 0.5) * MOTE_TILE;
      const size = low + next() * (high - low);
      // Twice, one repeat apart, so the block can scroll up or down without a gap.
      for (const lift of [0, MOTE_HEIGHT]) {
        if (air.streak) k.slab(speck, [size, size, size * air.streak], { at: [x, y + lift, z], rot: [0, next() * 0.3, 0] });
        else k.ball(speck, { r: size, seg: 4, rings: 2 }, { at: [x, y + lift, z] });
      }
    }
    return k.node;
  });
}

// ---------- Flat things painted on the road ----------

function createFlat() {
  const data = { positions: [], normals: [], colors: [], params: [], indices: [] };
  return {
    /** A convex polygon of [x, z] points lying on the ground. */
    polygon(points, look) {
      const base = data.positions.length / 3;
      for (const [x, z] of points) {
        data.positions.push(x, 0, z);
        data.normals.push(0, 1, 0);
        data.colors.push(...look.color);
        data.params.push(look.spec, look.shine, look.glow);
      }
      for (let i = 1; i < points.length - 1; i++) {
        const [ax, az] = points[0];
        const [bx, bz] = points[i];
        const [cx, cz] = points[i + 1];
        const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
        if (up >= 0) data.indices.push(base, base + i, base + i + 1);
        else data.indices.push(base, base + i + 1, base + i);
      }
    },
    finish: () => ({
      positions: new Float32Array(data.positions),
      normals: new Float32Array(data.normals),
      colors: new Float32Array(data.colors),
      params: new Float32Array(data.params),
      indices: new Uint16Array(data.indices),
      triangles: data.indices.length / 3,
    }),
  };
}

/** Hazard: a glossy oil slick, centred on the origin. */
export function oilGeometry() {
  if (!cache.has('oil')) {
    const flat = createFlat();
    const blob = (radius, cx, cz, look, wobble) => {
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const r = radius * (1 + wobble * Math.sin(i * 2.3 + radius));
        points.push([cx + Math.cos(angle) * r, cz + Math.sin(angle) * r]);
      }
      flat.polygon(points, look);
    };
    blob(2.7, 0, 0, material('#15111d', { spec: 0.9, shine: 40 }), 0.16);
    blob(1.3, 0.5, -0.3, material('#3b2a63', { spec: 0.9, shine: 40 }), 0.2);
    blob(0.6, -0.9, 0.7, material('#2a4a6e', { spec: 0.9, shine: 40 }), 0.2);
    cache.set('oil', flat.finish());
  }
  return cache.get('oil');
}

/** A flat ring painted on the road in a halo colour. */
export function ringGeometry(colour, inner, outer) {
  const name = `ring-${colour}-${inner}-${outer}`;
  if (!cache.has(name)) {
    const flat = createFlat();
    const look = material(HALO_COLOURS[colour], { glow: 1 });
    const sides = 16;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const b = ((i + 1) / sides) * Math.PI * 2;
      flat.polygon(
        [
          [Math.cos(a) * inner, Math.sin(a) * inner],
          [Math.cos(a) * outer, Math.sin(a) * outer],
          [Math.cos(b) * outer, Math.sin(b) * outer],
          [Math.cos(b) * inner, Math.sin(b) * inner],
        ],
        look,
      );
    }
    cache.set(name, flat.finish());
  }
  return cache.get(name);
}

/** The ring each event sits in: [colour, inner radius, outer radius]. */
export const ITEM_RINGS = {
  boost: ['good', 1.7, 2.1],
  slow: ['bad', 2.0, 2.4],
  bomb: ['bad', 1.8, 2.2],
  oil: ['bad', 3.0, 3.35],
  trampoline: ['bounce', 2.75, 3.15],
  freeze: ['frost', 1.7, 2.1],
  coins: ['gold', 1.8, 2.2],
};

const checkpointLooks = {
  dim: { line: material('#8b93a6'), lamp: material('#4a5266', { spec: 0.3 }) },
  lit: { line: material('#6dff97', { glow: 1 }), lamp: material('#6dff97', { glow: 1 }) },
};

/** The line across the road at a checkpoint, dull or lit up. */
export function checkpointLine(track, index, lit) {
  const flat = createFlat();
  const half = track.halfWidth;
  const at = (i, offset) => {
    const p = track.pointAt(index + i, offset);
    return [p.x, p.z];
  };
  flat.polygon([at(-0.4, -half), at(-0.4, half), at(0.4, half), at(0.4, -half)], (lit ? checkpointLooks.lit : checkpointLooks.dim).line);
  return flat.finish();
}

/** The strip of lights under a checkpoint gate's beam, dull or lit up. */
export const checkpointLamp = (span, height, lit) =>
  once(`lamp-${span}-${lit}`, () => {
    const k = kit();
    const look = (lit ? checkpointLooks.lit : checkpointLooks.dim).lamp;
    k.slab(look, [span * 2 - 0.8, 0.7, 0.4], { at: [0, height - 0.45, 0] });
    for (const side of [1, -1]) k.ball(look, { r: 0.55, seg: 6, rings: 3 }, { at: [side * span, height + 0.8, 0] });
    return k.node;
  });

/** The hole a mummy climbs out of. */
export function holeGeometry() {
  if (!cache.has('hole')) {
    const flat = createFlat();
    const disc = (radius, look) => {
      const points = [];
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        points.push([Math.cos(angle) * radius * (1 + 0.12 * Math.sin(i * 2.1)), Math.sin(angle) * radius * (1 + 0.12 * Math.cos(i * 1.7))]);
      }
      flat.polygon(points, look);
    };
    disc(2.3, material('#b98d52', { spec: 0 }));
    disc(1.6, material('#3a2a1c', { spec: 0 }));
    cache.set('hole', flat.finish());
  }
  return cache.get('hole');
}

const stripLooks = {
  fast: { base: material('#12733f'), mark: material('#6dff97', { glow: 1 }) },
  slow: { base: material('#7c2126'), mark: material('#ff6a5c', { glow: 1 }) },
};

/**
 * Modifier: a strip along part of the road, in its speed-up or slow-down
 * look. Green arrows pointing down the road mean go; red bars mean stuck.
 */
export function stripGeometry(track, strip, fast) {
  const flat = createFlat();
  const look = fast ? stripLooks.fast : stripLooks.slow;
  const at = (i, offset) => {
    const p = track.pointAt(strip.start + i, offset);
    return [p.x, p.z];
  };
  const { from, to, length } = strip;
  const middle = (from + to) / 2;

  for (let i = 0; i < length; i++) {
    flat.polygon([at(i, from), at(i, to), at(i + 1, to), at(i + 1, from)], look.base);
  }
  for (let i = 1; i + 2.6 < length; i += 3) {
    if (fast) {
      // A chevron: two slanted bars meeting at a point further down the road.
      flat.polygon([at(i, from + 0.3), at(i + 1.6, middle), at(i + 2.6, middle), at(i + 1, from + 0.3)], look.mark);
      flat.polygon([at(i, to - 0.3), at(i + 1.6, middle), at(i + 2.6, middle), at(i + 1, to - 0.3)], look.mark);
    } else {
      flat.polygon([at(i, from + 0.3), at(i, to - 0.3), at(i + 1, to - 0.3), at(i + 1, from + 0.3)], look.mark);
    }
  }
  return flat.finish();
}
