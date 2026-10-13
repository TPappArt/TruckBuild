// The game's logo and its app icon, as SVG markup.
//
// The logo is drawn around whatever the game is called (config.js), so it
// survives a rename: the last word of the name goes underneath, smaller,
// and the rest across the middle in big letters, both in the chunky
// cartoon lettering of lettering.js, on a badge with bolts out of its ends.
// Over one corner: a bottle of fizz that has just popped its own cork and
// is very pleased about it; behind: a tyre and a chequered flag.
//
// `npm run icons` writes `iconSvg()` out as icons/icon.svg, which the other
// icon files are made from (see the README).

import { inset, measure, word } from './lettering.js';

const INK = '#0d1d4d';

// Colours shared by everything below. `id` keeps two drawings on one page
// from tripping over each other's gradients.
const defs = (id) => `
  <linearGradient id="${id}-gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff6c2"/><stop offset=".42" stop-color="#ffd23f"/><stop offset="1" stop-color="#c98200"/>
  </linearGradient>
  <linearGradient id="${id}-face" x1="0" y1="0" x2="0" y2="1">
    <stop offset=".05" stop-color="#ffffff"/><stop offset=".5" stop-color="#ffe680"/><stop offset=".95" stop-color="#ff9a1f"/>
  </linearGradient>
  <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#35c26b"/><stop offset=".55" stop-color="#1f9d55"/><stop offset="1" stop-color="#14713c"/>
  </linearGradient>
  <pattern id="${id}-check" width="32" height="32" patternUnits="userSpaceOnUse">
    <rect width="32" height="32" fill="#ffffff"/><rect width="16" height="16" fill="#14204a"/><rect x="16" y="16" width="16" height="16" fill="#14204a"/>
  </pattern>`;

/**
 * The bottle, standing on (0, 0) and 222 tall. `fizz` adds the cork in
 * flight and the spray; without it the cork is still in.
 */
function bottle(id, fizz = true) {
  const spray = fizz
    ? `
    <g fill="#fffbe6" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">
      <path d="M-11 -224C-40 -262 -74 -262 -96 -244 -74 -250 -50 -240 -30 -214z"/>
      <path d="M8 -224C24 -270 60 -288 92 -274 62 -272 40 -252 24 -216z"/>
      <path d="M-4 -226C-10 -270 -2 -300 22 -318 12 -292 12 -262 12 -226z"/>
      <circle cx="-108" cy="-226" r="9"/><circle cx="108" cy="-262" r="10"/><circle cx="-52" cy="-290" r="8"/>
      <circle cx="-84" cy="-284" r="5"/><circle cx="62" cy="-312" r="6"/><circle cx="126" cy="-226" r="5"/>
    </g>
    <g transform="translate(42 -346) rotate(28)">
      <path d="M-15 0h30l-4 30h-22z" fill="#d9a866" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-21 -14a21 15 0 0 1 42 0v8a6 6 0 0 1-6 6h-30a6 6 0 0 1-6-6z" fill="#edc58a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    </g>
    <g fill="url(#${id}-gold)" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
      <path d="M-130 -300l6 14 14 6-14 6-6 14-6-14-14-6 14-6z"/>
      <path d="M118 -330l5 11 11 5-11 5-5 11-5-11-11-5 11-5z"/>
    </g>`
    : `
    <g>
      <path d="M-12 -216h24l-3 -16h-18z" fill="#d9a866" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M-19 -240a19 13 0 0 1 38 0v6a5 5 0 0 1-5 5h-28a5 5 0 0 1-5-5z" fill="#edc58a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    </g>`;
  return `
    ${spray}
    <path d="M-46 0V-104C-46 -142 -15 -150 -15 -180V-216H15V-180C15 -150 46 -142 46 -104V0Z" fill="url(#${id}-glass)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M-34 -22V-100C-34 -122 -22 -134 -14 -146" fill="none" stroke="#ffffff" stroke-opacity=".38" stroke-width="7" stroke-linecap="round"/>
    <path d="M-15 -222H15V-180C15 -168 21 -160 28 -152L14 -158 4 -148 -6 -158 -16 -148 -28 -152C-21 -160 -15 -168 -15 -180Z" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="-20" y="-228" width="40" height="12" rx="5" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="5"/>
    <path d="M-46 -52H46V-8H-46Z" fill="#fff6e0" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M0 -46l4.6 9.6 10.4 1.2-7.7 7.2 2 10.4L0 -22.6l-9.3 5 2-10.4-7.7-7.2 10.4-1.2z" fill="#e4463a"/>
    <ellipse cx="-17" cy="-106" rx="14" ry="17" fill="#ffffff" stroke="${INK}" stroke-width="4.5"/>
    <ellipse cx="17" cy="-106" rx="14" ry="17" fill="#ffffff" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="-13" cy="-102" r="6.5" fill="${INK}"/><circle cx="21" cy="-102" r="6.5" fill="${INK}"/>
    <circle cx="-15" cy="-105" r="2.2" fill="#ffffff"/><circle cx="19" cy="-105" r="2.2" fill="#ffffff"/>
    <path d="M-34 -126l20 -7M34 -126l-20 -7" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M-24 -80Q0 -52 24 -80Q0 -72 -24 -80Z" fill="${INK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M-9 -68Q0 -58 9 -68Q0 -72 -9 -68Z" fill="#ff6a7a"/>`;
}

/** A tyre on a gold rim, centred on (0, 0) and 82 in radius. */
function tyre(id) {
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    return `M0 0L${(Math.cos(angle) * 40).toFixed(1)} ${(Math.sin(angle) * 40).toFixed(1)}`;
  }).join('');
  return `
    <circle r="78" fill="#22252d" stroke="${INK}" stroke-width="7"/>
    <circle r="70" fill="none" stroke="#474d5c" stroke-width="12" stroke-dasharray="14 9.5"/>
    <circle r="46" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="6"/>
    <path d="${spokes}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <circle r="13" fill="#e4463a" stroke="${INK}" stroke-width="5"/>`;
}

/** A chequered flag on a gold pole. The foot of the pole is at (0, 0). */
function flag(id) {
  return `
    <path d="M0 0V-210" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
    <path d="M0 0V-210" stroke="url(#${id}-gold)" stroke-width="8" stroke-linecap="round"/>
    <path d="M4 -204C44 -228 84 -180 126 -202S178 -214 190 -206V-104C178 -112 168 -122 126 -100S44 -126 4 -102Z" fill="url(#${id}-check)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <circle cy="-214" r="11" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="5"/>`;
}

/** A badge for the name to sit on: a wide shield with a peak top and bottom, edged in red. */
function badge(id, cx, cy, w, h) {
  const peak = h * 0.42;
  const outline = [
    [cx - w, cy],
    [cx - w + h * 0.75, cy - h],
    [cx - w * 0.3, cy - h],
    [cx, cy - h - peak],
    [cx + w * 0.3, cy - h],
    [cx + w - h * 0.75, cy - h],
    [cx + w, cy],
    [cx + w - h * 0.75, cy + h],
    [cx + w * 0.3, cy + h],
    [cx, cy + h + peak],
    [cx - w * 0.3, cy + h],
    [cx - w + h * 0.75, cy + h],
  ];
  const ring = (points) => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
  const rim = inset(outline, 15);
  const plate = inset(outline, 30);
  // Gold rivets round the rim.
  const rivets = rim
    .filter((_, i) => i % 2 === 1)
    .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="3"/>`)
    .join('');
  return `
    <path d="${ring(outline)}" fill="${INK}" stroke="${INK}" stroke-width="18" stroke-linejoin="round" transform="translate(6 12)" opacity=".4"/>
    <path d="${ring(outline)}" fill="#e4463a" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
    <path d="${ring(rim)}" fill="none" stroke="#ff8a7a" stroke-width="4" stroke-linejoin="round" opacity=".7"/>
    <path d="${ring(plate)}" fill="url(#${id}-plate)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <path d="${ring(inset(outline, 40))}" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="5" stroke-linejoin="round"/>
    ${rivets}`;
}

// Colours of the two lines of lettering.
const BIG = { face: ['#fffbe0', '#ffe14a', '#ffaa1f'], light: '#fffdf0', dark: '#c46a0a', side: ['#4a63ff', '#161b7a'], ink: '#0b1033' };
const SMALL = { face: ['#ffffff', '#eef7ff', '#a9d4ff'], light: '#ffffff', dark: '#3f6fb4', side: ['#4a63ff', '#161b7a'], ink: '#0b1033' };

/**
 * The logo for a game called `name`: its name in chunky gold letters on a
 * badge, the last word smaller underneath, with the bottle popping its cork
 * over one corner, and a tyre and a chequered flag behind.
 * tall: arranged for a narrow screen.
 * id:   a prefix for the names of its gradients, unique on the page.
 */
export function logoSvg(name, { tall = false, id = tall ? 'logo-tall' : 'logo' } = {}) {
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : '';
  const top = words.join(' ');
  const width = tall ? 640 : 1000;
  const height = tall ? 640 : 470;
  // The big line as large as fits, then the small one under it.
  const cx = tall ? width / 2 : 575;
  const units = Math.max(1, measure(top));
  // As big as fits with the badge round it, inside the picture.
  const size = Math.min(tall ? 118 : 150, (width / 2 - Math.abs(width / 2 - cx) - 20) / ((units / 20) * 1.08 + 0.5));
  const room = (units * size) / 10;
  const cy = tall ? 440 : 262;
  const big = word(top, { size, x: cx, y: cy + size * 0.42, colours: BIG, arch: size * 0.16, tilt: 0.1, swell: 0.12, id: `${id}-big` });
  const smallSize = Math.min(size * 0.5, (room * 0.55) / Math.max(1, measure(last)) * 10);
  const small = last ? word(last, { size: smallSize, x: cx, y: cy + size * 0.42 + smallSize * 1.25, colours: SMALL, arch: -smallSize * 0.08, tilt: -0.04, swell: 0.05, id: `${id}-small` }) : null;
  // (The end letters are drawn a little bigger than they measure.)
  const halfWide = (big.width / 2) * 1.08 + size * 0.5;
  const halfTall = size * 0.72 + (small ? smallSize * 0.55 : 0);

  const scenery = tall
    ? `<g transform="translate(150 250) rotate(-14) scale(0.95)">${tyre(id)}</g>
       <g transform="translate(560 300) rotate(9) scale(-1 1)">${flag(id)}</g>`
    : `<g transform="translate(938 380) rotate(14) scale(0.8)">${tyre(id)}</g>
       <g transform="translate(905 238) rotate(10) scale(-0.95 0.95)">${flag(id)}</g>`;
  const fizz = tall ? `<g transform="translate(330 352) rotate(-6) scale(1.05)">${bottle(id)}</g>` : `<g transform="translate(150 446) rotate(-14) scale(1.12)">${bottle(id)}</g>`;

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>${defs(id)}
    <linearGradient id="${id}-plate" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a3a8f"/><stop offset="1" stop-color="#121a52"/>
    </linearGradient>
  </defs>
  ${scenery}
  ${badge(id, cx, cy + (small ? smallSize * 0.45 : 0), halfWide, halfTall)}
  ${fizz}
  ${big.svg}
  ${small ? small.svg : ''}
</svg>`;
}

/**
 * The app icon: the bottle looking out of the tyre, on the game's blue.
 * `bleed` fills the square to its corners (for icons the system crops to
 * its own shape); otherwise the corners are rounded. `scale` is how much of
 * the square the picture takes up.
 */
export function iconSvg({ bleed = false, scale = bleed ? 0.74 : 0.9, id = 'icon' } = {}) {
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>${defs(id)}
    <radialGradient id="${id}-sky" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#3f8dff"/><stop offset=".7" stop-color="#1d43a8"/><stop offset="1" stop-color="#132a6b"/></radialGradient>
  </defs>
  <rect width="512" height="512" rx="${bleed ? 0 : 112}" fill="url(#${id}-sky)"/>
  ${bleed ? '' : `<rect x="13" y="13" width="486" height="486" rx="100" fill="none" stroke="url(#${id}-gold)" stroke-width="14"/>`}
  <g transform="translate(256 262) scale(${scale})">
    <g transform="translate(0 86) scale(2.05)">${tyre(id)}</g>
    <g transform="translate(-6 196) rotate(-8) scale(1.22)">${bottle(id)}</g>
  </g>
</svg>`;
}
