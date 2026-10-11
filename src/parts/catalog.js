import { BODIES } from './bodies.js';
import { EXTRAS, SPECIAL_EXTRAS } from './extras.js';
import { WEAPONS } from './weapons.js';
import { WHEELS } from './wheels.js';

// Everything the player can choose from in the build phase, in tab order.
// A build is one part id per category (or null where `optional`), plus paint.
// Parts are bought with coins won in races (see profile.js).
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

// What each part costs, in coins. Parts at 0 are the ones every player
// starts with: enough to build a whole vehicle, weapon included, so there
// is a way to earn coins from the first race.
const PRICES = {
  'kart-wheels': 0,
  'monster-wheels': 150,
  'spider-legs': 220,
  'tank-treads': 260,
  'mech-legs': 340,

  kart: 0,
  pickup: 120,
  bug: 160,
  bulldog: 220,
  tub: 280,

  spoiler: 60,
  'shark-fin': 80,
  'side-pipes': 120,
  'glider-wings': 180,
  booster: 260,

  blaster: 0,
  flipper: 140,
  hammer: 200,
  'buzz-saw': 240,
  cannon: 300,
};

export const priceOf = (part) => PRICES[part.id] ?? 0;

// Premium parts are not for sale for coins at all. They cost golden things,
// of which there are three hidden on every track (race/gold.js): fifteen in
// the whole game, and these come to fourteen.
const GOLD_PRICES = {
  'gold-rims': 3,
  'hot-rod': 4,
  'champion-wing': 3,
  'fizz-cannon': 4,
};

/** What a premium part costs in golden things; 0 for an ordinary part. */
export const goldPriceOf = (part) => GOLD_PRICES[part.id] ?? 0;
export const isPremium = (part) => goldPriceOf(part) > 0;

/** The parts a new player owns, as 'category/part' keys. */
export const STARTER_PARTS = CATEGORIES.flatMap((category) =>
  category.parts.filter((part) => priceOf(part) === 0 && !isPremium(part)).map((part) => `${category.id}/${part.id}`),
);

export const partKey = (categoryId, partId) => `${categoryId}/${partId}`;

export const DEFAULT_BUILD = {
  wheels: 'kart-wheels',
  body: 'kart',
  extra: null,
  weapon: 'blaster',
  paint: PAINTS[0].hex,
};

// Parts nobody can buy or pick: they are fitted to one particular car.
export const SPECIAL = { extra: SPECIAL_EXTRAS };

export function findPart(categoryId, partId) {
  const category = CATEGORIES.find((entry) => entry.id === categoryId);
  return category?.parts.find((part) => part.id === partId) ?? SPECIAL[categoryId]?.find((part) => part.id === partId) ?? null;
}

/**
 * Returns a copy of `build` with anything missing or unknown replaced by
 * defaults. With `owns(categoryId, partId)`, parts the player does not own
 * are replaced too.
 */
export function sanitizeBuild(build, owns = () => true) {
  const clean = { ...DEFAULT_BUILD };
  for (const category of CATEGORIES) {
    const value = build?.[category.id];
    if (findPart(category.id, value) && owns(category.id, value)) clean[category.id] = value;
    else if (category.optional && value === null) clean[category.id] = null;
  }
  if (PAINTS.some((paint) => paint.hex === build?.paint)) clean.paint = build.paint;
  return clean;
}

/** A random build. With `owns`, only from parts the player has. */
export function randomBuild(owns = () => true) {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const build = { paint: pick(PAINTS).hex };
  for (const category of CATEGORIES) {
    const choices = category.parts.filter((part) => owns(category.id, part.id)).map((part) => part.id);
    if (category.optional) choices.push(null);
    build[category.id] = choices.length ? pick(choices) : null;
  }
  return build;
}
