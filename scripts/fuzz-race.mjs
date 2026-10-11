// Tries to break a race. Where `npm run simulate` asks whether sensible
// drivers get round, this puts a driver who does anything at all in the
// player's seat and checks, sixty times a second, that nothing impossible
// has happened:
//
//   - every number describing a car is a real number
//   - no car is through the wall at the edge of the road, or inside the
//     island where the road is divided
//   - places are 1 to 4 with no ties
//   - the rivals keep making progress whatever the player does
//   - nothing throws
//
//   npm run fuzz            every track, a few minutes of driving on each
//   npm run fuzz -- 40      more races per track
//
// The player's drivers: a toddler (random stabs at the controls), one who
// reverses the wrong way round the lap, one who parks across the road in the
// awkward places (the nose of an island, a ramp, the landmark), and one who
// drives properly but never stops firing.
import { DIFFICULTIES } from '../src/race/grid.js';
import { createSession } from '../src/race/session.js';
import { createTrack } from '../src/race/track.js';
import { TRACKS } from '../src/race/tracks/index.js';
import { seeded } from '../src/race/world.js';

const RACES = Number(process.argv[2]) || 12;
const STEP = 1 / 60;
const SECONDS = 150;
const ATTACKS = [{ type: 'shot', shot: 'shell' }, { type: 'melee', reach: 3.4 }, { type: 'shot', shot: 'bolt' }];
const problems = new Map();

const note = (theme, text) => {
  const key = `${theme.name}: ${text}`;
  problems.set(key, (problems.get(key) || 0) + 1);
};

/** The player's drivers. Each returns an input for this tick. */
const DRIVERS = {
  toddler(random) {
    let input = { steer: 0, throttle: 1, brake: 0, fire: false };
    let until = 0;
    return (time) => {
      if (time >= until) {
        until = time + 0.15 + random() * 1.6;
        const mood = random();
        input = {
          steer: mood < 0.2 ? 0 : (random() * 2 - 1) * (random() < 0.5 ? 1 : 0.4),
          throttle: mood < 0.75 ? 1 : 0,
          brake: mood > 0.88 ? 1 : 0,
          fire: random() < 0.3,
        };
      }
      return input;
    };
  },
  backwards(random) {
    return (time) => ({ steer: Math.sin(time * 0.7) * (0.3 + random() * 0.2), throttle: 0, brake: 1, fire: false });
  },
  parker() {
    return () => ({ steer: 0, throttle: 0, brake: 0, fire: false });
  },
  gunner() {
    return null; // the computer drives; see below
  },
};

function check(theme, session, memo) {
  const track = session.track;
  const places = new Set();
  for (const racer of session.racers) {
    const car = racer.car;
    for (const field of ['x', 'z', 'heading', 'vx', 'vz', 'speed', 'steer', 'offset', 'along', 'y', 'slope', 'lift', 'twirl']) {
      if (!Number.isFinite(car[field])) note(theme, `car.${field} is ${car[field]}`);
    }
    if (!Number.isInteger(car.index) || car.index < 0 || car.index >= track.count) note(theme, `car.index is ${car.index}`);
    if (!Number.isFinite(racer.progress)) note(theme, `progress is ${racer.progress}`);
    places.add(racer.place);

    if (!car.flight) {
      const edge = track.edgeAt(car.index, Math.sign(car.offset) || 1);
      // Cars bumping each other are pushed apart after the walls are
      // applied, so allow a car's width of overlap for a tick.
      if (Math.abs(car.offset) > edge + 2.8) note(theme, 'a car is through the wall');
      const island = track.dividerAt(car.index + car.along / track.spacing);
      if (island > 1 && Math.abs(car.offset) < island - 1.2) note(theme, 'a car is inside an island');
    }
  }
  if (places.size !== session.racers.length) note(theme, 'two cars share a place');

  for (const item of session.events?.items ?? []) {
    if (!Number.isFinite(item.x) || !Number.isFinite(item.z) || !Number.isFinite(item.y ?? 0)) note(theme, `a ${item.kind} is nowhere`);
  }

  // The golden things are on the road, where a car can reach them, and
  // the player never holds the same one twice.
  for (const item of session.gold?.items ?? []) {
    if (![item.x, item.z, item.y].every(Number.isFinite)) note(theme, `a golden ${item.kind} is nowhere`);
    if (Math.abs(item.offset) > track.edgeAt(item.index, Math.sign(item.offset) || 1) - 1) note(theme, `a golden ${item.kind} is off the tarmac`);
    if (track.dividerAt(item.index) > 0 && Math.abs(item.offset) < track.dividerAt(item.index) + 1.5) note(theme, `a golden ${item.kind} is in an island`);
  }
  const golds = session.player?.golds ?? [];
  if (new Set(golds).size !== golds.length || golds.some((place) => !session.gold.items[place]?.taken)) note(theme, 'the golden things were miscounted');

  // The villain leaves little behind him, and never a mess.
  const slicks = session.villain?.slicks ?? [];
  if (slicks.length > 2) note(theme, `${slicks.length} of the villain's slicks at once`);
  for (const slick of slicks) {
    if (![slick.x, slick.z, slick.y].every(Number.isFinite)) note(theme, 'a slick is nowhere');
  }

  // Rivals must not get stuck: each should cover ground in any half minute
  // it is free to move, however the player is behaving.
  if (session.phase === 'racing' && session.time - memo.at >= 30) {
    session.racers.forEach((racer, i) => {
      if (racer.isPlayer || racer.finished) return;
      if (racer.progress - memo.progress[i] < 60) note(theme, 'a rival made no progress for 30 seconds');
    });
    memo.at = session.time;
    memo.progress = session.racers.map((racer) => racer.progress);
  }
}

/** Awkward places to park, as sample indices: island noses, ramps, the landmark, the first bend. */
function awkwardSpots(track, session) {
  const spots = [];
  for (const section of track.sections) {
    spots.push([section.from + 2, 0], [section.from + 8, 1.5], [section.from + Math.round(section.length / 2), -9], [section.from + section.length - 3, 0]);
  }
  const site = session.feature?.site;
  if (site) spots.push([site.from + 4, 0], [site.index, 6]);
  spots.push([40, -10], [Math.round(track.count / 2), 12]);
  return spots;
}

let races = 0;
for (const theme of TRACKS) {
  const track = createTrack(theme.layout);
  for (let race = 0; race < RACES; race++) {
    const random = seeded(7000 + race * 31);
    const level = DIFFICULTIES[race % DIFFICULTIES.length];
    const kind = Object.keys(DRIVERS)[race % Object.keys(DRIVERS).length];
    const drive = DRIVERS[kind](seeded(90 + race));
    races++;
    try {
      const session = createSession({
        track,
        surface: theme.surface,
        hazard: theme.hazard,
        feature: theme.feature,
        laps: 2,
        rules: level,
        random,
        drivers: [
          ...level.rivals.map((rival, i) => ({ ...rival, name: `Rival ${i + 1}`, attack: i === 0 ? null : ATTACKS[i], villain: i === 0 })),
          { name: kind, isPlayer: true, lane: 0, pace: 1, attack: ATTACKS[race % 3], auto: !drive },
        ],
      });
      if (kind === 'parker') {
        const spots = awkwardSpots(track, session);
        const [index, offset] = spots[Math.floor(race / 4) % spots.length];
        const at = track.pointAt(index, offset);
        // Sideways across the road.
        Object.assign(session.player.car, { x: at.x, z: at.z, heading: at.heading + Math.PI / 2, index: track.wrap(index) });
      }
      const memo = { at: 0, progress: session.racers.map(() => 0) };
      for (let elapsed = 0; elapsed < SECONDS; elapsed += STEP) {
        const input = drive ? drive(session.time) : { steer: 0, throttle: 0, brake: 0, fire: true };
        session.update(STEP, input);
        check(theme, session, memo);
        if (session.racers.every((racer) => racer.finished)) break;
      }
    } catch (error) {
      note(theme, `${kind} on ${level.name}: ${error.stack.split('\n').slice(0, 3).join(' | ')}`);
    }
  }
}

if (problems.size) {
  console.error(`${problems.size} kinds of problem in ${races} races:`);
  for (const [text, count] of problems) console.error(`  ${text} (${count} times)`);
  process.exit(1);
}
console.log(`${races} races with a driver doing anything at all: nothing impossible happened.`);
