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

/** The fireball when a bomb goes off. Scaled up over a moment by the scene. */
export const blastGeometry = () =>
  once('blast', () => {
    const k = kit();
    k.ball(fire, { r: 1, seg: 8, rings: 5 });
    return k.node;
  });

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
