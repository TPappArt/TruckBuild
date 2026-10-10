// What a race pays, in coins. Coins buy parts and tracks (see profile.js).
//
// There are three ways to earn them: finishing well, landing hits on rivals
// with a weapon, and picking up the coin bag that turns up on the road now
// and then. Harder rivals multiply the lot.

export const REWARDS = {
  place: [60, 30, 15, 5], // first to fourth
  hit: 5,
  bag: 20,
};

/** How many first places on a track open the next one. */
export const WINS_TO_UNLOCK = 2;

/** Coins the player has picked up so far in a race, before the finishing bonus. */
export const coinsSoFar = (racer) => (racer.hits ?? 0) * REWARDS.hit + (racer.bags ?? 0) * REWARDS.bag;

/**
 * The player's takings for a finished race:
 * { place, hits, bags, bonus, total, lines: [{ label, coins }] }.
 */
export function raceRewards(session, difficulty) {
  const player = session.player;
  const place = REWARDS.place[player.place - 1] ?? 0;
  const hits = (player.hits ?? 0) * REWARDS.hit;
  const bags = (player.bags ?? 0) * REWARDS.bag;
  const base = place + hits + bags;
  const total = Math.round(base * difficulty.reward);
  const lines = [{ label: ['1st place', '2nd place', '3rd place', '4th place'][player.place - 1], coins: place }];
  if (player.hits) lines.push({ label: `${player.hits} ${player.hits === 1 ? 'hit' : 'hits'}`, coins: hits });
  if (player.bags) lines.push({ label: `${player.bags} coin ${player.bags === 1 ? 'bag' : 'bags'}`, coins: bags });
  if (total !== base) lines.push({ label: `${difficulty.name} bonus`, coins: total - base });
  return { place, hits, bags, bonus: total - base, total, lines };
}
