import { cleanName, findCharacter } from './characters.js';
import { findPart, partKey, priceOf, sanitizeBuild, STARTER_PARTS } from './parts/catalog.js';
import { findDifficulty } from './race/grid.js';
import { WINS_TO_UNLOCK } from './race/rewards.js';
import { TRACKS } from './race/tracks/index.js';

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

export function loadProfile() {
  const saved = read(KEY) || {};
  const profile = {
    // No character yet means the player has not been through the
    // character screen, which is how a first visit is recognised.
    character: saved.character ? findCharacter(saved.character).id : null,
    name: saved.character ? cleanName(saved.name) : '',
    coins: Math.max(0, Math.floor(Number(saved.coins) || 0)),
    owned: [...new Set([...STARTER_PARTS, ...(Array.isArray(saved.owned) ? saved.owned : [])])],
    tracks: [TRACKS[0].id, ...(Array.isArray(saved.tracks) ? saved.tracks : [])].filter((id, i, list) => list.indexOf(id) === i && TRACKS.some((theme) => theme.id === id)),
    wins: { ...(saved.wins || {}) },
    difficulty: findDifficulty(saved.difficulty).id,
    build: null,
  };
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
  if (!part || owns(profile, categoryId, partId) || profile.coins < priceOf(part)) return false;
  profile.coins -= priceOf(part);
  profile.owned.push(partKey(categoryId, partId));
  return true;
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
  profile.coins += coins;
  if (place !== 1) return null;
  profile.wins[theme.id] = (profile.wins[theme.id] || 0) + 1;
  const next = TRACKS[TRACKS.indexOf(theme) + 1];
  if (!next || trackOpen(profile, next) || profile.wins[theme.id] < WINS_TO_UNLOCK) return null;
  profile.tracks.push(next.id);
  return next;
}
