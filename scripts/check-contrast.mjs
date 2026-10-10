// Checks that the things a driver has to tell apart can be told apart, on
// every track.
//
//   npm run check:contrast
//
// It works out the colour each flat surface comes out on screen, using the
// same sums as the shader (the track's light, sky colour and fog), near the
// car and well down the road, and measures how different pairs of them
// look. The measure is the distance between two colours in CIELAB, where
// about 2 is the least difference an eye can see side by side, 10 is plain,
// and 30 or more is a strong contrast.
//
// What has to be told apart, and by how much, is the list below. The road
// from what lies beside it matters most: it is what a child steers by.
// Fails if any pair is under its mark.
import { linear } from '../src/engine/materials.js';
import { PAINTS } from '../src/parts/catalog.js';
import { HALO_COLOURS, ITEM_RINGS } from '../src/race/props.js';
import { TRACKS } from '../src/race/tracks/index.js';

const NEAR = 18; // metres ahead of the camera
const FAR = 75;
const EYE = 3.5; // metres the camera is above the road

// [what, against what, least difference near, least difference far]
const MARKS = [
  ['road', 'verge', 10, 6],
  ['road', 'ground', 14, 8],
  ['kerb', 'road', 30, 16],
  ['kerb', 'verge', 22, 12],
  ['centre line', 'road', 30, 14],
];
const RING_MARK = 32; // pickups' rings against the road
const PAINT_MARK = 16; // every car paint against the road

/** What a flat, upward-facing surface of a (linear) colour comes out as on screen, `distance` metres off. */
function shade(theme, colour, distance, glow = 0) {
  const length = Math.hypot(...theme.light);
  const up = theme.light[1] / length;
  const { sun, sky } = theme.lighting;
  const wrap = up * 0.5 + 0.5;
  const facing = EYE / Math.hypot(distance, EYE);
  const fogColour = linear(theme.fog.color);
  const d = distance * theme.fog.density;
  let fog = 1 - Math.exp(-d * d);
  // Mist: an average bank, as thick as it gets at ground level.
  if (theme.mist) {
    const reach = Math.min(1, Math.max(0, (distance - 8) / 47));
    fog = Math.min(1, fog + theme.mist.strength * 0.25 * reach * reach * (3 - 2 * reach));
  }
  return colour.map((value, k) => {
    let lit = value * (sky[k] * 0.5 + sun[k] * wrap * wrap * 0.95);
    lit += sky[k] * (1 - facing) ** 3 * 0.16 * 0.4;
    lit = lit + (value * 1.35 - lit) * glow;
    lit = lit + (fogColour[k] - lit) * fog * (1 - 0.6 * glow);
    return Math.min(1, Math.max(0, lit)) ** (1 / 2.2);
  });
}

/** sRGB (0 to 1, as on screen) to CIELAB. */
function lab(rgb) {
  const [r, g, b] = rgb.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  const xyz = [(r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, r * 0.2126 + g * 0.7152 + b * 0.0722, (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883];
  const [fx, fy, fz] = xyz.map((value) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const difference = (a, b) => Math.hypot(...lab(a).map((value, k) => value - lab(b)[k]));
const hex = (rgb) => `#${rgb.map((value) => Math.round(value * 255).toString(16).padStart(2, '0')).join('')}`;

let failed = false;
for (const theme of TRACKS) {
  const road = theme.road;
  const surfaces = {
    road: [road.surface],
    verge: [road.shoulder],
    ground: [theme.ground],
    // Kerbs are two colours in turn: one of them standing out is enough.
    kerb: [road.kerbA, road.kerbB],
    'centre line': [road.line],
  };
  console.log(`\n${theme.name}`);
  const seen = (look, distance) => shade(theme, look.color, distance, look.glow);
  for (const [a, b, near, far] of MARKS) {
    const results = [[NEAR, near], [FAR, far]].map(([distance, mark]) => {
      const best = Math.max(...surfaces[a].flatMap((one) => surfaces[b].map((other) => difference(seen(one, distance), seen(other, distance)))));
      return { best, ok: best >= mark, mark };
    });
    const ok = results.every((result) => result.ok);
    if (!ok) failed = true;
    console.log(
      `  ${ok ? 'ok  ' : 'LOW '} ${`${a} / ${b}`.padEnd(20)} near ${results[0].best.toFixed(0).padStart(3)} (needs ${results[0].mark})   far ${results[1].best.toFixed(0).padStart(3)} (needs ${results[1].mark})` +
        `   ${surfaces[a].map((look) => hex(seen(look, NEAR))).join(' ')} on ${surfaces[b].map((look) => hex(seen(look, NEAR))).join(' ')}`,
    );
  }

  const tarmac = seen(road.surface, NEAR);
  const rings = [...new Set(Object.values(ITEM_RINGS).map(([name]) => name))].map((name) => [name, difference(shade(theme, linear(HALO_COLOURS[name]), NEAR, 1), tarmac)]);
  const paints = PAINTS.map((paint) => [paint.name ?? paint.hex, difference(shade(theme, linear(paint.hex), NEAR), tarmac)]);
  for (const [label, list, mark] of [['rings on the road', rings, RING_MARK], ['car paints on the road', paints, PAINT_MARK]]) {
    const low = list.filter(([, value]) => value < mark);
    if (low.length) failed = true;
    console.log(`  ${low.length ? 'LOW ' : 'ok  '} ${label.padEnd(20)} ${list.map(([name, value]) => `${name} ${value.toFixed(0)}`).join(', ')} (each needs ${mark})`);
  }
}

if (failed) {
  console.error('\nSomething is too hard to tell from what is next to it.');
  process.exit(1);
}
