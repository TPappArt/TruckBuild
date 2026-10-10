// Looks for scenery standing where cars drive.
//
//   npm run check:tracks            every track
//   npm run check:tracks -- snow    one track
//
// Every track is built exactly as the game builds it, and every triangle of
// its scenery is tested: any part of one that is over the tarmac, at a
// height a car or the camera could reach, is reported with where it is on
// the lap. Things over the shoulder (between the tarmac and the wall) are
// listed too, since a few are meant to be there (gate posts) and anything
// else is a mistake.
//
// It also checks where each track's built stretches (viaducts, tunnels,
// islands) have been put: clear of the start, the checkpoint gates, the
// landmark and each other, and not on a bend too tight to build on.
//
// Fails if anything is over the tarmac or a built stretch is badly placed.
// Run it after adding scenery, moving a landmark or changing a layout.
import { TRACKS } from '../src/race/tracks/index.js';
import { buildWorld } from '../src/race/world.js';

const LOW = 0.15; // metres: below this it is lying on the ground
const HIGH = 5.2; // above this, cars and the camera pass underneath
const STEP = 1.2; // metres between test points across a big triangle
const only = process.argv[2];
let failed = false;

/** Finds the nearest sample of a track to a point, quickly: samples are sorted into a grid of squares. */
function createLocator(track) {
  const size = 12;
  const cells = new Map();
  const key = (cx, cz) => cx * 100003 + cz;
  for (let i = 0; i < track.count; i++) {
    const k = key(Math.floor(track.xs[i] / size), Math.floor(track.zs[i] / size));
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(i);
  }
  const reach = Math.ceil((track.limit + 2) / size);
  /** Returns { index, offset, onRoad } or null if the point is nowhere near the road. */
  return (x, z, y) => {
    const cx = Math.floor(x / size);
    const cz = Math.floor(z / size);
    let best = -1;
    let bestDistance = Infinity;
    for (let a = cx - reach; a <= cx + reach; a++) {
      for (let b = cz - reach; b <= cz + reach; b++) {
        const list = cells.get(key(a, b));
        if (!list) continue;
        for (const i of list) {
          // Where the road climbs or dips, measure height from the road.
          const d = (x - track.xs[i]) ** 2 + (z - track.zs[i]) ** 2;
          if (d < bestDistance) {
            bestDistance = d;
            best = i;
          }
        }
      }
    }
    if (best < 0) return null;
    const offset = (x - track.xs[best]) * -track.tz[best] + (z - track.zs[best]) * track.tx[best];
    const ground = track.heightAt ? track.heightAt(best, offset) : 0;
    return { index: best, offset, above: y - ground };
  };
}

/** Lists what is wrong with where a track's built stretches are, if anything. */
function checkSections(world) {
  const { track, site } = world;
  const problems = [];
  const at = (index) => (track.wrap(index) / track.count).toFixed(3);
  /** True if the stretch [from, from + length] of the lap touches [a, a + span]. */
  const touches = (section, a, span) => track.wrap(a - section.from) <= section.length || track.wrap(section.from - a) <= span;
  const grid = Math.round(60 / track.spacing); // the cars line up behind the start
  const clear = Math.round(16 / track.spacing);

  track.sections.forEach((section, n) => {
    const name = `${section.kind} at ${at(section.from + section.length / 2)}`;
    if (touches(section, -grid, grid + clear)) problems.push(`${name} runs over the start line or the grid`);
    for (const gate of track.checkpoints) {
      if (touches(section, gate - 3, 6)) problems.push(`${name} has the checkpoint gate at ${at(gate)} on it`);
    }
    if (site?.zone && touches(section, site.zone.from - clear, site.zone.length + clear * 2)) {
      problems.push(`${name} runs into the landmark (${site.kind})`);
    }
    for (const other of track.sections.slice(n + 1)) {
      if (touches(section, other.from - clear, other.length + clear * 2)) problems.push(`${name} runs into the ${other.kind} at ${at(other.from + other.length / 2)}`);
    }
    // Round the inside of a very tight bend the road is pinched in, so its
    // edge does not fold back through itself. Losing some verge is fine.
    // Losing tarmac is not: a ramp there would be a funnel.
    for (let i = 0; i <= section.length; i++) {
      const tight = [1, -1].find((side) => track.edgeAt(section.from + i, side) < track.halfWidth);
      if (tight) {
        problems.push(`${name} is on a bend too tight to build on, at ${at(section.from + i)}`);
        break;
      }
    }
  });
  return problems;
}

for (const theme of TRACKS) {
  if (only && only !== theme.id) continue;
  const world = buildWorld(theme);
  const track = world.track;
  const locate = createLocator(track);
  const found = new Map(); // rough place -> what is there

  const test = (x, y, z) => {
    const at = locate(x, z, y);
    if (!at || at.above < LOW || at.above > HIGH) return;
    const reach = Math.abs(at.offset);
    if (reach > track.limit - 0.4) return;
    // A divided stretch has an island down the middle, which is scenery.
    const island = track.dividerAt ? track.dividerAt(at.index) : 0;
    if (island > 0 && reach < island + 0.6) return;
    const where = reach < track.halfWidth - 0.2 ? 'TARMAC' : 'shoulder';
    const key = `${where} ${Math.round(at.index / 4)} ${Math.sign(at.offset)}`;
    const entry = found.get(key) || { where, index: at.index, low: Infinity, high: -Infinity, inner: Infinity, x, z, points: 0 };
    entry.low = Math.min(entry.low, at.above);
    entry.high = Math.max(entry.high, at.above);
    if (reach < entry.inner) Object.assign(entry, { inner: reach, x, z, side: Math.sign(at.offset) });
    entry.points++;
    found.set(key, entry);
  };

  let triangles = 0;
  world.scenery.walk((node) => {
    const g = node.geometry;
    if (!g) return;
    const p = g.positions;
    for (let t = 0; t < g.indices.length; t += 3) {
      triangles++;
      const a = g.indices[t] * 3;
      const b = g.indices[t + 1] * 3;
      const c = g.indices[t + 2] * 3;
      // Points across the triangle, closer together the bigger it is.
      const longest = Math.max(
        Math.hypot(p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]),
        Math.hypot(p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]),
        Math.hypot(p[c] - p[b], p[c + 1] - p[b + 1], p[c + 2] - p[b + 2]),
      );
      const n = Math.min(60, Math.max(1, Math.ceil(longest / STEP)));
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n - i; j++) {
          const u = i / n;
          const v = j / n;
          const w = 1 - u - v;
          test(p[a] * w + p[b] * u + p[c] * v, p[a + 1] * w + p[b + 1] * u + p[c + 1] * v, p[a + 2] * w + p[b + 2] * u + p[c + 2] * v);
        }
      }
    }
  });

  const list = [...found.values()].sort((a, b) => a.index - b.index);
  const onTarmac = list.filter((entry) => entry.where === 'TARMAC');
  console.log(`\n${theme.name}: ${triangles} triangles of scenery, ${onTarmac.length} places over the tarmac, ${list.length - onTarmac.length} over the shoulder`);
  for (const problem of checkSections(world)) {
    console.log(`  SECTION  ${problem}`);
    failed = true;
  }
  for (const entry of list) {
    console.log(
      `  ${entry.where.padEnd(8)} ${(entry.index / track.count).toFixed(3)} of the lap, ${entry.side > 0 ? 'right' : 'left'}, ` +
        `${entry.inner.toFixed(1)} m from the centre line, ${entry.low.toFixed(1)}-${entry.high.toFixed(1)} m up, at (${entry.x.toFixed(0)}, ${entry.z.toFixed(0)})`,
    );
  }
  if (onTarmac.length) failed = true;
}

if (failed) {
  console.error('\nSomething is standing on the road, or a built stretch is in the wrong place.');
  process.exit(1);
}
