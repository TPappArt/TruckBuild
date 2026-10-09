import { BODIES } from './bodies.js';
import { EXTRAS } from './extras.js';
import { WEAPONS } from './weapons.js';
import { WHEELS } from './wheels.js';

// Everything the player can choose from in the build phase, in tab order.
// A build is one part id per category (or null where `optional`), plus paint.
export const CATEGORIES = [
  { id: 'wheels', name: 'Wheels', optional: false, parts: WHEELS },
  { id: 'body', name: 'Body', optional: false, parts: BODIES },
  { id: 'extra', name: 'Extras', optional: true, parts: EXTRAS },
  { id: 'weapon', name: 'Weapons', optional: true, parts: WEAPONS },
];

export const PAINTS = [
  { name: 'Red', hex: '#f23a2f' },
  { name: 'Blue', hex: '#2f7df2' },
  { name: 'Green', hex: '#31c45a' },
  { name: 'Yellow', hex: '#ffc928' },
  { name: 'Pink', hex: '#ff6fae' },
  { name: 'White', hex: '#f4f6fb' },
];

export const DEFAULT_BUILD = {
  wheels: 'kart-wheels',
  body: 'pickup',
  extra: 'spoiler',
  weapon: 'cannon',
  paint: PAINTS[0].hex,
};

export function findPart(categoryId, partId) {
  const category = CATEGORIES.find((entry) => entry.id === categoryId);
  return category?.parts.find((part) => part.id === partId) ?? null;
}

/** Returns a copy of `build` with anything missing or unknown replaced by defaults. */
export function sanitizeBuild(build) {
  const clean = { ...DEFAULT_BUILD };
  for (const category of CATEGORIES) {
    const value = build?.[category.id];
    if (findPart(category.id, value)) clean[category.id] = value;
    else if (category.optional && value === null) clean[category.id] = null;
  }
  if (PAINTS.some((paint) => paint.hex === build?.paint)) clean.paint = build.paint;
  return clean;
}

export function randomBuild() {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const build = { paint: pick(PAINTS).hex };
  for (const category of CATEGORIES) {
    build[category.id] = pick(category.parts).id;
  }
  return build;
}
