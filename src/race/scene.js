import { linear, setPaint } from '../engine/materials.js';
import { identity, lookAt, multiply, perspective } from '../engine/math.js';
import { Node } from '../engine/node.js';
import { locate } from './car.js';
import { PASS, PYRAMID } from './features.js';
import {
  bangGeometry,
  boltGeometry,
  bombGeometry,
  boostGeometry,
  checkpointLamp,
  checkpointLine,
  coinsGeometry,
  freezeGeometry,
  haloGeometry,
  holeGeometry,
  ITEM_HALOS,
  ITEM_RINGS,
  meteorGeometry,
  MOTE_HEIGHT,
  MOTE_TILE,
  moteGeometry,
  mummyGeometry,
  oilGeometry,
  ringGeometry,
  shotGeometry,
  skeletonGeometry,
  slowGeometry,
  stripGeometry,
  trampolineGeometry,
  werewolfGeometry,
  zombieGeometry,
} from './props.js';
import { createSession } from './session.js';
import { curtainGeometry, pillarGeometry, snowballGeometry } from './setpieces.js';
import { buildRaceVehicle } from './vehicle.js';
import { buildWorld, CHECKPOINT_HEIGHT, checkpointSpan } from './world.js';

// The 3D side of a race: builds the world for a track, runs a session on it,
// draws everything that happens and follows the player with a chase camera.

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const BANG_TIME = 0.45;
const KEEP_WORLDS = 2; // tracks kept built, so "race again" is instant

const ITEM_GEOMETRY = {
  boost: boostGeometry,
  slow: slowGeometry,
  bomb: bombGeometry,
  trampoline: trampolineGeometry,
  freeze: freezeGeometry,
  coins: coinsGeometry,
};
// Pickups that hang in the air and turn, rather than sitting on the road.
const FLOATS = new Set(['boost', 'freeze', 'coins']);

function mesh(geometry) {
  const node = new Node();
  node.geometry = geometry;
  return node;
}

/** A fixed set of nodes handed out afresh each frame, for short-lived things. */
function createPool() {
  const nodes = [];
  const active = [];
  return {
    reset() {
      active.length = 0;
    },
    /** Returns a node showing `geometry` at the given place and size. */
    take(geometry, x, y, z, scale = 1, turn = 0) {
      if (active.length === nodes.length) nodes.push(new Node());
      const node = nodes[active.length];
      active.push(node);
      node.geometry = geometry;
      const p = node.position;
      p[0] = x;
      p[1] = y;
      p[2] = z;
      // (Callers sometimes give a node a rotation array of their own.)
      node.rotation = [0, turn, 0];
      const s = node.scale;
      const each = Array.isArray(scale);
      s[0] = each ? scale[0] : scale;
      s[1] = each ? scale[1] : scale;
      s[2] = each ? scale[2] : scale;
      node.updateWorld();
      return node;
    },
    /** The nodes handed out since the last reset. Not to be kept or changed. */
    active,
  };
}

// Things on the road further off than this are not drawn: at that range a
// pickup is a speck, and there may be thirty of them round the lap.
const SIGHT = 230;

export function createRaceScene(renderer, view) {
  let world = null;
  let session = null;
  let vehicles = [];
  let time = 0;

  // Built tracks, most recently used last. Building one takes a moment, so
  // a couple are kept; older ones are let go to save memory on phones.
  const worlds = new Map();
  function worldFor(theme) {
    let built = worlds.get(theme.id);
    if (built) {
      worlds.delete(theme.id);
    } else {
      built = buildWorld(theme);
      const length = Math.hypot(...theme.light);
      built.light = theme.light.map((value) => value / length);
      built.fogColor = linear(theme.fog.color);
    }
    worlds.set(theme.id, built);
    while (worlds.size > KEEP_WORLDS) {
      const [oldest, gone] = worlds.entries().next().value;
      worlds.delete(oldest);
      for (const node of [gone.ground, gone.scenery, gone.sky, gone.decks, gone.openings]) {
        if (node) renderer.release(node);
      }
    }
    return built;
  }

  // Track events: things standing on the road, and things painted on it.
  let props = []; // [{ item, node, ring }]
  let strips = []; // [{ strip, node, fast, slow }]
  let gates = []; // checkpoints: [{ index, x, z, heading, line, dim, lit }]
  let fixedGround = []; // the track's own ground, then strips and checkpoint lines

  // Everything short-lived is drawn from pools, rebuilt every frame.
  const solidPool = createPool(); // bangs, shots, bolts
  const castPool = createPool(); // as solidPool, for things big enough to want a shadow
  const paintPool = createPool(); // rings, slicks, holes: flat on the road
  const glowPool = createPool(); // halos
  const motePool = createPool(); // whatever is in the air
  const ground = new Node();
  const drift = [0, 0, 0]; // how far the air has moved: x, down, z
  const mistDrift = [0, 0];

  const camera = { eye: [0, 5, -10], target: [0, 1, 0], fov: 1, near: 0.5, far: 520 };
  let cameraHeading = 0;
  let cameraY = 0; // height of the road the camera is following
  let aheadY = 0; // and of the road it is looking toward
  let shade = 0; // 0 in the open, 1 in a tunnel

  /**
   * Starts a race.
   * drivers: [{ name, build, isPlayer, lane, pace, attack, ... }] in grid order.
   * rules:   how the rivals behave, from the difficulty (see grid.js).
   */
  function start({ theme, drivers, laps, rules }) {
    world = worldFor(theme);
    session = createSession({
      track: world.track,
      surface: theme.surface,
      hazard: theme.hazard,
      feature: theme.feature,
      laps,
      drivers,
      rules,
    });
    vehicles = session.racers.map((racer) => {
      const vehicle = buildRaceVehicle(racer.build);
      // How tall it stands, for hanging its nameplate over it.
      vehicle.height = vehicle.node.worldBounds().max[1];
      return vehicle;
    });

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
    chase(0, true);
    aim();
    place(0);
    return session;
  }

  // Which way the camera is looking over the ground, and how wide. Only
  // what is in front of it and near enough to make out is worth drawing.
  const sight = { x: 0, z: 1, spread: 1 };
  function aim(aspect = view.width / view.height) {
    const dx = camera.target[0] - camera.eye[0];
    const dz = camera.target[2] - camera.eye[2];
    const length = Math.hypot(dx, dz) || 1;
    sight.x = dx / length;
    sight.z = dz / length;
    // Half the width of the view at a metre's distance, with room to spare.
    sight.spread = Math.tan(camera.fov / 2) * Math.max(1, aspect) * 1.25;
  }
  /** True if a thing `size` metres across at (x, z) may be on screen. */
  function inSight(x, z, size = 5) {
    const dx = x - camera.eye[0];
    const dz = z - camera.eye[2];
    const ahead = dx * sight.x + dz * sight.z;
    if (ahead < -size || ahead > SIGHT) return false;
    return Math.abs(dx * sight.z - dz * sight.x) < (ahead + size) * sight.spread + size;
  }

  /** Puts everything where the session says it is. */
  function place(dt) {
    session.racers.forEach((racer, i) => {
      const { node, animate } = vehicles[i];
      const car = racer.car;
      // On the road at whatever height it is here, nose up or down with the slope.
      node.position = [car.x, car.y + car.lift, car.z];
      node.rotation[0] = car.flight ? 0 : -Math.atan(car.slope);
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
      if (racer.car.effects.frozen > 0) glowPool.take(haloGeometry('frost'), racer.car.x, racer.car.y + 1.3, racer.car.z, 3.4);
    }

    // Checkpoints light up once the player is through them, and go out
    // again at the start of the next lap.
    const player = session.player;
    const span = checkpointSpan(world.track);
    for (const gate of gates) {
      const through = Boolean(player) && (player.finished || (player.lap >= 0 && player.car.index >= gate.index));
      gate.line.geometry = through ? gate.lit : gate.dim;
      if (inSight(gate.x, gate.z, span)) solidPool.take(checkpointLamp(span, CHECKPOINT_HEIGHT, through), gate.x, 0, gate.z, 1, gate.heading);
    }

    // Pickups, hazards and trampolines, each in its colour-coded ring and halo.
    props.forEach((entry, i) => {
      const { item, node, ring, halo } = entry;
      entry.shown = item.active && inSight(item.x, item.z);
      if (!entry.shown) return;
      const [, radius, height, squash] = ITEM_HALOS[item.kind];
      const y = item.y;
      glowPool.take(halo, item.x, y + height, item.z, [radius * pulse, radius * squash * pulse, radius * pulse]);
      // What lies on the road is paint where the road is flat ground, and
      // a thin solid just above the surface where the road is built.
      const flat = item.level ? paintPool : solidPool;
      const rest = item.level ? 0 : y + 0.065;
      flat.take(ring, item.x, rest, item.z, pulse);

      if (item.kind === 'oil') {
        flat.take(oilGeometry(), item.x, rest, item.z, 1, item.heading);
      } else if (FLOATS.has(item.kind)) {
        node.position = [item.x, y + 1.7 + 0.2 * Math.sin(time * 3 + i), item.z];
        node.rotation[1] = time * 2.6 + i;
      } else if (item.kind === 'slow') {
        // Crossing the road, at a snail's pace.
        node.position = [item.x, y, item.z];
        node.rotation[1] = item.heading + Math.PI / 2 + 0.2 * Math.sin(time * 1.4 + i);
        node.scale = [1.2, 1.2, 1.2];
      } else if (item.kind === 'bomb') {
        const throb = 1 + 0.07 * Math.sin(time * 9 + i);
        node.position = [item.x, y, item.z];
        node.scale = [throb, throb, throb];
      } else {
        node.position = [item.x, y, item.z];
        node.rotation[1] = item.heading;
      }
      node?.updateWorld();
    });
    for (const entry of strips) {
      entry.node.geometry = entry.strip.fast ? entry.fast : entry.slow;
    }

    // Shots in flight.
    for (const shot of session.combat.shots) {
      const y = world.track.heightAt(shot.index, shot.offset) + 1.3;
      solidPool.take(shotGeometry(shot.kind), shot.x, y, shot.z, 1, shot.heading);
      glowPool.take(haloGeometry('fire'), shot.x, y, shot.z, 1.6);
    }

    // Things going off: a ball that swells and is gone.
    for (const bang of session.bangs) {
      const age = (session.time - bang.at) / BANG_TIME;
      if (age < 0 || age >= 1) continue;
      const y = (bang.y ?? 0) + 1.6;
      solidPool.take(bangGeometry(bang.kind), bang.x, y, bang.z, 0.7 + age * 1.7);
      const halo = { spark: 'spark', blast: 'fire', slime: 'slime' }[bang.kind];
      if (halo) glowPool.take(haloGeometry(halo), bang.x, y, bang.z, 3 + age * 3);
    }

    placeHazard();
    placeFeature();
    placeAir(dt);

    ground.children = [...fixedGround, ...paintPool.active];
    ground.updateWorld();
  }

  /** Draws the track's own hazard, if it has one. */
  function placeHazard() {
    const hazard = session.hazard;
    if (!hazard) return;

    if (hazard.kind === 'mummy') {
      const { rise, swing, sink } = hazard.timings;
      for (const mummy of hazard.mummies) {
        const age = mummy.age;
        // Up out of the ground, a lunge forward, then back down.
        const up = age < rise ? age / rise : age < rise + swing ? 1 : 1 - (age - rise - swing) / sink;
        const lunge = age >= rise && age < rise + swing ? Math.sin((Math.PI * (age - rise)) / swing) : 0;
        const node = castPool.take(mummyGeometry(), mummy.x, -3.6 * (1 - Math.max(0, up)), mummy.z, 1.15, mummy.heading);
        node.rotation[0] = lunge * 0.8;
        node.updateWorld();
        paintPool.take(holeGeometry(), mummy.x, 0, mummy.z);
        glowPool.take(haloGeometry('bad'), mummy.x, 1.6, mummy.z, 2.8);
      }
    }

    if (hazard.kind === 'lightning' || hazard.kind === 'meteor') {
      const { warning, flash } = hazard.timings;
      const falling = hazard.kind === 'meteor';
      for (const strike of hazard.strikes) {
        const coming = strike.age < warning;
        if (coming && !strike.harmless) {
          // A ring that closes in on the spot as the strike gets nearer.
          const closing = 1.7 - 0.7 * (strike.age / warning);
          paintPool.take(ringGeometry(falling ? 'bad' : 'spark', 2.6, 3.4), strike.x, 0, strike.z, closing);
          glowPool.take(haloGeometry(falling ? 'bad' : 'spark'), strike.x, 0.4, strike.z, [3.4, 1.2, 3.4]);
        }
        if (falling) {
          if (coming) {
            // Down out of the sky on a slant, trailing fire.
            const left = 1 - strike.age / warning;
            const slant = Math.cos(strike.seed) * 26 * left;
            const node = solidPool.take(meteorGeometry(), strike.x + slant, 1 + 70 * left, strike.z + Math.sin(strike.seed) * 26 * left, 1.5, strike.seed);
            node.rotation[0] = 0.35;
            node.updateWorld();
            glowPool.take(haloGeometry('fire'), node.position[0], node.position[1], node.position[2], 4);
          } else if (strike.harmless) {
            const age = (strike.age - warning) / flash;
            solidPool.take(bangGeometry('blast'), strike.x, 1.4, strike.z, 1 + age * 3);
            glowPool.take(haloGeometry('fire'), strike.x, 1.6, strike.z, 5 + age * 4);
          }
        } else if (!coming) {
          solidPool.take(boltGeometry(), strike.x, 0, strike.z, 1, strike.seed);
          glowPool.take(haloGeometry('spark'), strike.x, 2, strike.z, 9);
        }
      }
    }

    if (hazard.kind === 'werewolf') {
      const track = world.track;
      for (const wolf of hazard.wolves) {
        if (!wolf.running) {
          // Crouched at the roadside. Rings across the road show its line.
          for (const across of [-10, 0, 10]) {
            const p = track.pointAt(wolf.index, across);
            paintPool.take(ringGeometry('bad', 1.3, 1.9), p.x, 0, p.z, 1 + 0.2 * Math.sin(time * 16 + across));
          }
          glowPool.take(haloGeometry('bad'), wolf.x, 1.4, wolf.z, 3.2);
        }
        // Bounding: up and down, nose rising and falling with it.
        const bound = wolf.running ? Math.abs(Math.sin(wolf.age * 9)) : 0;
        const node = castPool.take(werewolfGeometry(), wolf.x, bound * 1.1, wolf.z, 1.35, wolf.heading);
        node.rotation[0] = wolf.running ? Math.cos(wolf.age * 9) * 0.3 : 0.25;
        node.updateWorld();
      }
    }
  }

  /** Draws the moving parts of the track's landmark. */
  function placeFeature() {
    const feature = session.feature;
    if (!feature) return;

    if (feature.kind === 'pyramid') {
      for (const pillar of feature.pillars) {
        if (!inSight(pillar.x, pillar.z)) continue;
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

    if (feature.kind === 'bridge') {
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

    if (feature.kind === 'pass') {
      for (const lane of feature.lanes) {
        if (!lane.rolling) continue;
        const ball = castPool.take(snowballGeometry(), lane.x, PASS.radius, lane.z, PASS.radius);
        ball.rotation = [0, lane.heading, lane.direction * lane.turned];
        ball.updateWorld();
      }
    }

    if (feature.kind === 'graveyard') {
      feature.graves.forEach((grave, i) => {
        if (!inSight(grave.x, grave.z)) return;
        if (grave.phase === 'warn') {
          const throb = 1 + 0.15 * Math.sin(time * 18);
          paintPool.take(ringGeometry('bad', 1.5, 2.3), grave.x, 0, grave.z, throb);
          glowPool.take(haloGeometry('bad'), grave.x, 0.3, grave.z, [2.8, 1, 2.8]);
        }
        if (grave.height <= 0) return;
        // Up out of the grave, then swaying on the spot with its arms up.
        const node = castPool.take(skeletonGeometry(), grave.x, -3.6 * (1 - grave.height), grave.z, 1.3, grave.heading + 0.3 * Math.sin(time * 5 + i));
        node.rotation[2] = 0.12 * Math.sin(time * 7 + i);
        node.updateWorld();
      });
    }

    if (feature.kind === 'street') {
      feature.zombies.forEach((zombie, i) => {
        if (zombie.phase === 'away' || !inSight(zombie.x, zombie.z, 24)) return;
        const shape = zombieGeometry(i % 3);
        if (zombie.phase === 'flung') {
          // Head over heels through the air.
          const t = zombie.flight;
          const node = castPool.take(shape, zombie.x, 0.4 + 22 * t * (1 - t), zombie.z, 1.2, zombie.heading);
          node.rotation[0] = t * 14;
          node.updateWorld();
          return;
        }
        const node = castPool.take(shape, zombie.x, 0, zombie.z, 1.2, zombie.heading);
        node.rotation[2] = 0.14 * Math.sin(time * zombie.speed * 2.4 + zombie.sway);
        node.updateWorld();
        paintPool.take(ringGeometry('bad', 0.9, 1.25), zombie.x, 0, zombie.z);
      });
    }
  }

  /** Whatever hangs in the air on this track: snow, dust, sparks, ash. */
  function placeAir(dt) {
    motePool.reset();
    const air = world.theme.air;
    // Nothing falls or drifts inside a tunnel.
    if (!air || shade > 0.5) return;

    // A snowstorm drives it sideways, hard.
    const storm = session.hazard?.kind === 'storm' ? session.hazard : null;
    const gust = storm ? storm.strength : 0;
    drift[0] += (air.wind[0] + (storm ? storm.windX * 34 * gust : 0)) * dt;
    drift[1] += (air.fall + 3 * gust) * dt;
    drift[2] += (air.wind[1] + (storm ? storm.windZ * 34 * gust : 0)) * dt;

    // The specks are a block that repeats in every direction. Draw the
    // four copies nearest the camera, sliding with the wind.
    const eye = camera.eye;
    const fall = ((drift[1] % MOTE_HEIGHT) + MOTE_HEIGHT) % MOTE_HEIGHT;
    const nearest = (value) => {
      const cell = (value + MOTE_TILE / 2) / MOTE_TILE;
      const base = Math.floor(cell);
      return cell - base < 0.5 ? [base - 1, base] : [base, base + 1];
    };
    const specks = moteGeometry(world.theme.id, air);
    for (const i of nearest(eye[0] - drift[0])) {
      for (const j of nearest(eye[2] - drift[2])) {
        motePool.take(specks, i * MOTE_TILE + drift[0], -fall, j * MOTE_TILE + drift[2]);
      }
    }

    const mist = world.theme.mist;
    if (mist) {
      mistDrift[0] = (mistDrift[0] + mist.drift[0] * dt) % 1;
      mistDrift[1] = (mistDrift[1] + mist.drift[1] * dt) % 1;
    }
  }

  /**
   * Chase camera: swings round behind the car a beat after it turns, rises
   * with it when it leaves the ground, and follows the road up and down.
   */
  function chase(dt, snap = false) {
    const subject = session.player || session.racers[0];
    const car = subject.car;
    const track = world.track;
    const ease = snap ? 1 : 1 - Math.exp(-dt * 5);
    cameraHeading += wrapAngle(car.heading - cameraHeading) * ease;
    const speed = Math.min(1.5, Math.abs(car.speed) / car.maxSpeed);
    const fx = Math.sin(cameraHeading);
    const fz = Math.cos(cameraHeading);
    const back = 9.6 + speed * 1.9;

    // Height: that of the road under the car, and of the road a little way
    // ahead for what the camera looks at, both eased so that the view glides.
    const here = car.index + car.along / track.spacing;
    const lift = snap ? 1 : 1 - Math.exp(-dt * 8);
    cameraY += (car.y - cameraY) * lift;
    aheadY += (track.heightAt(here + 6.5 / track.spacing, car.offset) - aheadY) * lift;
    // Far enough back and high enough up to see the road well ahead, and
    // what is coming up beside it.
    camera.eye = [car.x - fx * back, cameraY + 4.3 + car.lift * 0.5, car.z - fz * back];
    camera.target = [car.x + fx * 6.5, aheadY + 1.5 + car.lift * 0.6, car.z + fz * 6.5];

    // In a tunnel the daylight goes.
    shade += ((track.roofAt(car.index, car.offset) ? 1 : 0) - shade) * (snap ? 1 : 1 - Math.exp(-dt * 4));

    // Keep a useful width of view on tall phone screens, and open the lens
    // up a little with speed.
    const aspect = view.width / view.height;
    const wide = 1.15 + speed * 0.14;
    camera.fov = aspect >= 1.3 ? 0.92 + speed * 0.1 : Math.min(1.5, 2 * Math.atan(Math.tan(wide / 2) / aspect));
  }

  function update(dt, input) {
    if (!session) return;
    time += dt;
    session.update(dt, input);
    // Things are placed for the camera as it was last frame, which is as
    // near as makes no difference.
    aim();
    place(session.phase === 'countdown' ? 0 : dt);
    chase(dt);
  }

  function draw() {
    const theme = world.theme;
    const cars = vehicles.map((vehicle) => vehicle.node);
    const items = props.filter((entry) => entry.shown && entry.node);
    const standing = items.map((entry) => entry.node);

    // A snowstorm closes the view in; a strike nearby lights everything up.
    const hazard = session.hazard;
    const storm = hazard?.kind === 'storm' ? hazard.strength : 0;
    let flash = 1;
    if (hazard?.kind === 'lightning') {
      for (const strike of hazard.strikes) {
        if (strike.age < hazard.timings.warning) continue;
        const away = Math.hypot(strike.x - camera.eye[0], strike.z - camera.eye[2]);
        flash = Math.max(flash, 1 + 0.6 * Math.max(0, 1 - away / 170));
      }
    }
    const mist = theme.mist;

    // Under the ground there is only what the lamps give.
    let lighting = theme.lighting;
    if (shade > 0.01) {
      const dim = (colour, by) => colour.map((value) => value * (1 - by * shade));
      lighting = { sun: dim(theme.lighting.sun, 0.62), sky: dim(theme.lighting.sky, 0.45), bounce: dim(theme.lighting.bounce, 0.3) };
    }

    renderer.render({
      camera,
      light: world.light,
      lighting,
      fog: { color: world.fogColor, density: theme.fog.density * (1 + 1.5 * storm) },
      mist: mist ? { strength: mist.strength * (1 - shade), scale: mist.scale, offset: mistDrift } : null,
      grain: theme.grain ?? 0,
      pulse: (theme.pulse ? theme.pulse(time) : 1) * flash,
      sky: world.sky,
      ground,
      openings: world.openings,
      decks: world.decks ? [world.decks] : null,
      solids: [world.scenery, ...cars, ...standing, ...castPool.active, ...solidPool.active, ...motePool.active],
      // Shadows fall on the road each thing is on, whatever height that is.
      casters: [
        ...session.racers.map((racer, i) => ({ node: cars[i], height: racer.car.y })),
        ...items.map((entry) => ({ node: entry.node, height: entry.item.y })),
        ...castPool.active,
        world.scenery,
      ],
      shadow: { strength: theme.shadow },
      glows: glowPool.active,
    });
  }

  function render() {
    if (!session) return;
    renderer.setSize(view.width, view.height, view.pixelRatio);
    draw();
  }

  // ---------- Nameplates ----------

  const viewMatrix = identity();
  const projection = identity();
  const viewProjection = identity();

  /**
   * Where each racer's nameplate goes on screen, in CSS pixels, in the
   * order of session.racers: [{ x, y, scale, visible }]. `scale` shrinks
   * with distance.
   */
  function plates(out = []) {
    if (!session) return out;
    perspective(projection, camera.fov, view.width / view.height, camera.near, camera.far);
    lookAt(viewMatrix, camera.eye, camera.target);
    multiply(viewProjection, projection, viewMatrix);
    const m = viewProjection;
    session.racers.forEach((racer, i) => {
      const car = racer.car;
      const x = car.x;
      const y = car.y + car.lift + vehicles[i].height + 0.45;
      const z = car.z;
      const w = m[3] * x + m[7] * y + m[11] * z + m[15];
      const plate = (out[i] ??= { x: 0, y: 0, scale: 1, visible: false });
      plate.visible = w > 2 && w < 150;
      if (!plate.visible) return;
      plate.x = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5) * view.width;
      plate.y = (0.5 - ((m[1] * x + m[5] * y + m[9] * z + m[13]) / w) * 0.5) * view.height;
      plate.scale = Math.min(1, Math.max(0.5, 16 / w));
    });
    return out;
  }

  // ---------- Pictures of the tracks ----------

  /**
   * Takes a picture of a track's landmark with a pack of cars going
   * through it, for the track picker. Returns a JPEG data URL.
   *
   * The picture is drawn on the game's own canvas and read straight back,
   * so the caller must draw its own frame again before the browser next
   * paints. No race may be running.
   */
  function snapshot({ theme, drivers, rules, width, height, shot = theme.cinematic }) {
    start({ theme, drivers: drivers.map((driver) => ({ ...driver, auto: true })), laps: 9, rules });
    const { track, site } = world;
    const fx = Math.sin(site.heading);
    const fz = Math.cos(site.heading);
    // [metres right of the road, metres along it, metres up] at the landmark.
    const local = ([across, out, up]) => [site.x - fz * across + fx * out, up, site.z + fx * across + fz * out];

    // Put the cars on the road coming through, and let things happen for a
    // second or two so the place is in full swing.
    session.phase = 'racing';
    // (`carsAt` puts them at a sample of the track instead of at the landmark.)
    const lead = shot.carsAt ?? site.index + shot.cars / track.spacing;
    session.racers.forEach((racer, i) => {
      const at = track.pointAt(lead - i * 3.2, [-7, 5, -1, 9][i % 4]);
      const car = racer.car;
      Object.assign(car, { x: at.x, z: at.z, heading: at.heading, speed: 22, vx: Math.sin(at.heading) * 22, vz: Math.cos(at.heading) * 22 });
      car.index = track.wrap(Math.round(lead - i * 3.2));
      locate(car, track);
      racer.lap = 0;
    });
    for (let step = 0; step < 240; step++) session.feature?.update(1 / 60, 0, []);
    for (let step = 0; step < 75; step++) session.update(1 / 60);
    time = 3;

    // (`world: true` gives the camera in world coordinates instead: handy
    // for looking at other parts of a track while working on it.)
    camera.eye = shot.world ? shot.eye : local(shot.eye);
    camera.target = shot.world ? shot.target : local(shot.target);
    camera.fov = shot.fov;
    // Things are only put in the scene if the camera can see them, so it
    // has to be in place first.
    aim(width / height);
    place(1 / 60);
    renderer.setSize(width, height, 1);
    draw();
    const image = renderer.canvas.toDataURL('image/jpeg', 0.86);
    session = null;
    return image;
  }

  return {
    start,
    update,
    render,
    plates,
    snapshot,
    get session() {
      return session;
    },
    /** The landmark of the track being raced: see features.js. */
    get site() {
      return world?.site ?? null;
    },
  };
}
