import { resolveMaterial } from './materials.js';
import { determinant3, normalMatrix } from './math.js';
import { Node } from './node.js';

// Merges a tree of meshes into as few meshes as possible.
//
// Positions are moved into the root's space and each vertex carries its own
// colour and material, so the whole tree draws in one call however many
// pieces and materials went into it. Baked meshes are static: anything that
// has to move on its own (a spinning wheel) is baked separately and kept as
// its own node.
//
// The current paint colour is captured at bake time, which is how several
// vehicles can each keep their own paint.

const MAX_VERTICES = 65535; // index buffers are 16-bit

/** Returns a Node containing the baked mesh (or meshes, if it is very large). */
export function bake(root) {
  root.updateWorld();

  const result = new Node();
  let chunk = null;
  const start = () => {
    chunk = { positions: [], normals: [], colors: [], params: [], indices: [] };
  };
  const flush = () => {
    if (!chunk || chunk.indices.length === 0) return;
    const mesh = new Node();
    mesh.geometry = {
      positions: new Float32Array(chunk.positions),
      normals: new Float32Array(chunk.normals),
      colors: new Float32Array(chunk.colors),
      params: new Float32Array(chunk.params),
      indices: new Uint16Array(chunk.indices),
      triangles: chunk.indices.length / 3,
    };
    result.add(mesh);
    chunk = null;
  };

  const n3 = new Float32Array(9);
  root.walk((node) => {
    const geometry = node.geometry;
    if (!geometry) return;
    const count = geometry.positions.length / 3;
    if (!chunk || chunk.positions.length / 3 + count > MAX_VERTICES) {
      flush();
      start();
    }

    const m = node.world;
    normalMatrix(n3, m);
    const mirrored = determinant3(m) < 0;
    const look = geometry.colors ? null : resolveMaterial(node.role);
    const base = chunk.positions.length / 3;
    const p = geometry.positions;
    const n = geometry.normals;

    for (let v = 0; v < p.length; v += 3) {
      const x = p[v];
      const y = p[v + 1];
      const z = p[v + 2];
      chunk.positions.push(
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14],
      );
      const nx = n3[0] * n[v] + n3[3] * n[v + 1] + n3[6] * n[v + 2];
      const ny = n3[1] * n[v] + n3[4] * n[v + 1] + n3[7] * n[v + 2];
      const nz = n3[2] * n[v] + n3[5] * n[v + 1] + n3[8] * n[v + 2];
      const len = Math.hypot(nx, ny, nz) || 1;
      chunk.normals.push(nx / len, ny / len, nz / len);
      if (look) {
        chunk.colors.push(look.color[0], look.color[1], look.color[2]);
        chunk.params.push(look.spec, look.shine, look.glow);
      } else {
        chunk.colors.push(geometry.colors[v], geometry.colors[v + 1], geometry.colors[v + 2]);
        chunk.params.push(geometry.params[v], geometry.params[v + 1], geometry.params[v + 2]);
      }
    }

    const index = geometry.indices;
    for (let i = 0; i < index.length; i += 3) {
      // A mirrored piece has its triangles wound backwards; undo that.
      if (mirrored) chunk.indices.push(base + index[i], base + index[i + 2], base + index[i + 1]);
      else chunk.indices.push(base + index[i], base + index[i + 1], base + index[i + 2]);
    }
  });
  flush();

  result.updateWorld();
  return result;
}
