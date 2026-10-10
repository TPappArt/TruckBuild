// A race track as a closed centre line.
//
// Tracks are described by a handful of [x, z] control points. The curve
// through them is resampled into evenly spaced samples (about two metres
// apart), and everything else - the road, where cars are on the lap, the
// rivals' racing line - works from those samples.
//
// Directions: `t` is the unit tangent (the way the race runs) and
// `r` = (-t.z, t.x) points to the driver's right. A lateral offset is
// positive on the right.
//
// Most of a track is flat, at ground level. A layout can also list
// `sections`: stretches where the road climbs over the ground, dips under
// it, or splits into two lanes round an island:
//
//   'over'   the whole road rises onto a viaduct
//   'under'  the whole road drops into a cutting and through a tunnel
//   'split'  an island down the middle makes two lanes, on the level
//   'fork'   two lanes that part company: the left one climbs over, the
//            right one dives under, and they meet again at the far end
//
// A section is { kind, around, metres }: where its middle is, as a share of
// the lap, and how long it is. Heights only change what is seen; driving
// is the same on a slope as on the flat. The island is solid.

/** Each lap is split into this many sectors, with a checkpoint between each. */
export const SECTORS = 4;

// What each kind of section does to the two halves of the road (metres
// above the ground; negative is below), and how wide its island is (metres
// either side of the centre line).
const SHAPES = {
  over: { left: 6, right: 6, island: 0 },
  under: { left: -7, right: -7, island: 0 },
  split: { left: 0, right: 0, island: 2.4 },
  fork: { left: 6, right: -7, island: 2.4 },
};
const RAMP = 38; // metres a climb or a descent takes
const NOSE = 12; // metres over which an island widens from nothing
const ROOF_BELOW = -6.3; // a sunken road this deep has the ground closed over it

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const SPACING = 2;

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function createTrack({ points, halfWidth = 7, shoulder = 5, sections: wanted = [] }) {
  // 1. Trace the smooth curve densely and measure it.
  const dense = [];
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const p0 = points[(i + count - 1) % count];
    const p1 = points[i];
    const p2 = points[(i + 1) % count];
    const p3 = points[(i + 2) % count];
    for (let step = 0; step < 40; step++) {
      const t = step / 40;
      dense.push([catmullRom(p0[0], p1[0], p2[0], p3[0], t), catmullRom(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  const lengths = [0];
  for (let i = 0; i < dense.length; i++) {
    const a = dense[i];
    const b = dense[(i + 1) % dense.length];
    lengths.push(lengths[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = lengths[dense.length];

  // 2. Resample at even spacing.
  const n = Math.round(length / SPACING);
  const spacing = length / n;
  let xs = new Float32Array(n);
  let zs = new Float32Array(n);
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const target = i * spacing;
    while (lengths[cursor + 1] < target) cursor++;
    const a = dense[cursor];
    const b = dense[(cursor + 1) % dense.length];
    const f = (target - lengths[cursor]) / (lengths[cursor + 1] - lengths[cursor] || 1);
    xs[i] = a[0] + (b[0] - a[0]) * f;
    zs[i] = a[1] + (b[1] - a[1]) * f;
  }

  const wrap = (i) => ((i % n) + n) % n;

  // 3. Tangents and curvature (radians of turn per metre; positive = right).
  const measure = () => {
    const tx = new Float32Array(n);
    const tz = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const dx = xs[wrap(i + 1)] - xs[wrap(i - 1)];
      const dz = zs[wrap(i + 1)] - zs[wrap(i - 1)];
      const len = Math.hypot(dx, dz) || 1;
      tx[i] = dx / len;
      tz[i] = dz / len;
    }
    const curvature = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = wrap(i - 1);
      const b = wrap(i + 1);
      // Cross product of neighbouring tangents: positive when bending right.
      const cross = tx[a] * tz[b] - tz[a] * tx[b];
      const dot = tx[a] * tx[b] + tz[a] * tz[b];
      curvature[i] = Math.atan2(cross, dot) / (2 * spacing);
    }
    return { tx, tz, curvature };
  };
  let { tx, tz, curvature } = measure();

  // 4. Put the start line on the straightest stretch, so the grid fits.
  let best = 0;
  let bestScore = Infinity;
  for (let i = 0; i < n; i++) {
    let score = 0;
    for (let k = -14; k <= 22; k++) score += Math.abs(curvature[wrap(i + k)]);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  const rotate = (array) => Float32Array.from({ length: n }, (_, i) => array[wrap(i + best)]);
  xs = rotate(xs);
  zs = rotate(zs);
  ({ tx, tz, curvature } = measure());

  // On the inside of a tight bend the edges of the road would cross over
  // each other, so the road stops short of the middle of the bend there.
  // `reach` is how far from the centre line it goes on the inside.
  const limit = halfWidth + shoulder;
  const reach = Float32Array.from(curvature, (bend) => Math.min(limit, 0.85 / Math.max(Math.abs(bend), 1e-6)));

  /** Pulls an offset in to where the road actually is at a sample. */
  function clamp(index, offset) {
    const i = wrap(Math.round(index));
    if (curvature[i] * offset <= 0) return offset;
    return Math.sign(offset) * Math.min(Math.abs(offset), reach[i]);
  }

  /** How far a car can get from the centre line at a sample, on the right (side 1) or the left (-1). */
  const edgeAt = (index, side) => Math.abs(clamp(index, side * limit));

  // 5. Checkpoints: one near the end of each sector but the last (which
  // ends at the start line), nudged onto the straightest bit of road nearby
  // so that a gate never straddles a hairpin.
  const checkpoints = [];
  for (let k = 1; k < SECTORS; k++) {
    const middle = Math.round((n * k) / SECTORS);
    let chosen = middle;
    let lowest = Infinity;
    for (let shift = -12; shift <= 12; shift++) {
      let bend = 0;
      for (let j = -7; j <= 7; j++) bend = Math.max(bend, Math.abs(curvature[wrap(middle + shift + j)]));
      const score = bend + Math.abs(shift) * 0.0004;
      if (score < lowest) {
        lowest = score;
        chosen = middle + shift;
      }
    }
    checkpoints.push(chosen);
  }

  // 6. Sections: how high each half of the road is at every sample, and
  // how wide the island between them.
  const left = new Float32Array(n); // height of the half left of the centre line
  const right = new Float32Array(n);
  const island = new Float32Array(n); // half-width of the island; 0 where there is none
  const owner = new Int8Array(n).fill(-1); // which section a sample belongs to
  const sections = wanted.map((section, number) => {
    const shape = SHAPES[section.kind];
    const span = Math.round(section.metres / spacing);
    const from = Math.round(n * section.around) - Math.round(span / 2);
    // Islands open before the lanes start to climb or dive, so that by the
    // time the two are at different heights there is a wall between them.
    const lead = shape.island > 0 && (shape.left || shape.right) ? NOSE : 0;
    for (let i = 0; i <= span; i++) {
      const metres = i * spacing;
      const back = span * spacing - metres;
      const grade = smooth(lead, lead + RAMP, metres) * smooth(lead, lead + RAMP, back);
      const index = wrap(from + i);
      left[index] = shape.left * grade;
      right[index] = shape.right * grade;
      island[index] = shape.island * smooth(0, NOSE, metres) * smooth(0, NOSE, back);
      owner[index] = number;
    }
    return { kind: section.kind, from: wrap(from), to: wrap(from + span), length: span, ...shape };
  });

  /** Height of the road at a sample (which may be fractional), `offset` metres right of the centre line. */
  function heightAt(index, offset = 0) {
    const heights = offset < 0 ? left : right;
    const base = Math.floor(index);
    const f = index - base;
    const a = heights[wrap(base)];
    return f === 0 ? a : a + (heights[wrap(base + 1)] - a) * f;
  }

  /** Half the width of the island at a sample: 0 where the road is not divided. */
  function dividerAt(index) {
    const base = Math.floor(index);
    const f = index - base;
    const a = island[wrap(base)];
    return f === 0 ? a : a + (island[wrap(base + 1)] - a) * f;
  }

  /** True where the road is in a tunnel, with the ground closed over it. */
  const roofAt = (index, offset = 0) => (offset < 0 ? left : right)[wrap(Math.round(index))] < ROOF_BELOW;

  /** The section a sample is in, or null on ordinary flat road. */
  const sectionAt = (index) => sections[owner[wrap(Math.round(index))]] ?? null;

  /**
   * Finds where a point is relative to the track.
   * `hint` is the sample index from the last call (pass -1 to search everywhere).
   * Returns { index, offset, along }: nearest sample, metres to its right,
   * and metres past it along the track.
   */
  function project(x, z, hint = -1) {
    let index = 0;
    let bestDistance = Infinity;
    const from = hint < 0 ? 0 : hint - 14;
    const to = hint < 0 ? n - 1 : hint + 14;
    for (let k = from; k <= to; k++) {
      const i = wrap(k);
      const d = (x - xs[i]) ** 2 + (z - zs[i]) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        index = i;
      }
    }
    const dx = x - xs[index];
    const dz = z - zs[index];
    return {
      index,
      offset: dx * -tz[index] + dz * tx[index],
      along: dx * tx[index] + dz * tz[index],
    };
  }

  /** Position and heading at sample `index` (may be fractional or out of range), `offset` metres right. */
  function pointAt(index, offset = 0) {
    const base = Math.floor(index);
    const f = index - base;
    const a = wrap(base);
    const b = wrap(base + 1);
    const x = xs[a] + (xs[b] - xs[a]) * f;
    const z = zs[a] + (zs[b] - zs[a]) * f;
    const dirX = tx[a] + (tx[b] - tx[a]) * f;
    const dirZ = tz[a] + (tz[b] - tz[a]) * f;
    return { x: x - dirZ * offset, z: z + dirX * offset, heading: Math.atan2(dirX, dirZ) };
  }

  /** Distance from a point to the centre line. Slow: for building scenery, not per frame. */
  function distanceTo(x, z) {
    let bestDistance = Infinity;
    for (let i = 0; i < n; i++) {
      const d = (x - xs[i]) ** 2 + (z - zs[i]) ** 2;
      if (d < bestDistance) bestDistance = d;
    }
    return Math.sqrt(bestDistance);
  }

  /**
   * A place for a set piece `metres` long: the stretch `around` the given
   * share of the lap (0..1), described by the straight line that best fits
   * the road there. Returns { index, from, to, x, z, heading, bow } where
   * `bow` is how far the road strays from that line, in metres.
   */
  function site(around, metres) {
    const half = Math.round(metres / spacing / 2);
    const index = wrap(Math.round(n * around));
    const a = wrap(index - half);
    const b = wrap(index + half);
    const dx = xs[b] - xs[a];
    const dz = zs[b] - zs[a];
    const span = Math.hypot(dx, dz) || 1;
    // Centre the line on the road: halfway between the chord and the middle
    // of the bend, so the road strays equally to either side.
    const midX = (xs[a] + xs[b]) / 2;
    const midZ = (zs[a] + zs[b]) / 2;
    const x = (midX + xs[index]) / 2;
    const z = (midZ + zs[index]) / 2;
    const bow = Math.hypot(xs[index] - midX, zs[index] - midZ) / 2;
    return { index, from: a, to: b, x, z, heading: Math.atan2(dx / span, dz / span), bow };
  }

  return {
    count: n,
    spacing,
    length,
    halfWidth,
    shoulder,
    /** Cars cannot get further from the centre line than this (less on the inside of a tight bend: see edgeAt). */
    limit,
    xs,
    zs,
    tx,
    tz,
    curvature,
    /** Sample indices of the checkpoints, in the order they are met. */
    checkpoints,
    /** Raised, sunken and divided stretches: [{ kind, from, to, length, left, right, island }]. */
    sections,
    wrap,
    project,
    pointAt,
    distanceTo,
    site,
    clamp,
    edgeAt,
    heightAt,
    dividerAt,
    roofAt,
    sectionAt,
  };
}
