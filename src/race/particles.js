import { tileOf } from '../engine/atlas.js';
import { Node } from '../engine/node.js';

// Little things thrown up by the cars: dust when braking hard or sliding,
// dirt, snow or sand when off the road, sparks and bits when something
// hits them, a puff when they land.
//
// Every particle is a flat picture from the atlas (atlas.js: 'puff',
// 'spark', 'chunk', 'flake') turned to face the camera. All of them are
// rebuilt into one mesh each frame and drawn in one call, so a screen full
// of dust costs no more than one more car.
//
// This file only moves them and builds the mesh; what makes them is in
// scene.js, which knows what is happening to the cars.

const MOST = 260; // particles alive at once; the oldest give way to new ones

// What each kind of particle does. Sizes are in metres (half the width of
// the picture), times in seconds.
//   tile     the picture
//   life     how long it lasts, from and to
//   size     at birth and at death
//   alpha    how solid it is at birth (it fades to nothing)
//   gravity  how fast it falls; negative rises
//   drag     how quickly it slows, per second
//   glow     1: not lit by the scene (sparks)
//   spin     how fast it may turn, radians a second
const KINDS = {
  dust: { tile: 'puff', life: [0.7, 1.2], size: [0.55, 2.0], alpha: 0.55, gravity: -0.4, drag: 2.2, glow: 0, spin: 1 },
  smoke: { tile: 'puff', life: [1.0, 1.6], size: [0.8, 3.0], alpha: 0.6, gravity: -1.6, drag: 1.4, glow: 0, spin: 0.8 },
  clod: { tile: 'chunk', life: [0.5, 0.9], size: [0.2, 0.16], alpha: 1, gravity: 16, drag: 0.6, glow: 0, spin: 9 },
  debris: { tile: 'chunk', life: [0.8, 1.3], size: [0.32, 0.24], alpha: 1, gravity: 15, drag: 0.4, glow: 0, spin: 12 },
  spark: { tile: 'spark', life: [0.25, 0.5], size: [0.5, 0.15], alpha: 1, gravity: 7, drag: 1.2, glow: 1, spin: 4 },
  flake: { tile: 'flake', life: [0.6, 1.1], size: [0.16, 0.1], alpha: 0.95, gravity: 4, drag: 1.5, glow: 0, spin: 0 },
};

const between = ([low, high]) => low + (high - low) * Math.random();

export function createParticles() {
  const alive = [];
  const tiles = Object.fromEntries(Object.entries(KINDS).map(([name, kind]) => [name, tileOf(kind.tile).id]));

  // One mesh, refilled every frame: four corners and two triangles a particle.
  const geometry = {
    positions: new Float32Array(MOST * 12),
    normals: new Float32Array(MOST * 12),
    colors: new Float32Array(MOST * 12),
    params: new Float32Array(MOST * 12),
    texs: new Float32Array(MOST * 16),
    indices: new Uint16Array(MOST * 6),
    count: 0,
    triangles: 0,
    version: 0,
  };
  for (let i = 0; i < MOST; i++) {
    geometry.indices.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  const node = new Node();
  node.geometry = geometry;
  node.updateWorld();

  /**
   * Adds one particle of `kind` at (x, y, z), moving at `velocity` [x, y, z],
   * in colour `color` (linear [r, g, b]). `scale` makes it bigger or smaller;
   * `floor` is the height of whatever it would land on.
   */
  function emit(kind, x, y, z, velocity, color, scale = 1, floor = y - 0.4) {
    const spec = KINDS[kind];
    if (alive.length >= MOST) alive.shift();
    alive.push({
      spec,
      tile: tiles[kind],
      x,
      y,
      z,
      vx: velocity[0],
      vy: velocity[1],
      vz: velocity[2],
      color,
      floor,
      age: 0,
      life: between(spec.life),
      scale: scale * (0.8 + Math.random() * 0.4),
      turn: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2 * spec.spin,
    });
  }

  /** Moves everything on by `dt` seconds. */
  function update(dt) {
    for (let i = alive.length - 1; i >= 0; i--) {
      const p = alive[i];
      p.age += dt;
      if (p.age >= p.life) {
        alive.splice(i, 1);
        continue;
      }
      const slow = Math.max(0, 1 - p.spec.drag * dt);
      p.vx *= slow;
      p.vz *= slow;
      p.vy = p.vy * slow - p.spec.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      // Bits that fall bounce once off whatever is below, and stop.
      if (p.y < p.floor) {
        p.y = p.floor;
        p.vy = Math.abs(p.vy) * 0.3;
        p.vx *= 0.5;
        p.vz *= 0.5;
      }
      p.turn += p.spin * dt;
    }
  }

  /**
   * Builds the mesh for a camera at `eye` looking at `target`. Returns the
   * node to draw, or null when there is nothing to draw.
   */
  function build(eye, target) {
    if (!alive.length) return null;
    // The camera's right and up, which every picture is laid along.
    let fx = target[0] - eye[0];
    let fy = target[1] - eye[1];
    let fz = target[2] - eye[2];
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl;
    fy /= fl;
    fz /= fl;
    let rx = -fz;
    let rz = fx;
    const rl = Math.hypot(rx, rz) || 1;
    rx /= rl;
    rz /= rl;
    // up = right x forward
    const ux = -rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy;

    const { positions, normals, colors, params, texs } = geometry;
    alive.forEach((p, i) => {
      const t = p.age / p.life;
      const size = (p.spec.size[0] + (p.spec.size[1] - p.spec.size[0]) * t) * p.scale;
      // Fade in quickly, out slowly.
      const alpha = p.spec.alpha * Math.min(1, p.age * 12) * (1 - t * t);
      const c = Math.cos(p.turn) * size;
      const s = Math.sin(p.turn) * size;
      const corners = [
        [-c + s, -s - c],
        [c + s, s - c],
        [c - s, s + c],
        [-c - s, -s + c],
      ];
      const uv = [[0, 1], [1, 1], [1, 0], [0, 0]];
      corners.forEach(([a, b], k) => {
        const v = i * 4 + k;
        positions[v * 3] = p.x + rx * a + ux * b;
        positions[v * 3 + 1] = p.y + uy * b;
        positions[v * 3 + 2] = p.z + rz * a + uz * b;
        normals[v * 3] = -fx;
        normals[v * 3 + 1] = -fy;
        normals[v * 3 + 2] = -fz;
        colors[v * 3] = p.color[0];
        colors[v * 3 + 1] = p.color[1];
        colors[v * 3 + 2] = p.color[2];
        params[v * 3] = alpha;
        params[v * 3 + 1] = 0;
        params[v * 3 + 2] = p.spec.glow;
        texs[v * 4] = p.tile;
        texs[v * 4 + 1] = -1;
        texs[v * 4 + 2] = uv[k][0];
        texs[v * 4 + 3] = uv[k][1];
      });
    });
    geometry.count = alive.length * 6;
    geometry.triangles = alive.length * 2;
    geometry.version++;
    return node;
  }

  return {
    emit,
    update,
    build,
    /** Throws everything away (a new race). */
    clear() {
      alive.length = 0;
    },
    get count() {
      return alive.length;
    },
  };
}
