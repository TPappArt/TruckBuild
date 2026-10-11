// Runs races on every track at every difficulty with no graphics and
// reports how they went. Use it after changing the driving model, the
// rivals, the track events, a landmark or a layout, to check that every car
// still gets round and that the difficulty levels are what they claim.
//
//   npm run simulate            every track, every difficulty
//   npm run simulate -- easy    one difficulty
//
// The grid is the game's three rivals plus stand-ins for the player. Two
// are tried: a tidy driver (never clumsy, full pace) and a sloppy one
// (three quarters pace, clumsy), which is nearer a young child. Races are
// seeded, so the same code always gives the same result.
import { DIFFICULTIES } from '../src/race/grid.js';
import { createSession } from '../src/race/session.js';
import { createTrack } from '../src/race/track.js';
import { TRACKS } from '../src/race/tracks/index.js';
import { seeded } from '../src/race/world.js';

const ATTACKS = [{ type: 'shot', shot: 'shell' }, { type: 'melee', reach: 3.4 }, null];
const STAND_INS = [
  { name: 'tidy', lane: 0, pace: 1, clumsy: 0 },
  { name: 'sloppy', lane: 2, pace: 0.78, weave: 5, clumsy: 1.2 },
];
const LAPS = 2;
const RACES = 6;
const TIME_LIMIT = 900;
const STEP = 1 / 60;
const only = process.argv[2];
let failed = false;

for (const level of DIFFICULTIES) {
  if (only && only !== level.id) continue;
  console.log(`\n=== ${level.name} ===`);
  for (const theme of TRACKS) {
    const track = createTrack(theme.layout);
    const line = [`${theme.name.padEnd(16)} ${track.length.toFixed(0)} m`];

    for (const standIn of STAND_INS) {
      let wins = 0;
      let places = 0;
      let time = 0;
      let events = 0;
      let unfinished = 0;
      for (let race = 0; race < RACES; race++) {
        const session = createSession({
          track,
          surface: theme.surface,
          hazard: theme.hazard,
          feature: theme.feature,
          laps: LAPS,
          rules: level,
          random: seeded(100 + race),
          drivers: [
            // One of each kind of weapon, so both get exercised.
            // The first is the villain (grid.js), who blocks and drips.
            ...level.rivals.map((rival, i) => ({ ...rival, name: `Rival ${i + 1}`, attack: i === 0 ? null : ATTACKS[i], villain: i === 0 })),
            // Marked as the player, so the rivals treat it as one, but
            // driven by the computer: the session only hands the wheel to
            // a human when it is given input.
            { ...standIn, isPlayer: true, attack: null, auto: true },
          ],
        });
        const player = session.player;
        let seen = null;
        let elapsed = 0;
        while (elapsed < TIME_LIMIT && !session.racers.every((racer) => racer.finished)) {
          session.update(STEP);
          elapsed += STEP;
          if (player.lastEvent && player.lastEvent !== seen && player.lastEvent.kind !== 'checkpoint') {
            seen = player.lastEvent;
            events++;
          }
        }
        for (const racer of session.racers) {
          if (!racer.finished) {
            unfinished++;
            failed = true;
          }
        }
        if (player.place === 1) wins++;
        places += player.place;
        time += player.finishTime;
      }
      line.push(
        `${standIn.name}: won ${wins}/${RACES}, average place ${(places / RACES).toFixed(1)}, ${(time / RACES).toFixed(0)} s, ${(events / RACES).toFixed(0)} events` +
          (unfinished ? `, ${unfinished} DID NOT FINISH` : ''),
      );
    }
    console.log(`  ${line.join('   ')}`);
  }
}

if (failed) {
  console.error('\nAt least one car did not finish.');
  process.exit(1);
}
