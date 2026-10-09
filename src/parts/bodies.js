import { kit, taperBottom, taperTop } from './kit.js';

// Vehicle bodies.
//
// A body is modelled around its axle line: y = 0 is the height of the wheel
// centres, x = 0 and z = 0 are the middle of the vehicle, and +z is forward.
//
// `mounts` says where everything else attaches, in the same coordinates:
//   axles    front and rear axle positions (z) and the half track width (x)
//   top      weapons that sit on the vehicle (turrets, hammer)
//   front    weapons that stick out ahead (flipper, saw)
//   rearTop  spoilers and fins, at the top of the tail
//   rear     things bolted to the back (booster)
//   side     the +x (left) side; side parts are mirrored onto the other

function kart() {
  const k = kit();
  k.box('paint', [1.0, 0.26, 2.0], { at: [0, 0.05, -0.1], r: 0.1 });
  k.box('paint', [0.95, 0.24, 0.9], {
    at: [0, 0.06, 1.1],
    r: 0.1,
    deform: (p) => {
      p[0] *= 1 - 0.4 * (p[2] / 0.9 + 0.5); // narrow toward the nose
    },
  });
  k.box('dark', [0.52, 0.5, 0.16], { at: [0, 0.4, -0.28], rot: [-0.2, 0, 0], r: 0.07 });
  k.box('white', [0.72, 0.3, 0.62], { at: [0, 0.3, -0.72], r: 0.1 });
  k.cyl('dark', { r: 0.15, len: 0.05, seg: 6, axis: 'z' }, { at: [0, 0.4, 0.42], rot: [0.5, 0, 0] });
  return k.node;
}

function pickup() {
  const k = kit();
  k.box('paint', [1.3, 0.5, 2.6], { at: [0, 0.3, 0], r: 0.14 });
  // Cab: a glass greenhouse with a painted roof.
  k.box('glass', [1.14, 0.42, 0.95], { at: [0, 0.74, 0.2], r: 0.1, deform: taperTop(0.42, 0.88, 0.72, -0.06) });
  k.box('paint', [1.04, 0.1, 0.74], { at: [0, 0.97, 0.14], r: 0.05 });
  k.box('metal', [1.36, 0.16, 0.2], { at: [0, 0.12, 1.3], r: 0.07 });
  for (const side of [1, -1]) {
    k.disc('light', { r: 0.11, axis: 'z' }, { at: [side * 0.42, 0.38, 1.305] });
  }
  k.quad('dark', [1.06, 1.0], { at: [0, 0.555, -0.72] });
  return k.node;
}

function bulldog() {
  const k = kit();
  k.box('paint', [1.3, 0.42, 2.7], { at: [0, 0.16, 0], r: 0.12, deform: taperBottom(0.42, 1, 0.78) });
  // Wide upper deck that overhangs the running gear.
  k.box('paint', [1.56, 0.3, 2.3], { at: [0, 0.5, -0.05], r: 0.12, deform: taperTop(0.3, 0.82, 0.8) });
  k.cyl('dark', { r: 0.2, len: 0.08, caps: 'start', axis: 'y' }, { at: [0.36, 0.67, 0.5] });
  for (const side of [1, -1]) {
    k.ball('light', { r: 0.1, seg: 6, rings: 3 }, { at: [side * 0.5, 0.66, 0.78] });
    k.cyl('metal', { r: 0.07, len: 0.45, seg: 6, caps: 'start', axis: 'y' }, { at: [side * 0.5, 0.8, -0.9] });
  }
  return k.node;
}

function bug() {
  const k = kit();
  k.ball('paint', { r: 1, seg: 10, rings: 6, squash: [0.76, 0.56, 1.22] }, { at: [0, 0.38, 0] });
  k.dome('glass', { r: 1, seg: 8, rings: 3, squash: [0.52, 0.42, 0.56] }, { at: [0, 0.72, 0.08] });
  for (const side of [1, -1]) {
    k.ball('light', { r: 0.14, seg: 6, rings: 3 }, { at: [side * 0.4, 0.6, 0.92] });
  }
  k.slab('metal', [0.9, 0.08, 0.1], { at: [0, 0.1, 1.12] });
  return k.node;
}

function tub() {
  const k = kit();
  k.box('paint', [1.2, 0.62, 2.3], { at: [0, 0.36, 0], r: 0.16, deform: taperBottom(0.62, 0.78, 0.84) });
  k.box('white', [1.34, 0.12, 2.44], { at: [0, 0.7, 0], r: 0.06 });
  k.quad('glass', [1.1, 2.2], { at: [0, 0.765, 0] });
  // Tap on one rim.
  k.cyl('metal', { r: 0.06, len: 0.32, seg: 6, caps: 'start', axis: 'y' }, { at: [-0.56, 0.92, 0.35] });
  k.cyl('metal', { r: 0.05, len: 0.3, seg: 6, caps: 'start' }, { at: [-0.42, 1.04, 0.35] });
  // Rubber duck riding up front.
  k.ball('accent', { r: 1, seg: 6, rings: 3, squash: [0.17, 0.13, 0.22] }, { at: [0.15, 0.86, 0.75] });
  k.ball('accent', { r: 0.1, seg: 6, rings: 3 }, { at: [0.15, 1.02, 0.86] });
  k.lathe('hot', [[0, 0.09], [0.045, 0]], { seg: 4, axis: 'z' }, { at: [0.15, 1.0, 0.94] });
  return k.node;
}

export const BODIES = [
  {
    id: 'kart',
    name: 'Kart',
    unit: kart,
    mounts: {
      axles: { front: 0.95, rear: -0.75, halfWidth: 0.5 },
      top: [0, 0.45, -0.72],
      front: [0, 0.04, 1.52],
      rearTop: [0, 0.18, -1.05],
      rear: [0, 0.06, -1.1],
      side: [0.5, 0.08, 0.1],
    },
  },
  {
    id: 'pickup',
    name: 'Pickup',
    unit: pickup,
    mounts: {
      axles: { front: 0.85, rear: -0.85, halfWidth: 0.65 },
      top: [0, 1.02, 0.14],
      front: [0, 0.14, 1.4],
      rearTop: [0, 0.55, -1.22],
      rear: [0, 0.3, -1.3],
      side: [0.65, 0.35, 0],
    },
  },
  {
    id: 'bulldog',
    name: 'Bulldog',
    unit: bulldog,
    mounts: {
      axles: { front: 0.95, rear: -0.95, halfWidth: 0.62 },
      top: [0, 0.65, -0.2],
      front: [0, 0.12, 1.3],
      rearTop: [0, 0.63, -1.05],
      rear: [0, 0.3, -1.3],
      side: [0.72, 0.5, 0],
    },
  },
  {
    id: 'bug',
    name: 'Bug',
    unit: bug,
    mounts: {
      axles: { front: 0.7, rear: -0.7, halfWidth: 0.6 },
      top: [0, 1.1, 0.08],
      front: [0, 0.16, 1.12],
      rearTop: [0, 0.62, -0.95],
      rear: [0, 0.3, -1.18],
      side: [0.72, 0.38, 0],
    },
  },
  {
    id: 'tub',
    name: 'Tub',
    unit: tub,
    mounts: {
      axles: { front: 0.8, rear: -0.8, halfWidth: 0.5 },
      top: [0, 0.77, -0.35],
      front: [0, 0.2, 1.15],
      rearTop: [0, 0.76, -1.12],
      rear: [0, 0.35, -1.15],
      side: [0.67, 0.66, 0],
    },
  },
];
