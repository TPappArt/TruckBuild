// The drivers a player can be. Each is a simple face drawn as SVG, used on
// the character screen, on the nameplate over a car, and in the results.
//
// Faces are drawn in a 64 x 64 box on a round coloured badge. Keep them to
// a few bold shapes: they are shown as small as 22 pixels across.

const INK = '#1d2440';

const eyes = (y = 34, gap = 7, r = 3) =>
  `<circle cx="${32 - gap}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${32 + gap}" cy="${y}" r="${r}" fill="${INK}"/>`;
const smile = (y = 43, wide = 7) =>
  `<path d="M${32 - wide} ${y}q${wide} ${wide * 0.9} ${wide * 2} 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const cheeks = (y = 40) => `<circle cx="20" cy="${y}" r="3" fill="#ff8a8a" opacity=".6"/><circle cx="44" cy="${y}" r="3" fill="#ff8a8a" opacity=".6"/>`;

const FACES = {
  boy: `
    <ellipse cx="32" cy="35" rx="18" ry="19" fill="#f4c9a2"/>
    <path d="M13 31C12 17 21 9 33 9c11 0 19 7 18 20-3-6-8-9-13-10-5 4-14 6-25 12z" fill="#6b4226"/>
    ${eyes(36)}${cheeks(42)}${smile(45)}`,
  girl: `
    <circle cx="11" cy="30" r="8" fill="#2b1b17"/><circle cx="53" cy="30" r="8" fill="#2b1b17"/>
    <ellipse cx="32" cy="35" rx="18" ry="19" fill="#c98c5e"/>
    <path d="M13 32C12 17 21 9 32 9s20 8 19 23c-3-8-10-12-19-12s-16 4-19 12z" fill="#2b1b17"/>
    <path d="M40 12l8-5v10zM40 12l-8-5v10z" fill="#ff5fa2"/><circle cx="40" cy="12" r="2.6" fill="#ffd23f"/>
    ${eyes(36)}${cheeks(42)}${smile(45)}`,
  monster: `
    <path d="M17 16l-6-10 11 5zM47 16l6-10-11 5z" fill="#ffd23f"/>
    <path d="M12 34c0-13 9-21 20-21s20 8 20 21c0 12-7 20-20 20S12 46 12 34z" fill="#8f5cf0"/>
    <circle cx="32" cy="29" r="10" fill="#fff"/><circle cx="33" cy="30" r="5" fill="${INK}"/><circle cx="35" cy="28" r="1.6" fill="#fff"/>
    <path d="M21 43h22l-3 6-3-5-3 5-3-5-3 5-3-5-2 5z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  mummy: `
    <rect x="13" y="11" width="38" height="44" rx="17" fill="#efe6cc"/>
    <path d="M14 22l37-5M13 46l38-6M17 53l31-4M16 15l30-3" stroke="#b9a67f" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M13 27h38v10H13z" fill="#3a2a1c"/>
    <circle cx="25" cy="32" r="3.2" fill="#ffe24a"/><circle cx="39" cy="32" r="3.2" fill="#ffe24a"/>
    <path d="M47 50l7 8" stroke="#efe6cc" stroke-width="4" stroke-linecap="round"/>`,
  robot: `
    <path d="M32 13V6" stroke="#8b93a6" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="6" r="3.4" fill="#ff5a4a"/>
    <rect x="9" y="28" width="6" height="12" rx="2" fill="#8b93a6"/><rect x="49" y="28" width="6" height="12" rx="2" fill="#8b93a6"/>
    <rect x="14" y="13" width="36" height="40" rx="8" fill="#c7d0de"/>
    <rect x="20" y="24" width="9" height="9" rx="2" fill="#2fd0ff"/><rect x="35" y="24" width="9" height="9" rx="2" fill="#2fd0ff"/>
    <path d="M22 42h20M27 39v6M32 39v6M37 39v6" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,
  alien: `
    <path d="M32 9c13 0 21 9 21 20 0 13-11 26-21 26S11 42 11 29C11 18 19 9 32 9z" fill="#6fe07a"/>
    <ellipse cx="23" cy="31" rx="6" ry="9" transform="rotate(20 23 31)" fill="${INK}"/>
    <ellipse cx="41" cy="31" rx="6" ry="9" transform="rotate(-20 41 31)" fill="${INK}"/>
    <circle cx="25" cy="27" r="1.8" fill="#fff"/><circle cx="43" cy="27" r="1.8" fill="#fff"/>
    <path d="M28 46q4 3 8 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  cat: `
    <path d="M14 30L12 8l15 9zM50 30l2-22-15 9z" fill="#ff9f43"/><path d="M17 22l-1-8 6 4zM47 22l1-8-6 4z" fill="#ffd0d8"/>
    <ellipse cx="32" cy="36" rx="20" ry="18" fill="#ff9f43"/>
    <ellipse cx="32" cy="43" rx="9" ry="7" fill="#fff3e0"/>
    ${eyes(33, 8, 3.2)}
    <path d="M29 39h6l-3 3z" fill="#ff5a7a"/>
    <path d="M32 42v3M10 38l10 2M10 45l10-2M54 38l-10 2M54 45l-10-2" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  dino: `
    <path d="M22 13l4-7 4 6 4-6 4 6 4-5 2 8z" fill="#ff9f43"/>
    <path d="M11 33c0-12 9-21 21-21s21 9 21 21c0 6-3 11-8 14H19c-5-3-8-8-8-14z" fill="#3fbf6a"/>
    <path d="M17 41h30v6c0 4-6 8-15 8s-15-4-15-8z" fill="#2f9d54"/>
    <path d="M19 42l3 5 3-5 3 5 3-5 3 5 3-5 3 5 3-5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
    <circle cx="24" cy="29" r="5" fill="#fff"/><circle cx="40" cy="29" r="5" fill="#fff"/>
    <circle cx="25" cy="30" r="2.4" fill="${INK}"/><circle cx="41" cy="30" r="2.4" fill="${INK}"/>`,
  ghost: `
    <path d="M13 31c0-12 8-20 19-20s19 8 19 20v24l-6-5-6 5-7-5-7 5-6-5-6 5z" fill="#f6f8ff"/>
    <ellipse cx="25" cy="30" rx="3.6" ry="5" fill="${INK}"/><ellipse cx="39" cy="30" rx="3.6" ry="5" fill="${INK}"/>
    <ellipse cx="32" cy="42" rx="4" ry="5" fill="${INK}"/>`,
  pumpkin: `
    <path d="M30 14c0-5 2-8 6-9l1 4c-2 1-3 2-3 5z" fill="#3f8f3a"/>
    <ellipse cx="32" cy="35" rx="21" ry="19" fill="#ff8a1f"/>
    <path d="M32 16c-6 5-6 33 0 38M32 16c6 5 6 33 0 38" stroke="#d96a0a" stroke-width="2" fill="none"/>
    <path d="M19 28l8 2-6 5zM45 28l-8 2 6 5z" fill="${INK}"/>
    <path d="M19 41l5 2 4-3 4 3 4-3 4 3 5-2c-2 7-7 10-13 10s-11-3-13-10z" fill="${INK}"/>`,
};

export const CHARACTERS = [
  { id: 'boy', name: 'Boy', badge: '#2f9bff' },
  { id: 'girl', name: 'Girl', badge: '#ffb3d1' },
  { id: 'monster', name: 'Monster', badge: '#ffd23f' },
  { id: 'mummy', name: 'Mummy', badge: '#e59a4b' },
  { id: 'robot', name: 'Robot', badge: '#5b6ee8' },
  { id: 'alien', name: 'Alien', badge: '#3b2a7a' },
  { id: 'cat', name: 'Cat', badge: '#7fd6c4' },
  { id: 'dino', name: 'Dino', badge: '#ffe08a' },
  { id: 'ghost', name: 'Ghost', badge: '#7a5cc9' },
  { id: 'pumpkin', name: 'Pumpkin', badge: '#3a2f5c' },
];

export const DEFAULT_CHARACTER = 'boy';
export const NAME_LENGTH = 12;

export const findCharacter = (id) => CHARACTERS.find((character) => character.id === id) || CHARACTERS[0];

/** SVG markup for a character's badge. */
export function characterSvg(id) {
  const character = findCharacter(id);
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="${character.badge}"/>${FACES[character.id]}</svg>`;
}

/** Tidies a typed name: no odd spacing, not too long, never empty. */
export function cleanName(text, fallback = 'Player') {
  const name = (typeof text === 'string' ? text : '').replace(/\s+/g, ' ').trim().slice(0, NAME_LENGTH);
  return name || fallback;
}
