import { bake } from '../engine/bake.js';
import { material } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import { kit, taperTop } from '../parts/kit.js';
import { barricade, bunting, crate, drum, lampPost } from './dressing.js';
import { BRIDGE, GRAVEYARD, PASS, PYRAMID } from './features.js';
import { faceted } from './world.js';

// What each track's landmark looks like (the rules are in features.js).
//
// Each has a still part that becomes scenery (buildSetPiece), paint under
// and over the road (paintSetPieceUnder, paintSetPiece), and a few moving
// parts the scene draws each frame (the geometry getters).
//
// A landmark is meant to be the picture of its track: the place a
// screenshot is taken. So this is where the triangles are spent.

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

/** A straight bar from point `a` to point `b` ([x, y, z] each). 12 triangles. */
function beam(k, look, a, b, thick = 0.16) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  return k.slab(look, [thick, thick, length], {
    at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    rot: [-Math.asin(dy / length), Math.atan2(dx, dz), 0],
  });
}

/**
 * True if nothing of the road comes within `room` metres of point `p`.
 * A landmark is laid out along its own stretch of road, but another part of
 * the lap may pass close behind it, and nothing must be stood on that.
 */
const free = (track, p, room) => track.distanceTo(p.x, p.z) >= room;

/** How many samples long a site is, and a helper for points along it. */
function along(site, track) {
  const length = track.wrap(site.to - site.from);
  return {
    length,
    /** [x, z] at `i` samples into the site, `offset` metres right of the centre line. */
    at(i, offset) {
      const p = track.pointAt(site.from + i, offset);
      return [p.x, p.z];
    },
    point: (i, offset) => track.pointAt(site.from + i, offset),
  };
}

// =====================================================================
// Pyramid Desert: the drive-through pyramid
// =====================================================================

const sandstone = material('#dcb46c', { spec: 0.05 });
const shadeStone = material('#8f6f45', { spec: 0.05 });
const darkStone = material('#6f5536', { spec: 0.05 });
const gold = material('#ffd65c', { spec: 0.7, shine: 40 });
const lapis = material('#2f6fd6', { spec: 0.4 });
const torch = material('#ffb347', { glow: 1 });
const floorStone = material('#a98a5c', { spec: 0 });
const floorPale = material('#bfa070', { spec: 0 });
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
    // A painted lintel over the doorway, banded in gold and blue.
    const slope = B / A;
    const band = (low, high, look, proud) =>
      solid.polygon(
        [
          [-W - 1.5, H + low, end * (zH - low * slope + proud)],
          [W + 1.5, H + low, end * (zH - low * slope + proud)],
          [W + 1.5, H + high, end * (zH - high * slope + proud)],
          [-W - 1.5, H + high, end * (zH - high * slope + proud)],
        ],
        look,
        facing,
      );
    band(0, 2.4, gold, 0.05);
    band(0.5, 0.9, lapis, 0.1);
    band(1.5, 1.9, lapis, 0.1);
    // Courses of stone: thin darker bands up the face.
    for (const y of [16, 22, 28]) {
      const half = B * (1 - y / A);
      solid.polygon(
        [[-half, y, end * (half + 0.06)], [half, y, end * (half + 0.06)], [half - 0.35 * slope, y + 0.35, end * (half - 0.35 * slope + 0.06)], [-half + 0.35 * slope, y + 0.35, end * (half - 0.35 * slope + 0.06)]],
        shadeStone,
        facing,
      );
    }
  }
  for (const side of [1, -1]) {
    solid.polygon([[side * B, 0, B], [side * B, 0, -B], [0, A, 0]], sandstone, [side, 0.5, 0]);
    // Inside wall of the hall.
    solid.polygon([[side * W, 0, -B], [side * W, 0, B], [side * W, H, zH], [side * W, H, -zH]], shadeStone, [-side, 0, 0]);
    // A painted frieze along it at head height.
    solid.polygon([[side * (W - 0.05), 2.6, -B + 3], [side * (W - 0.05), 2.6, B - 3], [side * (W - 0.05), 3.5, B - 3], [side * (W - 0.05), 3.5, -B + 3]], gold, [-side, 0, 0]);
    solid.polygon([[side * (W - 0.08), 2.9, -B + 3], [side * (W - 0.08), 2.9, B - 3], [side * (W - 0.08), 3.2, B - 3], [side * (W - 0.08), 3.2, -B + 3]], lapis, [-side, 0, 0]);
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
    // Half columns standing against the walls between the torches.
    for (const z of [-18, 0, 18]) {
      k.cyl(sandstone, { r: 1.1, len: H, seg: 6, caps: 'none', axis: 'y' }, { at: [side * W, H / 2, z] });
      k.slab(gold, [2.6, 0.5, 2.6], { at: [side * W, H - 0.9, z] });
    }
  }
  return node;
}

/** A sphinx on a plinth, facing +z. About 185 triangles. */
function sphinx() {
  const k = kit();
  k.slab(shadeStone, [3.6, 0.7, 7.0], { at: [0, 0.35, 0] });
  k.box(sandstone, [2.4, 1.8, 4.6], { at: [0, 1.6, -0.8], r: 0.35 });
  for (const side of [1, -1]) k.slab(sandstone, [0.75, 0.7, 2.4], { at: [side * 0.8, 1.05, 2.2] });
  k.box(sandstone, [1.5, 1.7, 1.5], { at: [0, 3.3, 1.2], r: 0.3 });
  // Striped headdress, flaring out behind the face.
  k.prism(lapis, [[-1.35, -1.3], [1.35, -1.3], [0.9, 1.05], [-0.9, 1.05]], { depth: 0.5, axis: 'z' }, { at: [0, 3.35, 0.72] });
  for (const y of [2.6, 3.2, 3.8]) k.slab(gold, [2.3 - (y - 2.6) * 0.3, 0.16, 0.58], { at: [0, y, 0.72] });
  k.slab(gold, [0.3, 0.7, 0.3], { at: [0, 2.25, 1.8] });
  return k.node;
}

/** A stone bowl of fire on a column. About 40 triangles. */
function brazier() {
  const k = kit();
  k.cyl(sandstone, { r: 0.4, r2: 0.55, len: 2.3, seg: 6, caps: 'none', axis: 'y' }, { at: [0, 1.15, 0] });
  k.lathe(darkStone, [[1.0, 3.0], [0.45, 2.3]], { seg: 6, axis: 'y' });
  k.lathe(torch, [[0, 4.3], [0.6, 3.3], [0.75, 2.95]], { seg: 5, axis: 'y' });
  return k.node;
}

/** A pillar, its foot at the origin. The scene sinks it into the floor. */
export const pillarGeometry = () =>
  once('pillar', () => {
    const k = kit();
    const { radius, height } = PYRAMID;
    k.cyl(sandstone, { r: radius, len: height, seg: 8, caps: 'start', axis: 'y' }, { at: [0, height / 2, 0] });
    k.cyl(gold, { r: radius + 0.1, len: 0.4, seg: 8, caps: 'none', axis: 'y' }, { at: [0, height - 0.7, 0] });
    k.cyl(lapis, { r: radius + 0.1, len: 0.25, seg: 8, caps: 'none', axis: 'y' }, { at: [0, height - 1.3, 0] });
    k.cyl(shadeStone, { r: radius + 0.1, len: 0.3, seg: 8, caps: 'none', axis: 'y' }, { at: [0, 1.2, 0] });
    return k.node;
  });

function buildPyramid(site, track, add) {
  add(pyramidHall(hallWidth(track)), site.x, site.z, site.heading);

  // Sphinxes guard both doorways, looking down the road.
  const fx = Math.sin(site.heading);
  const fz = Math.cos(site.heading);
  const guard = sphinx();
  for (const end of [1, -1]) {
    for (const side of [1, -1]) {
      const across = side * (hallWidth(track) + 8);
      const out = end * (HALL.base + 9);
      add(guard, site.x - fz * across + fx * out, site.z + fx * across + fz * out, site.heading + (end > 0 ? 0 : Math.PI), 1.25);
    }
  }
  // Fires line the way in, where the mummies start to stir.
  const fire = brazier();
  for (const step of [-6, -11, -16]) {
    for (const side of [1, -1]) {
      const p = track.pointAt(site.from + step, side * (track.limit + 2.6));
      add(fire, p.x, p.z, p.heading);
    }
  }
}

function paintPyramid(site, track, paint) {
  // A stone floor through the hall, with a dark plate where each pillar hides.
  const fx = Math.sin(site.heading);
  const fz = Math.cos(site.heading);
  const local = (across, out) => [site.x - fz * across + fx * out, site.z + fx * across + fz * out];
  const W = hallWidth(track);
  const B = HALL.base;
  paint.polygon([local(-W, -B), local(W, -B), local(W, B), local(-W, B)], floorStone);
  // Flagstones: a chequer of two tones, with joints between the rows.
  const tile = W / 4;
  for (let row = 0; row * 6 < B * 2; row++) {
    for (let column = 0; column < 8; column++) {
      if ((row + column) % 2) continue;
      const x = -W + column * tile;
      const z = -B + row * 6;
      paint.polygon([local(x, z), local(x + tile, z), local(x + tile, z + 6), local(x, z + 6)], floorPale);
    }
  }
  for (let out = -B + 6; out < B; out += 6) {
    paint.polygon([local(-W, out), local(W, out), local(W, out + 0.22), local(-W, out + 0.22)], shadeStone);
  }
  for (const [across, out] of PYRAMID.pillars) {
    const r = PYRAMID.radius + 0.5;
    paint.polygon([local(across - r, out - r), local(across + r, out - r), local(across + r, out + r), local(across - r, out + r)], plateStone);
    const s = PYRAMID.radius - 0.3;
    paint.polygon([local(across - s, out - s), local(across + s, out - s), local(across + s, out + s), local(across - s, out + s)], shadeStone);
  }
}

// =====================================================================
// Electric Swamp: Thunder Bridge
// =====================================================================

const iron = material('#4a5266', { spec: 0.4, shine: 30 });
const ironDark = material('#2f3545', { spec: 0.3 });
const volt = material('#66f4ff', { glow: 1 });
const lime = material('#b6ff5c', { glow: 1 });
const plankA = material('#7a5a3a', { spec: 0.05 });
const plankB = material('#664a2e', { spec: 0.05 });
const plankGap = material('#3a2a1c', { spec: 0 });
const plankMoss = material('#4b5a36', { spec: 0 });
const lake = material('#1a8f8c', { glow: 0.42 });
const lakeDeep = material('#126a72', { glow: 0.3 });
const lakeShade = material('#0b3f4a', { glow: 0.1 });
const lily = material('#5fbf4a', { glow: 0.25 });
const ripple = material('#7ff0e0', { glow: 0.7 });
const timber = material('#5a4128', { spec: 0.05 });

const TOWER_HEIGHT = 12.5;
const CURTAIN_TOP = 8.4;
const bridgeSpan = (track) => track.limit + 1.5;

function bridgeTower(track) {
  const k = kit();
  const span = bridgeSpan(track);
  for (const side of [1, -1]) {
    k.box(ironDark, [2.4, 1.1, 2.4], { at: [side * span, 0.55, 0], r: 0.15 });
    k.box(iron, [1.3, TOWER_HEIGHT, 1.3], { at: [side * span, TOWER_HEIGHT / 2, 0], r: 0.14, deform: taperTop(TOWER_HEIGHT, 0.6, 0.6) });
    // Coils and a live ball on top.
    for (const y of [9.6, 10.6, 11.6]) k.cyl(volt, { r: 0.85 - (y - 9.6) * 0.12, len: 0.22, seg: 6, caps: 'none', axis: 'y' }, { at: [side * span, y, 0] });
    k.ball(volt, { r: 0.8, seg: 6, rings: 4 }, { at: [side * span, TOWER_HEIGHT + 0.9, 0] });
  }
  k.box(iron, [span * 2 + 1.4, 0.9, 1.0], { at: [0, CURTAIN_TOP + 0.2, 0], r: 0.2 });
  // Emitters along the underside of the beam.
  for (let x = -span + 2; x <= span - 2; x += 4) {
    k.slab(ironDark, [0.5, 0.5, 0.5], { at: [x, CURTAIN_TOP - 0.45, 0] });
  }
  return k.node;
}

/** One half of a tower's curtain of electricity: strands hanging from the beam, over x > 0. */
export function curtainGeometry(track) {
  return once(`curtain-${track.limit}`, () => {
    const k = kit();
    const top = CURTAIN_TOP - 0.5;
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

function buildBridge(site, track, add) {
  const road = along(site, track);
  const span = bridgeSpan(track);
  const k = kit();

  // Railings: a post every few metres with two rails between, and a lamp
  // on every third post.
  const every = 3;
  for (const side of [1, -1]) {
    let previous = null;
    for (let i = 0; i <= road.length; i += every) {
      const p = road.point(i, side * (track.limit + 0.6));
      k.slab(timber, [0.4, 1.9, 0.4], { at: [p.x, 0.95, p.z], rot: [0, p.heading, 0] });
      if ((i / every) % 3 === 1) k.ball(lime, { r: 0.36, seg: 5, rings: 3 }, { at: [p.x, 2.2, p.z] });
      if (previous) {
        beam(k, timber, [previous.x, 1.55, previous.z], [p.x, 1.55, p.z], 0.2);
        beam(k, timber, [previous.x, 0.8, previous.z], [p.x, 0.8, p.z], 0.16);
      }
      previous = p;
    }
  }

  // Towers, with cables fanning down to the railings either side.
  const tower = bridgeTower(track);
  for (const step of BRIDGE.gates) {
    const index = site.index + step;
    const p = track.pointAt(index, 0);
    add(tower, p.x, p.z, p.heading);
    for (const side of [1, -1]) {
      const top = track.pointAt(index, side * span);
      for (const reach of [5, 9, 13]) {
        for (const way of [1, -1]) {
          const foot = track.pointAt(index + way * reach, side * (track.limit + 0.6));
          beam(k, ironDark, [top.x, TOWER_HEIGHT - 1.4, top.z], [foot.x, 1.7, foot.z], 0.13);
        }
      }
    }
  }

  // Stone abutments where the bridge meets the bank.
  for (const i of [-1.5, road.length + 1.5]) {
    for (const side of [1, -1]) {
      const p = road.point(i, side * (track.limit + 2.4));
      k.box(ironDark, [3.4, 3.2, 5.5], { at: [p.x, 1.6, p.z], rot: [0, p.heading, 0], r: 0.3 });
      k.ball(volt, { r: 0.6, seg: 6, rings: 3 }, { at: [p.x, 3.8, p.z] });
    }
  }
  add(k.node);
}

/** How far the lake reaches from the centre line, `t` of the way along the bridge. */
const lakeReach = (track, t) => track.limit + 5 + 38 * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t)))));

function paintBridgeUnder(site, track, paint, random) {
  const road = along(site, track);
  const margin = 9;
  const steps = road.length + margin * 2;
  // The lake: a band of glowing water following the road, widest in the middle.
  for (const [look, shrink] of [[lakeDeep, 0], [lake, 9]]) {
    for (let i = 0; i < steps; i++) {
      const a = Math.max(track.limit, lakeReach(track, i / steps) - shrink);
      const b = Math.max(track.limit, lakeReach(track, (i + 1) / steps) - shrink);
      paint.polygon([road.at(i - margin, -a), road.at(i - margin, a), road.at(i + 1 - margin, b), road.at(i + 1 - margin, -b)], look);
    }
  }
  // Lily pads and ripples.
  for (let n = 0; n < 70; n++) {
    const t = 0.06 + random() * 0.88;
    const reach = lakeReach(track, t) - 3;
    const offset = (random() < 0.5 ? 1 : -1) * (track.limit + 3 + random() * Math.max(1, reach - track.limit - 4));
    const [x, z] = road.at(t * steps - margin, offset);
    if (n % 3) paint.blob(x, z, 0.8 + random() * 1.1, 0.7 + random() * 0.9, random() * 3, lily, 6);
    else paint.blob(x, z, 1.6 + random() * 2.4, 0.25 + random() * 0.2, random() * 3, ripple, 6);
  }
  // The shadow of the deck on the water.
  for (let i = 0; i < road.length; i++) {
    for (const side of [1, -1]) {
      paint.polygon([road.at(i, side * track.limit), road.at(i, side * (track.limit + 2.4)), road.at(i + 1, side * (track.limit + 2.4)), road.at(i + 1, side * track.limit)], lakeShade);
    }
  }
}

function paintBridge(site, track, paint) {
  const road = along(site, track);
  const half = track.halfWidth;
  // Planks: two to a sample, in alternating tones, with dark joints.
  for (let i = 0; i < road.length; i += 0.5) {
    const tone = Math.round(i * 2) % 3 === 0 ? plankB : plankA;
    paint.polygon([road.at(i, -track.limit), road.at(i, track.limit), road.at(i + 0.5, track.limit), road.at(i + 0.5, -track.limit)], tone);
    paint.polygon([road.at(i, -track.limit), road.at(i, track.limit), road.at(i + 0.06, track.limit), road.at(i + 0.06, -track.limit)], plankGap);
  }
  // The edges of the deck are slimy: this is the slow part, as off the road anywhere.
  for (const side of [1, -1]) {
    for (let i = 0; i < road.length; i++) {
      paint.polygon([road.at(i, side * (half + 0.2)), road.at(i, side * track.limit), road.at(i + 1, side * track.limit), road.at(i + 1, side * (half + 0.2))], plankMoss);
      paint.polygon([road.at(i, side * (half - 0.2)), road.at(i, side * (half + 0.2)), road.at(i + 1, side * (half + 0.2)), road.at(i + 1, side * (half - 0.2))], volt);
    }
  }
  // Glowing studs down the middle.
  for (let i = 0.5; i < road.length; i += 2) {
    paint.polygon([road.at(i, -0.25), road.at(i, 0.25), road.at(i + 0.6, 0.25), road.at(i + 0.6, -0.25)], lime);
  }
}

// =====================================================================
// Snowy Mountains: Avalanche Pass
// =====================================================================

const snow = material('#f6faff', { spec: 0.2, shine: 20 });
const grit = material('#9fb2c8', { spec: 0.1 });
const cliffRock = material('#63728f', { spec: 0.05 });
const cliffDark = material('#4c5a78', { spec: 0.05 });
const ice = material('#9fdcff', { spec: 0.9, shine: 70 });
const iceGlow = material('#c9f1ff', { glow: 0.5 });
const lanePaint = material('#b9dcf7');
const laneEdge = material('#2f7df2');
const icePatch = material('#8fa9c4');
const flagLooks = ['#e4463a', '#ffc928', '#2f7df2', '#31c45a', '#ffffff'].map((hex) => material(hex, { spec: 0.1 }));

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

/** A slab of cliff with snow on top. Three shapes, so a wall of them does not repeat. */
function cliff(variant) {
  const k = kit();
  const [wide, tall, deep] = [[6.5, 13, 6], [7.5, 17, 6.5], [5.5, 10, 5.5]][variant];
  faceted(k.ball(variant === 1 ? cliffDark : cliffRock, { r: 1, seg: 6, rings: 4, squash: [wide, tall, deep] }, { at: [0, tall * 0.25, 0] }));
  faceted(k.lathe(snow, [[0, tall * 1.3], [wide * 0.62, tall * 0.98], [wide * 0.55, tall * 0.9]], { seg: 6, axis: 'y' }));
  // A ledge of snow part-way up.
  faceted(k.ball(snow, { r: 1, seg: 5, rings: 3, squash: [wide * 0.7, 0.8, deep * 0.75] }, { at: [wide * 0.2, tall * 0.55, deep * 0.4] }));
  return k.node;
}

/** A natural arch of rock and ice across the road, hung with icicles. Runs along x. */
function iceArch(span) {
  const k = kit();
  for (const side of [1, -1]) {
    // Each leg is two boulders, one on the other, leaning in.
    faceted(k.ball(cliffRock, { r: 1, seg: 6, rings: 4, squash: [4.2, 8, 4] }, { at: [side * (span + 3.4), 5, 0], rot: [0, side * 0.5, side * 0.1] }));
    faceted(k.ball(cliffDark, { r: 1, seg: 6, rings: 4, squash: [3.6, 6, 3.4] }, { at: [side * (span + 1.6), 11.6, 0.3], rot: [0, side * 1.1, side * 0.34] }));
  }
  // The span: a long flattened boulder with a crust of snow.
  faceted(k.ball(cliffRock, { r: 1, seg: 8, rings: 4, squash: [span + 4.5, 2.5, 3.2] }, { at: [0, 15.2, 0] }));
  faceted(k.ball(snow, { r: 1, seg: 8, rings: 3, squash: [span + 3, 1.3, 2.8] }, { at: [0, 16.9, 0] }));
  // Icicles under it, long and short, following the curve of the span.
  const count = 11;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count * 2 - 1;
    const x = t * span * 0.94;
    const top = 15.2 - 2.4 * Math.sqrt(1 - (x / (span + 4.5)) ** 2) + 0.3;
    const length = 1.6 + ((i * 5) % 4) * 0.8;
    k.lathe(i % 3 ? ice : iceGlow, [[0.36, top], [0, top - length]], { seg: 4, axis: 'y' }, { at: [x, 0, ((i * 3) % 5) * 0.4 - 0.8] });
  }
  return k.node;
}

function buildPass(site, track, add, random) {
  const road = along(site, track);
  const lanes = PASS.lanes.map((step) => track.wrap(site.index + step - site.from));
  const nearLane = (i) => lanes.some((lane) => Math.abs(lane - i) < 4);

  // Walls of cliff both sides, with gaps where the snowballs come out.
  const cliffs = [cliff(0), cliff(1), cliff(2)];
  for (const side of [1, -1]) {
    for (let i = 1; i < road.length; i += 4) {
      if (nearLane(i)) continue;
      // Far enough back that the widest of them clears the edge of the road.
      const scale = 0.9 + random() * 0.5;
      const p = road.point(i + random() * 1.5, side * (track.limit + 1.6 + 7.5 * scale + random() * 1.5));
      if (free(track, p, track.limit + 7.5 * scale)) add(random.pick(cliffs), p.x, p.z, p.heading + random() * 6, scale);
    }
    // Bigger crags behind, so nothing shows through the gaps.
    for (let i = 4; i < road.length; i += 9) {
      const scale = 1.8 + random() * 0.8;
      const p = road.point(i, side * (track.limit + 7.5 * scale + 6 + random() * 6));
      if (free(track, p, track.limit + 7.5 * scale + 2)) add(cliffs[1], p.x, p.z, random() * 6, scale);
    }
  }

  // An arch at each end, and prayer flags strung across in between.
  const arch = iceArch(track.limit + 2);
  for (const i of [0, road.length]) {
    const p = road.point(i, 0);
    add(arch, p.x, p.z, p.heading);
  }
  const flags = bunting((track.limit + 6) * 2, flagLooks, { flags: 18, height: 10.5, poles: false });
  for (const share of [0.3, 0.7]) {
    const p = road.point(road.length * share, 0);
    add(flags, p.x, p.z, p.heading);
  }

  // A ramp of snow where each lane meets the cliff.
  const bank = snowBank();
  for (const step of PASS.lanes) {
    for (const side of [1, -1]) {
      const p = track.pointAt(site.index + step, side * (track.limit + 8));
      add(bank, p.x, p.z, p.heading);
    }
  }
}

function paintPass(site, track, paint, random) {
  const road = along(site, track);
  // Ice on the road, and snow drifting in from the edges.
  for (let n = 0; n < 26; n++) {
    const i = Math.floor(random() * (road.length - 3));
    const offset = (random() * 2 - 1) * (track.halfWidth - 4);
    const wide = 2 + random() * 4;
    paint.polygon([road.at(i, offset), road.at(i + 1, offset - wide * 0.5), road.at(i + 2.5, offset), road.at(i + 1.5, offset + wide * 0.5)], icePatch);
  }
  for (let i = 0; i < road.length; i += 1.5) {
    for (const side of [1, -1]) {
      const [x, z] = road.at(i, side * (track.limit - 0.5 + random()));
      paint.blob(x, z, 2 + random() * 3.5, 1.2 + random() * 2, random() * 3, snow, 6);
    }
  }
  // Each snowball lane is a band of polished ice across the road.
  const band = PASS.radius / track.spacing;
  for (const step of PASS.lanes) {
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

// =====================================================================
// Haunted Hollow: the manor graveyard
// =====================================================================

const wall = material('#4c4460', { spec: 0.05 });
const wallDark = material('#352f47', { spec: 0.05 });
const roof = material('#231f33', { spec: 0.1 });
const windowGlow = material('#ffc24a', { glow: 1 });
const windowSick = material('#b6ff5c', { glow: 1 });
const door = material('#2a1d1d', { spec: 0.1 });
const wrought = material('#1c1a26', { spec: 0.3 });
const tomb = material('#8d8aa0', { spec: 0.05 });
const tombDark = material('#6a6780', { spec: 0.05 });
const pumpkin = material('#ff8a1f', { spec: 0.2 });
const pumpkinFace = material('#ffe24a', { glow: 1 });
const stemGreen = material('#3f8f3a', { spec: 0.1 });
const graveEarth = material('#30283a', { spec: 0 });
const graveyardEarth = material('#3b3348', { spec: 0 });
const graveDirt = material('#2a1f1c', { spec: 0 });
const graveRim = material('#5a4335', { spec: 0 });
const gravel = material('#6b6272', { spec: 0 });
const leafLooks = [material('#c9651c'), material('#8a3f16'), material('#d9a21c')];
const ghostGlow = material('#d8fff0', { glow: 0.9 });
const barkDark = material('#231d2b', { spec: 0.05 });

/** A jack-o'-lantern, face toward +z. About 45 triangles. */
export function jackOLantern() {
  const k = kit();
  k.ball(pumpkin, { r: 1, seg: 7, rings: 3, squash: [0.62, 0.5, 0.58] }, { at: [0, 0.48, 0] });
  k.slab(stemGreen, [0.12, 0.22, 0.12], { at: [0, 1.02, 0] });
  for (const side of [1, -1]) k.slab(pumpkinFace, [0.16, 0.14, 0.06], { at: [side * 0.2, 0.62, 0.52] });
  k.slab(pumpkinFace, [0.44, 0.1, 0.06], { at: [0, 0.36, 0.55] });
  return k.node;
}

/** Gravestones: four kinds, each already leaning its own way. 24 to 36 triangles. */
export function gravestones() {
  const lean = [[0.07, 0, -0.06], [-0.05, 0, 0.1], [0.1, 0, 0.04], [-0.08, 0, -0.09]];
  return lean.map((rot, kind) => {
    const k = kit().sub({ rot });
    if (kind === 0) {
      k.slab(tomb, [1.0, 1.3, 0.3], { at: [0, 0.65, 0] });
      k.slab(tomb, [0.7, 0.3, 0.3], { at: [0, 1.42, 0] });
      k.slab(tombDark, [0.6, 0.08, 0.34], { at: [0, 0.9, 0] });
    } else if (kind === 1) {
      k.slab(tombDark, [0.9, 0.3, 0.6], { at: [0, 0.15, 0] });
      k.slab(tomb, [0.3, 1.9, 0.26], { at: [0, 1.2, 0] });
      k.slab(tomb, [1.0, 0.3, 0.26], { at: [0, 1.55, 0] });
    } else if (kind === 2) {
      k.slab(tombDark, [1.1, 0.25, 0.7], { at: [0, 0.12, 0] });
      k.slab(tomb, [0.8, 1.7, 0.36], { at: [0, 1.05, 0] });
      k.slab(tombDark, [0.9, 0.16, 0.44], { at: [0, 1.95, 0] });
    } else {
      k.slab(tomb, [1.2, 0.9, 0.3], { at: [0, 0.45, 0] });
      k.slab(tombDark, [0.8, 0.08, 0.34], { at: [0, 0.55, 0] });
    }
    return k.node;
  }).map((inner) => {
    const holder = new Node();
    holder.add(inner);
    return holder;
  });
}

/**
 * The manor: a tall crooked house with a tower, lit from inside.
 * Its front door is at the origin, facing +z.
 */
function manor() {
  const k = kit();
  // Main block, behind the door.
  k.slab(wall, [15, 9, 9], { at: [0, 4.5, -5] });
  k.prism(roof, [[-5.6, 0], [5.6, 0], [0, 5.4]], { depth: 15.8, axis: 'x' }, { at: [0, 9, -5] });
  // Boards and string courses, proud of the walls all the way round.
  k.slab(wallDark, [15.2, 0.4, 9.2], { at: [0, 4.6, -5] });
  k.slab(wallDark, [15.2, 0.5, 9.2], { at: [0, 0.25, -5] });
  // A wing leaning off one end, and a tower that is not quite upright.
  k.slab(wall, [7, 6, 7], { at: [-10.2, 3, -4.5], rot: [0, 0, 0.03] });
  k.prism(roof, [[-4.4, 0], [4.4, 0], [0, 4.2]], { depth: 7.6, axis: 'x' }, { at: [-10.2, 6, -4.5], rot: [0, 0, 0.03] });
  const tower = k.sub({ at: [6.2, 0, -1.6], rot: [0, 0, -0.045] });
  tower.slab(wall, [5, 17, 5], { at: [0, 8.5, 0] });
  tower.slab(wallDark, [5.5, 0.5, 5.5], { at: [0, 13.2, 0] });
  faceted(tower.lathe(roof, [[0, 25], [1.2, 20.5], [4.2, 17]], { seg: 4, axis: 'y' }, { rot: [0, Math.PI / 4, 0] }));
  tower.slab(windowGlow, [1.3, 2.2, 5.1], { at: [0, 14.9, 0] });
  tower.slab(windowGlow, [5.1, 2.2, 1.3], { at: [0, 14.9, 0] });
  tower.slab(windowSick, [1.2, 1.9, 5.1], { at: [0, 9.2, 0] });
  // Windows of the main block: tall on the ground floor, small above.
  for (const x of [-5.2, -2.6, 2.6]) k.slab(windowGlow, [1.3, 2.4, 9.1], { at: [x, 2.4, -5] });
  for (const x of [-5.2, -2.6, 0, 2.6]) k.slab(x === 0 ? windowSick : windowGlow, [1.1, 1.5, 9.1], { at: [x, 6.8, -5] });
  k.slab(windowGlow, [7.1, 1.6, 1.2], { at: [-10.2, 3.4, -4.5] });
  // Door, steps and a porch on two posts.
  k.slab(door, [2.2, 3.4, 0.3], { at: [0, 1.7, -0.45] });
  k.slab(tombDark, [4.4, 0.4, 2.2], { at: [0, 0.2, 0.6] });
  for (const x of [-1.9, 1.9]) k.slab(wallDark, [0.3, 4, 0.3], { at: [x, 2, 1.3] });
  k.prism(roof, [[-2.6, 0], [2.6, 0], [0, 1.6]], { depth: 2.6, axis: 'z' }, { at: [0, 4, 0.5] });
  // Chimneys.
  k.slab(wallDark, [1.1, 4.5, 1.1], { at: [-4.5, 12.4, -5.5], rot: [0, 0, 0.05] });
  k.slab(wallDark, [0.9, 3.2, 0.9], { at: [3.2, 12.2, -6.5] });
  return k.node;
}

/** Gate posts with pumpkins on top and an iron arch between. Runs along x. */
function graveyardGate(span) {
  const k = kit();
  const lantern = jackOLantern();
  for (const side of [1, -1]) {
    k.box(tomb, [2.4, 6.4, 2.4], { at: [side * span, 3.2, 0], r: 0.25 });
    k.slab(tombDark, [3, 0.5, 3], { at: [side * span, 6.6, 0] });
    k.slab(tombDark, [3, 0.6, 3], { at: [side * span, 0.3, 0] });
    for (const turn of [0, Math.PI]) {
      const copy = lantern.clone();
      copy.position = [side * span, 6.85, 0];
      copy.rotation[1] = turn;
      copy.scale = [1.7, 1.7, 1.7];
      k.node.add(copy);
    }
  }
  // The arch: straight bars round a curve, with spikes standing on it.
  const steps = 10;
  const point = (i) => {
    const angle = (i / steps) * Math.PI;
    return [-Math.cos(angle) * (span - 1), 7 + Math.sin(angle) * 4.2, 0];
  };
  for (let i = 0; i < steps; i++) {
    beam(k, wrought, point(i), point(i + 1), 0.3);
    const lower = point(i).map((value, axis) => (axis === 1 ? value - 1.1 : value));
    const lowerNext = point(i + 1).map((value, axis) => (axis === 1 ? value - 1.1 : value));
    if (i > 0 && i < steps - 1) beam(k, wrought, lower, lowerNext, 0.18);
    if (i > 0) k.lathe(wrought, [[0, 1.3], [0.16, 0]], { seg: 3, axis: 'y' }, { at: point(i) });
  }
  // A plate hanging in the middle with two eyes.
  k.slab(wrought, [3.6, 1.5, 0.2], { at: [0, 9.2, 0] });
  for (const x of [-0.7, 0.7]) k.slab(pumpkinFace, [0.6, 0.4, 0.3], { at: [x, 9.3, 0] });
  return k.node;
}

export function gnarledTree() {
  const k = kit();
  k.cyl(barkDark, { r: 0.2, r2: 0.7, len: 7, seg: 5, caps: 'none', axis: 'y' }, { at: [0, 3.5, 0], rot: [0, 0, 0.08] });
  for (const [height, turn, lean, length] of [[3.4, 0.4, 1.0, 3.4], [4.6, 2.6, -0.9, 2.8], [5.6, 4.4, 0.75, 2.2], [6.3, 1.6, -0.5, 1.8]]) {
    const branch = k.sub({ at: [-height * 0.08, height, 0], rot: [0, turn, lean] });
    branch.cyl(barkDark, { r: 0.05, r2: 0.2, len: length, seg: 4, caps: 'none', axis: 'y' }, { at: [0, length / 2, 0] });
    branch.cyl(barkDark, { r: 0.03, r2: 0.09, len: length * 0.6, seg: 3, caps: 'none', axis: 'y' }, { at: [length * 0.2, length * 0.95, 0], rot: [0, 0, -0.8] });
  }
  return k.node;
}

/** A little ghost: a glowing drop shape hanging in the air. 28 triangles. */
export function ghost() {
  const k = kit();
  k.lathe(ghostGlow, [[0, 2.9], [0.55, 2.5], [0.6, 1.9], [0.45, 1.2], [0.2, 1.0]], { seg: 5, axis: 'y' });
  for (const side of [1, -1]) k.slab(wrought, [0.14, 0.2, 0.06], { at: [side * 0.2, 2.3, 0.52] });
  return k.node;
}

/** Which side of the road the manor stands on: wherever there is room. */
function manorSide(site, track) {
  for (const side of [1, -1]) {
    const p = track.pointAt(site.index, side * (track.limit + 40));
    if (track.distanceTo(p.x, p.z) > track.limit + 34) return side;
  }
  return 1;
}

function buildGraveyard(site, track, add, random) {
  const road = along(site, track);
  const middle = road.length / 2;
  const side = manorSide(site, track);
  const k = kit();

  // Iron railings down both sides, with a gap at the manor's path.
  for (const flank of [1, -1]) {
    let previous = null;
    for (let i = 0; i <= road.length; i++) {
      const gap = flank === side && Math.abs(i - middle) < 2.5;
      const p = road.point(i, flank * (track.limit + 1.3));
      if (gap) {
        previous = null;
        continue;
      }
      k.slab(wrought, [0.13, 2.3, 0.13], { at: [p.x, 1.15, p.z], rot: [0, p.heading, 0] });
      if (i % 2 === 0) k.lathe(wrought, [[0, 0.7], [0.14, 0]], { seg: 3, axis: 'y' }, { at: [p.x, 2.3, p.z] });
      if (previous && i % 2 === 0) {
        beam(k, wrought, [previous.x, 1.95, previous.z], [p.x, 1.95, p.z], 0.12);
        beam(k, wrought, [previous.x, 0.45, previous.z], [p.x, 0.45, p.z], 0.12);
      }
      if (i % 2 === 0 || !previous) previous = p;
    }
  }
  add(k.node);

  // Pumpkins along the foot of the railings, facing the road.
  const lantern = jackOLantern();
  for (let i = 2; i < road.length; i += 4) {
    for (const flank of [1, -1]) {
      const p = road.point(i + (flank > 0 ? 0 : 2), flank * (track.limit + 0.8));
      add(lantern, p.x, p.z, p.heading + (flank * Math.PI) / 2 + random.range(-0.3, 0.3), 0.8 + random() * 0.4);
    }
  }

  // Gravestones in rows behind the railings: rows, because that is what
  // makes it a graveyard and not a field of rocks.
  const stones = gravestones();
  for (const flank of [1, -1]) {
    for (const row of [5, 9.5, 14, 19]) {
      for (let i = 1.5; i < road.length; i += 2.2) {
        if (flank === side && Math.abs(i - middle) < 4 + row * 0.3) continue; // the path, and the manor's lawn
        if (random() < 0.16) continue; // some plots are still empty
        const p = road.point(i + random() * 0.4, flank * (track.limit + row + random() * 0.8));
        if (!free(track, p, track.limit + 3)) continue;
        add(random.pick(stones), p.x, p.z, p.heading + (flank * Math.PI) / 2 + random.range(-0.25, 0.25), 0.9 + random() * 0.4);
      }
    }
  }

  // The manor, set back from the road at the end of its path.
  const front = road.point(middle, side * (track.limit + 25));
  add(manor(), front.x, front.z, front.heading - (side * Math.PI) / 2, 1.45);
  const tree = gnarledTree();
  for (const [out, down, scale] of [[20, -11, 1.5], [24, 12, 1.9], [12, -17, 1.2], [14, 19, 1.3]]) {
    const p = road.point(middle + down, side * (track.limit + out));
    if (free(track, p, track.limit + 4)) add(tree, p.x, p.z, random() * 6, scale);
  }
  for (const [out, down, scale] of [[9, -15, 1.4], [16, 6, 1.7], [11, 20, 1.2]]) {
    const p = road.point(middle + down, -side * (track.limit + out));
    if (free(track, p, track.limit + 4)) add(tree, p.x, p.z, random() * 6, scale);
  }
  // Ghosts drifting among the stones.
  const spirit = ghost();
  for (let n = 0; n < 9; n++) {
    const flank = n % 2 ? 1 : -1;
    const p = road.point(4 + (n / 9) * (road.length - 8), flank * (track.limit + 4 + random() * 14));
    if (!free(track, p, track.limit + 2)) continue;
    const copy = add(spirit, p.x, p.z, p.heading + (flank * Math.PI) / 2, 1 + random() * 0.6);
    copy.position[1] = 0.4 + random() * 1.6;
  }

  // The gates at either end.
  const gate = graveyardGate(track.limit + 2.4);
  for (const i of [-0.5, road.length + 0.5]) {
    const p = road.point(i, 0);
    add(gate, p.x, p.z, p.heading);
  }
}

function paintGraveyardUnder(site, track, paint, random) {
  const road = along(site, track);
  const side = manorSide(site, track);
  // Turned earth either side of the road, wider on the manor's side.
  for (let i = -2; i < road.length + 2; i++) {
    const a = -(track.limit + (side < 0 ? 44 : 24));
    const b = track.limit + (side > 0 ? 44 : 24);
    paint.polygon([road.at(i, a), road.at(i, b), road.at(i + 1, b), road.at(i + 1, a)], i % 2 ? graveEarth : graveyardEarth);
  }
  // The gravel path from the road to the front door.
  const middle = road.length / 2;
  paint.polygon([road.at(middle - 1.6, side * track.limit), road.at(middle + 1.6, side * track.limit), road.at(middle + 1.3, side * (track.limit + 27)), road.at(middle - 1.3, side * (track.limit + 27))], gravel);
  // Fallen leaves.
  for (let n = 0; n < 90; n++) {
    const [x, z] = road.at(random() * road.length, (random() * 2 - 1) * (track.limit + 22));
    paint.strands(x, z, 3, 0.7, random.pick(leafLooks), random);
  }
}

function paintGraveyard(site, track, paint, random) {
  const road = along(site, track);
  // A grave in the road wherever a skeleton sleeps: a rim of earth and a dark pit.
  for (const [across, step] of GRAVEYARD.graves) {
    const p = track.pointAt(site.index + step, across);
    paint.blob(p.x, p.z, 2.0, 2.7, -p.heading, graveRim, 8);
    paint.blob(p.x, p.z, 1.4, 2.1, -p.heading, graveDirt, 8);
  }
  for (let n = 0; n < 60; n++) {
    const [x, z] = road.at(random() * road.length, (random() * 2 - 1) * track.limit);
    paint.strands(x, z, 2, 0.6, random.pick(leafLooks), random);
  }
}

// =====================================================================
// Zombie City: the ruined street
// =====================================================================

const concrete = material('#8a8780', { spec: 0.05 });
const concreteDark = material('#5e5c58', { spec: 0.05 });
const brick = material('#7a4a3a', { spec: 0.05 });
const brickDark = material('#56342a', { spec: 0.05 });
const glassDark = material('#23303a', { spec: 0.6, shine: 40 });
const glassLit = material('#ffc56a', { glow: 0.9 });
const rust = material('#9a4f2a', { spec: 0.2 });
const rustDark = material('#5e3320', { spec: 0.2 });
const hazard = material('#f2c230', { spec: 0.2 });
const hazardDark = material('#23252b', { spec: 0.1 });
const fireGlow = material('#ff9a2e', { glow: 1 });
const toxic = material('#9dff4a', { glow: 0.9 });
const pavement = material('#6e6c68', { spec: 0 });
const pavementDark = material('#5a5855', { spec: 0 });
const crack = material('#2b2a2c', { spec: 0 });
const zebra = material('#d9d6cc', { spec: 0 });
const rubble = material('#7d7a74', { spec: 0 });

/**
 * A ruined building. `floors` storeys of 3.2 m; the top is broken off at an
 * angle. Rows of windows are single slabs that poke through every wall, so
 * four walls of windows cost twelve triangles a storey.
 */
export function ruin(wide, deep, floors, body, trim, lit) {
  const k = kit();
  const height = floors * 3.2;
  k.slab(body, [wide, height, deep], { at: [0, height / 2, 0] });
  k.slab(trim, [wide + 0.3, 0.5, deep + 0.3], { at: [0, 0.25, 0] });
  for (let floor = 0; floor < floors; floor++) {
    const y = floor * 3.2 + 1.9;
    // One band of glass round the building, cut into windows by the piers below.
    k.slab(floor === lit ? glassLit : glassDark, [wide + 0.08, 1.5, deep + 0.08], { at: [0, y, 0] });
  }
  // Piers: uprights that stand proud of the glass.
  const piers = Math.max(2, Math.round(wide / 3.2));
  for (let i = 0; i <= piers; i++) {
    k.slab(body, [0.7, height, deep + 0.2], { at: [-wide / 2 + (i * wide) / piers, height / 2, 0] });
  }
  for (const z of [-deep / 4, deep / 4]) k.slab(body, [wide + 0.2, height, 0.7], { at: [0, height / 2, z] });
  // The broken top: jagged leftovers of the next floor.
  k.slab(trim, [wide * 0.5, 2.6, deep * 0.9], { at: [-wide * 0.25, height + 1, 0], rot: [0, 0, 0.12] });
  k.slab(body, [wide * 0.28, 4.4, deep * 0.5], { at: [wide * 0.3, height + 1.6, -deep * 0.2], rot: [0.06, 0, -0.1] });
  k.slab(rustDark, [0.14, 3.4, 0.14], { at: [wide * 0.05, height + 2.6, deep * 0.3], rot: [0.2, 0, 0.3] });
  return k.node;
}

/** A burnt-out car. Faces +z. About 110 triangles. */
export function wreck(body) {
  const k = kit();
  k.box(body, [1.9, 0.75, 4.2], { at: [0, 0.7, 0], r: 0.2, rot: [0, 0, 0.06] });
  k.slab(body, [1.6, 0.6, 1.9], { at: [0.03, 1.3, -0.2], rot: [0, 0, 0.06] });
  k.slab(glassDark, [1.64, 0.4, 1.5], { at: [0.03, 1.32, -0.2], rot: [0, 0, 0.06] });
  for (const [x, z] of [[1, 1.3], [-1, 1.3], [1, -1.3]]) k.cyl(hazardDark, { r: 0.42, len: 0.3, seg: 6, axis: 'x' }, { at: [x * 0.9, 0.42, z] });
  k.slab(rustDark, [1.7, 0.1, 1.2], { at: [0.1, 1.2, 1.6], rot: [-0.5, 0, 0.06] }); // the bonnet, sprung
  return k.node;
}

/** An oil drum with a fire in it. About 75 triangles. */
export function fireDrum() {
  const node = drum(rust, rustDark);
  const k = kit(node);
  k.lathe(fireGlow, [[0, 2.4], [0.36, 1.7], [0.42, 1.3]], { seg: 5, axis: 'y' });
  return node;
}

/** A concrete barrier with hazard stripes. Runs along z. 48 triangles. */
export function jersey() {
  const k = kit();
  k.slab(concrete, [0.7, 0.5, 3.6], { at: [0, 0.25, 0] });
  k.slab(concrete, [0.34, 0.6, 3.6], { at: [0, 0.8, 0] });
  for (const z of [-1.2, 0, 1.2]) k.slab(z ? hazard : hazardDark, [0.38, 0.3, 0.7], { at: [0, 0.86, z] });
  return k.node;
}

/** A fallen walkway between two buildings, sagging over the road. Runs along x. */
function skybridge(span) {
  const k = kit();
  const tilt = 0.09;
  const deck = k.sub({ at: [0, 9.2, 0], rot: [0, 0, tilt] });
  deck.slab(concrete, [span * 2 + 8, 1.2, 4.6], {});
  deck.slab(concreteDark, [span * 2 + 8.2, 0.3, 4.8], { at: [0, -0.5, 0] });
  // Hazard tape along the edge: a row of slabs in two colours.
  const marks = 14;
  for (let i = 0; i < marks; i++) {
    deck.slab(i % 2 ? hazard : hazardDark, [((span * 2 + 8) / marks) * 0.98, 0.5, 4.9], { at: [-(span + 4) + ((i + 0.5) / marks) * (span * 2 + 8), 0.2, 0] });
  }
  // What is left of the glass sides.
  for (const [x, wide] of [[-span * 0.6, 7], [span * 0.2, 5], [span * 0.75, 4]]) {
    deck.slab(glassDark, [wide, 2.2, 0.16], { at: [x, 1.7, 2.1] });
    deck.slab(concreteDark, [wide + 0.3, 0.2, 0.3], { at: [x, 2.9, 2.1] });
  }
  // Reinforcing bars and a dead traffic light hanging underneath.
  for (const [x, length, lean] of [[-span * 0.8, 3.2, 0.3], [-span * 0.3, 2.2, -0.2], [span * 0.4, 3.8, 0.25], [span * 0.85, 2.4, -0.35]]) {
    deck.slab(rustDark, [0.12, length, 0.12], { at: [x, -length / 2 - 0.5, 0.6], rot: [0, 0, lean] });
  }
  deck.slab(hazardDark, [0.8, 2.2, 0.7], { at: [span * 0.1, -2.6, -0.8] });
  for (const [y, look] of [[-1.95, material('#ff4a3a', { glow: 1 })], [-2.6, hazardDark], [-3.25, hazardDark]]) {
    deck.slab(look, [0.46, 0.46, 0.8], { at: [span * 0.1, y, -0.8] });
  }
  return k.node;
}

function buildStreet(site, track, add, random) {
  const road = along(site, track);
  const middle = road.length / 2;

  // Buildings shoulder to shoulder down both sides.
  const kinds = [
    ruin(11, 9, 4, brick, brickDark, 1),
    ruin(13, 10, 7, concrete, concreteDark, 4),
    ruin(9, 9, 3, concreteDark, concrete, -1),
    ruin(12, 10, 5, brick, concreteDark, 2),
    ruin(10, 9, 9, concrete, concreteDark, 6),
  ];
  for (const side of [1, -1]) {
    let n = side > 0 ? 0 : 2;
    for (let i = 3; i < road.length - 2; i += 7) {
      const p = road.point(i, side * (track.limit + 9.5 + random() * 2));
      const kind = kinds[n++ % kinds.length];
      if (free(track, p, track.limit + 8)) add(kind, p.x, p.z, p.heading + (side > 0 ? 0 : Math.PI) + random.range(-0.05, 0.05));
    }
    // A second, taller rank behind, for a skyline.
    for (let i = 8; i < road.length; i += 13) {
      const scale = 1.5 + random() * 0.5;
      const p = road.point(i, side * (track.limit + 27 + random() * 6));
      const kind = kinds[(n++ % 2) * 3 + 1];
      if (free(track, p, track.limit + 9 * scale)) add(kind, p.x, p.z, p.heading + random() * 0.4, scale);
    }
  }

  // The fallen walkway everyone drives under.
  const mid = road.point(middle, 0);
  add(skybridge(track.limit + 5), mid.x, mid.z, mid.heading);

  // Concrete barriers along both kerbs, some knocked out of line.
  const barrier = jersey();
  for (const side of [1, -1]) {
    for (let i = 1; i < road.length; i += 2) {
      if (random() < 0.12) continue;
      const p = road.point(i, side * (track.limit + 0.9));
      add(barrier, p.x, p.z, p.heading + (random() < 0.15 ? random.range(-0.5, 0.5) : 0));
    }
  }

  // Clutter on the shoulders, in clumps: a wreck with a barricade and a
  // fire beside it reads as a scene; the same things spaced out do not.
  const wrecks = [wreck(rust), wreck(material('#6b7a86', { spec: 0.3 })), wreck(material('#c9b14a', { spec: 0.3 }))];
  const fire = fireDrum();
  const fenceBoard = barricade(hazard, hazardDark);
  const box = crate(1.2);
  const lamp = lampPost(concreteDark, glassLit, 7);
  let clump = 0;
  for (let i = 5; i < road.length - 4; i += 9) {
    const side = clump++ % 2 ? 1 : -1;
    const out = side * (track.limit + 3.6);
    const car = road.point(i, out);
    add(random.pick(wrecks), car.x, car.z, car.heading + random.range(-0.9, 0.9));
    const a = road.point(i + 2.2, out + side * 0.6);
    add(fire, a.x, a.z, 0);
    const b = road.point(i - 2.4, out - side * 0.4);
    add(fenceBoard, b.x, b.z, b.heading + Math.PI / 2 + random.range(-0.3, 0.3));
    const c = road.point(i + 3.2, out - side * 1.4);
    add(box, c.x, c.z, random() * 3);
    add(box, c.x + 0.3, c.z + 0.2, random() * 3, 0.7).position[1] = 1.2;
    const d = road.point(i + 4.5, -out);
    add(lamp, d.x, d.z, d.heading + (side * Math.PI) / 2 + (random() < 0.4 ? 0.25 : 0));
  }
}

function paintStreetUnder(site, track, paint, random) {
  const road = along(site, track);
  // Pavement under the buildings, in slabs.
  for (let i = -2; i < road.length + 2; i++) {
    const reach = track.limit + 42;
    paint.polygon([road.at(i, -reach), road.at(i, reach), road.at(i + 1, reach), road.at(i + 1, -reach)], i % 2 ? pavement : pavementDark);
  }
  for (let n = 0; n < 50; n++) {
    const [x, z] = road.at(random() * road.length, (random() < 0.5 ? 1 : -1) * (track.limit + 1 + random() * 8));
    paint.blob(x, z, 0.8 + random() * 1.6, 0.5 + random(), random() * 3, rubble, 5);
  }
}

function paintStreet(site, track, paint, random) {
  const road = along(site, track);
  const half = track.halfWidth;
  // Zebra crossings at both ends and in the middle.
  for (const where of [1, road.length / 2 - 4, road.length - 3]) {
    for (let stripe = 0; stripe < 12; stripe++) {
      const a = -half + 1.6 + (stripe * (half * 2 - 3.2)) / 12;
      paint.polygon([road.at(where, a), road.at(where, a + 1.3), road.at(where + 1.8, a + 1.3), road.at(where + 1.8, a)], zebra);
    }
  }
  // Cracks: crooked lines of short dark strokes.
  for (let n = 0; n < 22; n++) {
    let i = random() * (road.length - 6);
    let offset = (random() * 2 - 1) * (half - 2);
    for (let step = 0; step < 5 + random() * 5; step++) {
      const nextI = i + 0.5 + random() * 0.7;
      const nextOffset = offset + (random() * 2 - 1) * 1.6;
      paint.polygon([road.at(i, offset), road.at(i, offset + 0.16), road.at(nextI, nextOffset + 0.16), road.at(nextI, nextOffset)], crack);
      i = nextI;
      offset = nextOffset;
    }
  }
  // Manholes leaking something that glows.
  for (let n = 0; n < 6; n++) {
    const [x, z] = road.at(4 + (n / 6) * (road.length - 8), (n % 2 ? 1 : -1) * (3 + random() * 8));
    paint.blob(x, z, 1.7, 1.7, 0, crack, 10);
    paint.blob(x, z, 1.2, 1.2, 0, toxic, 10);
    paint.blob(x, z, 0.9, 0.9, 0, crack, 10);
    paint.blob(x + 1.6, z + 0.8, 1.3, 0.5, random() * 3, toxic, 6);
  }
}

// =====================================================================
// Putting them on a track
// =====================================================================

/**
 * The ground a landmark needs to itself. Returns a test (x, z) => boolean;
 * ordinary scenery stays out of wherever it is true.
 */
export function setPieceFootprint(site, track) {
  if (site.kind === 'pyramid') {
    const radius = HALL.base * 1.5;
    return (x, z) => Math.hypot(x - site.x, z - site.z) < radius;
  }
  const reach = track.limit + { bridge: 46, pass: 36, graveyard: 48, street: 44 }[site.kind];
  const points = [];
  const length = track.wrap(site.to - site.from);
  for (let i = -5; i <= length + 5; i++) {
    const index = track.wrap(site.from + i);
    points.push([track.xs[index], track.zs[index]]);
  }
  return (x, z) => points.some(([px, pz]) => (x - px) ** 2 + (z - pz) ** 2 < reach * reach);
}

/**
 * Adds the still part of a landmark to a world.
 * add(node, x, z, turn, scale): places a model, and returns the copy.
 */
export function buildSetPiece(site, track, add, random) {
  const build = { pyramid: buildPyramid, bridge: buildBridge, pass: buildPass, graveyard: buildGraveyard, street: buildStreet }[site.kind];
  build?.(site, track, add, random);
}

/** Paints what lies under the road at a landmark: water, earth, pavement. */
export function paintSetPieceUnder(site, track, paint, random) {
  const under = { bridge: paintBridgeUnder, graveyard: paintGraveyardUnder, street: paintStreetUnder }[site.kind];
  under?.(site, track, paint, random);
}

/**
 * Paints a landmark's markings over the road.
 * paint.polygon(points, look) takes [x, z] points.
 */
export function paintSetPiece(site, track, paint, random) {
  const over = { pyramid: paintPyramid, bridge: paintBridge, pass: paintPass, graveyard: paintGraveyard, street: paintStreet }[site.kind];
  over?.(site, track, paint, random);
}
