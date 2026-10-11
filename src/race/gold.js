// Golden things: three on every track, always in the same places, for the
// player to find. Each can be picked up once, ever. They are what premium
// parts are bought with (parts/catalog.js), so there are exactly as many in
// the game as there are to spend.
//
// This file decides where they are and when one is picked up. Which ones a
// player already has is kept in their profile (profile.js); drawing is in
// scene.js and props.js.

export const GOLD_KINDS = ['star', 'spanner', 'crown'];
export const GOLD_NAMES = { star: 'Golden star', spanner: 'Golden spanner', crown: 'Golden crown' };

// Where round the lap each one sits (0..1), and which side of the road:
// out toward the kerb, so that it takes a little steering to fetch.
const SPOTS = [
  [0.27, 1],
  [0.52, -1],
  [0.79, 1],
];
const REACH = 3.0; // metres from the car's centre

/**
 * found:   which of this track's three the player already has ([bool, bool, bool]).
 * keepOut: [{ from, to }] stretches of the lap, in samples, to stay out of.
 */
export function createGold(track, found = [], keepOut = []) {
  const inside = (index, range) => track.wrap(index - range.from + 5) < track.wrap(range.to - range.from) + 10;
  const items = SPOTS.map(([share, side], i) => {
    let index = Math.round(track.count * share);
    for (let step = 0; step < track.count && keepOut.some((range) => inside(index, range)); step++) index = track.wrap(index + 1);
    // Two and a half metres in from the kerb, and clear of any island.
    const edge = Math.min(track.halfWidth, track.edgeAt(index, side)) - 2.5;
    const offset = side * Math.max(edge, Math.min(track.halfWidth - 1.5, track.dividerAt(index) + 2.8));
    const at = track.pointAt(index, offset);
    return {
      kind: GOLD_KINDS[i],
      index,
      offset,
      x: at.x,
      z: at.z,
      y: track.heightAt(index, offset),
      heading: at.heading,
      level: !track.sectionAt(index), // on the ground, rather than on a built stretch of road
      found: Boolean(found[i]), // had it before this race: not there to pick up
      taken: false, // picked up in this race
    };
  });

  /** Lets the player pick up whatever they are driving over. */
  function update(time, racers, bang = () => {}) {
    for (const racer of racers) {
      if (!racer.isPlayer || racer.car.flight) continue;
      items.forEach((item, i) => {
        if (item.found || item.taken || Math.hypot(racer.car.x - item.x, racer.car.z - item.z) > REACH) return;
        item.taken = true;
        racer.golds = [...(racer.golds ?? []), i];
        racer.lastEvent = { kind: 'gold', at: time, gold: item.kind };
        bang(item.x, item.z, 'gold');
      });
    }
  }

  return { items, update };
}
