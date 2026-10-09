import { meshData } from '../engine/geometry.js';
import { setPaint } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import { kit } from '../parts/kit.js';
import { buildVehicle } from '../vehicle.js';

// The 3D side of the build phase: a vehicle on a turntable.
//
// The camera and light stay put and the turntable turns, so the vehicle is
// always lit from the same flattering angle whichever way it faces.

const TURNTABLE_RADIUS = 2.7;
const FOV = 0.5;
const LIGHT = normalize([-0.45, 0.85, 0.5]);

function normalize(v) {
  const len = Math.hypot(...v);
  return v.map((value) => value / len);
}

/** Alternate panels of a ring, for the chequered edge of the turntable. */
function chequerBand(radius, top, bottom, segments, parity) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let s = parity; s < segments; s += 2) {
    const a0 = (s / segments) * Math.PI * 2;
    const a1 = ((s + 1) / segments) * Math.PI * 2;
    const base = positions.length / 3;
    for (const [angle, y] of [[a0, top], [a1, top], [a1, bottom], [a0, bottom]]) {
      positions.push(radius * Math.sin(angle), y, radius * Math.cos(angle));
      normals.push(Math.sin(angle), 0, Math.cos(angle));
    }
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  return meshData(positions, normals, indices);
}

function buildTurntable() {
  const k = kit();
  k.disc('floor', { r: TURNTABLE_RADIUS, seg: 48, axis: 'y' });
  k.lathe('accent', [[TURNTABLE_RADIUS - 0.42, 0.006], [TURNTABLE_RADIUS - 0.28, 0.006]], { seg: 48, axis: 'y' });
  for (const [parity, role] of [[0, 'checkDark'], [1, 'checkLight']]) {
    const band = new Node();
    band.geometry = chequerBand(TURNTABLE_RADIUS, 0, -0.3, 48, parity);
    band.role = role;
    k.node.add(band);
  }
  return k.node;
}

// Overshoots a little before settling: the "pop" when a part is swapped in.
const easeOutBack = (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

export function createGarageScene(renderer, view) {
  const ground = buildTurntable();
  const turntable = new Node();
  const camera = { eye: [0, 0, 0], target: [0, 0, 0], fov: FOV };

  // Players who ask their device for less motion get a turntable that only
  // moves when they drag it.
  const stillness = window.matchMedia('(prefers-reduced-motion: reduce)');

  let vehicle = null;
  let pop = null;
  let time = 0;

  // The view eases toward these rather than snapping.
  let yaw = -0.7;
  let pitch = 0.3;
  let distance = 0;
  let focusY = 0.8;
  let fitRadius = 2;
  let fitY = 0.8;
  let idle = 10;

  function setBuild(build, changed) {
    setPaint(build.paint);
    vehicle = buildVehicle(build);
    turntable.children = [vehicle.root];

    const box = vehicle.root.worldBounds();
    fitRadius = Math.max(1.7, box.radius);
    fitY = box.center[1];

    const node = changed === 'body' ? vehicle.root : vehicle.slots[changed];
    pop = node ? { node, t: 0 } : null;
  }

  /** Turns the vehicle (dx) and tilts the view (dy), in CSS pixels dragged. */
  function orbit(dx, dy) {
    yaw += dx * 0.01;
    pitch = Math.min(1.0, Math.max(0.06, pitch + dy * 0.006));
    idle = 0;
  }

  function fitDistance() {
    // Narrow screens are limited by width, so fit the vehicle alone. Wide
    // screens have room to spare, so keep most of the turntable in view too.
    const aspect = view.width / view.height;
    const horizontal = 2 * Math.atan(Math.tan(FOV / 2) * aspect);
    const byWidth = fitRadius / Math.sin(horizontal / 2);
    const byHeight = Math.max(fitRadius, 2.2) / Math.sin(FOV / 2);
    return Math.max(byWidth, byHeight) * 1.12;
  }

  function update(dt) {
    time += dt;

    // Slow showroom spin once the player has left it alone for a moment.
    idle += dt;
    if (idle > 2.5 && !stillness.matches) yaw += dt * 0.35;

    const ease = 1 - Math.exp(-dt * 7);
    const wanted = fitDistance();
    distance = distance ? distance + (wanted - distance) * ease : wanted;
    focusY += (fitY - focusY) * ease;

    if (pop) {
      pop.t = Math.min(1, pop.t + dt / 0.3);
      const s = 0.7 + 0.3 * easeOutBack(pop.t);
      pop.node.scale = [s, s, s];
      if (pop.t === 1) pop = null;
    }

    // Idle motion that parts ask for (see `motion` in the part files).
    vehicle?.root.walk((node) => {
      const motion = node.motion;
      if (!motion) return;
      if (motion.type === 'spin') {
        node.rotation[0] += motion.speed * dt;
      } else if (motion.type === 'swing') {
        motion.rest ??= node.rotation[0];
        node.rotation[0] = motion.rest + Math.sin(time * motion.speed) * motion.amount;
      } else if (motion.type === 'flicker') {
        const wide = 1 + 0.12 * Math.sin(time * 31);
        node.scale = [wide, wide, 1 + 0.25 * Math.sin(time * 43) + 0.1 * Math.sin(time * 17)];
      }
    });
  }

  function render() {
    renderer.setSize(view.width, view.height, view.pixelRatio);
    if (!distance) distance = fitDistance();

    turntable.rotation[1] = yaw;
    ground.rotation[1] = yaw;
    turntable.updateWorld();
    ground.updateWorld();
    camera.target = [0, focusY, 0];
    camera.eye = [0, focusY + Math.sin(pitch) * distance, Math.cos(pitch) * distance];

    renderer.render({
      camera,
      light: LIGHT,
      ground,
      solids: [turntable],
      casters: [turntable],
      shadow: { strength: 0.26, clipRadius: TURNTABLE_RADIUS },
    });
  }

  return { setBuild, orbit, update, render };
}
