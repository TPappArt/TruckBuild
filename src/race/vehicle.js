import { bake } from '../engine/bake.js';
import { setPaint } from '../engine/materials.js';
import { Node } from '../engine/node.js';
import { findPart } from '../parts/catalog.js';
import { buildVehicle } from '../vehicle.js';

// A vehicle prepared for racing.
//
// The garage draws a vehicle piece by piece. On track that would be dozens
// of draw calls per car, so here the body, extra and weapon are merged into
// one mesh, and the wheels (or tracks, or legs) share one more. Parts that
// move on their own (a saw blade, a hammer arm, a booster flame) are merged
// separately so they can keep moving. A car costs two to six draw calls
// however elaborate the build.
//
// Returns { node, animate(car, dt) }. Place `node` at the car's position.

/** Copies a node's position, rotation and scale, and nothing else. */
function shell(node) {
  const copy = new Node();
  copy.position = [...node.position];
  copy.rotation = [...node.rotation];
  copy.scale = [...node.scale];
  return copy;
}

/**
 * Pulls every self-moving piece (a node with `motion`) out of a tree, so the
 * rest can be merged. Each comes back with the chain of nodes above it.
 */
function detachMoving(root) {
  const found = [];
  const visit = (node, above) => {
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child.motion) {
        node.children.splice(i, 1);
        found.push({ piece: child, above: [...above, node] });
      } else {
        visit(child, [...above, node]);
      }
    }
  };
  visit(root, []);
  return found;
}

export function buildRaceVehicle(build) {
  setPaint(build.paint);
  const { root, slots } = buildVehicle(build);
  const drive = findPart('wheels', build.wheels).drive;

  const upper = new Node();
  upper.children = root.children.filter((child) => child !== slots.wheels);

  // Moving pieces: merge each on its own, then hang it from a copy of the
  // chain it was on, so it ends up exactly where it was.
  const moving = detachMoving(upper).map(({ piece, above }) => {
    const holder = new Node();
    holder.children = piece.children;
    const part = shell(piece);
    part.geometry = bake(holder).children[0].geometry;

    let top = part;
    for (let i = above.length - 1; i >= 1; i--) {
      const link = shell(above[i]);
      link.add(top);
      top = link;
    }
    return { top, part, motion: piece.motion, rest: [...piece.rotation] };
  });

  const body = bake(upper);

  // Every wheel is a copy of the same unit, so bake one and share it.
  let shared = null;
  const units = slots.wheels.children.map((unit) => {
    if (!shared) {
      const holder = new Node();
      holder.children = unit.children;
      shared = bake(holder).children[0].geometry;
    }
    const copy = shell(unit);
    copy.geometry = shared;
    return { node: copy, rest: [...unit.rotation], front: unit.position[2] > 0 };
  });

  // `lean` carries everything, so the whole car can roll into corners.
  const node = new Node();
  const lean = new Node();
  node.add(lean);
  lean.add(body, ...units.map((unit) => unit.node), ...moving.map((entry) => entry.top));

  let stride = 0;
  let clock = Math.random() * 10;

  function animate(car, dt) {
    clock += dt;
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

    // Weapons that are always on never stop: saws spin, hammers pound.
    for (const { part, motion, rest } of moving) {
      if (motion.type === 'spin') {
        part.rotation[0] += motion.speed * 2 * dt;
      } else if (motion.type === 'swing') {
        const amount = motion.raceAmount ?? motion.amount;
        const speed = motion.raceSpeed ?? motion.speed;
        part.rotation[0] = rest[0] + amount * (0.5 + 0.5 * Math.sin(clock * speed)) * 1.6 - amount * 0.6;
      } else if (motion.type === 'flicker') {
        // A booster flame: longer the faster the car goes.
        const wide = 1 + 0.12 * Math.sin(clock * 31);
        part.scale = [wide, wide, 0.5 + pace * 1.3 + 0.2 * Math.sin(clock * 43)];
      }
    }
  }

  return { node, animate };
}
