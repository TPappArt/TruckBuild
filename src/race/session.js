import { autopilot, collide, createCar, locate, speedLimits, stepCar } from './car.js';

// The rules of a race, with no rendering: grid, countdown, laps, positions
// and the finish. It can be run headless (scripts/simulate-race.mjs does),
// which is how the driving and the rivals are tuned.
//
// Race type "circuit": everyone starts together and the first to complete
// the laps wins. Other race types will be added alongside this one.

const STEP = 1 / 60;
const COUNTDOWN = 3;

/**
 * drivers: [{ name, isPlayer, lane, pace }] in grid order (first = pole).
 * surface: { grip, offroad } from the track theme.
 */
export function createSession({ track, surface, laps = 3, drivers }) {
  const limits = speedLimits(track, surface);

  // Two-by-two grid behind the line.
  const racers = drivers.map((driver, slot) => {
    const row = Math.floor(slot / 2);
    const car = createCar(track, -(3 + row * 4), slot % 2 ? 3.2 : -3.2);
    return {
      ...driver,
      car,
      lap: -1, // becomes 0 on first crossing the line
      progress: 0, // metres raced, for ordering
      finished: false,
      finishTime: 0,
      place: slot + 1,
    };
  });
  const cars = racers.map((racer) => racer.car);
  const player = racers.find((racer) => racer.isPlayer) || null;

  const session = {
    track,
    laps,
    racers,
    player,
    phase: 'countdown', // 'countdown' | 'racing' | 'finished' (the player is home)
    countdown: COUNTDOWN,
    time: 0,
    update,
  };

  let carry = 0;
  let playerInput = { steer: 0, throttle: 0, brake: 0 };

  /** Advances the race. `input` is the player's { steer, throttle, brake }. */
  function update(dt, input) {
    if (input) playerInput = input;
    carry += dt;
    while (carry >= STEP) {
      carry -= STEP;
      tick(STEP);
    }
  }

  function tick(dt) {
    if (session.phase === 'countdown') {
      session.countdown -= dt;
      if (session.countdown <= 0) session.phase = 'racing';
      return;
    }
    session.time += dt;

    for (const racer of racers) {
      const previous = racer.car.index;
      let input;
      if (racer.isPlayer && !racer.finished) {
        input = playerInput;
      } else {
        // Rivals ease off when far ahead of the player and push when behind,
        // to keep the pack within sight of each other.
        let pace = racer.pace ?? 0.95;
        if (player && !racer.isPlayer) {
          const gap = racer.progress - player.progress;
          pace *= Math.min(1.05, Math.max(0.93, 1 - gap / 900));
        }
        input = autopilot(racer.car, { lane: racer.lane ?? 0, pace }, track, limits, cars);
      }
      stepCar(racer.car, input, dt, track, surface);
      countLap(racer, previous);
    }

    collide(cars);
    for (const racer of racers) locate(racer.car, track);

    // Places: finishers in finishing order, then everyone else by distance.
    const order = [...racers].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.finishTime - b.finishTime;
      return b.progress - a.progress;
    });
    order.forEach((racer, i) => {
      racer.place = i + 1;
    });
  }

  function countLap(racer, previous) {
    const n = track.count;
    const now = racer.car.index;
    // The sample index wraps at the line: a big jump down is a lap completed,
    // a big jump up is the line crossed backwards.
    if (previous > n * 0.75 && now < n * 0.25) racer.lap++;
    else if (previous < n * 0.25 && now > n * 0.75) racer.lap--;
    racer.progress = (racer.lap * n + now) * track.spacing + racer.car.along;

    if (!racer.finished && racer.lap >= laps) {
      racer.finished = true;
      racer.finishTime = session.time;
      if (racer.isPlayer) session.phase = 'finished';
    }
  }

  return session;
}
