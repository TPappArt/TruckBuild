import { EFFECTS, launch } from './car.js';

// Random events on the track. Three families, two of each:
//
//   Pickups    'boost'       speeds the car up for a few seconds
//              'slow'        slows it down for a few seconds
//   Hazards    'bomb'        tosses the car in the air; it loses its speed
//              'oil'         takes away grip and steering for a moment
//   Modifiers  'trampoline'  throws the car a long way down the track
//              strips        a stretch of one side of the road that speeds
//                            cars up, or slows them down, while they are on
//                            it. Each strip flips between the two now and
//                            then, so the fast line keeps changing.
//
// Where everything goes is random each race. Pickups and bombs vanish when
// hit and come back somewhere else; oil moves on after a while.
//
// This file only decides what happens; drawing is in scene.js and props.js.

// More good things than bad: it is meant to be fun, not punishing.
const COUNTS = { boost: 6, slow: 2, bomb: 2, oil: 2, trampoline: 2 };
const STRIPS = 2;

// How close a car's centre has to be to set each one off, in metres.
const REACH = { boost: 2.3, slow: 2.2, bomb: 2.0, oil: 2.6, trampoline: 2.6 };

const RESPAWN = { boost: 3, slow: 5, bomb: 5 }; // seconds before it reappears elsewhere
const OIL_MOVES = [16, 28]; // seconds an oil patch stays put
const STRIP_FLIPS = [6, 12]; // seconds a strip stays fast or slow
const STRIP_LENGTH = 44; // metres

export function createEvents(track, random) {
  const between = ([low, high]) => low + (high - low) * random();
  const items = [];
  const strips = [];

  // Strips first, so items can keep clear of them.
  for (let i = 0; i < STRIPS; i++) {
    const length = Math.round(STRIP_LENGTH / track.spacing);
    // Spread around the lap, away from the start, on alternate sides.
    const start = track.wrap(Math.round(track.count * ((i + 0.5) / STRIPS + random() * 0.2 - 0.1)) + 30);
    const side = i % 2 ? 1 : -1;
    strips.push({
      start,
      length,
      from: side > 0 ? 0.7 : -(track.halfWidth - 1),
      to: side > 0 ? track.halfWidth - 1 : -0.7,
      fast: random() < 0.5,
      timer: between(STRIP_FLIPS),
    });
  }

  const onStrip = (index, margin = 0) =>
    strips.some((strip) => {
      const along = track.wrap(index - strip.start + margin);
      return along < strip.length + margin * 2;
    });

  /** Finds a clear place on the road for an item. */
  function findSpot(item) {
    for (let tries = 0; tries < 60; tries++) {
      const index = Math.floor(random() * track.count);
      // Not on the grid or just past the line, not on a strip, and not on
      // top of another item.
      if (index < 26 || index > track.count - 14) continue;
      if (onStrip(index, 4)) continue;
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
      const item = { kind, active: true, timer: kind === 'oil' ? between(OIL_MOVES) : 0, hitAt: -10, x: 0, z: 0 };
      findSpot(item);
      items.push(item);
    }
  }

  function take(item, time) {
    item.active = false;
    item.timer = RESPAWN[item.kind];
    item.hitAt = time;
    // Where it was hit, for the bang. The item itself is about to move.
    item.hitX = item.x;
    item.hitZ = item.z;
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
      // Reappear, or in oil's case seep away to somewhere new.
      findSpot(item);
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
          take(item, time);
        } else if (item.kind === 'slow') {
          effects.slow = EFFECTS.slow.time;
          effects.boost = 0;
          take(item, time);
        } else if (item.kind === 'bomb') {
          effects.stun = EFFECTS.stun.time;
          effects.boost = 0;
          take(item, time);
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
