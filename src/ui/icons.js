// Small pictures used around the menus, as SVG markup. Drawn here rather
// than loaded, so the game stays a handful of text files.

const svg = (box, inner) => `<svg viewBox="${box}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

export const coinIcon = svg(
  '0 0 24 24',
  '<circle cx="12" cy="12" r="11" fill="#e8a500"/><circle cx="12" cy="11" r="10" fill="#ffd23f"/><circle cx="12" cy="11" r="7" fill="none" stroke="#e8a500" stroke-width="1.6"/><path d="M12 6.5l1.4 3 3.2.3-2.4 2.2.7 3.2-2.9-1.7-2.9 1.7.7-3.2-2.4-2.2 3.2-.3z" fill="#e8a500"/>',
);

/** A golden thing: what premium parts cost (race/gold.js). */
export const goldIcon = svg(
  '0 0 24 24',
  '<path d="M12 1.6l3.1 6.5 7.1.9-5.2 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.8 9l7.1-.9z" fill="#ffd23f" stroke="#b97700" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 5.6l1.8 3.9 4.2.5-3.1 2.9.8 4.1-3.7-2-3.7 2 .8-4.1-3.1-2.9 4.2-.5z" fill="#fff3a8"/>',
);

export const lockIcon = svg(
  '0 0 24 24',
  '<path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="4.5" y="10.5" width="15" height="11" rx="3" fill="currentColor"/><circle cx="12" cy="16" r="1.8" fill="#fff"/>',
);

const rays = (count, colour) =>
  Array.from({ length: count }, (_, i) => `<path d="M100 100L${100 + 130 * Math.cos(((i + 0.25) / count) * 6.283)} ${100 + 130 * Math.sin(((i + 0.25) / count) * 6.283)}L${100 + 130 * Math.cos(((i + 0.75) / count) * 6.283)} ${100 + 130 * Math.sin(((i + 0.75) / count) * 6.283)}z" fill="${colour}"/>`).join('');

/** First place: a gold cup in a burst of light. */
export const trophyArt = svg(
  '0 0 200 200',
  `<g class="art-rays">${rays(12, 'rgb(255 210 63 / 30%)')}</g>
   <path d="M52 44H30c0 30 12 46 32 50M148 44h22c0 30-12 46-32 50" fill="none" stroke="#e8a500" stroke-width="10" stroke-linecap="round"/>
   <path d="M52 32h96v34c0 30-20 52-48 52S52 96 52 66z" fill="#ffd23f"/>
   <path d="M52 32h96v10H52z" fill="#fff0a8"/>
   <path d="M66 46v22c0 20 10 34 24 40" fill="none" stroke="#fff6cf" stroke-width="8" stroke-linecap="round"/>
   <path d="M88 116h24v22H88z" fill="#e8a500"/>
   <path d="M66 138h68a6 6 0 0 1 6 6v20H60v-20a6 6 0 0 1 6-6z" fill="#14204a"/>
   <rect x="76" y="146" width="48" height="10" rx="3" fill="#ffd23f"/>
   <path d="M100 52l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="#fff6cf"/>`,
);

const medal = (disc, edge, ribbonA, ribbonB, digit) =>
  svg(
    '0 0 200 200',
    `<path d="M70 20h28l14 62H84z" fill="${ribbonA}"/><path d="M130 20h-28L88 82h28z" fill="${ribbonB}"/>
     <circle cx="100" cy="126" r="54" fill="${edge}"/><circle cx="100" cy="122" r="50" fill="${disc}"/>
     <circle cx="100" cy="122" r="38" fill="none" stroke="${edge}" stroke-width="5"/>
     <text x="100" y="142" text-anchor="middle" font-size="56" font-weight="900" font-style="italic" font-family="ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif" fill="${edge}">${digit}</text>`,
  );

export const silverArt = medal('#e8edf5', '#8b93a6', '#2f7df2', '#1d43a8', 2);
export const bronzeArt = medal('#f0b27a', '#a9652e', '#31c45a', '#1f8a3d', 3);

/** Last place: a flat tyre and a puff of smoke. Not the end of the world. */
export const flatTyreArt = svg(
  '0 0 200 200',
  `<ellipse cx="100" cy="176" rx="74" ry="10" fill="rgb(0 0 0 / 25%)"/>
   <circle cx="146" cy="52" r="16" fill="#c5d2f5"/><circle cx="164" cy="38" r="11" fill="#c5d2f5"/><circle cx="130" cy="36" r="9" fill="#c5d2f5"/>
   <path d="M36 108a64 64 0 0 1 128 0c0 24-10 46-22 58H58c-12-12-22-34-22-58z" fill="#22252d"/>
   <path d="M44 166h112a8 8 0 0 1 0 16H44a8 8 0 0 1 0-16z" fill="#22252d"/>
   <circle cx="100" cy="108" r="34" fill="#c7d0de"/><circle cx="100" cy="108" r="10" fill="#22252d"/>
   <path d="M100 80v16M100 120v16M72 108h16M112 108h16" stroke="#22252d" stroke-width="6" stroke-linecap="round"/>
   <path d="M46 96l10 6M154 96l-10 6M62 62l8 8M138 62l-8 8M100 44v10" stroke="#3a3f4b" stroke-width="7" stroke-linecap="round"/>`,
);

/** The picture that goes with a finishing place. */
export const placeArt = (place) => [trophyArt, silverArt, bronzeArt, flatTyreArt][Math.min(place, 4) - 1];
