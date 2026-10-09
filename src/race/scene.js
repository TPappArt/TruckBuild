import { linear, setPaint } from '../engine/materials.js';
import { createSession } from './session.js';
import { buildRaceVehicle } from './vehicle.js';
import { buildWorld } from './world.js';

// The 3D side of a race: builds the world for a track, runs a session on it
// and follows the player with a chase camera.

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

export function createRaceScene(renderer, view) {
  let world = null;
  let session = null;
  let vehicles = [];
  let time = 0;

  const camera = { eye: [0, 5, -10], target: [0, 1, 0], fov: 1, near: 0.5, far: 520 };
  let cameraHeading = 0;

  /**
   * Starts a race.
   * drivers: [{ name, build, isPlayer, lane, pace }] in grid order.
   */
  function start({ theme, drivers, laps }) {
    world = worldFor(theme);
    session = createSession({ track: world.track, surface: theme.surface, laps, drivers });
    vehicles = session.racers.map((racer) => buildRaceVehicle(racer.build));

    // Baking borrowed the shared paint material; hand it back to the player.
    const player = session.player;
    if (player) setPaint(player.build.paint);

    time = 0;
    cameraHeading = (player || session.racers[0]).car.heading;
    place(0);
    return session;
  }

  function place(dt) {
    session.racers.forEach((racer, i) => {
      const { node, animate } = vehicles[i];
      node.position[0] = racer.car.x;
      node.position[2] = racer.car.z;
      node.rotation[1] = racer.car.heading;
      animate(racer.car, dt);
      node.updateWorld();
    });
  }

  function update(dt, input) {
    if (!session) return;
    time += dt;
    session.update(dt, input);
    place(session.phase === 'countdown' ? 0 : dt);

    // Chase camera: swings round behind the car a beat after it turns.
    const car = (session.player || session.racers[0]).car;
    cameraHeading += wrapAngle(car.heading - cameraHeading) * (1 - Math.exp(-dt * 5));
    const speed = Math.min(1, Math.abs(car.speed) / car.maxSpeed);
    const fx = Math.sin(cameraHeading);
    const fz = Math.cos(cameraHeading);
    const back = 7.6 + speed * 1.6;
    camera.eye = [car.x - fx * back, 3.5, car.z - fz * back];
    camera.target = [car.x + fx * 5, 1.4, car.z + fz * 5];

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
    renderer.render({
      camera,
      light: world.light,
      lighting: theme.lighting,
      fog: world.fog,
      pulse: theme.pulse ? theme.pulse(time) : 1,
      sky: world.sky,
      ground: world.ground,
      solids: [world.scenery, ...cars],
      casters: [...cars, world.scenery],
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
