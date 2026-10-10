import { bake } from './engine/bake.js';
import { linear, material } from './engine/materials.js';
import { Node } from './engine/node.js';
import { kit } from './parts/kit.js';
import { bunting, cone, hayBale, tyreStack } from './race/dressing.js';
import { buildRaceVehicle } from './race/vehicle.js';
import { buildSky, seeded } from './race/world.js';

// What is behind the start screen: the player's car and a few rivals coming
// over the brow of a hill and jumping straight at the camera, which lies in
// the road at the bottom looking up.
//
// The camera is low and its lens is wide, so a car that passes close fills
// the screen while the one behind it is still small against the sky (forced
// perspective). Most land just in front of the lens and tear past beside
// it; one goes over the top. Their time in the air is slowed down; streaks
// of light rushing past the camera are not, which is what makes it feel
// fast.
//
// It is a little scene of its own, not one of the tracks: a ridge with a road
// over it, built here in a few hundred triangles.
//
// Directions: the cars travel along +z, toward the camera. +y is up.

const CREST = 6.5; // metres the brow of the hill stands above the camera's end of the road
const SPREAD = 17; // how far the hill reaches either side of its brow, along the road
const ROAD = 7; // half the width of the tarmac
const KERB = 1;
const CAMERA_Z = 26.5; // the camera lies in the road this far down the near side

// A jump, in the car's own time. Each car leaves the brow at this speed with
// a spring upward of its own (LANES below), and comes down where that takes
// it: most land a car's length in front of the camera and tear past beside
// it, and the one in the middle goes over the top.
const SPEED = 17; // m/s along the road
const GRAVITY = 9;
const RUN_UP = 30; // metres of road before the brow, out of sight behind it
const GONE = 34; // metres past the brow at which a car is behind the camera and starts again

// How fast each part of that is shown. The time in the air is slowed right
// down, which is when the car is growing from a speck to the whole screen.
const PACE = { run: 1.7, air: 0.4, away: 0.85 };

// [metres left of the centre line, m/s of spring upward off the brow]
const LANES = [[0.8, 4.3], [-3.4, 2.5], [3.6, 2.7], [-6.0, 3.0], [5.9, 2.4]];

const STREAK_TILE = 90; // metres: the block of streaks repeats this often along the road
const STREAK_SPEED = 78;

const hill = (z) => CREST * Math.exp(-(z * z) / (SPREAD * SPREAD));
const slope = (z) => hill(z) * ((-2 * z) / (SPREAD * SPREAD));

/** Height of the ground. Level across the road; banks rise and roll to either side of it. */
function ground(x, z) {
  const out = Math.max(0, Math.abs(x) - (ROAD + KERB + 3));
  const roll = Math.sin(x * 0.21 + z * 0.13) * 0.7 + Math.sin(x * 0.09 - z * 0.17) * 0.9;
  return hill(z) * (1 + 0.01 * out) + 0.011 * out * out + roll * Math.min(1, out / 7);
}

/** Collects triangles, each flat shaded in its own colour, into one mesh. */
function createFaces() {
  const data = { positions: [], normals: [], colors: [], indices: [] };
  const triangle = (a, b, c, colour) => {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    // Everything here is ground: its visible side is the top.
    const flip = ny < 0;
    nx /= flip ? -length : length;
    ny /= flip ? -length : length;
    nz /= flip ? -length : length;
    const base = data.positions.length / 3;
    for (const p of flip ? [a, c, b] : [a, b, c]) {
      data.positions.push(p[0], p[1], p[2]);
      data.normals.push(nx, ny, nz);
      data.colors.push(colour[0], colour[1], colour[2]);
    }
    data.indices.push(base, base + 1, base + 2);
  };
  return {
    /** A four-cornered patch, corners in order round its edge. */
    patch(a, b, c, d, colour) {
      triangle(a, b, c, colour);
      triangle(a, c, d, colour);
    },
    finish() {
      const node = new Node();
      const count = data.positions.length / 3;
      const params = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) params[i * 3 + 1] = 1; // no shine, no glow
      node.geometry = {
        positions: new Float32Array(data.positions),
        normals: new Float32Array(data.normals),
        colors: new Float32Array(data.colors),
        params,
        indices: new Uint16Array(data.indices),
        triangles: data.indices.length / 3,
      };
      return node;
    },
  };
}

/** The hill, the road over it and its kerbs. */
function buildTerrain(random) {
  const faces = createFaces();
  const grass = ['#58b947', '#4cab3f', '#63c452'].map(linear);
  const verge = ['#8fd067', '#84c65d'].map(linear);
  const tarmac = ['#4b4e59', '#474a55'].map(linear);
  const kerbs = ['#f23a2f', '#f6f3ea'].map(linear);
  const line = linear('#ffd23f');

  // Strips across the scene, narrow where it matters (the road) and wide
  // out on the banks.
  const xs = [-95, -70, -52, -40, -31, -24, -18, -14, -ROAD - KERB - 3, -ROAD - KERB, -ROAD, 0, ROAD, ROAD + KERB, ROAD + KERB + 3, 14, 18, 24, 31, 40, 52, 70, 95];
  const step = 1.5;
  let row = 0;
  for (let z = -42; z < 48; z += step, row++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const middle = Math.abs((x0 + x1) / 2);
      let colour;
      if (middle < ROAD) colour = tarmac[(row >> 2) % 2];
      else if (middle < ROAD + KERB) colour = kerbs[(row >> 1) % 2];
      else if (middle < ROAD + KERB + 3) colour = verge[row % 2];
      else colour = grass[Math.floor(random() * grass.length)];
      const corner = (x, at) => [x, ground(x, at), at];
      faces.patch(corner(x0, z), corner(x1, z), corner(x1, z + step), corner(x0, z + step), colour);
    }
    // The centre line: dashes, a finger above the tarmac.
    if (row % 4 < 2) {
      const dash = (at) => hill(at) + 0.03;
      faces.patch([-0.22, dash(z), z], [0.22, dash(z), z], [0.22, dash(z + step), z + step], [-0.22, dash(z + step), z + step], line);
    }
  }
  return faces.finish();
}

/** A fir tree: three cones on a trunk. About 50 triangles. */
function fir(needles, dark, trunk) {
  const k = kit();
  k.cyl(trunk, { r: 0.28, len: 1.6, seg: 5, caps: 'none', axis: 'y' }, { at: [0, 0.8, 0] });
  k.lathe(dark, [[0, 4.2], [1.9, 1.3]], { seg: 6, axis: 'y' });
  k.lathe(needles, [[0, 5.6], [1.5, 3.2]], { seg: 6, axis: 'y' });
  k.lathe(needles, [[0, 6.8], [1.0, 4.9]], { seg: 6, axis: 'y' });
  return k.node;
}

/** Everything standing beside the road, merged into one mesh. */
function buildDressing(random) {
  const set = new Node();
  const put = (prop, x, z, { turn = 0, scale = 1, lift = 0 } = {}) => {
    const copy = prop.clone();
    const y = ground(x, z) + lift;
    copy.position = [x, y, z];
    copy.rotation[1] = turn;
    copy.scale = [scale, scale, scale];
    copy.floor = y;
    const light = 0.9 + random() * 0.2;
    copy.tint = [light, light, light];
    set.add(copy);
  };

  const tree = fir(material('#2f9a4d', { spec: 0.05 }), material('#237a3c', { spec: 0.05 }), material('#7a5234', { spec: 0.05 }));
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1;
    put(tree, side * random.range(15, 78), random.range(-34, 40), { turn: random() * 6, scale: random.range(0.8, 1.7) });
  }

  // Flags strung over the brow, where the cars leave the ground.
  const flags = ['#f23a2f', '#ffd23f', '#2f7df2', '#f6f3ea', '#31c45a'].map((hex) => material(hex, { spec: 0.1 }));
  put(bunting(24, flags, { flags: 16, height: 7 }), 0, -1);

  // The edge of the road down the near side, where the camera is.
  const tyres = tyreStack(material('#f23a2f', { spec: 0.15 }));
  const marker = cone(material('#ff7a1a', { spec: 0.15 }));
  const bale = hayBale();
  for (const side of [1, -1]) {
    const x = side * (ROAD + KERB + 1.2);
    for (const z of [3, 9, 15]) put(tyres, x, z);
    for (const z of [6, 12, 18, 21]) put(marker, x - side * 0.5, z);
    put(bale, x + side * 0.4, 24, { turn: 0.3 * side });
    put(bale, x + side * 0.9, 26.6, { turn: 1.2 });
  }
  return bake(set, { contact: { height: 1.4, dark: 0.2 } });
}

/** Thin bright lines lying along the road, scattered through a block of air. */
function buildStreaks(random) {
  const looks = [material('#ffffff', { glow: 1 }), material('#fff1a8', { glow: 1 }), material('#bfe6ff', { glow: 1 })];
  const k = kit();
  for (let i = 0; i < 64; i++) {
    const side = i % 2 ? 1 : -1;
    const length = random.range(3.5, 10);
    k.slab(random.pick(looks), [0.045, 0.045, length], {
      at: [side * random.range(1.4, 19), random.range(0.45, 13), random() * STREAK_TILE],
    });
  }
  return bake(k.node).children[0].geometry;
}

/**
 * builds: the vehicles to show, the player's first ([{ wheels, body, ... }]).
 * Returns { update(dt), render(), picture(), dispose() }.
 */
export function createIntro(renderer, view, builds) {
  const random = seeded(2026);
  const theme = {
    seed: 11,
    sky: { top: '#1668d6', disc: { color: '#fff6c8', size: 5, halo: '#ffe89a' }, clouds: { count: 10, color: '#ffffff', shade: '#dbe8ff' } },
    fog: { color: '#bfe3ff', density: 0.0042 },
    light: [0.42, 0.78, 0.46],
  };
  const length = Math.hypot(...theme.light);
  const light = theme.light.map((value) => value / length);
  const fog = { color: linear(theme.fog.color), density: theme.fog.density };
  const lighting = { sun: [1.0, 0.96, 0.86], sky: [0.62, 0.76, 1.0], bounce: [0.5, 0.58, 0.42] };

  const sky = buildSky(theme);
  const terrain = buildTerrain(random);
  const dressing = buildDressing(random);
  const streakShape = buildStreaks(random);
  const streaks = [new Node(), new Node()];
  for (const node of streaks) node.geometry = streakShape;
  terrain.updateWorld();

  // Each car has a lane of its own, so they fan out as they come. The
  // first (the player's) is the one that goes over the lens.
  const cars = builds.slice(0, LANES.length).map((build, i) => ({
    ...buildRaceVehicle(build),
    x: LANES[i][0],
    spring: LANES[i][1],
    roll: random.range(-0.18, 0.18),
    wobble: random() * 6,
    phase: 'wait', // 'wait' | 'run' | 'air' | 'away'
    wait: i * 1.35, // seconds before it sets off
    t: 0, // the car's own clock within its phase
    z: -RUN_UP,
    landed: 0, // how hard it came down, fading: squashes it onto its wheels
    driving: { speed: SPEED, steer: 0 },
  }));
  const camera = { eye: [0, 1, CAMERA_Z], target: [0, 7, 2], fov: 1.25, near: 0.25, far: 420 };
  let clock = 0;
  let squeeze = 1; // on a tall screen the lanes are brought in, to keep the cars in the picture

  /** Moves one car on by `dt` seconds as watched. */
  function drive(car, dt) {
    const node = car.node;
    let y = 0;
    let pitch = 0;
    let roll = 0;
    if (car.phase === 'wait') {
      car.wait -= dt;
      if (car.wait <= 0) {
        car.phase = 'run';
        car.z = -RUN_UP;
      }
      // Out of sight, down behind the hill.
      car.z = -RUN_UP;
      y = hill(car.z);
    } else if (car.phase === 'run') {
      // Up the far side, flat out.
      car.z += SPEED * PACE.run * dt;
      y = hill(car.z);
      pitch = -Math.atan(slope(car.z));
      if (car.z >= 0) {
        car.phase = 'air';
        car.t = 0;
      }
    } else if (car.phase === 'air') {
      // Off the brow: a thrown ball's path, watched in slow motion.
      car.t += PACE.air * dt;
      car.z = SPEED * car.t;
      y = CREST + car.spring * car.t - (GRAVITY / 2) * car.t * car.t;
      const rise = car.spring - GRAVITY * car.t;
      // Nose up as it leaves, level again by the time it comes down.
      pitch = -Math.atan(rise / SPEED) * 0.55 - 0.16 * Math.max(0, 1 - car.t / 0.7);
      roll = car.roll * Math.sin(Math.min(1, car.t / 1.5) * Math.PI) + 0.03 * Math.sin(clock * 5 + car.wobble);
      if (y <= hill(car.z)) {
        car.phase = 'away';
        car.landed = 1;
      }
    }
    if (car.phase === 'away') {
      // Down, and away past the camera.
      car.z += SPEED * PACE.away * dt;
      car.landed *= Math.exp(-dt * 7);
      y = hill(car.z);
      pitch = -Math.atan(slope(car.z)) + 0.1 * car.landed * Math.sin(car.landed * 9);
      if (car.z > GONE) {
        car.phase = 'wait';
        car.wait = 0.25 + ((car.wobble * 7) % 1) * 0.9;
      }
    }
    node.position = [car.x * squeeze, y, car.z];
    node.rotation = [pitch, 0.05 * Math.sin(clock * 1.3 + car.wobble), roll];
    // Squashed down for a moment as it lands.
    node.scale = [1 + 0.1 * car.landed, 1 - 0.22 * car.landed, 1 + 0.06 * car.landed];
    car.driving.steer = 0.5 * Math.sin(clock * 2.1 + car.wobble);
    car.animate(car.driving, dt);
    node.updateWorld();
    return Math.hypot(car.x * squeeze - camera.eye[0], y + 0.8 - camera.eye[1], car.z - CAMERA_Z);
  }

  function step(dt) {
    for (const car of cars) drive(car, dt);
  }

  function update(dt) {
    clock += dt;
    let nearest = Infinity;
    for (const car of cars) nearest = Math.min(nearest, drive(car, dt));

    // Streaks rush past the camera, a block of them and the block behind it.
    const along = (clock * STREAK_SPEED) % STREAK_TILE;
    streaks[0].position = [0, 0, along - 52];
    streaks[1].position = [0, 0, along - 52 - STREAK_TILE];
    for (const node of streaks) node.updateWorld();

    // The camera lies in the road looking up at the brow. It sways a little,
    // and shudders as a car goes by.
    const shudder = Math.max(0, 1 - nearest / 9);
    const aspect = view.width / view.height;
    camera.eye = [
      0.2 + 0.3 * Math.sin(clock * 0.37) + 0.06 * shudder * Math.sin(clock * 53),
      hill(CAMERA_Z) + 0.55 + 0.06 * Math.sin(clock * 0.53) + 0.06 * shudder * Math.sin(clock * 67),
      CAMERA_Z,
    ];
    // A wide lens. On a tall screen it is tipped further back, so that the
    // picture is mostly sky with cars in it rather than mostly road.
    const tall = aspect < 1;
    squeeze = tall ? 0.55 : 1;
    camera.target = [0.2 + 0.4 * Math.sin(clock * 0.29), CREST + (tall ? 7 : 2.2), 0];
    camera.fov = tall ? 1.5 : aspect < 1.25 ? 1.4 : 1.3;
  }

  function render(sharpness = view.pixelRatio) {
    renderer.setSize(view.width, view.height, sharpness);
    renderer.render({
      camera,
      light,
      lighting,
      fog,
      grain: 0.12,
      sky,
      solids: [terrain, dressing, ...streaks, ...cars.map((car) => car.node)],
    });
  }

  // Begin with some of them already on their way.
  for (let i = 0; i < 170; i++) step(1 / 30);
  update(0);

  return {
    update,
    render: () => render(),
    /**
     * The scene as it is this instant, as a JPEG data URL. It is for going
     * behind a loading screen, so it is kept small: about a thousand pixels
     * on its longer side, which is quick to make and light to hold.
     */
    picture() {
      render(Math.min(view.pixelRatio, 1000 / Math.max(view.width, view.height)));
      return renderer.canvas.toDataURL('image/jpeg', 0.8);
    },
    /** Frees what the scene held in graphics memory. It cannot be drawn again. */
    dispose() {
      for (const node of [sky, terrain, dressing, streaks[0], ...cars.map((car) => car.node)]) renderer.release(node);
    },
  };
}
