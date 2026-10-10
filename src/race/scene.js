import { linear, setPaint } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import {
  bangGeometry,
  boltGeometry,
  bombGeometry,
  boostGeometry,
  checkpointLamp,
  checkpointLine,
  FLAKE_HEIGHT,
  FLAKE_TILE,
  flakeGeometry,
  freezeGeometry,
  haloGeometry,
  holeGeometry,
  ITEM_HALOS,
  ITEM_RINGS,
  mummyGeometry,
  oilGeometry,
  ringGeometry,
  shotGeometry,
  slowGeometry,
  stripGeometry,
  trampolineGeometry,
} from './props.js';
import { PYRAMID, SNOWBALLS } from './features.js';
import { createSession } from './session.js';
import { curtainGeometry, pillarGeometry, snowballGeometry } from './setpieces.js';
import { buildRaceVehicle } from './vehicle.js';
import { buildWorld, CHECKPOINT_HEIGHT, checkpointSpan } from './world.js';

// The 3D side of a race: builds the world for a track, runs a session on it,
// draws everything that happens and follows the player with a chase camera.

const worlds = new Map();

function worldFor(theme) {
  // Building a world takes a moment, so each track is built once and kept.
  if (!worlds.has(theme.id)) {
    const world = buildWorld(theme);
    const length = Math.hypot(...theme.light);
    world.light = theme.light.map((value) => value / length);
    world.fogColor = linear(theme.fog.color);
    worlds.set(theme.id, world);
  }
  return worlds.get(theme.id);
}

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const BANG_TIME = 0.45;

const ITEM_GEOMETRY = {
  boost: boostGeometry,
  slow: slowGeometry,
  bomb: bombGeometry,
  trampoline: trampolineGeometry,
  freeze: freezeGeometry,
};

function mesh(geometry) {
  const node = new Node();
  node.geometry = geometry;
  return node;
}

/** A fixed set of nodes handed out afresh each frame, for short-lived things. */
function createPool() {
  const nodes = [];
  let used = 0;
  return {
    reset() {
      used = 0;
    },
    /** Returns a node showing `geometry` at the given place and size. */
    take(geometry, x, y, z, scale = 1, turn = 0) {
      if (used === nodes.length) nodes.push(new Node());
      const node = nodes[used++];
      node.geometry = geometry;
      node.position = [x, y, z];
      node.rotation = [0, turn, 0];
      node.scale = Array.isArray(scale) ? scale : [scale, scale, scale];
      node.updateWorld();
      return node;
    },
    get active() {
      return nodes.slice(0, used);
    },
  };
}

export function createRaceScene(renderer, view) {
  let world = null;
  let session = null;
  let vehicles = [];
  let time = 0;

  // Track events: things standing on the road, and things painted on it.
  let props = []; // [{ item, node, ring }]
  let strips = []; // [{ strip, node, fast, slow }]
  let gates = []; // checkpoints: [{ index, x, z, heading, line, dim, lit }]
  let fixedGround = []; // the track's own ground, then strips and checkpoint lines

  // Everything short-lived is drawn from pools, rebuilt every frame.
  const solidPool = createPool(); // bangs, shots, bolts, the mummy
  const castPool = createPool(); // as solidPool, for things big enough to want a shadow
  const paintPool = createPool(); // rings, slicks, holes: flat on the road
  const glowPool = createPool(); // halos
  const flakePool = createPool();
  const ground = new Node();
  const drift = [0, 0, 0]; // how far the snow has blown and fallen

  const camera = { eye: [0, 5, -10], target: [0, 1, 0], fov: 1, near: 0.5, far: 520 };
  let cameraHeading = 0;

  /**
   * Starts a race.
   * drivers: [{ name, build, isPlayer, lane, pace, attack, ... }] in grid order.
   */
  function start({ theme, drivers, laps }) {
    world = worldFor(theme);
    session = createSession({
      track: world.track,
      surface: theme.surface,
      hazard: theme.hazard,
      feature: theme.feature,
      laps,
      drivers,
    });
    vehicles = session.racers.map((racer) => buildRaceVehicle(racer.build));

    // Baking borrowed the shared paint material; hand it back to the player.
    const player = session.player;
    if (player) setPaint(player.build.paint);

    const events = session.events;
    props = [];
    strips = [];
    if (events) {
      for (const item of events.items) {
        const [colour, inner, outer] = ITEM_RINGS[item.kind];
        props.push({
          item,
          node: item.kind === 'oil' ? null : mesh(ITEM_GEOMETRY[item.kind]()),
          ring: ringGeometry(colour, inner, outer),
          halo: haloGeometry(ITEM_HALOS[item.kind][0]),
        });
      }
      strips = events.strips.map((strip) => ({
        strip,
        node: new Node(),
        fast: stripGeometry(world.track, strip, true),
        slow: stripGeometry(world.track, strip, false),
      }));
    }
    gates = world.checkpoints.map((checkpoint) => ({
      ...checkpoint,
      line: new Node(),
      dim: checkpointLine(world.track, checkpoint.index, false),
      lit: checkpointLine(world.track, checkpoint.index, true),
    }));
    fixedGround = [world.ground, ...strips.map((entry) => entry.node), ...gates.map((gate) => gate.line)];

    time = 0;
    cameraHeading = (player || session.racers[0]).car.heading;
    place(0);
    return session;
  }

  /** Puts everything where the session says it is. */
  function place(dt) {
    session.racers.forEach((racer, i) => {
      const { node, animate } = vehicles[i];
      const car = racer.car;
      node.position = [car.x, car.lift, car.z];
      node.rotation[1] = car.heading + car.twirl;
      animate(car, dt);
      node.updateWorld();
    });

    solidPool.reset();
    castPool.reset();
    paintPool.reset();
    glowPool.reset();
    const pulse = 1 + 0.08 * Math.sin(time * 5);

    // Frozen cars sit in a block of cold light.
    for (const racer of session.racers) {
      if (racer.car.effects.frozen > 0) glowPool.take(haloGeometry('frost'), racer.car.x, 1.3, racer.car.z, 3.4);
    }

    // Checkpoints light up once the player is through them, and go out
    // again at the start of the next lap.
    const player = session.player;
    const span = checkpointSpan(world.track);
    for (const gate of gates) {
      const through = Boolean(player) && (player.finished || (player.lap >= 0 && player.car.index >= gate.index));
      gate.line.geometry = through ? gate.lit : gate.dim;
      solidPool.take(checkpointLamp(span, CHECKPOINT_HEIGHT, through), gate.x, 0, gate.z, 1, gate.heading);
    }

    // Pickups, hazards and trampolines, each in its colour-coded ring and halo.
    props.forEach(({ item, node, ring, halo }, i) => {
      if (!item.active) return;
      const [, radius, height, squash] = ITEM_HALOS[item.kind];
      glowPool.take(halo, item.x, height, item.z, [radius * pulse, radius * squash * pulse, radius * pulse]);
      paintPool.take(ring, item.x, 0, item.z, pulse);

      if (item.kind === 'oil') {
        paintPool.take(oilGeometry(), item.x, 0, item.z, 1, item.heading);
      } else if (item.kind === 'boost' || item.kind === 'freeze') {
        node.position = [item.x, 1.7 + 0.2 * Math.sin(time * 3 + i), item.z];
        node.rotation[1] = time * 2.6 + i;
      } else if (item.kind === 'slow') {
        // Crossing the road, at a snail's pace.
        node.position = [item.x, 0, item.z];
        node.rotation[1] = item.heading + Math.PI / 2 + 0.2 * Math.sin(time * 1.4 + i);
        node.scale = [1.2, 1.2, 1.2];
      } else if (item.kind === 'bomb') {
        const throb = 1 + 0.07 * Math.sin(time * 9 + i);
        node.position = [item.x, 0, item.z];
        node.scale = [throb, throb, throb];
      } else {
        node.position = [item.x, 0, item.z];
        node.rotation[1] = item.heading;
      }
      node?.updateWorld();
    });
    for (const entry of strips) {
      entry.node.geometry = entry.strip.fast ? entry.fast : entry.slow;
    }

    // Shots in flight.
    for (const shot of session.combat.shots) {
      solidPool.take(shotGeometry(shot.kind), shot.x, 1.3, shot.z, 1, shot.heading);
      glowPool.take(haloGeometry('fire'), shot.x, 1.3, shot.z, 1.6);
    }

    // Things going off: a ball that swells and is gone.
    for (const bang of session.bangs) {
      const age = (session.time - bang.at) / BANG_TIME;
      if (age < 0 || age >= 1) continue;
      solidPool.take(bangGeometry(bang.kind), bang.x, 1.6, bang.z, 0.7 + age * 1.7);
      if (bang.kind !== 'dust') glowPool.take(haloGeometry(bang.kind === 'spark' ? 'spark' : 'fire'), bang.x, 1.6, bang.z, 3 + age * 3);
    }

    placeHazard(dt);
    placeFeature();

    ground.children = [...fixedGround, ...paintPool.active];
    ground.updateWorld();
  }

  /** Draws the track's own hazard, if it has one. */
  function placeHazard(dt) {
    const hazard = session.hazard;
    flakePool.reset();
    if (!hazard) return;

    if (hazard.kind === 'mummy' && hazard.active) {
      const { rise, swing, sink } = hazard.timings;
      const age = hazard.age;
      // Up out of the ground, a lunge forward, then back down.
      const up = age < rise ? age / rise : age < rise + swing ? 1 : 1 - (age - rise - swing) / sink;
      const lunge = age >= rise && age < rise + swing ? Math.sin((Math.PI * (age - rise)) / swing) : 0;
      const node = solidPool.take(mummyGeometry(), hazard.x, -3.6 * (1 - Math.max(0, up)), hazard.z, 1.15, hazard.heading);
      node.rotation[0] = lunge * 0.8;
      node.updateWorld();
      paintPool.take(holeGeometry(), hazard.x, 0, hazard.z);
      glowPool.take(haloGeometry('bad'), hazard.x, 1.6, hazard.z, 2.8);
    }

    if (hazard.kind === 'lightning') {
      const { warning } = hazard.timings;
      for (const strike of hazard.strikes) {
        if (strike.age < warning) {
          // A ring that closes in on the spot as the strike gets nearer.
          const closing = 1.7 - 0.7 * (strike.age / warning);
          paintPool.take(ringGeometry('spark', 2.6, 3.4), strike.x, 0, strike.z, closing);
          glowPool.take(haloGeometry('spark'), strike.x, 0.4, strike.z, [3.4, 1.2, 3.4]);
        } else {
          solidPool.take(boltGeometry(), strike.x, 0, strike.z, 1, strike.seed);
          glowPool.take(haloGeometry('spark'), strike.x, 2, strike.z, 9);
        }
      }
    }

    if (hazard.kind === 'storm') {
      // Snow always falls here; in a storm it is driven sideways, hard.
      const wind = 3 + 34 * hazard.strength;
      drift[0] += hazard.windX * wind * dt;
      drift[1] += (3.5 + 3 * hazard.strength) * dt;
      drift[2] += hazard.windZ * wind * dt;

      // The flakes are a block that repeats in every direction. Draw the
      // four copies nearest the camera, sliding with the wind.
      const eye = camera.eye;
      const fall = drift[1] % FLAKE_HEIGHT;
      const nearest = (value) => {
        const cell = (value + FLAKE_TILE / 2) / FLAKE_TILE;
        const base = Math.floor(cell);
        return cell - base < 0.5 ? [base - 1, base] : [base, base + 1];
      };
      for (const i of nearest(eye[0] - drift[0])) {
        for (const j of nearest(eye[2] - drift[2])) {
          flakePool.take(flakeGeometry(), i * FLAKE_TILE + drift[0], -fall, j * FLAKE_TILE + drift[2]);
        }
      }
    }
  }

  /** Draws the moving parts of the track's set piece. */
  function placeFeature() {
    const feature = session.feature;
    if (!feature) return;

    if (feature.kind === 'pyramid') {
      for (const pillar of feature.pillars) {
        if (pillar.height > 0) {
          castPool.take(pillarGeometry(), pillar.x, -PYRAMID.height * (1 - pillar.height), pillar.z);
        }
        if (pillar.phase === 'warn') {
          // The floor glows red where one is about to come up.
          const throb = 1 + 0.15 * Math.sin(time * 18);
          paintPool.take(ringGeometry('bad', 1.3, 2.1), pillar.x, 0, pillar.z, throb);
          glowPool.take(haloGeometry('bad'), pillar.x, 0.3, pillar.z, [2.6, 1, 2.6]);
        }
      }
    }

    if (feature.kind === 'arcs') {
      const curtain = curtainGeometry(world.track);
      const reach = world.track.limit / 2;
      for (const gate of feature.gates) {
        // Live: on. About to go live: flickering, as a warning.
        if (!gate.live && Math.floor(time * 14) % 2) continue;
        // The curtain is modelled over +x, which is the left of the road.
        solidPool.take(curtain, gate.x, 0, gate.z, [-gate.side, 1, 1], gate.heading);
        if (gate.live) {
          const middle = world.track.pointAt(gate.index, gate.side * reach);
          glowPool.take(haloGeometry('spark'), middle.x, 3, middle.z, [reach, 5, reach]);
        }
      }
    }

    if (feature.kind === 'snowballs') {
      for (const lane of feature.lanes) {
        if (!lane.rolling) continue;
        const ball = castPool.take(snowballGeometry(), lane.x, SNOWBALLS.radius, lane.z, SNOWBALLS.radius);
        ball.rotation = [0, lane.heading, lane.direction * lane.turned];
        ball.updateWorld();
      }
    }
  }

  function update(dt, input) {
    if (!session) return;
    time += dt;
    session.update(dt, input);
    place(session.phase === 'countdown' ? 0 : dt);

    // Chase camera: swings round behind the car a beat after it turns, and
    // rises with it when it leaves the ground.
    const car = (session.player || session.racers[0]).car;
    cameraHeading += wrapAngle(car.heading - cameraHeading) * (1 - Math.exp(-dt * 5));
    const speed = Math.min(1.5, Math.abs(car.speed) / car.maxSpeed);
    const fx = Math.sin(cameraHeading);
    const fz = Math.cos(cameraHeading);
    const back = 7.6 + speed * 1.6;
    camera.eye = [car.x - fx * back, 3.5 + car.lift * 0.5, car.z - fz * back];
    camera.target = [car.x + fx * 5, 1.4 + car.lift * 0.6, car.z + fz * 5];

    // Keep a useful width of view on tall phone screens, and open the lens
    // up a little with speed.
    const aspect = view.width / view.height;
    const wide = 1.15 + speed * 0.14;
    camera.fov = aspect >= 1.3 ? 0.92 + speed * 0.1 : Math.min(1.5, 2 * Math.atan(Math.tan(wide / 2) / aspect));
  }

  function render() {
    if (!session) return;
    renderer.setSize(view.width, view.height, view.pixelRatio);
    const theme = world.theme;
    const cars = vehicles.map((vehicle) => vehicle.node);
    const standing = props.filter((entry) => entry.item.active && entry.node).map((entry) => entry.node);

    // A snowstorm closes the view in; lightning lights everything up.
    const hazard = session.hazard;
    const storm = hazard?.kind === 'storm' ? hazard.strength : 0;
    const flash = hazard?.kind === 'lightning' && hazard.strikes.some((strike) => strike.age >= hazard.timings.warning) ? 1.6 : 1;

    renderer.render({
      camera,
      light: world.light,
      lighting: theme.lighting,
      fog: { color: world.fogColor, density: theme.fog.density * (1 + 2.2 * storm) },
      pulse: (theme.pulse ? theme.pulse(time) : 1) * flash,
      sky: world.sky,
      ground,
      solids: [world.scenery, ...cars, ...standing, ...castPool.active, ...solidPool.active, ...flakePool.active],
      casters: [...cars, ...standing, ...castPool.active, world.scenery],
      shadow: { strength: theme.shadow },
      glows: glowPool.active,
    });
  }

  return {
    start,
    update,
    render,
    get session() {
      return session;
    },
  };
}
