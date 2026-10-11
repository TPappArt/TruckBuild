// The game's logo and its app icon, as SVG markup.
//
// The logo is drawn around whatever the game is called (config.js), so it
// survives a rename: the last word of the name goes on the ribbon and the
// rest across the middle in big letters. Behind the letters: a bottle of
// fizz that has just popped its own cork and is very pleased about it, a
// tyre, and a chequered flag.
//
// The letters are ordinary text in the game's font, stacked up in layers
// to look solid: a shadow, a gold side that gives them depth, a gold trim,
// a dark outline, the face of the letter and a shine across the top.
//
// `npm run icons` writes `iconSvg()` out as icons/icon.svg, which the other
// icon files are made from (see the README).

const FONT = "ui-rounded, 'Arial Rounded MT Bold', 'Nunito', 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif";
const INK = '#0d1d4d';

const escape = (text) => text.replace(/[&<>"]/g, (mark) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[mark]);

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

// Where everything goes, for a wide space and for a tall one.
const LAYOUTS = {
  wide: { width: 980, height: 430, tyre: 'translate(216 300) rotate(-12)', bottle: 'translate(218 412) rotate(-9) scale(1.08)', flag: 'translate(924 336) rotate(8) scale(-1 1)', x: 616, y: 312, fit: 600 },
  tall: { width: 640, height: 670, tyre: 'translate(128 318) rotate(-12) scale(1.1)', bottle: 'translate(318 416) rotate(-7) scale(1.16)', flag: 'translate(580 420) rotate(9) scale(-1.1 1.1)', x: 320, y: 552, fit: 580 },
};

/**
 * The logo for a game called `name`.
 * tall: the picture above the name (for a narrow screen) rather than beside it.
 * id:   a prefix for the names of its gradients, unique on the page.
 */
export function logoSvg(name, { tall = false, id = tall ? 'logo-tall' : 'logo' } = {}) {
  const at = tall ? LAYOUTS.tall : LAYOUTS.wide;
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : '';
  const top = escape(words.join(' ').toUpperCase());
  const under = escape(last.toUpperCase());
  // The big word is fitted to the width whatever font the device has.
  const wide = Math.min(at.fit, top.length * 80);
  const ribbon = Math.min(250, under.length * 40);
  const word = `<text id="${id}-word" x="${at.x}" y="${at.y}" text-anchor="middle" font-family="${FONT}" font-size="128" font-weight="900" font-style="italic" textLength="${wide}" lengthAdjust="spacingAndGlyphs" stroke-linejoin="round">${top}</text>`;
  const layer = (attributes) => `<use href="#${id}-word" ${attributes}/>`;
  // The side of the letters: the same word again and again, each a little
  // further down and to the right.
  const depth = Array.from({ length: 7 }, (_, i) => layer(`transform="translate(${((7 - i) * 1.3).toFixed(1)} ${((7 - i) * 2.1).toFixed(1)})" fill="#a35f00" stroke="#a35f00" stroke-width="26"`)).join('');

  return `<svg viewBox="0 0 ${at.width} ${at.height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>${defs(id)}${word}
    <clipPath id="${id}-top"><rect x="0" y="${at.y - 118}" width="${at.width}" height="76"/></clipPath>
  </defs>
  <g transform="${at.tyre}">${tyre(id)}</g>
  <g transform="${at.flag}">${flag(id)}</g>
  <g transform="${at.bottle}">${bottle(id)}</g>
  <g transform="rotate(-3 ${at.x} ${at.y - 18})">
    ${layer(`transform="translate(10 22)" fill="#061033" stroke="#061033" stroke-width="28" opacity=".45"`)}
    ${depth}
    ${layer(`fill="url(#${id}-gold)" stroke="url(#${id}-gold)" stroke-width="26"`)}
    ${layer(`fill="${INK}" stroke="${INK}" stroke-width="13"`)}
    ${layer(`fill="url(#${id}-face)"`)}
    <g clip-path="url(#${id}-top)">${layer('fill="#ffffff" opacity=".55"')}</g>
    ${
      under
        ? `<g transform="translate(${at.x} ${at.y + 54})">
      <path d="M${-ribbon / 2 - 6} -22h-50l20 27-20 27h64z" fill="#a8261d" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M${ribbon / 2 + 6} -22h50l-20 27 20 27h-64z" fill="#a8261d" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <rect x="${-ribbon / 2 - 24}" y="-34" width="${ribbon + 48}" height="62" rx="12" fill="url(#${id}-gold)" stroke="${INK}" stroke-width="6"/>
      <rect x="${-ribbon / 2 - 16}" y="-26" width="${ribbon + 32}" height="46" rx="7" fill="#e4463a"/>
      <text x="0" y="13" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="900" font-style="italic" textLength="${ribbon}" lengthAdjust="spacingAndGlyphs" fill="#ffffff" stroke="${INK}" stroke-width="7" stroke-linejoin="round" paint-order="stroke">${under}</text>
    </g>`
        : ''
    }
  </g>
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
