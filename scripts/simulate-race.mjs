// Runs races on every track with no graphics and reports how they went.
// Use it after changing the driving model, the rivals, the track events or a
// layout, to check that every car still gets round.
//
//   npm run simulate
//
// The grid is the game's three rivals plus a stand-in for the player: a
// driver with no clumsy moments at full pace. Races are seeded, so the same
// code always gives the same result.
import { RIVALS } from '../src/race/grid.js';
import { createSession } from '../src/race/session.js';
import { createTrack } from '../src/race/track.js';
import { TRACKS } from '../src/race/tracks/index.js';
import { seeded } from '../src/race/world.js';

const LAPS = 3;
const RACES = 5;
const TIME_LIMIT = 900;
const STEP = 1 / 60;
let failed = false;

for (const theme of TRACKS) {
  const track = createTrack(theme.layout);
  const tightest = 1 / Math.max(...Array.from(track.curvature, Math.abs));
  console.log(`\n${theme.name}: ${track.length.toFixed(0)} m, tightest corner ${tightest.toFixed(1)} m radius`);

  const totals = new Map();
  for (let race = 0; race < RACES; race++) {
    const session = createSession({
      track,
      surface: theme.surface,
      laps: LAPS,
      random: seeded(100 + race),
      drivers: [
        ...RIVALS.map((rival, i) => ({ ...rival, name: `Rival ${i + 1}` })),
        { name: 'Stand-in player', lane: 0, pace: 1, isPlayer: false },
      ],
    });

    const seen = new Map(session.racers.map((racer) => [racer, null]));
    let elapsed = 0;
    while (elapsed < TIME_LIMIT && !session.racers.every((racer) => racer.finished)) {
      session.update(STEP);
      elapsed += STEP;
      for (const racer of session.racers) {
        const total = totals.get(racer.name) || { time: 0, wins: 0, wall: 0, rough: 0, events: 0, unfinished: 0 };
        totals.set(racer.name, total);
        if (racer.finished) continue;
        if (racer.car.hitWall) total.wall += STEP;
        if (!racer.car.onRoad) total.rough += STEP;
        if (racer.lastEvent && racer.lastEvent !== seen.get(racer)) {
          seen.set(racer, racer.lastEvent);
          total.events++;
        }
      }
    }
    for (const racer of session.racers) {
      const total = totals.get(racer.name);
      if (!racer.finished) {
        total.unfinished++;
        failed = true;
      } else {
        total.time += racer.finishTime;
      }
      if (racer.place === 1) total.wins++;
    }
  }

  for (const [name, total] of totals) {
    const finished = RACES - total.unfinished;
    console.log(
      `  ${name.padEnd(16)} wins ${total.wins}/${RACES}, average ${(total.time / Math.max(1, finished)).toFixed(0)} s, ` +
        `per race: off road ${(total.rough / RACES).toFixed(0)} s, on the wall ${(total.wall / RACES).toFixed(0)} s, ` +
        `${(total.events / RACES).toFixed(0)} events${total.unfinished ? `, DID NOT FINISH ${total.unfinished}` : ''}`,
    );
  }
}

if (failed) {
  console.error('\nAt least one car did not finish.');
  process.exit(1);
}
