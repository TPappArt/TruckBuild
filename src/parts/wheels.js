import { Node } from '../engine/node.js';
import { kit } from './kit.js';

// Things a vehicle stands and moves on.
//
// Each entry has:
//   unit()        one wheel, track or leg - the mesh the triangle budget
//                 applies to. Its outer side faces +x.
//   place(mounts) all of them, positioned for a body, standing on y = 0.
//   rideHeight    how far above the ground the body's axle line sits.
//   drive         how it moves in a race: { type: 'wheels', radius } roll and
//                 steer, { type: 'legs' } stride, { type: 'tracks' } stay put.

const TAU = Math.PI * 2;

/** Puts a copy of `unit` at each of the four axle ends, mirrored on the left. */
function atCorners(unit, { axles }, offset, y) {
  const group = new Node();
  for (const z of [axles.front, axles.rear]) {
    for (const side of [1, -1]) {
      const copy = unit.clone();
      copy.position = [side * (axles.halfWidth + offset), y, z];
      copy.scale = [side, 1, 1];
      group.add(copy);
    }
  }
  return group;
}

/** Puts a copy of `unit` on each side, mirrored on the left. */
function onSides(unit, { axles }, offset, y) {
  const group = new Node();
  for (const side of [1, -1]) {
    const copy = unit.clone();
    copy.position = [side * (axles.halfWidth + offset), y, (axles.front + axles.rear) / 2];
    copy.scale = [side, 1, 1];
    group.add(copy);
  }
  return group;
}

function kartWheel() {
  const k = kit();
  // Tyre: fat, with soft shoulders. Closed on the inner side.
  k.lathe('rubber', [[0.2, 0.16], [0.31, 0.16], [0.36, 0.08], [0.36, -0.08], [0.31, -0.16], [0, -0.16]]);
  // Dished hub cap and a centre nut.
  k.lathe('white', [[0, 0.09], [0.14, 0.1], [0.2, 0.16]]);
  k.cyl('red', { r: 0.05, len: 0.06, seg: 6, caps: 'start' }, { at: [0.11, 0, 0] });
  return k.node;
}

function monsterWheel() {
  const k = kit();
  k.lathe('rubber', [[0.3, 0.25], [0.48, 0.25], [0.57, 0.15], [0.57, -0.15], [0.48, -0.25], [0, -0.25]], { seg: 10 });
  // A star-shaped ring through the tyre: only its tips show, as chunky knobs.
  const knobs = [];
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * TAU;
    const radius = i % 2 ? 0.55 : 0.66;
    knobs.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  k.prism('rubber', knobs, { depth: 0.3, axis: 'x' });
  k.lathe('accent', [[0, 0.12], [0.2, 0.14], [0.3, 0.25]], { seg: 10 });
  return k.node;
}

function track(length = 2.5) {
  const k = kit();
  const r = 0.3;
  const half = length / 2 - r;
  // Belt: a stadium shape seen from the side.
  const belt = [];
  for (let i = 0; i <= 4; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    belt.push([half + r * Math.cos(angle), r + r * Math.sin(angle)]);
  }
  for (let i = 0; i <= 4; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 4;
    belt.push([-half + r * Math.cos(angle), r + r * Math.sin(angle)]);
  }
  k.prism('rubber', belt, { depth: 0.4, axis: 'x', smooth: 50 });
  // Road wheels on the outer face.
  for (const z of [-half, 0, half]) {
    k.cyl('accent', { r: 0.19, len: 0.06, seg: 8, caps: 'start' }, { at: [0.22, r, z] });
  }
  // Cleats along the top run and at each end.
  for (const z of [-half * 0.66, 0, half * 0.66]) {
    k.slab('dark', [0.46, 0.05, 0.14], { at: [0, r * 2, z] });
  }
  for (const end of [-1, 1]) {
    k.slab('dark', [0.46, 0.14, 0.05], { at: [0, r, end * (half + r)] });
  }
  return k.node;
}

function mechLeg() {
  const k = kit();
  // Origin is the hip. The leg bends forward at the knee, walker style.
  k.cyl('accent', { r: 0.2, len: 0.26, seg: 8 }, { at: [0.13, 0, 0] });
  k.box('paint', [0.26, 0.6, 0.3], { at: [0.17, -0.24, 0.12], rot: [-0.5, 0, 0], r: 0.09 });
  k.cyl('dark', { r: 0.14, len: 0.32, seg: 8 }, { at: [0.17, -0.48, 0.25] });
  k.box('metal', [0.18, 0.52, 0.2], { at: [0.17, -0.7, 0.14], rot: [0.45, 0, 0], r: 0.07 });
  k.box('dark', [0.38, 0.14, 0.62], { at: [0.17, -0.93, 0.1], r: 0.06 });
  return k.node;
}

function spiderLeg() {
  const k = kit();
  // Origin is the shoulder. The leg arches up and out, then down to a point.
  k.ball('dark', { r: 0.15, seg: 6, rings: 3 });
  const upper = k.sub({ rot: [0, 0, 0.54] });
  upper.box('paint', [0.62, 0.16, 0.18], { at: [0.3, 0, 0], r: 0.06 });
  k.ball('accent', { r: 0.12, seg: 6, rings: 3 }, { at: [0.5, 0.3, 0] });
  const lower = k.sub({ at: [0.5, 0.3, 0], rot: [0, 0, -1.33] });
  lower.cyl('metal', { r: 0.03, r2: 0.08, len: 1.0, seg: 6, caps: 'none' }, { at: [0.5, 0, 0] });
  k.ball('dark', { r: 1, seg: 6, rings: 3, squash: [0.1, 0.06, 0.1] }, { at: [0.74, -0.66, 0] });
  return k.node;
}

export const WHEELS = [
  {
    id: 'kart-wheels',
    name: 'Kart Wheels',
    rideHeight: 0.36,
    drive: { type: 'wheels', radius: 0.36 },
    unit: kartWheel,
    place: (mounts) => atCorners(kartWheel(), mounts, 0.18, 0.36),
  },
  {
    id: 'monster-wheels',
    name: 'Monster Wheels',
    rideHeight: 0.66,
    drive: { type: 'wheels', radius: 0.66 },
    unit: monsterWheel,
    place: (mounts) => atCorners(monsterWheel(), mounts, 0.28, 0.66),
  },
  {
    id: 'tank-treads',
    name: 'Tank Treads',
    rideHeight: 0.3,
    drive: { type: 'tracks' },
    unit: track,
    place: (mounts) => onSides(track(mounts.axles.front - mounts.axles.rear + 0.8), mounts, 0.22, 0),
  },
  {
    id: 'mech-legs',
    name: 'Mech Legs',
    rideHeight: 1.0,
    drive: { type: 'legs', swing: 0.5 },
    unit: mechLeg,
    place: (mounts) => onSides(mechLeg(), mounts, 0, 1.0),
  },
  {
    id: 'spider-legs',
    name: 'Spider Legs',
    rideHeight: 0.72,
    drive: { type: 'legs', swing: 0.3 },
    unit: spiderLeg,
    place: (mounts) => {
      const group = atCorners(spiderLeg(), mounts, -0.05, 0.72);
      // Splay the front pair forward and the rear pair back.
      for (const leg of group.children) {
        const forward = leg.position[2] > (mounts.axles.front + mounts.axles.rear) / 2 ? 1 : -1;
        leg.rotation[1] = -0.55 * forward * leg.scale[0];
      }
      return group;
    },
  },
];
