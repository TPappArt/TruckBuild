import { autopilot, collide, createCar, locate, speedLimits, stepCar, stepFlight } from './car.js';
import { createEvents } from './events.js';

// The rules of a race, with no rendering: grid, countdown, laps, positions
// and the finish. It can be run headless (scripts/simulate-race.mjs does),
// which is how the driving and the rivals are tuned.
//
// Race type "circuit": everyone starts together and the first to complete
// the laps wins. Other race types will be added alongside this one.

const STEP = 1 / 60;
const COUNTDOWN = 3;

// Rivals have clumsy moments: every so often one takes its foot off and
// drifts off line for a second or so. Seconds between them, and how long.
const LAPSE_EVERY = [5, 11];
const LAPSE_LASTS = [0.7, 1.5];

/**
 * drivers: [{ name, isPlayer, lane, pace, weave, clumsy }] in grid order (first = pole).
 * surface: { grip, offroad } from the track theme.
 * random:  source of randomness; pass a seeded one for repeatable races.
 * events:  false to race on an empty road.
 */
export function createSession({ track, surface, laps = 3, drivers, random = Math.random, events = true }) {
  const limits = speedLimits(track, surface);
  const between = ([low, high]) => low + (high - low) * random();

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
      lastEvent: null, // { kind, at } of the latest track event to hit this racer

      // The rival's state of mind, for the computer driver.
      phase: random() * 6,
      lapse: null,
      nextLapse: between(LAPSE_EVERY),
    };
  });
  const cars = racers.map((racer) => racer.car);
  const player = racers.find((racer) => racer.isPlayer) || null;

  const session = {
    track,
    laps,
    racers,
    player,
    events: events ? createEvents(track, random) : null,
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
      const car = racer.car;
      const previous = car.index;
      if (car.flight) {
        stepFlight(car, dt, track);
      } else {
        const human = racer.isPlayer && !racer.finished;
        stepCar(car, human ? playerInput : drive(racer), dt, track, surface);
      }
      countLap(racer, previous);
    }

    collide(cars);
    for (const racer of racers) {
      if (!racer.car.flight) locate(racer.car, track);
    }

    session.events?.update(dt, session.time, racers);

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

  /** Decides what a computer-driven racer does this tick. */
  function drive(racer) {
    // Clumsy moments come and go. A racer with clumsy = 0 never has one.
    const clumsy = racer.clumsy ?? 0;
    if (racer.lapse && session.time >= racer.lapse.until) {
      racer.lapse = null;
      racer.nextLapse = session.time + between(LAPSE_EVERY) / Math.max(clumsy, 0.01);
    } else if (!racer.lapse && clumsy > 0 && session.time >= racer.nextLapse) {
      racer.lapse = {
        until: session.time + between(LAPSE_LASTS),
        steer: (random() < 0.5 ? -1 : 1) * (0.35 + random() * 0.5),
      };
    }

    // Rivals wait for a player who has fallen behind, and find a little
    // more speed when they are the ones trailing, so the pack stays
    // together. They slow down far more readily than they speed up.
    let pace = racer.pace ?? 0.8;
    if (player && !racer.isPlayer) {
      const lead = racer.progress - player.progress; // metres ahead of the player
      pace *= lead > 0 ? Math.max(0.25, 1 - lead / 80) : Math.min(1.05, 1 - lead / 3000);
    }

    return autopilot(
      racer.car,
      { lane: racer.lane ?? 0, pace, weave: racer.weave ?? 0, phase: racer.phase, lapse: racer.lapse },
      track,
      limits,
      cars,
      session.time,
    );
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
