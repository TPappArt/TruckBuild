import { cleanName, findCharacter } from './characters.js';
import { CATEGORIES, findPart, goldPriceOf, isPremium, partKey, priceOf, sanitizeBuild, STARTER_PARTS } from './parts/catalog.js';
import { GOLD_KINDS } from './race/gold.js';
import { findDifficulty } from './race/grid.js';
import { WINS_TO_UNLOCK } from './race/rewards.js';
import { TRACKS } from './race/tracks/index.js';
import { cleanSettings } from './settings.js';

// Everything the game remembers about a player between visits: who they
// are, their coins, what they own, which tracks are open and their current
// build. It is kept in the browser's local storage, which can be missing
// (private windows, blocked site data); then the game just starts fresh
// each time.

const KEY = 'profile';
const OLD_BUILD_KEY = 'garage.build';

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

const MOST_COINS = 999999;

export function loadProfile() {
  // Whatever is in storage is treated as possibly rubbish: a half-written
  // save, something from an older version, or a curious child with the
  // browser's tools open.
  const found = read(KEY);
  const saved = found && typeof found === 'object' && !Array.isArray(found) ? found : {};
  const wins = {};
  if (saved.wins && typeof saved.wins === 'object') {
    for (const theme of TRACKS) {
      const count = Math.floor(Number(saved.wins[theme.id]) || 0);
      if (count > 0) wins[theme.id] = Math.min(count, MOST_COINS);
    }
  }
  // Golden things found, three to a track (race/gold.js).
  const gold = {};
  if (saved.gold && typeof saved.gold === 'object') {
    for (const theme of TRACKS) {
      const found = saved.gold[theme.id];
      if (Array.isArray(found) && found.some(Boolean)) gold[theme.id] = GOLD_KINDS.map((kind, i) => Boolean(found[i]));
    }
  }
  const profile = {
    // No character yet means the player has not been through the
    // character screen, which is how a first visit is recognised.
    character: saved.character ? findCharacter(saved.character).id : null,
    name: saved.character ? cleanName(saved.name) : '',
    coins: Math.min(MOST_COINS, Math.max(0, Math.floor(Number(saved.coins) || 0))),
    owned: [...new Set([...STARTER_PARTS, ...(Array.isArray(saved.owned) ? saved.owned.filter((key) => typeof key === 'string') : [])])],
    tracks: [TRACKS[0].id, ...(Array.isArray(saved.tracks) ? saved.tracks : [])].filter((id, i, list) => list.indexOf(id) === i && TRACKS.some((theme) => theme.id === id)),
    wins,
    gold,
    difficulty: findDifficulty(saved.difficulty).id,
    settings: cleanSettings(saved.settings),
    build: null,
  };
  // Premium parts are paid for in golden things: nobody keeps more of them
  // than they have found the gold for, cheapest first.
  let left = goldFound(profile);
  const premium = (key) => {
    const [categoryId, partId] = key.split('/');
    const part = findPart(categoryId, partId);
    return part && isPremium(part) ? part : null;
  };
  const paidFor = new Set(
    profile.owned
      .filter(premium)
      .sort((a, b) => goldPriceOf(premium(a)) - goldPriceOf(premium(b)))
      .filter((key) => (left -= goldPriceOf(premium(key))) >= 0),
  );
  profile.owned = profile.owned.filter((key) => !premium(key) || paidFor.has(key));
  profile.build = sanitizeBuild(saved.build || read(OLD_BUILD_KEY), (category, part) => owns(profile, category, part));
  return profile;
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Not saved; nothing else to do.
  }
}

// ---------- Parts ----------

export const owns = (profile, categoryId, partId) => partId === null || profile.owned.includes(partKey(categoryId, partId));

/** Buys a part if the player can afford it. Returns whether it was bought. */
export function buyPart(profile, categoryId, partId) {
  const part = findPart(categoryId, partId);
  if (!part || owns(profile, categoryId, partId) || profile.coins < priceOf(part) || goldLeft(profile) < goldPriceOf(part)) return false;
  // (A premium part costs golden things, which are never taken away: what
  // has been spent is worked out from what is owned.)
  profile.coins -= priceOf(part);
  profile.owned.push(partKey(categoryId, partId));
  return true;
}

// ---------- Golden things ----------

/** Which of a track's three golden things the player has: [bool, bool, bool]. */
export const goldOn = (profile, theme) => profile.gold[theme.id] ?? GOLD_KINDS.map(() => false);

/** How many golden things the player has found, on every track together. */
export const goldFound = (profile) => Object.values(profile.gold).reduce((sum, found) => sum + found.filter(Boolean).length, 0);

/** How many of them are still to spend. */
export function goldLeft(profile) {
  let spent = 0;
  for (const category of CATEGORIES) {
    for (const part of category.parts) {
      if (isPremium(part) && profile.owned.includes(partKey(category.id, part.id))) spent += goldPriceOf(part);
    }
  }
  return goldFound(profile) - spent;
}

/**
 * Records golden things picked up on a track (their places among its
 * three: 0, 1, 2). Returns how many of them were new.
 */
export function recordGold(profile, theme, places) {
  const found = [...goldOn(profile, theme)];
  let fresh = 0;
  for (const place of places) {
    if (place >= 0 && place < found.length && !found[place]) {
      found[place] = true;
      fresh++;
    }
  }
  if (fresh) profile.gold[theme.id] = found;
  return fresh;
}

// ---------- Tracks ----------

export const trackOpen = (profile, theme) => profile.tracks.includes(theme.id);

/**
 * What stands between the player and a locked track:
 * { before, winsLeft, price, affordable }, where `before` is the track that
 * has to be won to open it.
 */
export function trackLock(profile, theme) {
  const before = TRACKS[TRACKS.indexOf(theme) - 1] || null;
  const won = before ? profile.wins[before.id] || 0 : 0;
  return { before, winsLeft: Math.max(0, WINS_TO_UNLOCK - won), price: theme.price, affordable: profile.coins >= theme.price };
}

export function buyTrack(profile, theme) {
  if (trackOpen(profile, theme) || profile.coins < theme.price) return false;
  profile.coins -= theme.price;
  profile.tracks.push(theme.id);
  return true;
}

/**
 * Records the result of a race: coins earned, and the win if it was one.
 * Returns the track this opened, if any.
 */
export function recordRace(profile, theme, place, coins) {
  profile.coins = Math.min(MOST_COINS, profile.coins + coins);
  if (place !== 1) return null;
  profile.wins[theme.id] = (profile.wins[theme.id] || 0) + 1;
  const next = TRACKS[TRACKS.indexOf(theme) + 1];
  if (!next || trackOpen(profile, next) || profile.wins[theme.id] < WINS_TO_UNLOCK) return null;
  profile.tracks.push(next.id);
  return next;
}
