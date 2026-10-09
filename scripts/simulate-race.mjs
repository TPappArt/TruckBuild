// Runs a full race on every track with computer drivers only and no graphics,
// then reports how it went. Use it after changing the driving model, the
// rivals or a track layout, to check that every car still gets round cleanly.
//
//   npm run simulate
import { createSession } from '../src/race/session.js';
import { createTrack } from '../src/race/track.js';
import { TRACKS } from '../src/race/tracks/index.js';

const LAPS = 3;
const TIME_LIMIT = 600;
const STEP = 1 / 60;
let failed = false;

for (const theme of TRACKS) {
  const track = createTrack(theme.layout);
  const tightest = 1 / Math.max(...Array.from(track.curvature, Math.abs));
  const session = createSession({
    track,
    surface: theme.surface,
    laps: LAPS,
    drivers: [
      { name: 'A', lane: -2.5, pace: 0.98 },
      { name: 'B', lane: 2.5, pace: 0.96 },
      { name: 'C', lane: -1, pace: 0.94 },
      { name: 'D', lane: 1, pace: 0.92 },
    ],
  });

  const stats = new Map(session.racers.map((racer) => [racer, { wall: 0, rough: 0, top: 0 }]));
  let elapsed = 0;
  while (elapsed < TIME_LIMIT && !session.racers.every((racer) => racer.finished)) {
    session.update(STEP);
    elapsed += STEP;
    for (const racer of session.racers) {
      if (racer.finished) continue;
      const s = stats.get(racer);
      if (racer.car.hitWall) s.wall += STEP;
      if (!racer.car.onRoad) s.rough += STEP;
      s.top = Math.max(s.top, racer.car.speed);
    }
  }

  console.log(`\n${theme.name}: ${track.length.toFixed(0)} m, tightest corner ${tightest.toFixed(1)} m radius`);
  for (const racer of [...session.racers].sort((a, b) => a.place - b.place)) {
    const s = stats.get(racer);
    const time = racer.finished ? `${racer.finishTime.toFixed(1)} s` : 'DID NOT FINISH';
    if (!racer.finished) failed = true;
    console.log(
      `  ${racer.place}. ${racer.name}  ${time.padEnd(14)} top ${s.top.toFixed(1)} m/s, ` +
        `off road ${s.rough.toFixed(1)} s, on the wall ${s.wall.toFixed(1)} s`,
    );
  }
}

if (failed) {
  console.error('\nAt least one car did not finish.');
  process.exit(1);
}
