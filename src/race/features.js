import { EFFECTS, knock, TUNING } from './car.js';

// Every track has one landmark: a stretch of road that looks like nowhere
// else on the lap and is the dangerous part of it. The track's traps live
// here, named in its theme as `feature`:
//
//   'pyramid'    Pyramid Desert. The road runs straight through a pyramid.
//                Inside, stone pillars rise out of the floor without much
//                warning and stop anything that runs into them.
//   'bridge'     Electric Swamp. A long bridge over a glowing lake, with
//                three towers that each hang a curtain of electricity over
//                one half of the deck. The live half swaps sides every
//                couple of seconds.
//   'pass'       Snowy Mountains. A gorge between two cliffs. Giant
//                snowballs roll out of the cliffs and across the road.
//   'graveyard'  Haunted Hollow. The road cuts through the graveyard of the
//                old manor. Skeletons climb out of graves in the road.
//   'street'     Zombie City. A ruined street full of wandering zombies.
//                Running one down sends it flying, but gums up the car.
//
// The track's hazard (hazards.js) happens here too, and nowhere else.
//
// Where a landmark goes is worked out from the track here, so the rules,
// the scenery (world.js) and the drawing (scene.js) all agree.

const between = (random, [low, high]) => low + (high - low) * random();

// Where around the lap each landmark sits (0..1), how long it is, and how
// far before it the track's hazard starts taking an interest, in metres.
// Each is clear of the checkpoints, which are at the quarters of the lap.
// The pyramid needs a straight: its hall does not bend with the road.
const PLACES = {
  pyramid: { around: 0.835, metres: 76, lead: 34 },
  bridge: { around: 0.345, metres: 124, lead: 6 },
  pass: { around: 0.84, metres: 104, lead: 6 },
  graveyard: { around: 0.585, metres: 112, lead: 6 },
  street: { around: 0.65, metres: 124, lead: 6 },
};

/**
 * Where a track's landmark goes: track.site() plus { kind, metres, zone }.
 * `zone` is the stretch the hazard works in: { from, length } in samples.
 * Null if the track has no landmark.
 */
export function featureSite(kind, track) {
  const place = PLACES[kind];
  if (!place) return null;
  const site = track.site(place.around, place.metres);
  const lead = Math.round(place.lead / track.spacing);
  const from = track.wrap(site.from - lead);
  return { kind, metres: place.metres, ...site, zone: { from, length: track.wrap(site.to - from) } };
}

/** True if a sample index is inside a zone. */
export const inZone = (track, zone, index) => track.wrap(index - zone.from) <= zone.length;

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

// ---------- Bridge: arc gates ----------

export const BRIDGE = {
  gates: [-21, 0, 21], // samples either side of the middle of the site
  live: 2.0, // seconds one half stays live
  swap: 0.7, // dead time between, while the other half flickers as a warning
};

function createBridge(site, track, random, bang) {
  const gates = BRIDGE.gates.map((step, i) => {
    const index = track.wrap(site.index + step);
    const at = track.pointAt(index, 0);
    return {
      index,
      x: at.x,
      z: at.z,
      heading: at.heading,
      side: i % 2 ? 1 : -1, // which half is live, or about to be: +1 right, -1 left
      live: true,
      timer: BRIDGE.live * (0.4 + 0.3 * i),
      before: new Map(), // where each racer was relative to the gate last tick
    };
  });
  const state = { kind: 'bridge', site, gates };

  state.update = (dt, time, racers) => {
    for (const gate of gates) {
      gate.timer -= dt;
      if (gate.timer <= 0) {
        if (gate.live) {
          Object.assign(gate, { live: false, side: -gate.side, timer: BRIDGE.swap });
        } else {
          Object.assign(gate, { live: true, timer: BRIDGE.live });
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

// ---------- Pass: snowballs ----------

export const PASS = {
  lanes: [-17, 0, 17], // samples either side of the middle of the site
  radius: 2.7,
  speed: 13, // m/s
  wait: [1.2, 3.4], // seconds between one ball and the next in a lane
};

function createPass(site, track, random, bang) {
  const edge = track.limit + 7; // balls start and finish out of sight in the cliffs
  const lanes = PASS.lanes.map((step, i) => {
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
  const state = { kind: 'pass', site, lanes, edge };

  state.update = (dt, time, racers) => {
    for (const lane of lanes) {
      if (!lane.rolling) {
        lane.timer -= dt;
        if (lane.timer > 0) continue;
        lane.rolling = true;
        lane.across = -lane.direction * edge;
      }
      lane.across += lane.direction * PASS.speed * dt;
      lane.turned += (PASS.speed * dt) / PASS.radius;
      const at = track.pointAt(lane.index, lane.across);
      lane.x = at.x;
      lane.z = at.z;
      if (Math.abs(lane.across) > edge) {
        lane.rolling = false;
        lane.direction = -lane.direction;
        lane.timer = between(random, PASS.wait);
        continue;
      }

      for (const racer of racers) {
        const car = racer.car;
        if (Math.hypot(car.x - lane.x, car.z - lane.z) > PASS.radius + 1.1) continue;
        if (!knock(car)) continue;
        racer.lastEvent = { kind: 'snowball', at: time };
        bang(car.x, car.z, 'snow');
      }
    }
  };
  return state;
}

// ---------- Graveyard: skeletons ----------

export const GRAVEYARD = {
  // Graves in the road, as [metres right of the centre line, samples from the middle of the site].
  graves: [[-11, -24], [6, -19], [-3, -13], [12, -7], [-12, -1], [2, 5], [-7, 11], [10, 17], [-1, 23]],
  reach: 2.1, // metres from a standing skeleton that it can clout a car
  warn: 0.9, // the grave glows before anything comes out of it
  rise: 0.3,
  stay: [1.8, 3.0],
  sink: 0.4,
  rest: [1.4, 4.5], // seconds a grave stays quiet
};

function createGraveyard(site, track, random, bang) {
  const graves = GRAVEYARD.graves.map(([across, step]) => {
    const at = track.pointAt(site.index + step, across);
    return {
      x: at.x,
      z: at.z,
      heading: at.heading + Math.PI, // facing the traffic
      phase: 'down', // 'down' | 'warn' | 'up' | 'sink'
      timer: between(random, [0.3, 4]),
      height: 0, // 0 buried, 1 standing
    };
  });
  const state = { kind: 'graveyard', site, graves };

  state.update = (dt, time, racers) => {
    for (const grave of graves) {
      grave.timer -= dt;
      if (grave.phase === 'down') {
        if (grave.timer <= 0) Object.assign(grave, { phase: 'warn', timer: GRAVEYARD.warn });
      } else if (grave.phase === 'warn') {
        if (grave.timer <= 0) Object.assign(grave, { phase: 'up', timer: between(random, GRAVEYARD.stay) });
      } else if (grave.phase === 'up') {
        grave.height = Math.min(1, grave.height + dt / GRAVEYARD.rise);
        if (grave.timer <= 0) grave.phase = 'sink';
      } else {
        grave.height = Math.max(0, grave.height - dt / GRAVEYARD.sink);
        if (grave.height === 0) Object.assign(grave, { phase: 'down', timer: between(random, GRAVEYARD.rest) });
      }
      if (grave.height < 0.5) continue;

      for (const racer of racers) {
        const car = racer.car;
        if (Math.hypot(car.x - grave.x, car.z - grave.z) > GRAVEYARD.reach) continue;
        if (!knock(car)) continue;
        racer.lastEvent = { kind: 'skeleton', at: time };
        bang(grave.x, grave.z, 'bone');
        // The skeleton goes to pieces, and takes a while to pull itself together.
        Object.assign(grave, { phase: 'down', height: 0, timer: between(random, GRAVEYARD.rest) + 1.5 });
      }
    }
  };
  return state;
}

// ---------- Street: zombies ----------

export const STREET = {
  zombies: 10,
  spread: 26, // samples either side of the middle of the site that they wander in
  walk: [1.5, 2.6], // m/s: a shamble
  reach: 1.8,
  gummed: 1.5, // seconds a car is slowed after hitting one
  flung: 1.1, // seconds a zombie spends in the air
  away: [1.5, 3.5], // and then out of sight before another turns up
};

function createStreet(site, track, random, bang) {
  const room = track.halfWidth - 1.2;
  const zombies = [];
  for (let i = 0; i < STREET.zombies; i++) {
    const zombie = { phase: 'walk', timer: 0, flight: 0, fromX: 0, fromZ: 0, throwX: 0, throwZ: 0, x: 0, z: 0, heading: 0, sway: random() * 6 };
    // Spread along the street, each crossing the road on its own line.
    zombie.index = track.wrap(site.index + Math.round(((i + 0.5) / STREET.zombies * 2 - 1) * STREET.spread));
    zombie.across = (random() * 2 - 1) * room;
    zombie.direction = random() < 0.5 ? 1 : -1;
    zombie.speed = between(random, STREET.walk);
    zombies.push(zombie);
  }
  const state = { kind: 'street', site, zombies };

  state.update = (dt, time, racers) => {
    for (const zombie of zombies) {
      if (zombie.phase === 'flung') {
        zombie.flight += dt / STREET.flung;
        zombie.x = zombie.fromX + zombie.throwX * zombie.flight;
        zombie.z = zombie.fromZ + zombie.throwZ * zombie.flight;
        if (zombie.flight >= 1) Object.assign(zombie, { phase: 'away', timer: between(random, STREET.away) });
        continue;
      }
      if (zombie.phase === 'away') {
        zombie.timer -= dt;
        if (zombie.timer > 0) continue;
        // Another one wanders in from the kerb.
        zombie.direction = random() < 0.5 ? 1 : -1;
        zombie.across = -zombie.direction * room;
        zombie.speed = between(random, STREET.walk);
        zombie.phase = 'walk';
      }

      zombie.across += zombie.direction * zombie.speed * dt;
      if (Math.abs(zombie.across) > room) {
        zombie.across = Math.sign(zombie.across) * room;
        zombie.direction = -zombie.direction;
      }
      const at = track.pointAt(zombie.index, zombie.across);
      zombie.x = at.x;
      zombie.z = at.z;
      // Facing the way it is shambling (+1 is toward the right of the road).
      zombie.heading = at.heading - (zombie.direction * Math.PI) / 2;

      for (const racer of racers) {
        const car = racer.car;
        if (car.flight || Math.hypot(car.x - zombie.x, car.z - zombie.z) > STREET.reach) continue;
        // Sent flying the way the car was going.
        const speed = Math.max(8, Math.hypot(car.vx, car.vz));
        Object.assign(zombie, {
          phase: 'flung',
          flight: 0,
          fromX: zombie.x,
          fromZ: zombie.z,
          throwX: (car.vx / speed) * 16 + (random() - 0.5) * 8,
          throwZ: (car.vz / speed) * 16 + (random() - 0.5) * 8,
        });
        bang(zombie.x, zombie.z, 'slime');
        // Only the first of a bunch gums the car up; the rest just fly.
        if (car.effects.slow < 0.3) {
          car.effects.slow = STREET.gummed;
          car.effects.boost = 0;
          racer.lastEvent = { kind: 'zombie', at: time };
        }
        break;
      }
    }
  };
  return state;
}

const BUILDERS = {
  pyramid: createPyramid,
  bridge: createBridge,
  pass: createPass,
  graveyard: createGraveyard,
  street: createStreet,
};

/** `bang(x, z, kind)` is called when something goes off, for the scene to draw. */
export function createFeature(kind, track, random, bang = () => {}) {
  const site = featureSite(kind, track);
  if (!site) return null;
  return BUILDERS[kind](site, track, random, bang);
}
