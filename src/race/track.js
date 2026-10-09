// A race track as a closed centre line.
//
// Tracks are flat and described by a handful of [x, z] control points. The
// curve through them is resampled into evenly spaced samples (about two
// metres apart), and everything else - the road mesh, where cars are on the
// lap, the rivals' racing line - works from those samples.
//
// Directions: `t` is the unit tangent (the way the race runs) and
// `r` = (-t.z, t.x) points to the driver's right. A lateral offset is
// positive on the right.

const SPACING = 2;

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function createTrack({ points, halfWidth = 7, shoulder = 5 }) {
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

  return {
    count: n,
    spacing,
    length,
    halfWidth,
    shoulder,
    /** Cars cannot get further from the centre line than this. */
    limit: halfWidth + shoulder,
    xs,
    zs,
    tx,
    tz,
    curvature,
    wrap,
    project,
    pointAt,
    distanceTo,
  };
}
