import { bake } from '../engine/bake.js';
import { ball, facet, pointAlong } from '../engine/geometry.js';
import { linear, material } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import { kit } from '../parts/kit.js';
import { cornerSign } from './dressing.js';
import { featureSite } from './features.js';
import { buildRoadworks, islandTop, roadworksFootprint } from './roadworks.js';
import { buildSetPiece, paintSetPiece, paintSetPieceUnder, setPieceFootprint } from './setpieces.js';
import { createTrack } from './track.js';

// Turns a track theme (see tracks/) into something to race on and look at:
// the track itself, a painted ground, baked scenery and a sky.
//
// Everything static ends up in a handful of merged meshes. The ground is a
// stack of flat coloured layers (terrain, patches, shoulder, road, markings)
// drawn in order with no depth test, which costs almost nothing and can
// never flicker the way stacked coplanar surfaces usually do. That makes
// paint the cheapest detail there is, so a lot of what looks like texture
// (ragged verges, tyre marks, cracks, strands of grass) is paint.

/** Small seeded random generator, so a track looks the same every time. */
export function seeded(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (low, high) => low + (high - low) * next();
  next.pick = (list) => list[Math.floor(next() * list.length)];
  return next;
}

/** Gives a kit mesh hard facets (rocks, crystals, pyramids). Returns the node. */
export function faceted(node) {
  node.geometry = facet(node.geometry);
  return node;
}

const MAX_VERTICES = 60000; // index buffers are 16-bit

/** Collects flat polygons at ground level into merged meshes. Later calls paint over earlier ones. */
function createPainter() {
  const root = new Node();
  let data = null;
  let total = 0;

  function flush() {
    if (!data || data.indices.length === 0) return;
    const node = new Node();
    node.geometry = {
      positions: new Float32Array(data.positions),
      normals: new Float32Array(data.normals),
      colors: new Float32Array(data.colors),
      params: new Float32Array(data.params),
      indices: new Uint16Array(data.indices),
      triangles: data.indices.length / 3,
    };
    root.add(node);
    data = null;
  }

  /** points: [[x, z], ...] forming a convex polygon. look: a material. */
  function polygon(points, look) {
    if (data && data.positions.length / 3 + points.length > MAX_VERTICES) flush();
    data ??= { positions: [], normals: [], colors: [], params: [], indices: [] };
    const base = data.positions.length / 3;
    total += points.length;
    for (const [x, z] of points) {
      data.positions.push(x, 0, z);
      data.normals.push(0, 1, 0);
      data.colors.push(look.color[0], look.color[1], look.color[2]);
      data.params.push(0, 1, look.glow);
    }
    for (let i = 1; i < points.length - 1; i++) {
      // Wind each triangle so it faces up, whichever way the outline ran.
      const [ax, az] = points[0];
      const [bx, bz] = points[i];
      const [cx, cz] = points[i + 1];
      const up = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      if (up >= 0) data.indices.push(base, base + i, base + i + 1);
      else data.indices.push(base, base + i + 1, base + i);
    }
  }

  /** A rough blob: an ellipse with `sides` corners. */
  function blob(x, z, radiusX, radiusZ, turn, look, sides = 7) {
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const px = Math.cos(angle) * radiusX;
      const pz = Math.sin(angle) * radiusZ;
      points.push([x + px * Math.cos(turn) - pz * Math.sin(turn), z + px * Math.sin(turn) + pz * Math.cos(turn)]);
    }
    polygon(points, look);
  }

  /**
   * A tuft: `count` thin slivers fanned out around a point, like blades of
   * grass seen from above. One triangle each.
   */
  function strands(x, z, count, length, look, random) {
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const reach = length * (0.5 + random());
      const rootX = x + (random() - 0.5) * length * 0.6;
      const rootZ = z + (random() - 0.5) * length * 0.6;
      const wide = 0.07 + reach * 0.07;
      polygon(
        [
          [rootX - Math.sin(angle) * wide, rootZ + Math.cos(angle) * wide],
          [rootX + Math.sin(angle) * wide, rootZ - Math.cos(angle) * wide],
          [rootX + Math.cos(angle) * reach, rootZ + Math.sin(angle) * reach],
        ],
        look,
      );
    }
  }

  function finish() {
    flush();
    root.updateWorld();
    return root;
  }

  return { polygon, blob, strands, finish, get vertices() { return total; } };
}

function paintRoad(paint, track, road, random) {
  const n = track.count;
  const half = track.halfWidth;
  // On the inside of a tight bend the road stops short of the middle of
  // the bend (track.clamp), so that its edges never cross over.
  const at = (i, offset) => {
    const p = track.pointAt(i, track.clamp(i, offset));
    return [p.x, p.z];
  };
  // Where the road climbs, dives or divides it is built, not painted
  // (roadworks.js), so the paint leaves those stretches alone.
  const built = (i) => Boolean(track.sectionAt(Math.floor(i)));
  // The paint runs one step in under each end of a built stretch. Built road
  // sits a finger above the ground, and seen from a car the join would
  // otherwise show as a hairline of bare ground across the road.
  const covered = (i) => built(i - 1) && built(i + 1);
  const strip = (from, to, look, every = 1, on = 1) => {
    for (let i = 0; i < n; i++) {
      if (covered(i)) continue;
      const chosen = typeof look === 'function' ? look(i) : look;
      if (every > 1 && i % every >= on) continue;
      if (chosen) paint.polygon([at(i, from), at(i, to), at(i + 1, to), at(i + 1, from)], chosen);
    }
  };

  // A ragged verge: tongues of the shoulder reaching out into the ground,
  // so the edge of the track is not a ruled line.
  for (let i = 0; i < n; i++) {
    if (covered(i)) continue;
    for (const side of [1, -1]) {
      const reach = track.limit + 0.4 + random() * random() * 3.2;
      const tip = at(i + 0.3 + random() * 0.4, side * reach);
      paint.polygon([at(i, side * (track.limit - 0.2)), tip, at(i + 1, side * (track.limit - 0.2))], road.shoulder);
    }
  }

  strip(-track.limit, track.limit, road.shoulder);
  // Wear on the shoulder: streaks of the ground showing through.
  if (road.wear) {
    for (let k = 0; k < n * 0.5; k++) {
      const i = random() * n;
      const side = random() < 0.5 ? 1 : -1;
      const offset = side * (half + 0.8 + random() * (track.shoulder - 1.6));
      const length = 1 + random() * 2.5;
      const wide = 0.15 + random() * 0.35;
      if (built(i) || built(i + length)) continue;
      paint.polygon([at(i, offset), at(i + length, offset + wide * 0.5), at(i + length, offset + wide), at(i, offset + wide)], road.wear);
    }
  }
  strip(-half, half, road.surface);

  // Patches where the surface has been mended, and tyre marks into the bends.
  if (road.patch) {
    for (let k = 0; k < 46; k++) {
      const i = Math.floor(random() * n);
      const length = 2 + Math.floor(random() * 4);
      const wide = 1.6 + random() * 3.4;
      const offset = (random() * 2 - 1) * (half - wide - 1.4);
      if (built(i) || built(i + length)) continue;
      for (let j = 0; j < length; j++) {
        paint.polygon([at(i + j, offset), at(i + j, offset + wide), at(i + j + 1, offset + wide), at(i + j + 1, offset)], road.patch);
      }
    }
  }
  if (road.scuff) {
    for (let i = 0; i < n; i += 3) {
      const bend = Math.abs(track.curvature[i]);
      if (bend < 1 / 70 || random() < 0.35) continue;
      // Marks swing toward the outside of the bend.
      const out = -Math.sign(track.curvature[i]);
      const length = 4 + Math.floor(random() * 7);
      const start = (random() * 2 - 1) * (half - 5);
      if (built(i) || built(i + length)) continue;
      for (const wheel of [0, 1.5]) {
        for (let j = 0; j < length; j++) {
          const a = start + wheel + out * (j / length) ** 2 * 3;
          const b = start + wheel + out * ((j + 1) / length) ** 2 * 3;
          paint.polygon([at(i + j, a), at(i + j, a + 0.34), at(i + j + 1, b + 0.34), at(i + j + 1, b)], road.scuff);
        }
      }
    }
  }

  const kerb = (i) => (Math.floor(i / 3) % 2 ? road.kerbA : road.kerbB);
  const kerbWidth = road.kerbWidth ?? 0.9;
  strip(half - kerbWidth, half, kerb);
  strip(-half, -half + kerbWidth, kerb);
  strip(-0.18, 0.18, road.line, 8, 3);
  // Thin edge lines just inside the kerbs.
  if (road.edge) {
    strip(half - kerbWidth - 0.55, half - kerbWidth - 0.35, road.edge);
    strip(-half + kerbWidth + 0.35, -half + kerbWidth + 0.55, road.edge);
  }

  // Start and finish: two rows of chequers across the road at sample 0.
  const square = (2 * half) / 14;
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 14; column++) {
      const left = -half + column * square;
      const a = (row * square) / track.spacing;
      const b = ((row + 1) * square) / track.spacing;
      paint.polygon(
        [at(a, left), at(a, left + square), at(b, left + square), at(b, left)],
        (row + column) % 2 ? road.chequerDark : road.chequerLight,
      );
    }
  }
  // Grid boxes behind the line, where the cars start.
  for (let slot = 0; slot < 4; slot++) {
    const row = Math.floor(slot / 2);
    const centre = slot % 2 ? 6.5 : -6.5;
    const front = -(3 + row * 4) + 1.4;
    for (const [from, to, a, b] of [
      [centre - 2, centre + 2, front, front + 0.12],
      [centre - 2, centre - 1.8, front - 1.6, front],
      [centre + 1.8, centre + 2, front - 1.6, front],
    ]) {
      paint.polygon([at(a, from), at(a, to), at(b, to), at(b, from)], road.chequerLight);
    }
  }
}

/** The arch over the start and finish line. */
function startGate(track, road) {
  const k = kit();
  const span = track.halfWidth + 1.4;
  const post = material('#39404f', { spec: 0.2 });
  const lamp = material('#ffe9a8', { glow: 1 });
  for (const side of [1, -1]) {
    k.box(post, [0.9, 7, 0.9], { at: [side * span, 3.5, 0], r: 0.2 });
    k.box(road.kerbA, [1.5, 0.7, 1.5], { at: [side * span, 0.35, 0], r: 0.15 });
    // Bands round the posts, and a lamp on top.
    k.slab(road.kerbB, [1.0, 0.35, 1.0], { at: [side * span, 2.2, 0] });
    k.slab(road.kerbA, [1.0, 0.35, 1.0], { at: [side * span, 4.4, 0] });
    k.ball(lamp, { r: 0.55, seg: 6, rings: 3 }, { at: [side * span, 8.6, 0] });
    // A brace up to the beam.
    k.slab(post, [0.3, 2.6, 0.3], { at: [side * (span - 1.1), 5.9, 0], rot: [0, 0, side * 0.75] });
  }
  k.box(post, [span * 2 + 1.6, 1.6, 0.7], { at: [0, 7.2, 0], r: 0.2 });
  // Chequered banner on both faces of the beam.
  const cells = 12;
  const size = (span * 2) / cells;
  for (let i = 0; i < cells; i++) {
    for (let row = 0; row < 2; row++) {
      const look = (i + row) % 2 ? road.chequerDark : road.chequerLight;
      k.slab(look, [size, 0.6, 0.76], { at: [-span + size * (i + 0.5), 6.9 + row * 0.6, 0] });
    }
  }
  // Start lights hanging under the beam.
  for (const x of [-3, -1.5, 0, 1.5, 3]) {
    k.slab(post, [0.9, 0.9, 0.5], { at: [x, 5.9, 0] });
    k.slab(lamp, [0.5, 0.5, 0.6], { at: [x, 5.9, 0] });
  }
  return k.node;
}

/** How far apart the posts of a checkpoint gate stand, either side of the centre line. */
export const checkpointSpan = (track) => track.halfWidth + 1.4;
export const CHECKPOINT_HEIGHT = 7;

/**
 * The frame of a checkpoint gate. The strip of lights under the beam is
 * drawn by the scene, since it changes as the player goes through.
 */
function checkpointGate(track, road) {
  const k = kit();
  const span = checkpointSpan(track);
  const frame = material('#39404f', { spec: 0.2 });
  for (const side of [1, -1]) {
    k.box(frame, [0.7, CHECKPOINT_HEIGHT, 0.7], { at: [side * span, CHECKPOINT_HEIGHT / 2, 0], r: 0.16 });
    k.box(frame, [1.3, 0.5, 1.3], { at: [side * span, 0.25, 0], r: 0.12 });
    k.slab(road.kerbA, [0.8, 0.3, 0.8], { at: [side * span, 1.8, 0] });
    k.slab(road.kerbB, [0.8, 0.3, 0.8], { at: [side * span, 2.4, 0] });
  }
  k.box(frame, [span * 2 + 1.2, 0.5, 0.6], { at: [0, CHECKPOINT_HEIGHT + 0.2, 0], r: 0.14 });
  return k.node;
}

/**
 * A sky to go round the camera: a dome shading from the fog colour at the
 * horizon to `theme.sky.top`, with stars, a sun or moon and clouds as the
 * theme asks. One mesh.
 */
export function buildSky(theme) {
  const top = linear(theme.sky.top);
  const horizon = linear(theme.fog.color);
  const dome = pointAlong(ball({ r: 90, seg: 16, rings: 6, half: true }), 'y');
  const count = dome.positions.length / 3;
  dome.colors = new Float32Array(count * 3);
  dome.params = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    const t = Math.pow(Math.max(0, dome.positions[v * 3 + 1] / 90), 0.45);
    for (let k = 0; k < 3; k++) dome.colors[v * 3 + k] = horizon[k] + (top[k] - horizon[k]) * t;
  }
  const sky = new Node();
  sky.geometry = dome;
  const random = seeded(theme.seed * 7 + 1);
  const k = kit(sky);

  // Stars: specks scattered over the upper sky.
  if (theme.sky.stars) {
    const star = material(theme.sky.stars.color ?? '#ffffff');
    for (let i = 0; i < theme.sky.stars.count; i++) {
      const turn = random() * Math.PI * 2;
      const up = 0.25 + random() * 1.2;
      const size = 0.12 + random() * random() * 0.3;
      k.ball(star, { r: size, seg: 4, rings: 2 }, { at: [Math.cos(turn) * Math.cos(up) * 85, Math.sin(up) * 85, Math.sin(turn) * Math.cos(up) * 85] });
    }
  }

  if (theme.sky.disc) {
    // Sun or moon, sitting where the light comes from, with a faint ring
    // of haze around it.
    const [x, y, z] = theme.light;
    const length = Math.hypot(x, y, z);
    const at = [(x / length) * 80, (y / length) * 80, (z / length) * 80];
    if (theme.sky.disc.halo) k.ball(material(theme.sky.disc.halo), { r: theme.sky.disc.size * 1.5, seg: 12, rings: 6 }, { at: at.map((value) => value * 1.04) });
    k.ball(material(theme.sky.disc.color), { r: theme.sky.disc.size, seg: 12, rings: 6 }, { at });
  }

  // Clouds: a few flattened puffs each, low in the sky all the way round.
  if (theme.sky.clouds) {
    const { count, color, shade } = theme.sky.clouds;
    const looks = [material(color), material(shade ?? color)];
    for (let i = 0; i < count; i++) {
      const turn = (i / count) * Math.PI * 2 + random() * 0.5;
      const up = 0.16 + random() * 0.4;
      const size = 5 + random() * 6;
      const cloud = k.sub({
        at: [Math.cos(turn) * Math.cos(up) * 84, Math.sin(up) * 84, Math.sin(turn) * Math.cos(up) * 84],
        rot: [0, -turn + Math.PI / 2, 0],
      });
      for (const [dx, dy, scale, look] of [[0, 0, 1, 0], [-0.9, -0.12, 0.7, 1], [0.95, -0.1, 0.62, 1], [0.35, 0.22, 0.6, 0]]) {
        cloud.ball(looks[look], { r: size * scale, seg: 7, rings: 4, squash: [1.25, 0.42, 0.5] }, { at: [dx * size, dy * size, 0] });
      }
    }
  }

  // One mesh, so the whole sky is one draw call however many stars it has.
  // (The dome comes first in it and is drawn first, with the rest over it.)
  return bake(sky);
}

/** A number from 0 to 1 that depends only on a place: the same every time, different a step away. */
function scatter(x, z) {
  const value = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function buildWorld(theme) {
  const track = createTrack(theme.layout);
  const random = seeded(theme.seed);

  // The landmark, if the track has one, and the ground it takes up; and
  // the same for the stretches where the road leaves the flat.
  const site = featureSite(theme.feature, track);
  const landmark = site ? setPieceFootprint(site, track) : () => false;
  const works = roadworksFootprint(track);
  const taken = (x, z) => landmark(x, z) || works(x, z);
  // Stretches that look after their own edges: no marker posts or arrow boards.
  const onSite = (index) =>
    (site && track.wrap(index - site.from + 3) <= track.wrap(site.to - site.from) + 6) ||
    Boolean(track.sectionAt(index - 2) || track.sectionAt(index + 2));

  // Scenery: copies of a few prototype props, merged into one mesh at the end.
  // No two copies are quite the same colour: each is a touch lighter or
  // darker and a touch warmer or cooler than the next, decided by where it
  // stands (so a track looks the same every time it is built).
  const set = new Node();
  const variety = theme.variety ?? 1;
  const put = (prop, x, z, { scale = 1, turn = 0, y = 0, plain = false } = {}) => {
    const copy = prop.clone();
    copy.position = [x, y, z];
    copy.rotation[1] = turn;
    copy.scale = Array.isArray(scale) ? scale : [scale, scale, scale];
    copy.floor = Math.max(0, y);
    if (!plain && variety > 0) {
      const light = 1 + (scatter(x, z) - 0.5) * 0.2 * variety;
      const warm = (scatter(z + 31.7, x - 12.3) - 0.5) * 0.08 * variety;
      copy.tint = [light * (1 + warm), light, light * (1 - warm)];
    }
    set.add(copy);
    return copy;
  };
  // Ordinary scenery keeps off the landmark.
  const place = (prop, x, z, options) => (taken(x, z) ? null : put(prop, x, z, options));
  // Scattered things also differ a little in build: one taller and thinner,
  // the next squatter. `size` is the scale asked for.
  const varied = (size, x, z) => {
    const girth = 1 + (scatter(x + 5.1, z + 9.7) - 0.5) * 0.14 * variety;
    const height = 1 + (scatter(z - 3.3, x + 17.9) - 0.5) * 0.24 * variety;
    return [size * girth, size * height, size * girth];
  };

  const paint = createPainter();
  const far = 700;
  paint.polygon([[-far, -far], [far, -far], [far, far], [-far, far]], theme.ground);

  const tools = {
    track,
    random,
    place,
    paint,
    taken,

    /** Scatters props beside the road, between `from` and `to` metres from its centre. */
    beside(count, props, { from, to, scale = [1, 1], y = [0, 0] }) {
      const list = Array.isArray(props) ? props : [props];
      for (let placed = 0, tries = 0; placed < count && tries < count * 20; tries++) {
        const distance = random.range(from, to) * (random() < 0.5 ? -1 : 1);
        const p = track.pointAt(random() * track.count, distance);
        // The far side of a bend can put it near another part of the road.
        if (track.distanceTo(p.x, p.z) < from - 1) continue;
        place(random.pick(list), p.x, p.z, {
          scale: varied(random.range(scale[0], scale[1]), p.x, p.z),
          turn: random() * Math.PI * 2,
          y: random.range(y[0], y[1]),
        });
        placed++;
      }
    },

    /** Scatters props anywhere within `reach` of the origin, at least `clear` metres from the road. */
    across(count, props, { clear, reach, scale = [1, 1] }) {
      const list = Array.isArray(props) ? props : [props];
      for (let placed = 0, tries = 0; placed < count && tries < count * 20; tries++) {
        const x = random.range(-reach, reach);
        const z = random.range(-reach, reach);
        if (track.distanceTo(x, z) < clear) continue;
        place(random.pick(list), x, z, { scale: varied(random.range(scale[0], scale[1]), x, z), turn: random() * Math.PI * 2 });
        placed++;
      }
    },

    /** Places one prop, but only if it is at least `clear` metres from the road. */
    landmark(prop, x, z, { clear, scale = 1, turn = 0 }) {
      if (track.distanceTo(x, z) < clear) return false;
      place(prop, x, z, { scale, turn });
      return true;
    },

    /**
     * Picks `count` places beside the road for a group of scenery, spread
     * round the lap on alternate sides. Each comes back as a little frame
     * of reference with the road behind it:
     *
     *   spot.put(prop, out, along, options)   out: metres further from the road
     *   spot.at(out, along)                   the same point as [x, z]
     *   spot.inward                           the turn (for put) that faces a prop at the road
     *   spot.blob(out, along, rx, rz, look)   paints a patch of ground there
     *
     * Building scenery in groups like this, rather than sprinkling it
     * evenly, is what makes a track look composed.
     */
    spots(count, { gap = 3, deep = 17 } = {}) {
      const found = [];
      for (let k = 0; k < count; k++) {
        const index = Math.round(track.count * (0.05 + (0.9 * (k + 0.2 + random() * 0.6)) / count));
        if (onSite(index)) continue;
        for (const side of k % 2 ? [1, -1] : [-1, 1]) {
          const near = track.pointAt(index, side * (track.limit + gap));
          const back = track.pointAt(index, side * (track.limit + gap + deep));
          // Room behind it, and not on the landmark.
          if (track.distanceTo(back.x, back.z) < track.limit + gap + deep - 2) continue;
          if (taken(back.x, back.z) || taken(near.x, near.z)) continue;
          const tx = track.tx[index];
          const tz = track.tz[index];
          const ox = -tz * side;
          const oz = tx * side;
          const at = (out, along) => [near.x + ox * out + tx * along, near.z + oz * out + tz * along];
          found.push({
            index,
            side,
            heading: near.heading,
            inward: (side * Math.PI) / 2,
            at,
            blob(out, along, radiusOut, radiusAlong, look, sides = 8) {
              const [x, z] = at(out, along);
              paint.blob(x, z, radiusAlong, radiusOut, Math.atan2(tz, tx), look, sides);
            },
            put(prop, out, along, options = {}) {
              const [x, z] = at(out, along);
              if (track.distanceTo(x, z) < track.limit + 1.2) return null;
              return put(prop, x, z, { ...options, turn: (options.turn ?? 0) + near.heading });
            },
          });
          break;
        }
      }
      return found;
    },
  };

  // Ground layers, bottom to top. Scenery is laid out before the road is
  // painted so that whatever it paints lies underneath.
  theme.paintGround?.(tools);
  if (site) paintSetPieceUnder(site, track, paint, random);
  theme.decorate(tools);
  paintRoad(paint, track, theme.road, random);
  if (site) paintSetPiece(site, track, paint, random);
  const ground = paint.finish();

  // Posts along the outer edge of the shoulder, where the invisible wall is.
  const marker = theme.marker();
  for (let i = 0; i < track.count; i += 5) {
    if (onSite(i)) continue;
    for (const side of [1, -1]) {
      const p = track.pointAt(i, side * (track.limit + 0.7));
      if (track.distanceTo(p.x, p.z) > track.limit) place(marker, p.x, p.z, { turn: p.heading });
    }
  }

  // Arrow boards round the outside of the sharper bends.
  const signs = { 1: cornerSign(theme.road, 1), [-1]: cornerSign(theme.road, -1) };
  for (let i = 3; i < track.count; i += 6) {
    const bend = track.curvature[i];
    if (Math.abs(bend) < 1 / 48 || onSite(i)) continue;
    const way = Math.sign(bend); // +1: the road bends right, so the board stands on the left
    const p = track.pointAt(i, -way * (track.limit + 2.4));
    if (track.distanceTo(p.x, p.z) > track.limit + 1) place(signs[way], p.x, p.z, { turn: p.heading + Math.PI + way * 0.5 });
  }

  const start = track.pointAt(0, 0);
  put(startGate(track, theme.road), start.x, start.z, { turn: start.heading, plain: true });

  // A checkpoint gate at the end of every sector but the last, which
  // finishes at the start line.
  const gate = checkpointGate(track, theme.road);
  const checkpoints = [];
  for (const index of track.checkpoints) {
    const p = track.pointAt(index, 0);
    put(gate, p.x, p.z, { turn: p.heading, plain: true });
    checkpoints.push({ index, x: p.x, z: p.z, heading: p.heading });
  }

  if (site) buildSetPiece(site, track, (model, x = 0, z = 0, turn = 0, scale = 1) => put(model, x, z, { turn, scale }), random);

  // Something growing or standing along each island, if the theme has a
  // thing for it: a row of palms, lamp posts, pines.
  const median = theme.median?.();
  if (median) {
    for (const section of track.sections) {
      for (let i = 4; i < section.length - 3; i += 5) {
        const index = section.from + i;
        if (track.dividerAt(index) < 2) continue;
        const p = track.pointAt(index, 0);
        put(median, p.x, p.z, { turn: p.heading + (i % 2 ? 0.4 : -0.3), y: islandTop(track, index), scale: (theme.medianScale ?? 1) * (0.9 + (i % 3) * 0.12) });
      }
    }
  }

  // Merged into one mesh (two on the biggest tracks), and darkened a little
  // toward the ground everything stands on.
  const scenery = bake(set, { contact: { height: 1.6, dark: 0.2 } });
  const { decks, openings } = buildRoadworks(track, theme);

  return { theme, track, ground, scenery, decks, openings, sky: buildSky(theme), site, checkpoints };
}
