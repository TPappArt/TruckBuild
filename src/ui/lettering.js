// Chunky cartoon lettering for the logo, drawn as SVG: block capitals with
// chiselled edges, standing out from the page on deep coloured sides, all
// inside one thick dark outline. Like the titles of a cartoon or a toy box.
//
// The letters are this file's own: an alphabet drawn on a grid as plain
// outlines (straight lines only), so they look the same on every device and
// every letter can be given real facets. For each letter:
//
//   1. the outline is pushed inward a little (an inset) to make the face;
//   2. the band between the outline and the face is cut into one facet per
//      edge, each lit by which way it faces: edges facing up catch the
//      light, edges facing down are in shade (the chiselled bevel);
//   3. each edge is drawn out along the way the letter "sticks out" into a
//      side wall, shaded the same way (the depth);
//   4. everything sits on a dark outline made from the letter swept along
//      its depth, drawn first, behind the lot.
//
// Letters are 10 units tall on their grid; `word()` scales them to size.

// The alphabet. Each letter is one or more shapes separated by ';', each
// shape an outline then any holes, separated by '|'. Points are "x,y", with
// y downward from the top of the capitals (0) to the baseline (10).
const GLYPHS = {
  A: '0,10 2,1.2 3.2,0 5.8,0 7,1.2 9,10 6,10 5.6,8 3.4,8 3,10|3.9,5.6 4.5,2.8 5.1,5.6',
  B: '0,0 6.4,0 8,1.4 8,3.8 7,4.9 8.4,6 8.4,8.6 7,10 0,10|3,2.3 5,2.3 5,3.9 3,3.9|3,6.1 5.4,6.1 5.4,7.7 3,7.7',
  C: '1.6,0 8,0 8,3 3.2,3 3.2,7 8,7 8,10 1.6,10 0,8.4 0,1.6',
  D: '0,0 6,0 8.4,2.2 8.4,7.8 6,10 0,10|3,3 4.8,3 5.4,3.8 5.4,6.2 4.8,7 3,7',
  E: '0,0 8,0 7.4,2.8 3.1,2.8 3.1,3.8 6.6,3.8 6.6,6.2 3.1,6.2 3.1,7.2 8,7.2 8,10 0,10',
  F: '0,0 8,0 7.4,2.8 3.1,2.8 3.1,4 6.6,4 6.6,6.6 3.1,6.6 3.1,10 0,10',
  G: '1.6,0 8,0 8,2.9 3.2,2.9 3.2,7.1 5,7.1 5,6.4 4.2,6.4 4.2,4.2 8.4,4.2 8.4,8.6 7,10 1.6,10 0,8.4 0,1.6',
  H: '0,0 3.1,0 3.1,3.6 5.3,3.6 5.3,0 8.4,0 8.4,10 5.3,10 5.3,6.4 3.1,6.4 3.1,10 0,10',
  I: '0,0 3.3,0 3.3,10 0,10',
  J: '4.6,0 7.8,0 7.8,8.4 6.2,10 1.4,10 0,8.6 0,5.8 3,5.8 3,7.1 4.6,7.1',
  K: '0,0 3.1,0 3.1,3.6 5.4,0 8.8,0 5.6,5 8.8,10 5.4,10 3.1,6.4 3.1,10 0,10',
  L: '0,0 3.2,0 3.2,7 8,7 8,10 0,10',
  M: '0,0 3.2,0 5,3 6.8,0 10,0 10,10 7,10 7,5.2 5,8 3,5.2 3,10 0,10',
  N: '0,0 3,0 5.6,4.6 5.6,0 8.6,0 8.6,10 5.6,10 3,5.4 3,10 0,10',
  O: '1.6,0 6.8,0 8.4,1.6 8.4,8.4 6.8,10 1.6,10 0,8.4 0,1.6|3.1,3 5.3,3 5.3,7 3.1,7',
  P: '0,0 6.6,0 8.4,1.8 8.4,5.2 6.6,7 3.1,7 3.1,10 0,10|3.1,2.6 5.2,2.6 5.2,4.4 3.1,4.4',
  Q: '1.6,0 6.8,0 8.4,1.6 8.4,7.8 9.4,8.8 8.2,10.4 7,9.4 6.6,10 1.6,10 0,8.4 0,1.6|3.1,3 5.3,3 5.3,7 3.1,7',
  R: '0,0 6.6,0 8.4,1.8 8.4,4.6 7,5.8 8.8,10 5.5,10 4.2,6.6 3.1,6.6 3.1,10 0,10|3.1,2.6 5.3,2.6 5.3,4.2 3.1,4.2',
  S: '1.6,0 8,0 8,2.8 3.4,2.8 3.4,3.5 6.8,3.5 8.4,5.1 8.4,8.4 6.8,10 0.2,10 0.2,7.2 5,7.2 5,6.5 1.6,6.5 0,4.9 0,1.6',
  T: '0,0 9,0 8.4,3 6,3 6,10 2.9,10 2.9,3 0.6,3',
  U: '0,0 3.1,0 3.1,7 5.3,7 5.3,0 8.4,0 8.4,8.4 6.8,10 1.6,10 0,8.4',
  V: '0,0 3.2,0 4.6,5.6 6,0 9.2,0 6.4,10 2.8,10',
  W: '0,0 3,0 3.6,5 4.8,1.6 6.6,1.6 7.8,5 8.4,0 11.4,0 9.6,10 6.8,10 5.7,6.6 4.6,10 1.8,10',
  X: '0,0 3.4,0 4.6,2.8 5.8,0 9.2,0 6.4,5 9.2,10 5.8,10 4.6,7.2 3.4,10 0,10 2.8,5',
  Y: '0,0 3.3,0 4.6,3.2 5.9,0 9.2,0 6.2,6 6.2,10 3,10 3,6',
  Z: '0,0 8.6,0 8.6,2.8 4.2,7.2 8.6,7.2 8.6,10 0,10 0,7.2 4.4,2.8 0,2.8',
  0: '1.6,0 6.4,0 8,1.6 8,8.4 6.4,10 1.6,10 0,8.4 0,1.6|3,3 5,3 5,7 3,7',
  1: '0.6,1.2 2.4,0 5,0 5,10 1.9,10 1.9,3.4 0.6,3.4',
  2: '0.4,0 6.8,0 8.4,1.6 8.4,4.6 4.4,7.2 8.4,7.2 8.4,10 0,10 0,7.2 5.2,3.8 5.2,2.8 0.4,2.8',
  3: '0,0 6.8,0 8.4,1.6 8.4,3.8 7.4,5 8.4,6.2 8.4,8.4 6.8,10 0,10 0,7.2 5.2,7.2 5.2,6.4 2.4,6.4 2.4,3.6 5.2,3.6 5.2,2.8 0,2.8',
  4: '0,0 3.1,0 3.1,4.4 5,4.4 5,0 8.2,0 8.2,10 5,10 5,7.2 0,7.2',
  5: '0,0 8,0 8,2.8 3.2,2.8 3.2,3.6 6.8,3.6 8.4,5.2 8.4,8.4 6.8,10 0,10 0,7.2 5.2,7.2 5.2,6.4 0,6.4',
  6: '1.6,0 8,0 8,2.8 3.2,2.8 3.2,3.6 6.8,3.6 8.4,5.2 8.4,8.4 6.8,10 1.6,10 0,8.4 0,1.6|3.2,6.2 5.2,6.2 5.2,7.4 3.2,7.4',
  7: '0,0 8.4,0 8.4,2.8 5,10 1.6,10 4.9,2.8 0,2.8',
  8: '1.6,0 6.8,0 8.4,1.6 8.4,3.8 7.4,5 8.4,6.2 8.4,8.4 6.8,10 1.6,10 0,8.4 0,6.2 1,5 0,3.8 0,1.6|3,2.4 5.4,2.4 5.4,3.8 3,3.8|3,6.2 5.4,6.2 5.4,7.6 3,7.6',
  9: '1.6,0 6.8,0 8.4,1.6 8.4,8.4 6.8,10 0.4,10 0.4,7.2 5.2,7.2 5.2,6.4 1.6,6.4 0,4.8 0,1.6|3.2,2.6 5.2,2.6 5.2,3.8 3.2,3.8',
  '!': '0,0 3.2,0 2.8,6.6 0.4,6.6;0.2,7.4 3,7.4 3,10 0.2,10',
  '?': '0,0 6.8,0 8.4,1.6 8.4,4.4 5.6,6.6 3,6.6 3,4.6 5.2,3.4 5.2,2.8 0,2.8;3,7.4 5.8,7.4 5.8,10 3,10',
  '-': '0,4 5,4 5,6.6 0,6.6',
  '.': '0,7.2 3,7.2 3,10 0,10',
  "'": '0.4,0 3,0 2.2,3.4 0.8,3.4',
  '&': '1.6,0 6,0 7.6,1.6 7.6,3.4 6,5 7.4,6.4 8,5.4 9.6,6.6 8.8,7.8 10,10 6.8,10 6.4,9.2 5.4,10 1.6,10 0,8.4 0,6.4 1.4,5 0.4,4 0.4,1.6|3,2.4 4.8,2.4 4.8,3.4 3.8,4.2 3,3.4|3,6.4 4,5.8 5.6,7.6 5,8 3,8',
};
const SPACE = 3.6; // width of a space between words
const GAP = 0.35; // between letters

const parse = (text) =>
  text.split(';').map((shape) => shape.split('|').map((ring) => ring.split(' ').map((pair) => pair.split(',').map(Number))));

/** A letter's shapes, or null for one this alphabet does not have. Accents are dropped first. */
function glyph(char) {
  const plain = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return GLYPHS[plain] ? parse(GLYPHS[plain]) : null;
}

const area = (ring) => ring.reduce((sum, [x, y], i) => {
  const [x2, y2] = ring[(i + 1) % ring.length];
  return sum + x * y2 - x2 * y;
}, 0) / 2;

/** Puts a shape's rings the same way round: its outline one way, its holes the other. */
function orient(shape) {
  return shape.map((ring, i) => {
    const forward = area(ring) > 0;
    return forward === (i === 0) ? ring : [...ring].reverse();
  });
}

/**
 * The ring moved `by` units toward the solid side of the letter (with rings
 * oriented as above, that is always to the right of each edge as drawn
 * with y downward). Corners are mitred, and very sharp ones held in.
 */
export function inset(ring, by) {
  const n = ring.length;
  const normals = ring.map(([x, y], i) => {
    const [x2, y2] = ring[(i + 1) % n];
    const length = Math.hypot(x2 - x, y2 - y) || 1;
    return [-(y2 - y) / length, (x2 - x) / length];
  });
  return ring.map(([x, y], i) => {
    const a = normals[(i - 1 + n) % n];
    const b = normals[i];
    const dot = a[0] * b[0] + a[1] * b[1];
    const reach = by / Math.max(0.35, 1 + dot);
    return [x + (a[0] + b[0]) * reach, y + (a[1] + b[1]) * reach];
  });
}

/** Each edge of a ring with its outward normal (away from the solid side). */
function edges(ring) {
  return ring.map(([x, y], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length];
    const length = Math.hypot(x2 - x, y2 - y) || 1;
    return { a: [x, y], b: [x2, y2], out: [(y2 - y) / length, -(x2 - x) / length], index: i };
  });
}

const fmt = (value) => (Math.round(value * 100) / 100).toString();
const pathOf = (rings) => rings.map((ring) => `M${ring.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')}Z`).join('');

/** Mixes two '#rrggbb' colours, t of the way from a to b. */
function blend(a, b, t) {
  const ca = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16));
  const cb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
  return `#${ca.map((value, k) => Math.round(value + (cb[k] - value) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('')}`;
}

// Light comes from the upper left.
const LIGHT = [-0.42, -0.91];

/** How wide `text` is in these letters, in units of their height (10 = as wide as they are tall). */
export function measure(text) {
  let pen = 0;
  let any = false;
  for (const char of text) {
    if (char === ' ') {
      pen += SPACE;
      continue;
    }
    const shapes = glyph(char);
    if (!shapes) continue;
    pen += Math.max(...shapes.flat(3).filter((_, i) => i % 2 === 0)) + GAP;
    any = true;
  }
  return any ? pen - GAP : 0;
}

/**
 * A word in chunky letters, as SVG markup to go inside an <svg>. Returns
 * { svg, width, height } in the units it was drawn at.
 *
 *   text      what to write (letters this alphabet lacks are left out)
 *   size      how tall the capitals are
 *   x, y      where the middle of the word's baseline goes
 *   colours   { face: [top, middle, bottom], light, dark, side: [lit, shaded], ink }
 *   arch      how far the middle of the word rises above its ends
 *   tilt      how far the end letters lean outward, in radians
 *   swell     how much bigger the end letters are than the middle ones
 *   depth     how far the letters stand out, as [x, y] in units of `size`
 *   id        a prefix for gradient names, unique on the page
 */
export function word(text, { size, x, y, colours, arch = 0, tilt = 0, swell = 0, depth = [0.04, 0.16], id }) {
  const unit = size / 10;
  const letters = [];
  let pen = 0;
  for (const char of text) {
    if (char === ' ') {
      pen += SPACE;
      continue;
    }
    const shapes = glyph(char);
    if (!shapes) continue;
    const xs = shapes.flat(3).filter((_, i) => i % 2 === 0);
    const width = Math.max(...xs);
    letters.push({ shapes: shapes.map(orient), left: pen, width });
    pen += width + GAP;
  }
  const total = Math.max(0, pen - GAP);
  const ink = colours.ink;
  const bevel = 0.75;
  let back = '';
  let front = '';
  const faceId = `${id}-face`;

  letters.forEach((letter, i) => {
    // Where along the word it is, from -1 at the left end to 1 at the right.
    const t = letters.length > 1 ? ((letter.left + letter.width / 2) / total) * 2 - 1 : 0;
    const scale = 1 + swell * t * t;
    const turn = tilt * t;
    // A little bounce, the same each time: every other letter a touch up.
    const bounce = (i % 2 ? -0.18 : 0.1) * unit;
    const cx = x + (letter.left + letter.width / 2 - total / 2) * unit;
    const cy = y - arch * (1 - t * t) + bounce;
    // The way the letters stand out, the same on screen for every letter:
    // into each letter's own turned frame, then into grid units.
    const cos = Math.cos(-turn);
    const sin = Math.sin(-turn);
    const dx = (depth[0] * 10) * 1 + t * 0.25;
    const dy = depth[1] * 10;
    const d = [(dx * cos - dy * sin) / scale, (dx * sin + dy * cos) / scale];
    const transform = `translate(${fmt(cx)} ${fmt(cy)}) rotate(${fmt((turn * 180) / Math.PI)}) scale(${fmt(unit * scale)}) translate(${fmt(-letter.width / 2)} -10)`;

    let outline = '';
    let sides = '';
    let facets = '';
    let faces = '';
    let shine = '';
    for (const rings of letter.shapes) {
      const full = pathOf(rings);
      // The dark outline: the letter swept back along its depth.
      for (let k = 0; k <= 4; k++) outline += `<path d="${full}" transform="translate(${fmt((d[0] * k) / 4)} ${fmt((d[1] * k) / 4)})"/>`;

      // The side walls: each edge drawn out along the depth, where it faces that way.
      const walls = rings
        .flatMap((ring) => edges(ring))
        .filter((edge) => edge.out[0] * d[0] + edge.out[1] * d[1] > 0.02)
        .map((edge) => ({ ...edge, order: (edge.a[0] + edge.b[0]) * d[0] + (edge.a[1] + edge.b[1]) * d[1] }))
        .sort((p, q) => p.order - q.order);
      for (const edge of walls) {
        const lit = edge.out[0] * LIGHT[0] * -1 + edge.out[1] * LIGHT[1] * -1;
        const fill = blend(colours.side[1], colours.side[0], 0.45 + lit * 0.55);
        const [ax, ay] = edge.a;
        const [bx, by] = edge.b;
        sides += `<path d="M${fmt(ax)} ${fmt(ay)}L${fmt(bx)} ${fmt(by)}L${fmt(bx + d[0])} ${fmt(by + d[1])}L${fmt(ax + d[0])} ${fmt(ay + d[1])}Z" fill="${fill}" stroke="${fill}" stroke-width="0.06" stroke-linejoin="round"/>`;
      }

      // The bevel: one facet per edge between the outline and the face.
      const inner = rings.map((ring) => inset(ring, bevel));
      rings.forEach((ring, r) => {
        for (const edge of edges(ring)) {
          const lit = -(edge.out[0] * LIGHT[0] + edge.out[1] * LIGHT[1]);
          const fill = lit > 0 ? blend(colours.face[1], colours.light, 0.25 + lit * 0.75) : blend(colours.face[2], colours.dark, 0.2 - lit * 0.8);
          const q1 = inner[r][edge.index];
          const q2 = inner[r][(edge.index + 1) % ring.length];
          facets += `<path d="M${fmt(edge.a[0])} ${fmt(edge.a[1])}L${fmt(edge.b[0])} ${fmt(edge.b[1])}L${fmt(q2[0])} ${fmt(q2[1])}L${fmt(q1[0])} ${fmt(q1[1])}Z" fill="${fill}" stroke="${fill}" stroke-width="0.05" stroke-linejoin="round"/>`;
        }
      });
      const face = pathOf(inner);
      faces += `<path d="${face}" fill="url(#${faceId})" fill-rule="evenodd"/>`;
      // A shine across the top of the face.
      shine += `<path d="${face}" fill="#ffffff" fill-rule="evenodd" opacity="0.38" clip-path="url(#${id}-shine)"/>`;
      // Fine line where the bevel meets the face.
      faces += `<path d="${face}" fill="none" stroke="${colours.dark}" stroke-opacity="0.35" stroke-width="0.12" stroke-linejoin="round"/>`;
    }
    back += `<g transform="${transform}">${outline}</g>`;
    front += `<g transform="${transform}">${sides}<g fill="none" stroke="${ink}" stroke-width="0.22" stroke-linejoin="round">${letter.shapes.map((rings) => `<path d="${pathOf(rings)}"/>`).join('')}</g>${facets}${faces}${shine}</g>`;
  });

  const defs = `
    <linearGradient id="${faceId}" x1="0" y1="0" x2="0" y2="10" gradientUnits="userSpaceOnUse">
      <stop offset="0.08" stop-color="${colours.face[0]}"/><stop offset="0.5" stop-color="${colours.face[1]}"/><stop offset="0.95" stop-color="${colours.face[2]}"/>
    </linearGradient>
    <clipPath id="${id}-shine"><path d="M-2 -2H14V3.3L-2 4.6Z"/></clipPath>`;
  const svg = `<defs>${defs}</defs>
    <g transform="translate(${fmt(size * 0.05)} ${fmt(size * 0.13)})" fill="#050a24" stroke="#050a24" stroke-width="2.6" stroke-linejoin="round" opacity="0.35">${back}</g>
    <g fill="${ink}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round">${back}</g>
    ${front}`;
  return { svg, width: total * unit, height: size };
}
