import { bake } from '../engine/bake.js';
import { material } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import { kit } from '../parts/kit.js';
import { ARCS, PYRAMID, SNOWBALLS } from './features.js';

// What each track's set piece looks like (the rules are in features.js).
//
// Each has a still part that becomes scenery (buildSetPiece), some paint on
// the road (paintSetPiece), and a few moving parts the scene draws each
// frame (the geometry getters at the bottom).

const cache = new Map();
function once(name, build) {
  if (!cache.has(name)) cache.set(name, bake(build()).children[0].geometry);
  return cache.get(name);
}

/** Collects flat-shaded polygons in 3D into one mesh. */
function createSolid() {
  const data = { positions: [], normals: [], colors: [], params: [], indices: [] };
  return {
    /**
     * points: corners of a flat convex polygon. `facing` is roughly the way
     * its visible side should point; the winding is fixed up to match.
     */
    polygon(points, look, facing) {
      const [a, b, c] = points;
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const length = Math.hypot(...n) || 1;
      n = n.map((value) => value / length);
      const flip = n[0] * facing[0] + n[1] * facing[1] + n[2] * facing[2] < 0;
      if (flip) n = n.map((value) => -value);

      const base = data.positions.length / 3;
      for (const p of points) {
        data.positions.push(...p);
        data.normals.push(...n);
        data.colors.push(...look.color);
        data.params.push(look.spec, look.shine, look.glow);
      }
      for (let i = 1; i < points.length - 1; i++) {
        if (flip) data.indices.push(base, base + i + 1, base + i);
        else data.indices.push(base, base + i, base + i + 1);
      }
    },
    finish() {
      const node = new Node();
      node.geometry = {
        positions: new Float32Array(data.positions),
        normals: new Float32Array(data.normals),
        colors: new Float32Array(data.colors),
        params: new Float32Array(data.params),
        indices: new Uint16Array(data.indices),
        triangles: data.indices.length / 3,
      };
      return node;
    },
  };
}

// ---------- Pyramid Desert: the drive-through pyramid ----------

const sandstone = material('#dcb46c', { spec: 0.05 });
const shadeStone = material('#8f6f45', { spec: 0.05 });
const darkStone = material('#6f5536', { spec: 0.05 });
const gold = material('#ffd65c', { spec: 0.7, shine: 40 });
const torch = material('#ffb347', { glow: 1 });
const floorStone = material('#a98a5c', { spec: 0 });
const plateStone = material('#5a452c', { spec: 0 });

export const HALL = { base: 38, apex: 36, height: 10 };

/** Half the width of the hall through the pyramid. */
export const hallWidth = (track) => track.limit + 5;

/**
 * A pyramid with a hall straight through it along z. The hall is `width`
 * either side of the centre and HALL.height tall.
 */
function pyramidHall(width) {
  const { base: B, apex: A, height: H } = HALL;
  const solid = createSolid();
  const W = width;
  const t = H / A; // how far up the face the top of the doorway comes
  const zH = B * (1 - t); // where the sloping face reaches hall height
  const xH = B * (1 - t); // and how wide the face still is there

  for (const end of [1, -1]) {
    const facing = [0, 0.5, end];
    // The end face, in three pieces around the doorway.
    solid.polygon([[-B, 0, end * B], [-W, 0, end * B], [-W, H, end * zH], [-xH, H, end * zH]], sandstone, facing);
    solid.polygon([[B, 0, end * B], [W, 0, end * B], [W, H, end * zH], [xH, H, end * zH]], sandstone, facing);
    solid.polygon([[-xH, H, end * zH], [xH, H, end * zH], [0, A, 0]], sandstone, facing);
    // A painted lintel over the doorway.
    solid.polygon(
      [[-W - 1.5, H, end * (zH + 0.05)], [W + 1.5, H, end * (zH + 0.05)], [W + 1.2, H + 2, end * (zH - 2 * (B / A) + 0.05)], [-W - 1.2, H + 2, end * (zH - 2 * (B / A) + 0.05)]],
      gold,
      facing,
    );
  }
  for (const side of [1, -1]) {
    solid.polygon([[side * B, 0, B], [side * B, 0, -B], [0, A, 0]], sandstone, [side, 0.5, 0]);
    // Inside wall of the hall.
    solid.polygon([[side * W, 0, -B], [side * W, 0, B], [side * W, H, zH], [side * W, H, -zH]], shadeStone, [-side, 0, 0]);
  }
  solid.polygon([[-W, H, -zH], [W, H, -zH], [W, H, zH], [-W, H, zH]], darkStone, [0, -1, 0]);

  const node = solid.finish();
  const k = kit(node);
  // Capstone, and torches down both walls.
  k.lathe(gold, [[0, A + 0.5], [B * 0.2, A * 0.8]], { seg: 4, axis: 'y' }, { rot: [0, Math.PI / 4, 0] });
  for (const side of [1, -1]) {
    for (const z of [-27, -9, 9, 27]) {
      k.slab(darkStone, [0.5, 1.4, 0.5], { at: [side * (W - 0.3), 4.6, z] });
      k.ball(torch, { r: 0.55, seg: 6, rings: 3 }, { at: [side * (W - 0.5), 5.7, z] });
    }
  }
  return node;
}

// ---------- Electric Swamp: the arc gates ----------

const iron = material('#4a5266', { spec: 0.4, shine: 30 });
const ironDark = material('#2f3545', { spec: 0.3 });
const volt = material('#66f4ff', { glow: 1 });

const GANTRY_HEIGHT = 8.4;

function gantry(track) {
  const k = kit();
  const span = track.limit + 1.4;
  for (const side of [1, -1]) {
    k.box(ironDark, [2, 0.9, 2], { at: [side * span, 0.45, 0], r: 0.15 });
    k.box(iron, [1.1, GANTRY_HEIGHT, 1.1], { at: [side * span, GANTRY_HEIGHT / 2, 0], r: 0.14 });
    k.ball(volt, { r: 0.7, seg: 6, rings: 4 }, { at: [side * span, GANTRY_HEIGHT + 1.2, 0] });
  }
  k.box(iron, [span * 2 + 1.4, 0.9, 1.0], { at: [0, GANTRY_HEIGHT + 0.2, 0], r: 0.2 });
  // Emitters along the underside of the beam.
  for (let x = -span + 2; x <= span - 2; x += 4) {
    k.slab(ironDark, [0.5, 0.5, 0.5], { at: [x, GANTRY_HEIGHT - 0.45, 0] });
  }
  return k.node;
}

/** One half of a gate's curtain of electricity: strands hanging from the beam, over x > 0. */
export function curtainGeometry(track) {
  return once(`curtain-${track.limit}`, () => {
    const k = kit();
    const top = GANTRY_HEIGHT - 0.5;
    const drops = 6;
    for (let x = 2; x < track.limit; x += 4) {
      let previous = [x, top];
      for (let i = 1; i <= drops; i++) {
        const y = top * (1 - i / drops) + 0.1;
        const kink = i === drops ? 0 : (i % 2 ? 0.8 : -0.8) * (1 + ((x * 7 + i * 3) % 5) / 10);
        const next = [x + kink, y];
        const length = Math.hypot(next[0] - previous[0], next[1] - previous[1]);
        k.slab(volt, [length, 0.2, 0.2], {
          at: [(next[0] + previous[0]) / 2, (next[1] + previous[1]) / 2, 0],
          rot: [0, 0, Math.atan2(next[1] - previous[1], next[0] - previous[0])],
        });
        previous = next;
      }
    }
    return k.node;
  });
}

// ---------- Snowy Mountains: the snowball run ----------

const snow = material('#f6faff', { spec: 0.2, shine: 20 });
const grit = material('#9fb2c8', { spec: 0.1 });
const lanePaint = material('#b9dcf7');
const laneEdge = material('#2f7df2');

/** A snowball of radius 1, with a few bits stuck in it so that it can be seen to roll. */
export const snowballGeometry = () =>
  once('snowball', () => {
    const k = kit();
    k.ball(snow, { r: 1, seg: 10, rings: 6 });
    for (const [x, y, z] of [[0.7, 0.6, 0.3], [-0.5, 0.8, -0.3], [0.2, -0.7, 0.7], [-0.8, -0.3, -0.5], [0.4, 0.2, -0.9], [-0.3, -0.9, 0.2]]) {
      k.ball(grit, { r: 0.16, seg: 4, rings: 2 }, { at: [x * 0.97, y * 0.97, z * 0.97] });
    }
    return k.node;
  });

function snowBank() {
  const k = kit();
  k.dome(snow, { r: 1, seg: 8, rings: 3, squash: [7, 4.5, 6] });
  return k.node;
}

// ---------- Pyramid pillars ----------

/** A pillar, its foot at the origin. The scene sinks it into the floor. */
export const pillarGeometry = () =>
  once('pillar', () => {
    const k = kit();
    const { radius, height } = PYRAMID;
    k.cyl(sandstone, { r: radius, len: height, seg: 8, caps: 'start', axis: 'y' }, { at: [0, height / 2, 0] });
    k.cyl(gold, { r: radius + 0.1, len: 0.4, seg: 8, caps: 'none', axis: 'y' }, { at: [0, height - 0.7, 0] });
    k.cyl(shadeStone, { r: radius + 0.1, len: 0.3, seg: 8, caps: 'none', axis: 'y' }, { at: [0, 1.2, 0] });
    return k.node;
  });

// ---------- Putting them on a track ----------

/** How close scenery may come to the middle of a set piece, in metres. */
export function setPieceClearance(site) {
  return site?.kind === 'pyramid' ? HALL.base * 1.5 : 0;
}

/**
 * Adds the still part of a set piece to a world.
 * add(node, x, z, turn): places a model, even inside the clearance.
 */
export function buildSetPiece(site, track, add) {
  if (site.kind === 'pyramid') {
    add(pyramidHall(hallWidth(track)), site.x, site.z, site.heading);
  } else if (site.kind === 'arcs') {
    const frame = gantry(track);
    for (const step of ARCS.gates) {
      const p = track.pointAt(site.index + step, 0);
      add(frame, p.x, p.z, p.heading);
    }
  } else if (site.kind === 'snowballs') {
    const bank = snowBank();
    for (const step of SNOWBALLS.lanes) {
      for (const side of [1, -1]) {
        const p = track.pointAt(site.index + step, side * (track.limit + 8));
        add(bank, p.x, p.z, p.heading);
      }
    }
  }
}

/**
 * Paints a set piece's markings on the road.
 * paint.polygon(points, look) takes [x, z] points.
 */
export function paintSetPiece(site, track, paint) {
  if (site.kind === 'pyramid') {
    // A stone floor through the hall, with a dark plate where each pillar hides.
    const fx = Math.sin(site.heading);
    const fz = Math.cos(site.heading);
    const local = (across, along) => [site.x - fz * across + fx * along, site.z + fx * across + fz * along];
    const W = hallWidth(track);
    const B = HALL.base;
    paint.polygon([local(-W, -B), local(W, -B), local(W, B), local(-W, B)], floorStone);
    for (let along = -B + 6; along < B; along += 12) {
      paint.polygon([local(-W, along), local(W, along), local(W, along + 0.5), local(-W, along + 0.5)], shadeStone);
    }
    for (const [across, along] of PYRAMID.pillars) {
      const r = PYRAMID.radius + 0.5;
      paint.polygon([local(across - r, along - r), local(across + r, along - r), local(across + r, along + r), local(across - r, along + r)], plateStone);
    }
  } else if (site.kind === 'snowballs') {
    // Each snowball lane is a band of ice across the road.
    const band = SNOWBALLS.radius / track.spacing;
    for (const step of SNOWBALLS.lanes) {
      const at = (i, offset) => {
        const p = track.pointAt(site.index + step + i, offset);
        return [p.x, p.z];
      };
      const reach = track.limit;
      paint.polygon([at(-band, -reach), at(-band, reach), at(band, reach), at(band, -reach)], lanePaint);
      for (const edge of [-band, band - 0.25]) {
        paint.polygon([at(edge, -reach), at(edge, reach), at(edge + 0.25, reach), at(edge + 0.25, -reach)], laneEdge);
      }
    }
  }
}
