import { bake } from '../engine/bake.js';
import { setPaint } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import { findPart } from '../parts/catalog.js';
import { buildVehicle } from '../vehicle.js';

// A vehicle prepared for racing.
//
// The garage draws a vehicle piece by piece. On track that would be dozens
// of draw calls per car, so here the body, extra and weapon are merged into
// one mesh, and the wheels (or tracks, or legs) share one more. A car costs
// two to five draw calls however elaborate the build.
//
// Returns { node, animate(car, dt) }. Place `node` at the car's position.
export function buildRaceVehicle(build) {
  setPaint(build.paint);
  const { root, slots } = buildVehicle(build);
  const drive = findPart('wheels', build.wheels).drive;

  const upper = new Node();
  upper.children = root.children.filter((child) => child !== slots.wheels);
  const body = bake(upper);

  // Every wheel is a copy of the same unit, so bake one and share it.
  let shared = null;
  const units = slots.wheels.children.map((unit) => {
    if (!shared) {
      const holder = new Node();
      holder.children = unit.children;
      shared = bake(holder).children[0].geometry;
    }
    const copy = new Node();
    copy.position = [...unit.position];
    copy.rotation = [...unit.rotation];
    copy.scale = [...unit.scale];
    copy.geometry = shared;
    return { node: copy, rest: [...unit.rotation], front: unit.position[2] > 0 };
  });

  // `lean` carries everything, so the whole car can roll into corners.
  const node = new Node();
  const lean = new Node();
  node.add(lean);
  lean.add(body, ...units.map((unit) => unit.node));

  let stride = 0;

  function animate(car, dt) {
    const pace = Math.min(1, Math.abs(car.speed) / 14);
    lean.rotation[2] = -car.steer * 0.07 * pace;

    if (drive.type === 'wheels') {
      for (const unit of units) {
        unit.node.rotation[0] += (car.speed / drive.radius) * dt;
        if (unit.front) unit.node.rotation[1] = unit.rest[1] - car.steer * 0.38;
      }
    } else if (drive.type === 'legs') {
      // Legs stride in alternating pairs, and the body bobs with each step.
      stride += car.speed * dt * 0.9;
      units.forEach((unit, i) => {
        const opposite = (i % 2 === 0) === unit.front ? 0 : Math.PI;
        unit.node.rotation[0] = unit.rest[0] + Math.sin(stride + opposite) * drive.swing * pace;
      });
      lean.position[1] = Math.abs(Math.sin(stride)) * 0.07 * pace;
    }
  }

  return { node, animate };
}
