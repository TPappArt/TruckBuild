import { tileOf } from '../engine/atlas.js';
import { ball, box, cylinder, decal, lathe, pointAlong, prism, quad, roundedBox, stretch } from '../engine/geometry.js';
import { material } from '../engine/materials.js';
import { Node } from '../engine/node.js';

// A small vocabulary for modelling parts in code. Each call adds one mesh to
// the part and returns its node, so a part reads as a list of shapes:
//
//   const k = kit();
//   k.box('paint', [1.2, 0.4, 2.4], { at: [0, 0.2, 0], r: 0.12 });
//   k.cyl('metal', { r: 0.1, len: 0.8, axis: 'z' }, { at: [0, 0.5, 1] });
//   return k.node;
//
// Units are metres. +z is forward, +y is up and +x is the vehicle's left.
// The first argument is always a material role from engine/materials.js.
//
// A decal is a picture from the atlas on a flat card (see engine/atlas.js):
//
//   k.decal('tagZap', [4, 2], { at: [0, 1.5, 3.01] });   // faces +z
//
// Triangle cost per call:
//   box    44          slab  12           quad  2
//   cyl    2 * seg, plus seg per cap      disc  seg
//   ball   2 * seg * (rings - 1)          dome  seg * (2 * rings - 1)
//   lathe  2 * seg per band (seg where a band touches the axis)
//   prism  4 * points - 4
//   decal  2

// Decals bring their own colours: they are drawn on white, and not shiny.
const PICTURE = material('#ffffff', { spec: 0.05 });

export function kit(node = new Node()) {
  const place = (role, geometry, { at, rot, scale } = {}) => {
    const mesh = new Node();
    mesh.geometry = geometry;
    mesh.role = role;
    if (at) mesh.position = [...at];
    if (rot) mesh.rotation = [...rot];
    if (scale) mesh.scale = [...scale];
    node.add(mesh);
    return mesh;
  };

  return {
    node,

    /** Rounded box. size = [x, y, z]; options: r (corner radius), deform. */
    box: (role, size, options = {}) =>
      place(role, roundedBox(size[0], size[1], size[2], { r: options.r, deform: options.deform }), options),

    /** Sharp-edged box for small details. */
    slab: (role, size, options) => place(role, box(size[0], size[1], size[2]), options),

    /** Flat rectangle facing up. size = [x, z]. */
    quad: (role, size, options) => place(role, quad(size[0], size[1]), options),

    /** Cylinder or cone frustum: { r, r2, len, seg, caps, axis }. r is at the +axis end. */
    cyl: (role, { axis = 'x', ...shape }, options) => place(role, pointAlong(cylinder(shape), axis), options),

    /** Flat disc facing along +axis: { r, seg, axis }. */
    disc: (role, { r, seg = 8, axis = 'x' }, options) =>
      place(role, pointAlong(lathe([[0, 0], [r, 0]], seg), axis), options),

    /** Sphere: { r, seg, rings, squash: [x, y, z] }. */
    ball: (role, { squash, ...shape }, options) => {
      const geometry = pointAlong(ball(shape), 'y');
      return place(role, squash ? stretch(geometry, ...squash) : geometry, options);
    },

    /** Upper half of a sphere, open underneath: { r, seg, rings, squash }. */
    dome: (role, { squash, ...shape }, options) => {
      const geometry = pointAlong(ball({ ...shape, half: true }), 'y');
      return place(role, squash ? stretch(geometry, ...squash) : geometry, options);
    },

    /** Surface of revolution: profile of [radius, along-axis] points, { seg, axis }. */
    lathe: (role, profile, { seg = 12, axis = 'x' } = {}, options) =>
      place(role, pointAlong(lathe(profile, seg), axis), options),

    /** Extruded outline: points, { depth, axis, smooth }. See engine/geometry.js. */
    prism: (role, points, shape, options) => place(role, prism(points, shape), options),

    /** A picture from the atlas, `size` = [width, height], facing +z. Its back is not drawn. */
    decal: (name, size, options) => place(PICTURE, decal(size[0], size[1], tileOf(name).id), options),

    /** A nested group with its own position and rotation, e.g. for a moving arm. */
    sub: ({ at, rot, scale, motion } = {}) => {
      const group = new Node();
      if (at) group.position = [...at];
      if (rot) group.rotation = [...rot];
      if (scale) group.scale = [...scale];
      if (motion) group.motion = motion;
      node.add(group);
      return kit(group);
    },
  };
}

/** Deform helper: narrows a box toward its top. Scales are for the top face. */
export const taperTop = (height, scaleX, scaleZ, shiftZ = 0) => (p) => {
  const t = p[1] / height + 0.5;
  p[0] *= 1 + (scaleX - 1) * t;
  p[2] = p[2] * (1 + (scaleZ - 1) * t) + shiftZ * t;
};

/** Deform helper: narrows a box toward its bottom. Scales are for the bottom face. */
export const taperBottom = (height, scaleX, scaleZ) => (p) => {
  const t = 0.5 - p[1] / height;
  p[0] *= 1 + (scaleX - 1) * t;
  p[2] *= 1 + (scaleZ - 1) * t;
};
