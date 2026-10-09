import { Node } from './engine/node.js';
import { findPart } from './parts/catalog.js';

// Assembles a vehicle from a build ({ wheels, body, extra, weapon }).
//
// The result stands on y = 0 facing +z. `slots` gives the node for each
// category so the garage can animate just the part that changed.
export function buildVehicle(build) {
  const wheels = findPart('wheels', build.wheels);
  const body = findPart('body', build.body);
  const extra = findPart('extra', build.extra);
  const weapon = findPart('weapon', build.weapon);

  const root = new Node();
  const slots = {};

  slots.wheels = wheels.place(body.mounts);
  root.add(slots.wheels);

  // Everything else rides on the body, lifted to the running gear's height.
  const chassis = new Node();
  chassis.position[1] = wheels.rideHeight;
  root.add(chassis);

  slots.body = body.unit();
  chassis.add(slots.body);

  for (const [slot, part] of [['extra', extra], ['weapon', weapon]]) {
    if (!part) continue;
    slots[slot] = attach(part, body.mounts);
    chassis.add(slots[slot]);
  }

  return { root, slots };
}

/** Positions a part on the body mount it asks for. Side parts are mirrored. */
function attach(part, mounts) {
  const holder = new Node();
  const mount = mounts[part.slot];
  if (part.slot === 'side') {
    for (const side of [1, -1]) {
      const unit = part.unit();
      unit.position = [side * mount[0], mount[1], mount[2]];
      unit.scale = [side, 1, 1];
      holder.add(unit);
    }
  } else {
    holder.position = [...mount];
    holder.add(part.unit());
  }
  return holder;
}
