import { EFFECTS, knock, launch } from './car.js';

// Things on the road that change a race:
//
//   Pickups    'boost'       speeds the car up for a few seconds. Boosts sit
//                            in rows across the road at fixed places, so
//                            everyone gets a shot at one each time round.
//              'slow'        slows it down for a few seconds
//              'freeze'      stops every other car dead for a few seconds.
//                            Only the player can pick it up: rivals drive
//                            straight through it.
//              'coins'       a bag of coins to spend in the garage. Rare,
//                            and also only for the player.
//   Hazards    'bomb'        tosses the car in the air; it loses its speed
//              'oil'         takes away grip and steering for a moment
//   Modifiers  'trampoline'  throws the car a long way down the track
//              strips        a stretch of one side of the road that speeds
//                            cars up, or slows them down, while they are on
//                            it. Each strip flips between the two now and
//                            then, so the fast line keeps changing.
//
// Apart from the boost rows, where everything goes is random each race.
// Random pickups and bombs vanish when hit and come back somewhere else;
// boosts come back where they were; oil moves on after a while.
//
// This file only decides what happens; drawing is in scene.js and props.js.

// Random items. More good things than bad overall, counting the boost rows.
const COUNTS = { slow: 3, bomb: 3, oil: 3, trampoline: 2, freeze: 2, coins: 1 };
const STRIPS = 2;

// Boost rows: where around the lap (0..1), and how many across the road.
const BOOST_ROWS = [0.13, 0.6];
const BOOSTS_PER_ROW = 5;

// How close a car's centre has to be to set each one off, in metres.
const REACH = { boost: 2.5, slow: 2.2, bomb: 2.0, oil: 2.6, trampoline: 2.6, freeze: 2.5, coins: 2.7 };

const RESPAWN = { boost: 4, slow: 5, bomb: 5, freeze: 12, coins: 24 }; // seconds before it reappears
const OIL_MOVES = [16, 28]; // seconds an oil patch stays put
const STRIP_FLIPS = [6, 12]; // seconds a strip stays fast or slow
const STRIP_LENGTH = 44; // metres

/**
 * keepOut: [{ from, to }] stretches of the lap, in samples, to leave empty
 *          (the track's set piece).
 * bang(x, z, kind) is called when something goes off, for the scene to draw.
 */
export function createEvents(track, random, bang = () => {}, keepOut = []) {
  const between = ([low, high]) => low + (high - low) * random();
  const items = [];
  const strips = [];

  // Stretches already spoken for. Everything placed adds itself here.
  const taken = keepOut.map((range) => ({ ...range }));
  const inside = (index, range, margin) => track.wrap(index - range.from + margin) < track.wrap(range.to - range.from) + margin * 2;
  const free = (index, margin = 5) => !taken.some((range) => inside(index, range, margin));
  /** The nearest free sample at or after `index`. */
  const nextFree = (index, length = 0) => {
    for (let step = 0; step < track.count; step++) {
      const from = track.wrap(index + step);
      if (free(from, 6) && free(from + length, 6)) return from;
    }
    return track.wrap(index);
  };

  // Boost rows: fixed places, the same every race.
  for (const share of BOOST_ROWS) {
    const index = nextFree(Math.round(track.count * share));
    taken.push({ from: index - 3, to: index + 3 });
    for (let i = 0; i < BOOSTS_PER_ROW; i++) {
      const offset = ((i / (BOOSTS_PER_ROW - 1)) * 2 - 1) * (track.halfWidth - 2.5);
      const at = track.pointAt(index, offset);
      items.push({ kind: 'boost', fixed: true, active: true, timer: 0, index, offset, x: at.x, z: at.z, heading: at.heading });
    }
  }

  // Strips: spread around the lap, on alternate sides.
  for (let i = 0; i < STRIPS; i++) {
    const length = Math.round(STRIP_LENGTH / track.spacing);
    const start = nextFree(Math.round(track.count * ((i + 0.5) / STRIPS + random() * 0.16 - 0.08)) + 30, length);
    const side = i % 2 ? 1 : -1;
    strips.push({
      start,
      length,
      from: side > 0 ? 0.7 : -(track.halfWidth - 1),
      to: side > 0 ? track.halfWidth - 1 : -0.7,
      fast: random() < 0.5,
      timer: between(STRIP_FLIPS),
    });
    taken.push({ from: start, to: start + length });
  }

  /** Finds a clear place on the road for a random item. */
  function findSpot(item) {
    for (let tries = 0; tries < 80; tries++) {
      const index = Math.floor(random() * track.count);
      // Not on the grid or just past the line, not somewhere spoken for,
      // and not on top of another item.
      if (index < 26 || index > track.count - 14) continue;
      if (!free(index)) continue;
      const crowded = items.some((other) => other !== item && Math.abs(track.wrap(other.index - index + 9) - 9) < 9);
      if (crowded) continue;
      const offset = (random() * 2 - 1) * (track.halfWidth - 2);
      const at = track.pointAt(index, offset);
      Object.assign(item, { index, offset, x: at.x, z: at.z, heading: at.heading });
      return;
    }
  }

  for (const [kind, count] of Object.entries(COUNTS)) {
    for (let i = 0; i < count; i++) {
      const item = { kind, active: true, timer: kind === 'oil' ? between(OIL_MOVES) : 0, index: 0, x: 0, z: 0 };
      findSpot(item);
      items.push(item);
    }
  }

  function take(item) {
    item.active = false;
    item.timer = RESPAWN[item.kind];
  }

  /** Applies events to every racer. `time` is the race clock. */
  function update(dt, time, racers) {
    for (const strip of strips) {
      strip.timer -= dt;
      if (strip.timer <= 0) {
        strip.fast = !strip.fast;
        strip.timer = between(STRIP_FLIPS);
      }
    }

    for (const item of items) {
      if (item.active && item.kind !== 'oil') continue;
      item.timer -= dt;
      if (item.timer > 0) continue;
      // Reappear (somewhere new, unless it has a fixed place), or in oil's
      // case seep away to somewhere else.
      if (!item.fixed) findSpot(item);
      item.active = true;
      if (item.kind === 'oil') item.timer = between(OIL_MOVES);
    }

    for (const racer of racers) {
      const car = racer.car;
      if (car.flight) {
        car.zone = 0;
        continue;
      }
      const note = (kind) => {
        racer.lastEvent = { kind, at: time };
      };

      let zone = 0;
      for (const strip of strips) {
        const along = track.wrap(car.index - strip.start);
        if (along < strip.length && car.offset > strip.from && car.offset < strip.to) zone = strip.fast ? 1 : -1;
      }
      if (zone !== 0 && zone !== car.zone) note(zone > 0 ? 'fast-strip' : 'slow-strip');
      car.zone = zone;

      for (const item of items) {
        if (!item.active) continue;
        if (Math.hypot(car.x - item.x, car.z - item.z) > REACH[item.kind]) continue;
        const effects = car.effects;

        if (item.kind === 'boost') {
          effects.boost = EFFECTS.boost.time;
          effects.slow = 0;
          take(item);
        } else if (item.kind === 'slow') {
          effects.slow = EFFECTS.slow.time;
          effects.boost = 0;
          take(item);
        } else if (item.kind === 'freeze') {
          if (!racer.isPlayer) continue;
          for (const other of racers) {
            if (other !== racer) other.car.effects.frozen = EFFECTS.freeze.time;
          }
          take(item);
        } else if (item.kind === 'coins') {
          if (!racer.isPlayer) continue;
          racer.bags = (racer.bags ?? 0) + 1;
          take(item);
        } else if (item.kind === 'bomb') {
          if (!knock(car)) continue; // still recovering from the last knock
          bang(item.x, item.z, 'blast');
          take(item);
        } else if (item.kind === 'oil') {
          if (effects.slip > 0) continue; // already sliding; no need to say so again
          effects.slip = EFFECTS.slip.time;
        } else if (item.kind === 'trampoline') {
          launch(car, track);
        }
        note(item.kind);
        if (car.flight) break;
      }
    }
  }

  return { items, strips, update };
}
