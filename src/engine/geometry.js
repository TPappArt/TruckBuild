// Low-poly shape builders.
//
// Every builder returns plain mesh data: { positions, normals, indices,
// triangles }. Nothing here touches WebGL, so the same data can feed another
// renderer or engine later.
//
// The cartoon look comes from the normals rather than from polygon count:
// a box gets a single chamfer per edge, and the shading is blended across
// that chamfer so it reads as a soft rounded corner at 44 triangles.

const TAU = Math.PI * 2;

/** Wraps raw arrays as mesh data. Use it for one-off custom shapes. */
export function meshData(positions, normals, indices) {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    triangles: indices.length / 3,
  };
}

function faceNormal(p, a, b, c) {
  const ux = p[b * 3] - p[a * 3];
  const uy = p[b * 3 + 1] - p[a * 3 + 1];
  const uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3];
  const vy = p[c * 3 + 1] - p[a * 3 + 1];
  const vz = p[c * 3 + 2] - p[a * 3 + 2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/** Area-weighted smooth normals for vertices shared between triangles. */
function smoothNormals(positions, indices) {
  const normals = new Array(positions.length).fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const n = faceNormal(positions, indices[i], indices[i + 1], indices[i + 2]);
    for (let k = 0; k < 3; k++) {
      const v = indices[i + k] * 3;
      normals[v] += n[0];
      normals[v + 1] += n[1];
      normals[v + 2] += n[2];
    }
  }
  for (let v = 0; v < normals.length; v += 3) {
    const len = Math.hypot(normals[v], normals[v + 1], normals[v + 2]) || 1;
    normals[v] /= len;
    normals[v + 1] /= len;
    normals[v + 2] /= len;
  }
  return normals;
}

/**
 * Box with every edge chamfered once and shaded as if rounded. 44 triangles.
 *
 * `deform(point)` may move vertices (taper, shear, wedge) by mutating the
 * [x, y, z] array it is given; face normals are rebuilt afterwards.
 */
export function roundedBox(width, height, depth, { r = 0.08, deform } = {}) {
  const half = [width / 2, height / 2, depth / 2];
  const radius = Math.min(r, half[0] * 0.95, half[1] * 0.95, half[2] * 0.95);
  const signs = [-1, 1];

  // Each box corner becomes three vertices, one on each face that meets there.
  const id = (axis, s) => axis * 8 + (s[0] > 0 ? 4 : 0) + (s[1] > 0 ? 2 : 0) + (s[2] > 0 ? 1 : 0);
  const positions = new Array(72);
  const normals = new Array(72).fill(0);
  for (let axis = 0; axis < 3; axis++) {
    for (const sx of signs) {
      for (const sy of signs) {
        for (const sz of signs) {
          const s = [sx, sy, sz];
          const v = id(axis, s) * 3;
          for (let k = 0; k < 3; k++) {
            positions[v + k] = s[k] * (k === axis ? half[k] : half[k] - radius);
          }
          normals[v + axis] = s[axis];
        }
      }
    }
  }

  const triangles = [];
  const quad = (a, b, c, d) => triangles.push([a, b, c], [a, c, d]);
  const faces = [];

  // Six flat faces.
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    for (const side of signs) {
      const corner = (su, sv) => {
        const s = [0, 0, 0];
        s[axis] = side;
        s[u] = su;
        s[v] = sv;
        return id(axis, s);
      };
      const ring = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
      quad(...ring);
      faces.push({ axis, side, ring });
    }
  }

  // Twelve chamfer strips along the edges.
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3;
    const c = (a + 2) % 3;
    for (const sa of signs) {
      for (const sb of signs) {
        const at = (axis, sc) => {
          const s = [0, 0, 0];
          s[a] = sa;
          s[b] = sb;
          s[c] = sc;
          return id(axis, s);
        };
        quad(at(a, -1), at(a, 1), at(b, 1), at(b, -1));
      }
    }
  }

  // Eight corner triangles.
  for (const sx of signs) {
    for (const sy of signs) {
      for (const sz of signs) {
        const s = [sx, sy, sz];
        triangles.push([id(0, s), id(1, s), id(2, s)]);
      }
    }
  }

  // The undeformed box is convex and centred, so "outward" is simply away
  // from the origin. Fix each triangle's winding against that.
  const indices = [];
  for (const [a, b, c] of triangles) {
    const n = faceNormal(positions, a, b, c);
    const cx = positions[a * 3] + positions[b * 3] + positions[c * 3];
    const cy = positions[a * 3 + 1] + positions[b * 3 + 1] + positions[c * 3 + 1];
    const cz = positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2];
    if (n[0] * cx + n[1] * cy + n[2] * cz >= 0) indices.push(a, b, c);
    else indices.push(a, c, b);
  }

  if (deform) {
    for (let v = 0; v < 72; v += 3) {
      const point = [positions[v], positions[v + 1], positions[v + 2]];
      deform(point);
      positions[v] = point[0];
      positions[v + 1] = point[1];
      positions[v + 2] = point[2];
    }
    for (const { axis, side, ring } of faces) {
      // Cross product of the diagonals gives the (possibly tilted) face normal.
      const d1 = [0, 1, 2].map((k) => positions[ring[2] * 3 + k] - positions[ring[0] * 3 + k]);
      const d2 = [0, 1, 2].map((k) => positions[ring[3] * 3 + k] - positions[ring[1] * 3 + k]);
      let n = [d1[1] * d2[2] - d1[2] * d2[1], d1[2] * d2[0] - d1[0] * d2[2], d1[0] * d2[1] - d1[1] * d2[0]];
      const len = Math.hypot(...n) || 1;
      const flip = n[axis] * side < 0 ? -1 : 1;
      n = n.map((value) => (value / len) * flip);
      for (const v of ring) {
        normals[v * 3] = n[0];
        normals[v * 3 + 1] = n[1];
        normals[v * 3 + 2] = n[2];
      }
    }
  }

  return meshData(positions, normals, indices);
}

/** Plain sharp-edged box. 12 triangles. For small details only. */
export function box(width, height, depth) {
  const half = [width / 2, height / 2, depth / 2];
  const positions = [];
  const normals = [];
  const indices = [];
  for (let axis = 0; axis < 3; axis++) {
    const u = (axis + 1) % 3;
    const v = (axis + 2) % 3;
    for (const side of [-1, 1]) {
      const base = positions.length / 3;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = [0, 0, 0];
        p[axis] = side * half[axis];
        p[u] = su * half[u];
        p[v] = sv * half[v];
        positions.push(...p);
        const n = [0, 0, 0];
        n[axis] = side;
        normals.push(...n);
      }
      if (side > 0) indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }
  return meshData(positions, normals, indices);
}

/** Flat rectangle in the XZ plane facing up. 2 triangles. */
export function quad(width, depth) {
  const x = width / 2;
  const z = depth / 2;
  return meshData(
    [-x, 0, -z, x, 0, -z, x, 0, z, -x, 0, z],
    [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    [0, 2, 1, 0, 3, 2],
  );
}

/**
 * Surface of revolution around the X axis.
 *
 * `profile` is a list of [radius, x] points, walked from the +x end to the
 * -x end around the outside of the shape. A radius of 0 closes the shape
 * with a single pole vertex. Shading is smooth along the profile; repeat a
 * point to put a hard crease there.
 *
 * Triangles: 2 * segments per band, or segments for a band touching the axis.
 */
export function lathe(profile, segments = 12) {
  const positions = [];
  const rings = [];
  for (const [r, a] of profile) {
    const start = positions.length / 3;
    if (r < 1e-6) {
      positions.push(a, 0, 0);
      rings.push({ start, count: 1 });
    } else {
      for (let s = 0; s < segments; s++) {
        const angle = (s / segments) * TAU;
        positions.push(a, r * Math.cos(angle), r * Math.sin(angle));
      }
      rings.push({ start, count: segments });
    }
  }

  const indices = [];
  const triangle = (a, b, c, outward) => {
    const n = faceNormal(positions, a, b, c);
    if (Math.hypot(...n) < 1e-12) return;
    if (n[0] * outward[0] + n[1] * outward[1] + n[2] * outward[2] >= 0) indices.push(a, b, c);
    else indices.push(a, c, b);
  };

  for (let i = 0; i < profile.length - 1; i++) {
    const dr = profile[i + 1][0] - profile[i][0];
    const da = profile[i + 1][1] - profile[i][1];
    if (Math.abs(dr) + Math.abs(da) < 1e-9) continue; // repeated point: crease
    const P = rings[i];
    const Q = rings[i + 1];
    for (let s = 0; s < segments; s++) {
      const s2 = (s + 1) % segments;
      const mid = ((s + 0.5) / segments) * TAU;
      const outward = [dr, -da * Math.cos(mid), -da * Math.sin(mid)];
      if (P.count > 1 && Q.count > 1) {
        triangle(P.start + s, P.start + s2, Q.start + s2, outward);
        triangle(P.start + s, Q.start + s2, Q.start + s, outward);
      } else if (P.count > 1) {
        triangle(P.start + s, P.start + s2, Q.start, outward);
      } else if (Q.count > 1) {
        triangle(P.start, Q.start + s2, Q.start + s, outward);
      }
    }
  }

  return meshData(positions, smoothNormals(positions, indices), indices);
}

/**
 * Cylinder or cone frustum along the X axis, `r` at the +x end and `r2`
 * (default `r`) at the -x end. `caps`: 'both', 'start' (+x), 'end' (-x)
 * or 'none'. Triangles: 2 * segments, plus segments per cap.
 */
export function cylinder({ r, r2 = r, len, seg = 8, caps = 'both' }) {
  const a = len / 2;
  const profile = [];
  if (caps === 'both' || caps === 'start') profile.push([0, a], [r, a]);
  profile.push([r, a], [r2, -a]);
  if (caps === 'both' || caps === 'end') profile.push([r2, -a], [0, -a]);
  return lathe(profile, seg);
}

/**
 * Low-poly sphere with poles on the X axis. `half` keeps only the +x half
 * and leaves it open. Triangles: 2 * seg * (rings - 1), or
 * seg * (2 * rings - 1) for a half.
 */
export function ball({ r, seg = 8, rings = 4, half = false }) {
  const profile = [];
  const sweep = half ? Math.PI / 2 : Math.PI;
  for (let i = 0; i <= rings; i++) {
    const angle = (i / rings) * sweep;
    profile.push([i === 0 || (!half && i === rings) ? 0 : r * Math.sin(angle), r * Math.cos(angle)]);
  }
  return lathe(profile, seg);
}

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

/** Ear clipping for a simple counter-clockwise polygon. n - 2 triangles. */
function triangulate(points) {
  const remaining = points.map((_, i) => i);
  const result = [];
  const cross = (a, b, c) =>
    (points[b][0] - points[a][0]) * (points[c][1] - points[a][1]) -
    (points[b][1] - points[a][1]) * (points[c][0] - points[a][0]);

  let guard = points.length * points.length;
  while (remaining.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let i = 0; i < remaining.length; i++) {
      const a = remaining[(i + remaining.length - 1) % remaining.length];
      const b = remaining[i];
      const c = remaining[(i + 1) % remaining.length];
      if (cross(a, b, c) <= 1e-12) continue; // reflex corner
      const blocked = remaining.some(
        (p) => p !== a && p !== b && p !== c && cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0,
      );
      if (blocked) continue;
      result.push(a, b, c);
      remaining.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break;
  }
  if (remaining.length === 3) result.push(...remaining);
  return result;
}

/**
 * Flat outline extruded into a solid.
 *
 * `points` is a 2D outline; `axis` is the direction it is extruded along:
 *   'z' -> points are [x, y]
 *   'x' -> points are [z, y]
 *   'y' -> points are [x, z]
 *
 * `smooth` is the largest corner angle, in degrees, still shaded as a curve.
 * 0 gives flat facets; around 60 rounds gentle curves and keeps sharp tips.
 *
 * Triangles: 2 * (n - 2) for the two caps plus 2 * n for the sides.
 */
export function prism(points, { depth, axis = 'z', smooth = 0 }) {
  const outline = signedArea(points) < 0 ? [...points].reverse() : points;
  const n = outline.length;
  const h = depth / 2;
  const positions = [];
  const normals = [];
  const indices = [];

  // Caps.
  const cap = triangulate(outline);
  for (const side of [1, -1]) {
    const base = positions.length / 3;
    for (const [x, y] of outline) {
      positions.push(x, y, side * h);
      normals.push(0, 0, side);
    }
    for (let i = 0; i < cap.length; i += 3) {
      if (side > 0) indices.push(base + cap[i], base + cap[i + 1], base + cap[i + 2]);
      else indices.push(base + cap[i], base + cap[i + 2], base + cap[i + 1]);
    }
  }

  // Sides. Outward normal of a counter-clockwise edge (dx, dy) is (dy, -dx).
  const edgeNormals = outline.map(([x1, y1], i) => {
    const [x2, y2] = outline[(i + 1) % n];
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    return [(y2 - y1) / len, -(x2 - x1) / len];
  });
  const limit = Math.cos((smooth * Math.PI) / 180);
  const cornerNormal = (vertex, edge) => {
    const before = edgeNormals[(vertex + n - 1) % n];
    const after = edgeNormals[vertex];
    if (smooth > 0 && before[0] * after[0] + before[1] * after[1] >= limit) {
      const len = Math.hypot(before[0] + after[0], before[1] + after[1]) || 1;
      return [(before[0] + after[0]) / len, (before[1] + after[1]) / len];
    }
    return edgeNormals[edge];
  };
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ni = cornerNormal(i, i);
    const nj = cornerNormal(j, i);
    const base = positions.length / 3;
    positions.push(outline[i][0], outline[i][1], h, outline[i][0], outline[i][1], -h);
    positions.push(outline[j][0], outline[j][1], -h, outline[j][0], outline[j][1], h);
    normals.push(ni[0], ni[1], 0, ni[0], ni[1], 0, nj[0], nj[1], 0, nj[0], nj[1], 0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // Built along Z. The other axes are coordinate swaps, which mirror the
  // shape, so the winding is reversed to keep faces pointing outward.
  if (axis !== 'z') {
    const swap = axis === 'x' ? [2, 1, 0] : [0, 2, 1];
    for (const list of [positions, normals]) {
      for (let v = 0; v < list.length; v += 3) {
        const p = [list[v], list[v + 1], list[v + 2]];
        list[v] = p[swap[0]];
        list[v + 1] = p[swap[1]];
        list[v + 2] = p[swap[2]];
      }
    }
    for (let i = 0; i < indices.length; i += 3) {
      const t = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = t;
    }
  }

  return meshData(positions, normals, indices);
}

/**
 * Turns a shape built along X (lathe, cylinder, ball) so that its +x end
 * points along +y or +z instead.
 */
export function pointAlong(geometry, axis) {
  if (axis === 'x') return geometry;
  for (const list of [geometry.positions, geometry.normals]) {
    for (let v = 0; v < list.length; v += 3) {
      const x = list[v];
      const y = list[v + 1];
      const z = list[v + 2];
      if (axis === 'y') {
        list[v] = -y;
        list[v + 1] = x;
      } else {
        list[v] = -z;
        list[v + 2] = x;
      }
    }
  }
  return geometry;
}

/** Stretches a shape and corrects its normals for the uneven scale. */
export function stretch(geometry, sx, sy, sz) {
  const { positions, normals } = geometry;
  for (let v = 0; v < positions.length; v += 3) {
    positions[v] *= sx;
    positions[v + 1] *= sy;
    positions[v + 2] *= sz;
    const nx = normals[v] / sx;
    const ny = normals[v + 1] / sy;
    const nz = normals[v + 2] / sz;
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[v] = nx / len;
    normals[v + 1] = ny / len;
    normals[v + 2] = nz / len;
  }
  return geometry;
}

/**
 * Returns a copy with hard facets: every triangle gets its own flat normal.
 * Used for scenery such as rocks, crystals and mountains, where the
 * chiselled low-poly look is the point. Triangle count is unchanged.
 */
export function facet(geometry) {
  const { positions: p, indices } = geometry;
  const positions = [];
  const normals = [];
  const out = [];
  for (let i = 0; i < indices.length; i += 3) {
    const n = faceNormal(p, indices[i], indices[i + 1], indices[i + 2]);
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    for (let k = 0; k < 3; k++) {
      const v = indices[i + k] * 3;
      positions.push(p[v], p[v + 1], p[v + 2]);
      normals.push(n[0] / len, n[1] / len, n[2] / len);
      out.push(i + k);
    }
  }
  return meshData(positions, normals, out);
}

/** Axis-aligned bounds of a shape: { min: [x, y, z], max: [x, y, z] }. */
export function bounds(geometry) {
  if (!geometry.bounds) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const p = geometry.positions;
    for (let v = 0; v < p.length; v += 3) {
      for (let k = 0; k < 3; k++) {
        if (p[v + k] < min[k]) min[k] = p[v + k];
        if (p[v + k] > max[k]) max[k] = p[v + k];
      }
    }
    geometry.bounds = { min, max };
  }
  return geometry.bounds;
}
