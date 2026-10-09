import { linear, setPaint } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import { blastGeometry, bombGeometry, boostGeometry, oilGeometry, slowGeometry, stripGeometry, trampolineGeometry } from './props.js';
import { createSession } from './session.js';
import { buildRaceVehicle } from './vehicle.js';
import { buildWorld } from './world.js';

// The 3D side of a race: builds the world for a track, runs a session on it,
// draws the track events and follows the player with a chase camera.

const worlds = new Map();

function worldFor(theme) {
  // Building a world takes a moment, so each track is built once and kept.
  if (!worlds.has(theme.id)) {
    const world = buildWorld(theme);
    const length = Math.hypot(...theme.light);
    world.light = theme.light.map((value) => value / length);
    world.fog = { color: linear(theme.fog.color), density: theme.fog.density };
    worlds.set(theme.id, world);
  }
  return worlds.get(theme.id);
}

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const BLAST_TIME = 0.45;

const ITEM_GEOMETRY = {
  boost: boostGeometry,
  slow: slowGeometry,
  bomb: bombGeometry,
  trampoline: trampolineGeometry,
};

export function createRaceScene(renderer, view) {
  let world = null;
  let session = null;
  let vehicles = [];
  let time = 0;

  // Track events: things standing on the road, and things painted on it.
  let props = []; // [{ item, node }]
  let slicks = []; // [{ item, node }]
  let strips = []; // [{ strip, node, fast, slow }]
  let blasts = []; // [{ item, node }]
  let ground = new Node();

  const camera = { eye: [0, 5, -10], target: [0, 1, 0], fov: 1, near: 0.5, far: 520 };
  let cameraHeading = 0;

  /**
   * Starts a race.
   * drivers: [{ name, build, isPlayer, lane, pace, ... }] in grid order.
   */
  function start({ theme, drivers, laps }) {
    world = worldFor(theme);
    session = createSession({ track: world.track, surface: theme.surface, laps, drivers });
    vehicles = session.racers.map((racer) => buildRaceVehicle(racer.build));

    // Baking borrowed the shared paint material; hand it back to the player.
    const player = session.player;
    if (player) setPaint(player.build.paint);

    const mesh = (geometry) => {
      const node = new Node();
      node.geometry = geometry;
      return node;
    };
    const events = session.events;
    props = [];
    slicks = [];
    blasts = [];
    strips = [];
    if (events) {
      for (const item of events.items) {
        if (item.kind === 'oil') slicks.push({ item, node: mesh(oilGeometry()) });
        else props.push({ item, node: mesh(ITEM_GEOMETRY[item.kind]()) });
        if (item.kind === 'bomb') blasts.push({ item, node: mesh(blastGeometry()) });
      }
      strips = events.strips.map((strip) => ({
        strip,
        node: new Node(),
        fast: stripGeometry(world.track, strip, true),
        slow: stripGeometry(world.track, strip, false),
      }));
    }
    // Painted layers go on top of the track's own ground, in this order.
    ground = new Node();
    ground.children = [world.ground, ...strips.map((entry) => entry.node), ...slicks.map((entry) => entry.node)];

    time = 0;
    cameraHeading = (player || session.racers[0]).car.heading;
    place(0);
    return session;
  }

  function place(dt) {
    session.racers.forEach((racer, i) => {
      const { node, animate } = vehicles[i];
      const car = racer.car;
      node.position = [car.x, car.lift, car.z];
      node.rotation[1] = car.heading + car.twirl;
      animate(car, dt);
      node.updateWorld();
    });

    props.forEach(({ item, node }, i) => {
      if (item.kind === 'boost') {
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
      node.updateWorld();
    });

    for (const { item, node } of slicks) {
      node.position = [item.x, 0, item.z];
      node.rotation[1] = item.heading;
    }
    for (const entry of strips) {
      entry.node.geometry = entry.strip.fast ? entry.fast : entry.slow;
    }
    ground.updateWorld();

    for (const { item, node } of blasts) {
      const age = (session.time - item.hitAt) / BLAST_TIME;
      const size = age >= 0 && age < 1 ? 1 + age * 4 : 0;
      node.position = [item.hitX ?? 0, 1.2, item.hitZ ?? 0];
      node.scale = [size, size, size];
      node.updateWorld();
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
    const standing = props.filter((entry) => entry.item.active).map((entry) => entry.node);
    const bangs = blasts.filter((entry) => entry.node.scale[0] > 0).map((entry) => entry.node);
    renderer.render({
      camera,
      light: world.light,
      lighting: theme.lighting,
      fog: world.fog,
      pulse: theme.pulse ? theme.pulse(time) : 1,
      sky: world.sky,
      ground,
      solids: [world.scenery, ...cars, ...standing, ...bangs],
      casters: [...cars, ...standing, world.scenery],
      shadow: { strength: theme.shadow },
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
