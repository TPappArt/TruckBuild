import { EFFECTS, knock } from './car.js';
import { inZone } from './features.js';

// Each track has one hazard of its own, named in its theme as `hazard`. It
// only happens at the track's landmark (features.js), so the rest of the lap
// is for racing and the landmark is the place to be careful:
//
//   'mummy'      Pyramid Desert. Mummies climb out of the floor of the
//                pyramid ahead of a car and take a swing at whatever is in
//                reach.
//   'lightning'  Electric Swamp. Bolts strike the bridge; a glowing ring
//                shows where a moment before.
//   'storm'      Snowy Mountains. Gusts of snow howl through the pass and
//                push cars sideways.
//   'werewolf'   Haunted Hollow. A werewolf bounds out of the graveyard and
//                across the road, flattening anything in its way.
//   'meteor'     Zombie City. Burning wreckage falls out of the sky onto
//                the street; a ring shows where it will land.
//
// All of them give warning, so a player who is paying attention can dodge.
// Like everything else in the race, this file is rules only; scene.js draws.

const between = (random, [low, high]) => low + (high - low) * random();
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** Tells a hazard who is at the landmark, and when each racer arrives there. */
function createWatch(track, zone) {
  const seen = new Map();
  return {
    inside: (racer) => !racer.finished && !racer.car.flight && inZone(track, zone, racer.car.index),
    /** Calls arrived(racer) once each time a racer drives into the zone. */
    check(racers, arrived) {
      for (const racer of racers) {
        const now = !racer.finished && inZone(track, zone, racer.car.index);
        if (now && !seen.get(racer)) arrived(racer);
        seen.set(racer, now);
      }
    },
  };
}

/** A spot on the road where `racer` will be in about `seconds`, kept inside the zone. */
function ahead(track, zone, racer, seconds, sideways = 0) {
  const car = racer.car;
  const metres = Math.max(8, car.speed * seconds + 4);
  const room = track.halfWidth - 1.5;
  const into = clamp(track.wrap(car.index - zone.from) + metres / track.spacing, 2, zone.length - 2);
  const index = track.wrap(zone.from + into);
  return { index, ...track.pointAt(index, clamp(car.offset + sideways, -room, room)) };
}

// ---------- Mummy ----------

const MUMMY = {
  chance: { player: 0.8, rival: 0.45 }, // of one coming for a car that drives in
  after: [0.1, 1.3], // seconds after the car arrives
  rise: 0.9, // climbing out, which is the warning
  swing: 0.35, // the moment it can hit
  sink: 0.9,
  reach: 3.3,
};

function createMummy(track, random, bang, zone) {
  const state = { kind: 'mummy', mummies: [], timings: MUMMY };
  const watch = createWatch(track, zone);
  const due = []; // [{ racer, timer }]

  state.update = (dt, time, racers) => {
    watch.check(racers, (racer) => {
      if (random() < (racer.isPlayer ? MUMMY.chance.player : MUMMY.chance.rival)) {
        due.push({ racer, timer: between(random, MUMMY.after) });
      }
    });
    for (let i = due.length - 1; i >= 0; i--) {
      due[i].timer -= dt;
      if (due[i].timer > 0) continue;
      const { racer } = due.splice(i, 1)[0];
      if (!watch.inside(racer)) continue;
      const spot = ahead(track, zone, racer, MUMMY.rise + 0.15);
      // It faces back up the road, toward the car coming at it.
      state.mummies.push({ x: spot.x, z: spot.z, heading: spot.heading + Math.PI, age: 0 });
    }

    for (const mummy of state.mummies) {
      mummy.age += dt;
      if (mummy.age < MUMMY.rise || mummy.age >= MUMMY.rise + MUMMY.swing) continue;
      for (const racer of racers) {
        const car = racer.car;
        if (Math.hypot(car.x - mummy.x, car.z - mummy.z) > MUMMY.reach) continue;
        if (!knock(car)) continue;
        racer.lastEvent = { kind: 'mummy', at: time };
        bang(car.x, car.z, 'dust');
      }
    }
    state.mummies = state.mummies.filter((mummy) => mummy.age < MUMMY.rise + MUMMY.swing + MUMMY.sink);
  };
  return state;
}

// ---------- Things that fall out of the sky: lightning and meteors ----------

const STRIKES = {
  lightning: {
    every: [0.8, 1.7], // seconds between strikes while someone is at the landmark
    warning: 1.0, // the ring on the road
    flash: 0.3, // how long the bolt stays visible
    reach: 3.4,
    scatter: 5, // metres either side of where the car is heading
    show: [1.2, 3.2], // seconds between harmless strikes beside the road, for show
    event: 'zap',
    knock: EFFECTS.zap.time,
    bang: 'spark',
  },
  meteor: {
    every: [0.9, 1.9],
    warning: 1.25,
    flash: 0.3,
    reach: 3.6,
    scatter: 5,
    show: [1.6, 3.8],
    event: 'meteor',
    knock: EFFECTS.stun.time,
    bang: 'blast',
  },
};

function createStrikes(kind, track, random, bang, zone) {
  const rules = STRIKES[kind];
  const state = { kind, strikes: [], timings: rules };
  const watch = createWatch(track, zone);
  let wait = 0.4;
  let show = 1;

  state.update = (dt, time, racers) => {
    const present = racers.filter(watch.inside);
    if (present.length) {
      wait -= dt;
      if (wait <= 0) {
        wait = between(random, rules.every);
        const target = present[Math.floor(random() * present.length)];
        const spot = ahead(track, zone, target, rules.warning, (random() * 2 - 1) * rules.scatter);
        state.strikes.push({ x: spot.x, z: spot.z, age: 0, struck: false, seed: random() * 100 });
      }
    } else {
      wait = Math.min(wait, 0.4);
    }

    // The landmark is never quiet: there is always something coming down
    // beside the road, where it can do no harm.
    show -= dt;
    if (show <= 0) {
      show = between(random, rules.show);
      const side = random() < 0.5 ? 1 : -1;
      const spot = track.pointAt(zone.from + random() * zone.length, side * (track.limit + 6 + random() * 26));
      state.strikes.push({ x: spot.x, z: spot.z, age: 0, struck: false, seed: random() * 100, harmless: true });
    }

    for (const strike of state.strikes) {
      strike.age += dt;
      if (strike.struck || strike.age < rules.warning) continue;
      strike.struck = true;
      if (strike.harmless) continue;
      bang(strike.x, strike.z, rules.bang);
      for (const racer of racers) {
        const car = racer.car;
        if (Math.hypot(car.x - strike.x, car.z - strike.z) > rules.reach) continue;
        if (knock(car, rules.knock)) racer.lastEvent = { kind: rules.event, at: time };
      }
    }
    state.strikes = state.strikes.filter((strike) => strike.age < rules.warning + rules.flash);
  };
  return state;
}

// ---------- Snowstorm ----------

const STORM = {
  lasts: 3.6, // seconds a gust blows
  lull: [2.2, 4.5], // and the calm before the next
  ramp: 0.7, // seconds to build up on a car, and to die away
  push: 11, // sideways acceleration at full strength, m/s2
};

function createStorm(track, random, bang, zone) {
  // `strength` runs 0..1 for the car the camera follows, and is what the
  // scene uses to thicken the air.
  const state = { kind: 'storm', strength: 0, windX: 1, windZ: 0, timings: STORM };
  const watch = createWatch(track, zone);
  const gusts = new Map(); // how hard it is blowing on each racer, 0..1
  let blowing = true;
  let side = random() < 0.5 ? 1 : -1;
  let timer = STORM.lasts;

  state.update = (dt, time, racers) => {
    timer -= dt;
    if (timer <= 0) {
      blowing = !blowing;
      timer = blowing ? STORM.lasts : between(random, STORM.lull);
      if (blowing) side = -side;
    }

    for (const racer of racers) {
      const car = racer.car;
      const before = gusts.get(racer) ?? 0;
      const caught = blowing && watch.inside(racer);
      const gust = clamp(before + (caught ? dt : -dt) / STORM.ramp, 0, 1);
      gusts.set(racer, gust);
      if (caught && before < 0.3 && gust >= 0.3) racer.lastEvent = { kind: 'storm', at: time };
      // Straight across the road, wherever on the pass the car is.
      car.push[0] = -track.tz[car.index] * side * STORM.push * gust;
      car.push[1] = track.tx[car.index] * side * STORM.push * gust;
    }

    const subject = racers.find((racer) => racer.isPlayer) || racers[0];
    state.strength = gusts.get(subject) ?? 0;
    state.windX = -track.tz[subject.car.index] * side;
    state.windZ = track.tx[subject.car.index] * side;
  };
  return state;
}

// ---------- Werewolf ----------

const WEREWOLF = {
  chance: { player: 0.85, rival: 0.45 },
  after: [0.2, 1.8],
  warn: 0.8, // crouched at the roadside, eyes glowing
  speed: 24, // m/s once it goes
  reach: 2.4,
};

function createWerewolf(track, random, bang, zone) {
  const state = { kind: 'werewolf', wolves: [], timings: WEREWOLF };
  const watch = createWatch(track, zone);
  const edge = track.limit + 4;
  const due = [];

  state.update = (dt, time, racers) => {
    watch.check(racers, (racer) => {
      if (random() < (racer.isPlayer ? WEREWOLF.chance.player : WEREWOLF.chance.rival)) {
        due.push({ racer, timer: between(random, WEREWOLF.after) });
      }
    });
    for (let i = due.length - 1; i >= 0; i--) {
      due[i].timer -= dt;
      if (due[i].timer > 0) continue;
      const { racer } = due.splice(i, 1)[0];
      // One werewolf at a time is plenty.
      if (!watch.inside(racer) || state.wolves.length) continue;
      // It crosses the road where the car will be by the time it gets there.
      const from = random() < 0.5 ? 1 : -1;
      const crossing = (edge - from * racer.car.offset) / WEREWOLF.speed;
      const spot = ahead(track, zone, racer, WEREWOLF.warn + crossing);
      state.wolves.push({ index: spot.index, from, across: from * edge, age: 0, x: 0, z: 0, heading: 0, running: false });
    }

    for (const wolf of state.wolves) {
      wolf.age += dt;
      wolf.running = wolf.age >= WEREWOLF.warn;
      if (wolf.running) wolf.across -= wolf.from * WEREWOLF.speed * dt;
      const at = track.pointAt(wolf.index, wolf.across);
      wolf.x = at.x;
      wolf.z = at.z;
      wolf.heading = at.heading - (wolf.from * Math.PI) / 2;
      if (!wolf.running) continue;
      for (const racer of racers) {
        const car = racer.car;
        if (Math.hypot(car.x - wolf.x, car.z - wolf.z) > WEREWOLF.reach) continue;
        if (!knock(car)) continue;
        racer.lastEvent = { kind: 'werewolf', at: time };
        bang(car.x, car.z, 'dust');
      }
    }
    state.wolves = state.wolves.filter((wolf) => wolf.across * wolf.from > -edge);
  };
  return state;
}

const BUILDERS = {
  mummy: createMummy,
  lightning: (...args) => createStrikes('lightning', ...args),
  meteor: (...args) => createStrikes('meteor', ...args),
  storm: createStorm,
  werewolf: createWerewolf,
};

/**
 * zone: where the hazard happens, { from, length } in samples (the track's
 *       landmark). Without one the track has no hazard.
 * `bang(x, z, kind)` is called when something goes off, for the scene to draw.
 */
export function createHazard(kind, track, random, bang = () => {}, zone = null) {
  if (!zone || !BUILDERS[kind]) return null;
  return BUILDERS[kind](track, random, bang, zone);
}
