import { EFFECTS, knock, TUNING } from './car.js';

// Each track has one set piece, named in its theme as `feature`:
//
//   'pyramid'    Pyramid Desert. The road runs straight through a pyramid.
//                Inside, stone pillars rise out of the floor without much
//                warning and stop anything that runs into them.
//   'arcs'       Electric Swamp. Three gantries in a row, each with a
//                curtain of electricity over one half of the road. The live
//                half swaps sides every couple of seconds.
//   'snowballs'  Snowy Mountains. Giant snowballs roll across the road
//                along three marked lanes.
//
// Where a set piece goes is worked out from the track here, so the rules,
// the scenery (world.js) and the drawing (scene.js) all agree.

const between = (random, [low, high]) => low + (high - low) * random();

// Where around the lap each set piece sits (0..1) and how long it is.
const PLACES = {
  pyramid: { around: 0.79, metres: 76 },
  arcs: { around: 0.33, metres: 80 },
  snowballs: { around: 0.84, metres: 70 },
};

/** Where a track's set piece goes: track.site() plus { kind, metres }. Null if it has none. */
export function featureSite(kind, track) {
  const place = PLACES[kind];
  if (!place) return null;
  return { kind, metres: place.metres, ...track.site(place.around, place.metres) };
}

// ---------- Pyramid ----------

export const PYRAMID = {
  // Pillars, as [metres right of the centre line of the hall, metres along it].
  pillars: [[-13, -27], [9, -20], [-3, -11], [15, -3], [-15, 5], [4, 12], [-8, 21], [12, 27]],
  radius: 1.7,
  height: 4.6,
  warn: 0.9, // the floor glows before a pillar comes up
  rise: 0.25,
  stay: [1.6, 2.6],
  sink: 0.5,
  rest: [1.5, 5], // seconds a pillar stays down
};

function createPyramid(site, track, random) {
  const fx = Math.sin(site.heading);
  const fz = Math.cos(site.heading);
  const pillars = PYRAMID.pillars.map(([across, along]) => ({
    x: site.x - fz * across + fx * along,
    z: site.z + fx * across + fz * along,
    phase: 'down', // 'down' | 'warn' | 'up' | 'sink'
    timer: between(random, [0.5, 5]),
    height: 0, // 0 flush with the floor, 1 fully up
  }));
  const state = { kind: 'pyramid', site, pillars };

  state.update = (dt, time, racers) => {
    for (const pillar of pillars) {
      pillar.timer -= dt;
      if (pillar.phase === 'down') {
        if (pillar.timer <= 0) Object.assign(pillar, { phase: 'warn', timer: PYRAMID.warn });
      } else if (pillar.phase === 'warn') {
        if (pillar.timer <= 0) Object.assign(pillar, { phase: 'up', timer: between(random, PYRAMID.stay) });
      } else if (pillar.phase === 'up') {
        pillar.height = Math.min(1, pillar.height + dt / PYRAMID.rise);
        if (pillar.timer <= 0) pillar.phase = 'sink';
      } else {
        pillar.height = Math.max(0, pillar.height - dt / PYRAMID.sink);
        if (pillar.height === 0) Object.assign(pillar, { phase: 'down', timer: between(random, PYRAMID.rest) });
      }
      if (pillar.height < 0.3) continue;

      // A raised pillar is solid: cars are pushed back out and lose the
      // speed they were carrying into it.
      const reach = PYRAMID.radius + TUNING.radius;
      for (const racer of racers) {
        const car = racer.car;
        if (car.flight) continue;
        const dx = car.x - pillar.x;
        const dz = car.z - pillar.z;
        const distance = Math.hypot(dx, dz);
        if (distance >= reach) continue;
        const nx = distance > 0.01 ? dx / distance : fx;
        const nz = distance > 0.01 ? dz / distance : fz;
        car.x = pillar.x + nx * reach;
        car.z = pillar.z + nz * reach;
        const inward = car.vx * nx + car.vz * nz;
        if (inward < 0) {
          car.vx -= nx * inward * 1.3;
          car.vz -= nz * inward * 1.3;
          if (inward < -6) racer.lastEvent = { kind: 'pillar', at: time };
        }
      }
    }
  };
  return state;
}

// ---------- Arc gates ----------

export const ARCS = {
  gates: [-16, 0, 16], // samples either side of the middle of the site
  live: 2.0, // seconds one half stays live
  swap: 0.7, // dead time between, while the other half flickers as a warning
};

function createArcs(site, track, random, bang) {
  const gates = ARCS.gates.map((step, i) => {
    const index = track.wrap(site.index + step);
    const at = track.pointAt(index, 0);
    return {
      index,
      x: at.x,
      z: at.z,
      heading: at.heading,
      side: i % 2 ? 1 : -1, // which half is live, or about to be: +1 right, -1 left
      live: true,
      timer: ARCS.live * (0.4 + 0.3 * i),
      before: new Map(), // where each racer was relative to the gate last tick
    };
  });
  const state = { kind: 'arcs', site, gates };

  state.update = (dt, time, racers) => {
    for (const gate of gates) {
      gate.timer -= dt;
      if (gate.timer <= 0) {
        if (gate.live) {
          Object.assign(gate, { live: false, side: -gate.side, timer: ARCS.swap });
        } else {
          Object.assign(gate, { live: true, timer: ARCS.live });
        }
      }

      for (const racer of racers) {
        const car = racer.car;
        // Signed distance past the gate, in samples.
        const n = track.count;
        const past = track.wrap(car.index - gate.index + n / 2) - n / 2 + car.along / track.spacing;
        const was = gate.before.get(racer);
        gate.before.set(racer, past);
        if (was === undefined || was >= 0 || past < 0 || past - was > 6 || car.flight) continue;
        // Crossed the line this tick. On the live half, that hurts.
        if (!gate.live || car.offset * gate.side <= 0.4) continue;
        if (knock(car, EFFECTS.zap.time)) {
          racer.lastEvent = { kind: 'zap', at: time };
          bang(car.x, car.z, 'spark');
        }
      }
    }
  };
  return state;
}

// ---------- Snowballs ----------

export const SNOWBALLS = {
  lanes: [-13, 0, 13], // samples either side of the middle of the site
  radius: 2.7,
  speed: 13, // m/s
  wait: [1.2, 3.4], // seconds between one ball and the next in a lane
};

function createSnowballs(site, track, random, bang) {
  const edge = track.limit + 7; // balls start and finish out of sight in the banks
  const lanes = SNOWBALLS.lanes.map((step, i) => {
    const index = track.wrap(site.index + step);
    return {
      index,
      heading: track.pointAt(index, 0).heading,
      direction: i % 2 ? 1 : -1, // +1 rolls left to right
      across: 0, // metres right of the centre line
      rolling: false,
      timer: between(random, [0.3, 2.5]),
      x: 0,
      z: 0,
      turned: 0, // how far it has rolled, for drawing, in radians
    };
  });
  const state = { kind: 'snowballs', site, lanes, edge };

  state.update = (dt, time, racers) => {
    for (const lane of lanes) {
      if (!lane.rolling) {
        lane.timer -= dt;
        if (lane.timer > 0) continue;
        lane.rolling = true;
        lane.across = -lane.direction * edge;
      }
      lane.across += lane.direction * SNOWBALLS.speed * dt;
      lane.turned += (SNOWBALLS.speed * dt) / SNOWBALLS.radius;
      const at = track.pointAt(lane.index, lane.across);
      lane.x = at.x;
      lane.z = at.z;
      if (Math.abs(lane.across) > edge) {
        lane.rolling = false;
        lane.direction = -lane.direction;
        lane.timer = between(random, SNOWBALLS.wait);
        continue;
      }

      for (const racer of racers) {
        const car = racer.car;
        if (Math.hypot(car.x - lane.x, car.z - lane.z) > SNOWBALLS.radius + 1.1) continue;
        if (!knock(car)) continue;
        racer.lastEvent = { kind: 'snowball', at: time };
        bang(car.x, car.z, 'snow');
      }
    }
  };
  return state;
}

/** `bang(x, z, kind)` is called when something goes off, for the scene to draw. */
export function createFeature(kind, track, random, bang = () => {}) {
  const site = featureSite(kind, track);
  if (!site) return null;
  if (kind === 'pyramid') return createPyramid(site, track, random);
  if (kind === 'arcs') return createArcs(site, track, random, bang);
  return createSnowballs(site, track, random, bang);
}
