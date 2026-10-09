import { EFFECTS, knock } from './car.js';

// Each track has one hazard of its own, named in its theme as `hazard`:
//
//   'mummy'      Pyramid Desert. Now and then a mummy climbs out of the road
//                ahead of a car and takes a swing at whatever is in reach.
//   'lightning'  Electric Swamp. Bolts strike the road here and there; a
//                glowing ring shows where a moment before.
//   'storm'      Snowy Mountains. A snowstorm sweeps across and pushes every
//                car sideways for a few seconds.
//
// All of them give warning, so a player who is paying attention can dodge.
// Like everything else in the race, this file is rules only; scene.js draws.

const between = (random, [low, high]) => low + (high - low) * random();
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** A spot on the road where `racer` will be in about `seconds`, if it carries on. */
function ahead(track, racer, seconds, sideways = 0) {
  const car = racer.car;
  const metres = Math.max(8, car.speed * seconds + 4);
  const room = track.halfWidth - 1.5;
  return track.pointAt(car.index + metres / track.spacing, clamp(car.offset + sideways, -room, room));
}

function pickRacer(random, racers) {
  const running = racers.filter((racer) => !racer.finished && !racer.car.flight);
  return running.length ? running[Math.floor(random() * running.length)] : null;
}

// ---------- Mummy ----------

const MUMMY = {
  every: [14, 26], // seconds between appearances: not a common sight
  rise: 0.9, // climbing out, which is the warning
  swing: 0.35, // the moment it can hit
  sink: 0.9,
  reach: 3.3,
};

function createMummy(track, random, bang) {
  const state = { kind: 'mummy', active: false, x: 0, z: 0, heading: 0, age: 0, timings: MUMMY };
  let wait = between(random, [8, 14]);

  state.update = (dt, time, racers) => {
    if (!state.active) {
      wait -= dt;
      if (wait > 0) return;
      const target = pickRacer(random, racers);
      if (!target) return;
      const spot = ahead(track, target, MUMMY.rise + 0.15);
      // It faces back up the road, toward the car coming at it.
      Object.assign(state, { active: true, x: spot.x, z: spot.z, heading: spot.heading + Math.PI, age: 0 });
      return;
    }

    state.age += dt;
    if (state.age >= MUMMY.rise && state.age < MUMMY.rise + MUMMY.swing) {
      for (const racer of racers) {
        const car = racer.car;
        if (Math.hypot(car.x - state.x, car.z - state.z) > MUMMY.reach) continue;
        if (!knock(car)) continue;
        racer.lastEvent = { kind: 'mummy', at: time };
        bang(car.x, car.z, 'dust');
      }
    }
    if (state.age >= MUMMY.rise + MUMMY.swing + MUMMY.sink) {
      state.active = false;
      wait = between(random, MUMMY.every);
    }
  };
  return state;
}

// ---------- Lightning ----------

const LIGHTNING = {
  every: [4, 9],
  warning: 1.0, // the ring on the road
  flash: 0.3, // how long the bolt stays visible
  reach: 3.4,
  scatter: 4, // metres either side of where the car is heading
};

function createLightning(track, random, bang) {
  const state = { kind: 'lightning', strikes: [], timings: LIGHTNING };
  let wait = between(random, [5, 8]);

  state.update = (dt, time, racers) => {
    wait -= dt;
    if (wait <= 0) {
      wait = between(random, LIGHTNING.every);
      const target = pickRacer(random, racers);
      if (target) {
        const spot = ahead(track, target, LIGHTNING.warning, (random() * 2 - 1) * LIGHTNING.scatter);
        state.strikes.push({ x: spot.x, z: spot.z, age: 0, struck: false, seed: random() * 100 });
      }
    }

    for (const strike of state.strikes) {
      strike.age += dt;
      if (strike.struck || strike.age < LIGHTNING.warning) continue;
      strike.struck = true;
      bang(strike.x, strike.z, 'spark');
      for (const racer of racers) {
        const car = racer.car;
        if (Math.hypot(car.x - strike.x, car.z - strike.z) > LIGHTNING.reach) continue;
        if (knock(car, EFFECTS.zap.time)) racer.lastEvent = { kind: 'zap', at: time };
      }
    }
    state.strikes = state.strikes.filter((strike) => strike.age < LIGHTNING.warning + LIGHTNING.flash);
  };
  return state;
}

// ---------- Snowstorm ----------

const STORM = {
  every: [13, 22],
  lasts: 4.5,
  ramp: 0.8, // seconds to build up and to die away
  push: 11, // sideways acceleration at full strength, m/s2
};

function createStorm(track, random) {
  // `strength` runs 0..1 and is also what the scene uses to thicken the air.
  const state = { kind: 'storm', strength: 0, windX: 1, windZ: 0, timings: STORM };
  let wait = between(random, [9, 14]);
  let left = 0;

  state.update = (dt, time, racers) => {
    if (left <= 0) {
      state.strength = Math.max(0, state.strength - dt / STORM.ramp);
      wait -= dt;
      if (wait <= 0) {
        // Blow across the road where the player is (or the first racer),
        // from one side or the other, so it is a crosswind for them.
        const subject = racers.find((racer) => racer.isPlayer) || racers[0];
        const i = subject.car.index;
        const side = random() < 0.5 ? 1 : -1;
        state.windX = -track.tz[i] * side;
        state.windZ = track.tx[i] * side;
        left = STORM.lasts;
        wait = between(random, STORM.every);
        for (const racer of racers) racer.lastEvent = { kind: 'storm', at: time };
      }
    } else {
      left -= dt;
      state.strength = Math.min(1, state.strength + dt / STORM.ramp);
    }

    for (const racer of racers) {
      racer.car.push[0] = state.windX * STORM.push * state.strength;
      racer.car.push[1] = state.windZ * STORM.push * state.strength;
    }
  };
  return state;
}

/** `bang(x, z, kind)` is called when something goes off, for the scene to draw. */
export function createHazard(kind, track, random, bang = () => {}) {
  if (kind === 'mummy') return createMummy(track, random, bang);
  if (kind === 'lightning') return createLightning(track, random, bang);
  if (kind === 'storm') return createStorm(track, random);
  return null;
}
