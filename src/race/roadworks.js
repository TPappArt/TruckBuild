import { tileOf } from '../engine/atlas.js';
import { linear, material, texOf } from '../engine/materials.js';
import { Node } from '../engine/node.js';

// Builds the road wherever it leaves the flat (track.js sections): raised
// on a viaduct, sunk into a cutting or a tunnel, or divided round an island.
//
// Flat road is paint on the ground (world.js). These stretches are real
// surfaces at their own heights, with everything that goes with them: the
// walls that hold a raised road up or the earth back, parapets, the island
// and its barrier, a ceiling and lamps where the ground closes over, and
// the portals at a tunnel's mouths.
//
// It also says where the ground has to be cut away so that a sunken road
// can be seen (`openings`), which the renderer does with its stencil buffer.
//
// One mesh for all of it, a few thousand triangles a track.

const LIFT = 0.03; // the road surface sits this far above its height, clear of the ground where they meet
const DETAIL = 0.05; // painted lines, above the surface
const PARAPET = 0.9; // height of the low walls along edges and islands
const THICK = 0.5; // and how thick they are
const CEILING = -0.35; // underside of the ground over a tunnel
const PORTAL = 1.7; // how far a tunnel mouth stands above the ground

/** Colours for a track's roadworks, unless its theme gives its own (`works`). */
const PLAIN = {
  wall: material('#8a8780', { spec: 0.05, tex: 'concrete' }),
  wallDark: material('#5e5c58', { spec: 0.05, tex: 'concrete' }),
  trim: material('#f2c230', { spec: 0.2 }),
  roof: material('#3a3b40', { spec: 0.05 }),
  lamp: material('#ffe9a8', { glow: 1 }),
  island: material('#77736c', { spec: 0, tex: 'concrete' }),
  arch: material('#3a3b40', { spec: 0 }),
};

// Pictures on the walls (atlas.js), unless a theme gives its own (`works.graffiti`).
const GRAFFITI = ['tagZap', 'smiley', 'tagVroom', 'bolt', 'star', 'tagFizz', 'crown', 'tagHonk'];
const PICTURE = { color: linear('#ffffff'), spec: 0.05, shine: 20, glow: 0 };
const EVERY = 12; // samples between pictures along a wall (a multiple of 4, to miss the arches)
const LONG = 2; // and how many samples one covers

/** Collects flat polygons in 3D into one mesh, each with its own flat normal. */
function createMesh() {
  const data = { positions: [], normals: [], colors: [], params: [], texs: [], indices: [] };
  return {
    /**
     * points: corners of a flat convex polygon, [x, y, z] each. `facing` is
     * roughly the way its visible side points. Corners may coincide (where
     * an island tapers to nothing); a polygon with no area is left out.
     */
    polygon(points, look, facing) {
      // Newell's method: a normal that does not mind repeated corners.
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        nx += (a[1] - b[1]) * (a[2] + b[2]);
        ny += (a[2] - b[2]) * (a[0] + b[0]);
        nz += (a[0] - b[0]) * (a[1] + b[1]);
      }
      const length = Math.hypot(nx, ny, nz);
      if (length < 1e-7) return;
      nx /= length;
      ny /= length;
      nz /= length;
      const flip = nx * facing[0] + ny * facing[1] + nz * facing[2] < 0;
      if (flip) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const base = data.positions.length / 3;
      const tex = texOf(look);
      points.forEach((point, i) => {
        data.positions.push(point[0], point[1], point[2]);
        data.normals.push(nx, ny, nz);
        data.colors.push(look.color[0], look.color[1], look.color[2]);
        // What lies flat is as matt as the paint it joins (world.js), or
        // a viaduct would shine where the road before it does not.
        data.params.push(ny > 0.9 ? 0 : look.spec, look.shine, look.glow);
        if (look.uv) data.texs.push(tex[0], -1, look.uv[i][0], look.uv[i][1]);
        else data.texs.push(tex[0], tex[1], tex[2], tex[3]);
      });
      for (let i = 1; i < points.length - 1; i++) {
        if (flip) data.indices.push(base, base + i + 1, base + i);
        else data.indices.push(base, base + i, base + i + 1);
      }
    },
    get empty() {
      return data.indices.length === 0;
    },
    finish() {
      const node = new Node();
      node.geometry = {
        positions: new Float32Array(data.positions),
        normals: new Float32Array(data.normals),
        colors: new Float32Array(data.colors),
        params: new Float32Array(data.params),
        texs: new Float32Array(data.texs),
        indices: new Uint16Array(data.indices),
        triangles: data.indices.length / 3,
      };
      node.updateWorld();
      return node;
    },
  };
}

/**
 * Returns { decks, openings }: a Node holding the roadworks for every
 * section of the track, and a Node of flat shapes at ground level where
 * the ground is cut away. Both are null on a track with no sections.
 */
export function buildRoadworks(track, theme) {
  if (!track.sections.length) return { decks: null, openings: null };
  const road = theme.road;
  const works = { ...PLAIN, ...theme.works };
  const solid = createMesh();
  const holes = createMesh();
  const UP = [0, 1, 0];
  const DOWN = [0, -1, 0];
  const half = track.halfWidth;
  const limit = track.limit;
  const kerbWidth = road.kerbWidth ?? 0.9;
  const graffiti = (works.graffiti ?? GRAFFITI).map((name) => tileOf(name));
  let painted = 0;
  /**
   * A picture on a wall `offset` metres from the centre line, from sample `a`
   * to `a + LONG`, between heights `low` and `low + tall`, facing `facing`.
   * Tags are twice as wide as they are tall; other pictures are square, and
   * are centred in the space.
   */
  const picture = (a, side, offset, low, tall, facing) => {
    const tile = graffiti[painted++ % graffiti.length];
    const share = Math.min(1, ((tile.width / tile.height) * tall) / (LONG * track.spacing));
    const from = a + ((1 - share) * LONG) / 2;
    const to = from + share * LONG;
    const height = Math.min(tall, (LONG * track.spacing * share) / (tile.width / tile.height));
    const top = low + height;
    // Its left edge is the start of the stretch when seen from in front.
    const [first, second] = side * (facing === 'out' ? 1 : -1) > 0 ? [from, to] : [to, from];
    const look = { ...PICTURE, tex: [tile.id, -1, 0, 0], uv: [[0, 1], [1, 1], [1, 0], [0, 0]] };
    const P2 = (index, y) => {
      const p = track.pointAt(index, track.clamp(index, side * offset));
      return [p.x, y, p.z];
    };
    const ai = track.wrap(Math.round(a));
    const out = [-track.tz[ai] * side, 0, track.tx[ai] * side];
    solid.polygon([P2(first, low), P2(second, low), P2(second, top), P2(first, top)], look, facing === 'out' ? out : out.map((value) => -value));
  };

  /** A point on (or above, or below) the road: sample, metres right of the centre line, height. */
  const P = (index, offset, y) => {
    const p = track.pointAt(index, track.clamp(index, offset));
    return [p.x, y, p.z];
  };

  for (const section of track.sections) {
    for (let i = 0; i <= section.length; i++) {
      const a = section.from + i;
      const b = a + 1;
      // The way the road runs here, and the way to its right.
      const ai = track.wrap(a);
      const along = [track.tx[ai], 0, track.tz[ai]];
      const rightward = [-track.tz[ai], 0, track.tx[ai]];
      const islandA = track.dividerAt(a);
      const islandB = track.dividerAt(b);
      const divided = islandA > 0 || islandB > 0;
      const stripe = Math.floor(i / 3) % 2 ? road.kerbA : road.kerbB;

      for (const side of [-1, 1]) {
        const hA = track.heightAt(a, side);
        const hB = track.heightAt(b, side);
        const roofA = track.roofAt(a, side);
        const roofB = track.roofAt(b, side);
        const outward = rightward.map((value) => value * side);
        const inward = outward.map((value) => -value);

        /** A strip of surface between two distances from the centre line, which may differ at the two ends. */
        const strip = (fromA, toA, fromB, toB, look, lift = LIFT) =>
          solid.polygon([P(a, side * fromA, hA + lift), P(a, side * toA, hA + lift), P(b, side * toB, hB + lift), P(b, side * fromB, hB + lift)], look, UP);
        /** An upright face along the road at a distance from the centre line, between two heights at each end. */
        const face = (offset, lowA, highA, lowB, highB, look, facing) => {
          if (highA - lowA < 0.01 && highB - lowB < 0.01) return;
          solid.polygon([P(a, side * offset, lowA), P(b, side * offset, lowB), P(b, side * offset, highB), P(a, side * offset, highA)], look, facing);
        };

        // The surface: shoulder, kerb, tarmac, and a kerb along the island.
        const innerA = islandA + Math.min(0.5, islandA);
        const innerB = islandB + Math.min(0.5, islandB);
        strip(half, limit, half, limit, road.shoulder);
        strip(half - kerbWidth, half, half - kerbWidth, half, stripe);
        strip(innerA, half - kerbWidth, innerB, half - kerbWidth, road.surface);
        if (divided) strip(islandA, innerA, islandB, innerB, stripe);
        if (road.edge) strip(half - kerbWidth - 0.55, half - kerbWidth - 0.35, half - kerbWidth - 0.55, half - kerbWidth - 0.35, road.edge, DETAIL);
        // The centre line carries on where the road is whole.
        if (!divided && side > 0 && track.wrap(a) % 8 < 3) {
          solid.polygon([P(a, -0.18, hA + DETAIL), P(a, 0.18, hA + DETAIL), P(b, 0.18, hB + DETAIL), P(b, -0.18, hB + DETAIL)], road.line, UP);
        }

        const raised = Math.max(hA, hB) > 0.05;
        const sunk = Math.min(hA, hB) < -0.05;
        const outer = limit + THICK;

        if (raised) {
          // A wall down to the ground, a parapet along the edge, and dark
          // arches in the wall where it is tall enough: a viaduct.
          face(outer, 0, hA, 0, hB, works.wall, outward);
          face(outer, hA, hA + PARAPET, hB, hB + PARAPET, works.wallDark, outward);
          face(limit, hA, hA + PARAPET, hB, hB + PARAPET, works.wallDark, inward);
          solid.polygon([P(a, side * limit, hA + PARAPET), P(a, side * outer, hA + PARAPET), P(b, side * outer, hB + PARAPET), P(b, side * limit, hB + PARAPET)], stripe === road.kerbA ? works.trim : works.wallDark, UP);
          if (i % 4 === 1 || i % 4 === 2) {
            const top = Math.min(hA, hB) - 1.3;
            if (top > 1.2) face(outer + 0.07, 0, Math.min(top, 4.8), 0, Math.min(top, 4.8), works.arch, outward);
          }
          // Now and then something sprayed on the wall, between the arches.
          if (i % EVERY === 3 && i + LONG <= section.length && Math.min(hA, track.heightAt(a + LONG, side)) > 3.2) picture(a, side, outer + 0.1, 0.5, 2.2, 'out');
        }

        if (sunk) {
          // A wall holding the earth back, with a band of trim near the top.
          const bandA = Math.min(-0.6, hA);
          const bandB = Math.min(-0.6, hB);
          face(limit, hA, Math.max(hA, bandA), hB, Math.max(hB, bandB), works.wall, inward);
          face(limit, Math.max(hA, bandA), Math.max(hA, 0), Math.max(hB, bandB), Math.max(hB, 0), works.wallDark, inward);
          // Something sprayed on the wall, where it is tall enough to hold it.
          if (i % EVERY === 6 && i + LONG <= section.length && Math.max(hA, track.heightAt(a + LONG, side)) < -3.4) picture(a, side, limit - 0.1, Math.max(hA, track.heightAt(a + LONG, side)) + 0.6, 2.2, 'in');
          if (!(roofA && roofB)) {
            // Open to the sky: a parapet round the edge of the hole.
            const deep = Math.min(hA, hB) < -0.4;
            if (deep) {
              face(limit, 0, PARAPET, 0, PARAPET, works.wallDark, inward);
              face(outer, 0, PARAPET, 0, PARAPET, works.wallDark, outward);
              solid.polygon([P(a, side * limit, PARAPET), P(a, side * outer, PARAPET), P(b, side * outer, PARAPET), P(b, side * limit, PARAPET)], stripe === road.kerbA ? works.trim : works.wallDark, UP);
            }
            // And the hole itself.
            holes.polygon([P(a, side * islandA, 0), P(a, side * limit, 0), P(b, side * limit, 0), P(b, side * islandB, 0)], works.roof, UP);
          } else {
            // Under the ground: a ceiling, and a lamp on the wall every few metres.
            solid.polygon([P(a, side * islandA, CEILING), P(a, side * limit, CEILING), P(b, side * limit, CEILING), P(b, side * islandB, CEILING)], works.roof, DOWN);
            if (i % 4 === 0) face(limit - 0.06, hA + 3.1, hA + 3.9, hB + 3.1, hB + 3.9, works.lamp, inward);
          }
          // A tunnel mouth: a striped beam standing on the ground across it.
          if (roofA !== roofB) {
            const mouth = roofB ? b : a;
            const back = mouth + (roofB ? 0.4 : -0.4);
            const island = roofB ? islandB : islandA;
            const toward = along.map((value) => (roofB ? -value : value));
            const away = toward.map((value) => -value);
            const blocks = 8;
            for (let n = 0; n < blocks; n++) {
              const from = island + ((outer - island) * n) / blocks;
              const to = island + ((outer - island) * (n + 1)) / blocks;
              const look = n % 2 ? works.trim : works.roof;
              solid.polygon([P(mouth, side * from, CEILING), P(mouth, side * to, CEILING), P(mouth, side * to, PORTAL), P(mouth, side * from, PORTAL)], look, toward);
              solid.polygon([P(back, side * from, 0), P(back, side * to, 0), P(back, side * to, PORTAL), P(back, side * from, PORTAL)], works.roof, away);
              solid.polygon([P(mouth, side * from, PORTAL), P(mouth, side * to, PORTAL), P(back, side * to, PORTAL), P(back, side * from, PORTAL)], works.wallDark, UP);
            }
            // Its outer end, so it is not hollow from the side.
            solid.polygon([P(mouth, side * outer, 0), P(back, side * outer, 0), P(back, side * outer, PORTAL), P(mouth, side * outer, PORTAL)], works.roof, outward);
          }
        }
      }

      // The island: a barrier down the middle, as tall as the higher lane
      // plus a parapet. Beside a lane that has dropped away it is a wall.
      if (divided) {
        const leftA = track.heightAt(a, -1);
        const leftB = track.heightAt(b, -1);
        const rightA = track.heightAt(a, 1);
        const rightB = track.heightAt(b, 1);
        const topA = Math.max(leftA, rightA) + PARAPET;
        const topB = Math.max(leftB, rightB) + PARAPET;
        const leftward = rightward.map((value) => -value);
        for (const [offsetA, offsetB, lowA, lowB, facing] of [
          [-islandA, -islandB, leftA, leftB, leftward],
          [islandA, islandB, rightA, rightB, rightward],
        ]) {
          const bandA = Math.max(lowA, topA - PARAPET);
          const bandB = Math.max(lowB, topB - PARAPET);
          solid.polygon([P(a, offsetA, lowA), P(b, offsetB, lowB), P(b, offsetB, bandB), P(a, offsetA, bandA)], works.wall, facing);
          solid.polygon([P(a, offsetA, bandA), P(b, offsetB, bandB), P(b, offsetB, topB), P(a, offsetA, topA)], stripe, facing);
        }
        solid.polygon([P(a, -islandA, topA), P(a, islandA, topA), P(b, islandB, topB), P(b, -islandB, topB)], works.island, UP);
      }
    }
  }

  return { decks: solid.empty ? null : solid.finish(), openings: holes.empty ? null : holes.finish() };
}

/**
 * The ground a track's sections need to themselves. Returns a test
 * (x, z) => boolean; ordinary scenery stays out of wherever it is true.
 */
export function roadworksFootprint(track) {
  const reach = track.limit + 7;
  const points = [];
  for (const section of track.sections) {
    for (let i = -4; i <= section.length + 4; i++) {
      const index = track.wrap(section.from + i);
      points.push([track.xs[index], track.zs[index]]);
    }
  }
  return (x, z) => points.some(([px, pz]) => (x - px) ** 2 + (z - pz) ** 2 < reach * reach);
}

/** How high the top of the island is at a sample: where anything standing on it goes. */
export const islandTop = (track, index) => Math.max(track.heightAt(index, -1), track.heightAt(index, 1)) + PARAPET;
