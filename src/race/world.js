import { bake } from '../engine/bake.js';
import { ball, facet, pointAlong } from '../engine/geometry.js';
import { linear, material } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import { kit } from '../parts/kit.js';
import { createTrack } from './track.js';

// Turns a track theme (see tracks/) into something to race on and look at:
// the track itself, a painted ground, baked scenery and a sky.
//
// Everything static ends up in a handful of merged meshes. The ground is a
// stack of flat coloured layers (terrain, patches, shoulder, road, markings)
// drawn in order with no depth test, which costs almost nothing and can
// never flicker the way stacked coplanar surfaces usually do.

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

/** Collects flat polygons at ground level into one mesh. Later calls paint over earlier ones. */
function createPainter() {
  const data = { positions: [], normals: [], colors: [], params: [], indices: [] };

  /** points: [[x, z], ...] forming a convex polygon. look: a material. */
  function polygon(points, look) {
    const base = data.positions.length / 3;
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

  function finish() {
    const node = new Node();
    node.geometry = {
      positions: new Float32Array(data.positions),
      normals: new Float32Array(data.normals),
      colors: new Float32Array(data.colors),
      params: new Float32Array(data.params),
      indices: new Uint16Array(data.indices),
      triangles: data.indices.length / 3,
    };
    node.updateWorld();
    return node;
  }

  return { polygon, blob, finish, get vertices() { return data.positions.length / 3; } };
}

function paintRoad(paint, track, road) {
  const n = track.count;
  const half = track.halfWidth;
  const at = (i, offset) => {
    const p = track.pointAt(i, offset);
    return [p.x, p.z];
  };
  const strip = (from, to, look, every = 1, on = 1) => {
    for (let i = 0; i < n; i++) {
      const chosen = typeof look === 'function' ? look(i) : look;
      if (every > 1 && i % every >= on) continue;
      if (chosen) paint.polygon([at(i, from), at(i, to), at(i + 1, to), at(i + 1, from)], chosen);
    }
  };

  strip(-track.limit, track.limit, road.shoulder);
  strip(-half, half, road.surface);
  const kerb = (i) => (Math.floor(i / 3) % 2 ? road.kerbA : road.kerbB);
  const kerbWidth = road.kerbWidth ?? 0.9;
  strip(half - kerbWidth, half, kerb);
  strip(-half, -half + kerbWidth, kerb);
  strip(-0.18, 0.18, road.line, 8, 3);

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
}

/** The arch over the start and finish line. */
function startGate(track, road) {
  const k = kit();
  const span = track.halfWidth + 1.4;
  const post = material('#39404f', { spec: 0.2 });
  for (const side of [1, -1]) {
    k.box(post, [0.9, 7, 0.9], { at: [side * span, 3.5, 0], r: 0.2 });
    k.box(road.kerbA, [1.5, 0.7, 1.5], { at: [side * span, 0.35, 0], r: 0.15 });
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
  return k.node;
}

function buildSky(theme) {
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

  if (theme.sky.disc) {
    // Sun or moon, sitting where the light comes from.
    const k = kit(sky);
    const [x, y, z] = theme.light;
    k.ball(material(theme.sky.disc.color), { r: theme.sky.disc.size, seg: 10, rings: 5 }, { at: [x * 80, y * 80, z * 80] });
  }
  sky.updateWorld();
  return sky;
}

export function buildWorld(theme) {
  const track = createTrack(theme.layout);
  const random = seeded(theme.seed);

  // Ground layers, bottom to top.
  const paint = createPainter();
  const far = 700;
  paint.polygon([[-far, -far], [far, -far], [far, far], [-far, far]], theme.ground);
  theme.paintGround?.({ paint, track, random });
  paintRoad(paint, track, theme.road);
  const ground = paint.finish();

  // Scenery: copies of a few prototype props, merged into one mesh at the end.
  const set = new Node();
  const place = (prop, x, z, { scale = 1, turn = 0, y = 0 } = {}) => {
    const copy = prop.clone();
    copy.position = [x, y, z];
    copy.rotation[1] = turn;
    copy.scale = [scale, scale, scale];
    set.add(copy);
    return copy;
  };

  const tools = {
    track,
    random,
    place,

    /** Scatters props beside the road, between `from` and `to` metres from its centre. */
    beside(count, props, { from, to, scale = [1, 1], y = [0, 0] }) {
      const list = Array.isArray(props) ? props : [props];
      for (let placed = 0, tries = 0; placed < count && tries < count * 20; tries++) {
        const distance = random.range(from, to) * (random() < 0.5 ? -1 : 1);
        const p = track.pointAt(random() * track.count, distance);
        // The far side of a bend can put it near another part of the road.
        if (track.distanceTo(p.x, p.z) < from - 1) continue;
        place(random.pick(list), p.x, p.z, {
          scale: random.range(scale[0], scale[1]),
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
        place(random.pick(list), x, z, { scale: random.range(scale[0], scale[1]), turn: random() * Math.PI * 2 });
        placed++;
      }
    },

    /** Places one prop, but only if it is at least `clear` metres from the road. */
    landmark(prop, x, z, { clear, scale = 1, turn = 0 }) {
      if (track.distanceTo(x, z) < clear) return false;
      place(prop, x, z, { scale, turn });
      return true;
    },
  };

  // Posts along the outer edge of the shoulder, where the invisible wall is.
  const marker = theme.marker();
  for (let i = 0; i < track.count; i += 5) {
    for (const side of [1, -1]) {
      const p = track.pointAt(i, side * (track.limit + 0.7));
      if (track.distanceTo(p.x, p.z) > track.limit) place(marker, p.x, p.z, { turn: p.heading });
    }
  }

  const start = track.pointAt(0, 0);
  place(startGate(track, theme.road), start.x, start.z, { turn: start.heading });

  theme.decorate(tools);

  const scenery = bake(set);

  return { theme, track, ground, scenery, sky: buildSky(theme) };
}
