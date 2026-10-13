import { resolveMaterial, texOf } from './materials.js';
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

/**
 * Returns a Node containing the baked mesh (or meshes, if it is very large).
 *
 * Two cheap ways of making merged things look less uniform are applied here,
 * since this is the last moment each piece is still separate:
 *
 *   tint     a node with `tint` = [r, g, b] has its colours, and those of
 *            everything under it, multiplied by it. Scenery gives every copy
 *            of a prop a slightly different one.
 *   contact  { height, dark }: surfaces are darkened toward the ground they
 *            stand on (a node's `floor`, or 0), as if less light got in
 *            under there. `dark` is the share of light lost at the bottom;
 *            it fades to nothing `height` metres up.
 *
 * Neither touches anything that glows.
 */
export function bake(root, { contact = null } = {}) {
  root.updateWorld();

  const result = new Node();
  let chunk = null;
  const start = () => {
    chunk = { positions: [], normals: [], colors: [], params: [], texs: [], indices: [] };
  };
  const flush = () => {
    if (!chunk || chunk.indices.length === 0) return;
    const mesh = new Node();
    mesh.geometry = {
      positions: new Float32Array(chunk.positions),
      normals: new Float32Array(chunk.normals),
      colors: new Float32Array(chunk.colors),
      params: new Float32Array(chunk.params),
      texs: new Float32Array(chunk.texs),
      indices: new Uint16Array(chunk.indices),
      triangles: chunk.indices.length / 3,
    };
    result.add(mesh);
    chunk = null;
  };

  const n3 = new Float32Array(9);
  const visit = (node, tint, floor) => {
    if (node.tint) tint = tint ? [tint[0] * node.tint[0], tint[1] * node.tint[1], tint[2] * node.tint[2]] : node.tint;
    if (node.floor !== undefined) floor = node.floor;
    add(node, tint, floor);
    for (const child of node.children) visit(child, tint, floor);
  };
  const add = (node, tint, floor) => {
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
    // What each vertex says about textures: its own (a decal), or its
    // material's pattern, or nothing.
    const texs = geometry.texs || null;
    const tex = look ? texOf(look) : texOf({});
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
      let r = look ? look.color[0] : geometry.colors[v];
      let g = look ? look.color[1] : geometry.colors[v + 1];
      let b = look ? look.color[2] : geometry.colors[v + 2];
      const glow = look ? look.glow : geometry.params[v + 2];
      if (glow < 0.05 && (tint || contact)) {
        let light = 1;
        if (contact) {
          const up = (m[1] * x + m[5] * y + m[9] * z + m[13] - floor) / contact.height;
          if (up < 1) light -= contact.dark * (1 - Math.max(0, up)) ** 2;
        }
        r *= light * (tint ? tint[0] : 1);
        g *= light * (tint ? tint[1] : 1);
        b *= light * (tint ? tint[2] : 1);
      }
      chunk.colors.push(r, g, b);
      if (look) chunk.params.push(look.spec, look.shine, look.glow);
      else chunk.params.push(geometry.params[v], geometry.params[v + 1], geometry.params[v + 2]);
      if (texs) {
        const t = (v / 3) * 4;
        chunk.texs.push(texs[t], texs[t + 1], texs[t + 2], texs[t + 3]);
      } else {
        chunk.texs.push(tex[0], tex[1], tex[2], tex[3]);
      }
    }

    const index = geometry.indices;
    for (let i = 0; i < index.length; i += 3) {
      // A mirrored piece has its triangles wound backwards; undo that.
      if (mirrored) chunk.indices.push(base + index[i], base + index[i + 2], base + index[i + 1]);
      else chunk.indices.push(base + index[i], base + index[i + 1], base + index[i + 2]);
    }
  };
  visit(root, null, 0);
  flush();

  result.updateWorld();
  return result;
}
