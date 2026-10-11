import { autopilot, collide, createCar, EFFECTS, locate, speedLimits, stepCar, stepFlight } from './car.js';
import { createCombat } from './combat.js';
import { createEvents } from './events.js';
import { createFeature } from './features.js';
import { createGold } from './gold.js';
import { createHazard } from './hazards.js';
import { SECTORS } from './track.js';

// The rules of a race, with no rendering: grid, countdown, laps, positions
// and the finish. It can be run headless (scripts/simulate-race.mjs does),
// which is how the driving and the rivals are tuned.
//
// Race type "circuit": everyone starts together and the first to complete
// the laps wins. Other race types will be added alongside this one.

const STEP = 1 / 60;
const COUNTDOWN = 3;

export { SECTORS };

// Rivals have clumsy moments: every so often one takes its foot off and
// drifts off line for a second or so. Seconds between them, and how long.
const LAPSE_EVERY = [5, 11];
const LAPSE_LASTS = [0.7, 1.5];

// The villain (a driver with `villain: true`: see grid.js) drives like any
// other rival, with four differences, all aimed at the player and all mild:
//
//   He blocks.  Just ahead of the player, he drifts over to whichever part
//               of the road the player is on. He only looks in his mirror
//               now and then, so a change of side gets past him.
//   He lurks.   He waits for the player sooner than the others do, and
//               tries a little harder to catch up, so he is usually nearby.
//   He drips.   Now and then, when he is ahead, he leaves a small slick
//               behind him. It only ever catches the player, for half as
//               long as a proper oil patch, and it is gone after one car.
//   He tires.   On the last stretch of the last lap he eases off, so a
//               player who has kept up gets to go past him at the end.
const VILLAIN = {
  blocks: [2, 30], // metres ahead of the player, from and to, in which he blocks
  mirror: 1.1, // seconds between looks in his mirror
  cover: 0.8, // how much of the player's side of the road he moves over
  waits: 0.55, // share of the usual distance at which he starts to wait
  chase: 1.1, // most extra pace when he is the one behind
  tires: [0.62, 0.9], // from this far round the last lap, he manages this share of his pace
  drips: [8, 42], // metres ahead of the player, from and to, in which he may drip
  every: [9, 15], // seconds between slicks
  lasts: 9, // seconds a slick stays on the road
  reach: 2.3, // metres from the car's centre at which a slick is hit
  slip: 0.5, // share of a proper oil patch's time
};

/** Seconds one of the villain's slicks stays on the road. */
export const SLICK_LASTS = VILLAIN.lasts;

// How the rivals treat the player when no difficulty is given: as on Easy.
const KIND = { wait: 80, floor: 0.25, catchUp: 1.05, trigger: 0.2 };

/**
 * drivers: [{ name, isPlayer, lane, pace, weave, clumsy, attack }] in grid order (first = pole).
 * surface: { grip, offroad } from the track theme.
 * hazard:  the track's own hazard, by name (see hazards.js), if it has one.
 * feature: the track's landmark, by name (see features.js), if it has one.
 * rules:   how the rivals behave toward the player (see grid.js DIFFICULTIES):
 *          { wait, floor, catchUp, trigger }.
 * random:  source of randomness; pass a seeded one for repeatable races.
 * events:  false to race on an empty road with no hazard.
 * assist:  how much steering help the player gets (see ASSIST in car.js): 0 to 1.
 * gold:    which of the track's golden things the player already has (see gold.js).
 */
export function createSession({ track, surface, hazard, feature, laps = 3, drivers, rules = KIND, random = Math.random, events = true, assist = 1, gold = [] }) {
  const limits = speedLimits(track, surface);
  const between = ([low, high]) => low + (high - low) * random();

  // Two-by-two grid behind the line.
  const racers = drivers.map((driver, slot) => {
    const row = Math.floor(slot / 2);
    const car = createCar(track, -(3 + row * 4), slot % 2 ? 6.5 : -6.5);
    return {
      ...driver,
      car,
      lap: -1, // becomes 0 on first crossing the line
      progress: 0, // metres raced, for ordering
      finished: false,
      finishTime: 0,
      place: slot + 1,
      sector: SECTORS - 1, // which quarter of the lap it is in: 0 to SECTORS - 1
      lastEvent: null, // { kind, at } of the latest track event to hit this racer
      hits: 0, // rivals knocked with a weapon
      bags: 0, // coin bags collected

      // The rival's state of mind, for the computer driver.
      phase: random() * 6,
      lapse: null,
      nextLapse: between(LAPSE_EVERY),
    };
  });
  const cars = racers.map((racer) => racer.car);
  const player = racers.find((racer) => racer.isPlayer) || null;

  // Things going off, for the scene to draw: [{ x, z, kind, at }].
  const bangs = [];
  const bang = (x, z, kind) => {
    const where = track.project(x, z);
    bangs.push({ x, z, y: track.heightAt(where.index, where.offset), kind, at: session.time });
    if (bangs.length > 12) bangs.shift();
  };

  // The landmark comes first: everything else keeps clear of it.
  const setPiece = events && feature ? createFeature(feature, track, random, bang) : null;
  const keepOut = setPiece ? [{ from: setPiece.site.from - 4, to: setPiece.site.to + 4 }] : [];

  // Then the golden things, which are always in the same places.
  const golden = events ? createGold(track, gold, keepOut) : null;
  if (golden) for (const item of golden.items) keepOut.push({ from: item.index - 2, to: item.index + 2 });

  const baron = racers.find((racer) => racer.villain) || null;

  const session = {
    track,
    laps,
    racers,
    player,
    bangs,
    feature: setPiece,
    gold: golden,
    // What the villain has left on the road: [{ x, y, z, heading, level, at }].
    // `dropped` counts them, for anything that wants to know of a new one.
    villain: baron ? { racer: baron, slicks: [], dropped: 0, next: between(VILLAIN.every) } : null,
    events: events ? createEvents(track, random, bang, keepOut) : null,
    hazard: setPiece && hazard ? createHazard(hazard, track, random, bang, setPiece.site.zone) : null,
    combat: createCombat(track, random, bang, rules.trigger),
    phase: 'countdown', // 'countdown' | 'racing' | 'finished' (the player is home)
    countdown: COUNTDOWN,
    time: 0,
    update,
  };

  let carry = 0;
  let playerInput = { steer: 0, throttle: 0, brake: 0 };

  /** Advances the race. `input` is the player's { steer, throttle, brake, fire }. */
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
        // `auto` puts the computer in the player's seat (simulations, and the
        // pictures of each track).
        const human = racer.isPlayer && !racer.finished && !racer.auto;
        // A person gets a little steering help; the computer needs none.
        stepCar(car, human ? playerInput : drive(racer), dt, track, surface, human ? assist : 0);
      }
      countLap(racer, previous);
    }

    collide(cars);
    session.feature?.update(dt, session.time, racers);
    for (const racer of racers) {
      if (!racer.car.flight) locate(racer.car, track);
    }

    session.events?.update(dt, session.time, racers);
    session.hazard?.update(dt, session.time, racers);
    session.gold?.update(session.time, racers, bang);
    if (session.villain) drip(session.villain);
    session.combat.update(dt, session.time, racers, Boolean(playerInput.fire));

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

  /** The villain's slicks: laid behind him, and hit by the player. */
  function drip(villain) {
    const now = session.time;
    const slicks = villain.slicks;
    while (slicks.length && now - slicks[0].at > VILLAIN.lasts) slicks.shift();
    if (!player || player === villain.racer) return;

    const his = villain.racer.car;
    const lead = villain.racer.progress - player.progress;
    const [from, to] = VILLAIN.drips;
    if (now >= villain.next && lead > from && lead < to && !villain.racer.finished && !player.finished && !his.flight && his.effects.frozen <= 0 && events) {
      villain.next = now + between(VILLAIN.every);
      villain.dropped++;
      slicks.push({ x: his.x, z: his.z, y: track.heightAt(his.index, his.offset), heading: his.heading, level: !track.sectionAt(his.index), at: now });
    }

    const car = player.car;
    if (car.flight || car.effects.slip > 0) return;
    const hit = slicks.findIndex((slick) => now - slick.at > 0.5 && Math.hypot(car.x - slick.x, car.z - slick.z) < VILLAIN.reach);
    if (hit < 0) return;
    slicks.splice(hit, 1);
    car.effects.slip = EFFECTS.slip.time * VILLAIN.slip;
    player.lastEvent = { kind: 'slick', at: now };
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
    // together. They slow down far more readily than they speed up; how
    // readily depends on the difficulty.
    let pace = racer.pace ?? 0.8;
    let lane = racer.lane ?? 0;
    let weave = racer.weave ?? 0;
    if (player && !racer.isPlayer) {
      const lead = racer.progress - player.progress; // metres ahead of the player
      if (racer.villain) {
        pace *= lead > 0 ? Math.max(rules.floor, 1 - lead / (rules.wait * VILLAIN.waits)) : Math.min(VILLAIN.chase, 1 - lead / 500);
        // Running out of puff as the flag comes into view.
        const [from, share] = VILLAIN.tires;
        // (Less so the harder the level: on Hard he barely fades at all.)
        if (racer.lap === laps - 1 && racer.car.index > track.count * from) pace *= 1 - (1 - share) * Math.min(1, (1 - rules.floor) / 0.75);
        // In the way: he looks back now and then, and moves over.
        const [near, far] = VILLAIN.blocks;
        if (lead > near && lead < far && !player.finished) {
          if (session.time >= (racer.looksAt ?? 0)) {
            racer.looksAt = session.time + VILLAIN.mirror;
            racer.covering = player.car.offset * VILLAIN.cover;
          }
          lane = racer.covering ?? lane;
          weave = 0;
        } else {
          racer.covering = null;
        }
      } else {
        pace *= lead > 0 ? Math.max(rules.floor, 1 - lead / rules.wait) : Math.min(rules.catchUp, 1 - lead / 3000);
      }
    }

    return autopilot(
      racer.car,
      { lane, pace, weave, phase: racer.phase, lapse: racer.lapse },
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

    // Checkpoints: note when a racer moves on into the next sector.
    // Which sector it is in: how many checkpoints it is past this lap.
    let sector = 0;
    for (const checkpoint of track.checkpoints) if (now >= checkpoint) sector++;
    if (sector !== racer.sector) {
      const forward = sector === (racer.sector + 1) % SECTORS;
      racer.sector = sector;
      if (forward && racer.lap >= 0 && sector > 0) racer.lastEvent = { kind: 'checkpoint', at: session.time, sector };
    }

    if (!racer.finished && racer.lap >= laps) {
      racer.finished = true;
      racer.finishTime = session.time;
      if (racer.isPlayer) session.phase = 'finished';
    }
  }

  return session;
}
