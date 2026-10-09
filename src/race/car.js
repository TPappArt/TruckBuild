// Arcade driving model, shared by the player and the computer rivals.
//
// A car is a point with a heading and a velocity. The velocity is not forced
// to follow the heading: sideways speed bleeds away at a rate set by the
// surface's grip, so a low-grip track makes the car slide wide. There is no
// suspension or tyre model; the aim is "easy to pick up on a phone".
//
// Headings are radians, 0 pointing along +z; forward is (sin h, cos h).
// Steering input is -1 (full left) to +1 (full right).

export const TUNING = {
  maxSpeed: 34, // m/s on the road
  power: 15, // acceleration at a standstill, fading to zero at top speed
  brake: 30,
  reverseSpeed: 9,
  turn: 2.3, // rad/s at low speed
  turnFade: 0.55, // how much of that is lost by top speed
  steerResponse: 9, // how quickly the wheels follow the input
  radius: 1.35, // collision circle
};

// What track events (see events.js) do to a car, and for how long.
export const EFFECTS = {
  boost: { time: 2.6, speed: 1.4 }, // speed pickup
  slow: { time: 2.6, speed: 0.5 }, // slow pickup
  slip: { time: 1.5, grip: 0.06, steering: 0.4 }, // oil
  stun: { time: 1.2, hop: 1.7 }, // bomb: tossed in the air, no control
  strip: { fast: 1.45, slow: 0.5 }, // while on a speed or sticky strip
  flight: { time: 1.5, distance: 70, height: 8 }, // trampoline
};

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const NO_INPUT = { steer: 0, throttle: 0, brake: 0 };

export function createCar(track, gridIndex, gridOffset) {
  const start = track.pointAt(gridIndex, gridOffset);
  return {
    x: start.x,
    z: start.z,
    heading: start.heading,
    vx: 0,
    vz: 0,
    speed: 0, // along the heading; negative in reverse
    steer: 0, // smoothed steering actually applied
    maxSpeed: TUNING.maxSpeed,

    // Where the car is on the track, refreshed every step.
    index: track.wrap(Math.round(gridIndex)),
    offset: gridOffset,
    along: 0,
    onRoad: true,
    hitWall: false,

    // Track events. Timers count down in seconds; 0 means not in effect.
    effects: { boost: 0, slow: 0, slip: 0, stun: 0 },
    zone: 0, // on a strip right now: +1 speed, -1 sticky, 0 neither
    flight: null, // set while a trampoline has the car in the air

    // For drawing only: height off the ground and extra spin.
    lift: 0,
    twirl: 0,
  };
}

/**
 * Advances a car by `dt` seconds.
 * input = { steer: -1..1, throttle: 0..1, brake: 0..1 }
 * surface = { grip, offroad } from the track's theme.
 */
export function stepCar(car, input, dt, track, surface) {
  const effects = car.effects;
  for (const name of Object.keys(effects)) effects[name] = Math.max(0, effects[name] - dt);

  const stunned = effects.stun > 0;
  if (stunned) input = NO_INPUT;
  const slipping = effects.slip > 0;

  car.steer += (clamp(input.steer, -1, 1) - car.steer) * Math.min(1, dt * TUNING.steerResponse);

  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  const rx = -fz;
  const rz = fx;
  let forward = car.vx * fx + car.vz * fz;
  let sideways = car.vx * rx + car.vz * rz;

  // Top speed, as changed by whatever the car has driven through.
  let pace = 1;
  if (effects.boost > 0) pace *= EFFECTS.boost.speed;
  if (car.zone > 0) pace *= EFFECTS.strip.fast;
  if (effects.slow > 0) pace *= EFFECTS.slow.speed;
  if (car.zone < 0) pace *= EFFECTS.strip.slow;
  pace = clamp(pace, 0.45, 1.6);
  const top = car.maxSpeed * pace * (car.onRoad ? 1 : surface.offroad);
  // Boosts kick in hard rather than building slowly.
  const power = TUNING.power * (pace > 1 ? 2.6 : 1);

  if (input.throttle > 0) {
    forward += power * input.throttle * (1 - forward / top) * dt;
  }
  if (input.brake > 0) {
    if (forward > 0.5) forward = Math.max(0, forward - TUNING.brake * input.brake * dt);
    else forward = Math.max(-TUNING.reverseSpeed, forward - TUNING.power * 0.6 * input.brake * dt);
  }
  // Engine braking when off the throttle, and heavy going in the rough.
  const drag = car.onRoad ? (input.throttle > 0 ? 0.02 : 0.3) : 1.4;
  forward -= forward * drag * dt;
  // Going faster than currently allowed (a boost ran out, a sticky strip).
  if (forward > top) forward -= (forward - top) * 2.5 * dt;
  if (stunned) forward *= Math.exp(-5 * dt);

  sideways *= Math.exp(-surface.grip * (slipping ? EFFECTS.slip.grip : 1) * dt);

  car.vx = fx * forward + rx * sideways;
  car.vz = fz * forward + rz * sideways;
  car.speed = forward;

  // Steering needs some speed to bite, and eases off as speed builds.
  const bite = clamp(forward / 6, -1, 1);
  const fade = 1 - TUNING.turnFade * Math.min(1, Math.abs(forward) / TUNING.maxSpeed);
  const authority = slipping ? EFFECTS.slip.steering : 1;
  car.heading -= car.steer * TUNING.turn * bite * fade * authority * dt;

  car.x += car.vx * dt;
  car.z += car.vz * dt;

  // A bombed car is tossed up and spun round once.
  const tossed = stunned ? 1 - effects.stun / EFFECTS.stun.time : 1;
  car.lift = stunned ? Math.sin(Math.PI * tossed) * EFFECTS.stun.hop : 0;
  car.twirl = stunned ? tossed * Math.PI * 2 : 0;

  locate(car, track);

  // Soft wall at the edge of the shoulder: slide along it, lose some speed.
  car.hitWall = false;
  const over = Math.abs(car.offset) - track.limit;
  if (over > 0) {
    const side = Math.sign(car.offset);
    const nx = -track.tz[car.index] * side;
    const nz = track.tx[car.index] * side;
    car.x -= nx * over;
    car.z -= nz * over;
    const outward = car.vx * nx + car.vz * nz;
    if (outward > 0) {
      car.vx -= nx * outward * 1.2;
      car.vz -= nz * outward * 1.2;
    }
    const scrub = Math.exp(-1.5 * dt);
    car.vx *= scrub;
    car.vz *= scrub;
    car.offset = side * track.limit;
    car.hitWall = true;
  }
}

/** Throws the car into the air, to land further down the track. */
export function launch(car, track) {
  const room = track.halfWidth - 2;
  car.flight = {
    time: 0,
    from: car.index + car.along / track.spacing,
    offset: clamp(car.offset, -room, room),
  };
  car.effects.slip = 0;
  car.effects.stun = 0;
}

/** Advances a car that is in the air. It follows the road and cannot be steered. */
export function stepFlight(car, dt, track) {
  const { time, distance, height } = EFFECTS.flight;
  const flight = car.flight;
  flight.time += dt;
  const t = Math.min(1, flight.time / time);

  const at = track.pointAt(flight.from + (distance * t) / track.spacing, flight.offset);
  car.x = at.x;
  car.z = at.z;
  car.heading = at.heading;
  car.lift = 4 * height * t * (1 - t);
  car.twirl = 0;
  car.steer = 0;

  // Come down moving, at a good clip, pointing along the road.
  const speed = Math.max(car.speed, car.maxSpeed * 0.85);
  car.speed = speed;
  car.vx = Math.sin(car.heading) * speed;
  car.vz = Math.cos(car.heading) * speed;
  locate(car, track);

  if (t >= 1) {
    car.flight = null;
    car.lift = 0;
  }
}

/** Refreshes the car's track position from its world position. */
export function locate(car, track) {
  const at = track.project(car.x, car.z, car.index);
  car.index = at.index;
  car.offset = at.offset;
  car.along = at.along;
  car.onRoad = Math.abs(at.offset) <= track.halfWidth;
}

/**
 * The fastest a car can take each sample of the track and still make the
 * corner, with braking distance worked back from slow corners.
 */
export function speedLimits(track, surface) {
  const n = track.count;
  const limits = new Float32Array(n);
  // Largest curvature the steering can follow at speed v:
  //   curvature * v <= hold * (1 - turnFade * v / maxSpeed)
  // `hold` is set high because sliding scrubs speed off anyway, so these are
  // the limits of a good driver. Each rival then drives at a fraction of
  // them (its `pace`), which is what makes rivals fast or slow.
  const hold = 1.7 * TUNING.turn * Math.sqrt(Math.min(1, surface.grip / 7));
  for (let i = 0; i < n; i++) {
    // Look at the tightest bit of the next few metres, not just this sample.
    let bend = 0;
    for (let k = 0; k <= 4; k++) bend = Math.max(bend, Math.abs(track.curvature[track.wrap(i + k)]));
    limits[i] = Math.min(TUNING.maxSpeed, hold / (bend + (hold * TUNING.turnFade) / TUNING.maxSpeed));
  }
  const braking = TUNING.brake * 0.6;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n - 1; i >= 0; i--) {
      const next = limits[track.wrap(i + 1)];
      limits[i] = Math.min(limits[i], Math.sqrt(next * next + 2 * braking * track.spacing));
    }
  }
  return limits;
}

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Computer driver: aims at a point further down its lane and keeps to a
 * share of the corner speed limits.
 *
 * rival = {
 *   lane     metres right of centre it likes to run,
 *   pace     share of a good driver's speed it manages (0..1),
 *   weave    how far it wanders either side of its lane, in metres,
 *   phase    offsets its weaving from the other rivals',
 *   lapse    set while it is having a clumsy moment: { steer } it holds
 *            instead of driving properly, with its foot off the accelerator,
 * }
 * Returns an input for stepCar.
 */
export function autopilot(car, rival, track, limits, others, time = 0) {
  if (rival.lapse) return { steer: rival.lapse.steer, throttle: 0, brake: 0 };

  let lane = rival.lane + (rival.weave || 0) * Math.sin(time * 0.9 + (rival.phase || 0));
  // Ease toward the far side of a car that is close ahead in the same lane.
  for (const other of others) {
    if (other === car) continue;
    const gap = track.wrap(other.index - car.index);
    if (gap > 0 && gap < 6 && Math.abs(other.offset - car.offset) < 2.6) {
      lane = other.offset > 0 ? other.offset - 3.4 : other.offset + 3.4;
    }
  }
  const room = track.halfWidth - 1.6;
  lane = clamp(lane, -room, room);

  const reach = (9 + Math.abs(car.speed) * 0.5) / track.spacing;
  const aim = track.pointAt(car.index + car.along / track.spacing + reach, lane);
  const wanted = Math.atan2(aim.x - car.x, aim.z - car.z);
  const steer = clamp(-wrapAngle(wanted - car.heading) * 2.4, -1, 1);

  const limit = limits[track.wrap(car.index + 2)] * rival.pace;
  return {
    steer,
    throttle: car.speed < limit ? 1 : 0,
    brake: car.speed > limit + 2.5 ? 1 : 0,
  };
}

/** Pushes overlapping cars apart and trades some of their closing speed. */
export function collide(cars) {
  const reach = TUNING.radius * 2;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      if (a.flight || b.flight) continue; // nothing to hit up there
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= reach || distance < 1e-6) continue;
      const nx = dx / distance;
      const nz = dz / distance;
      const push = (reach - distance) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
      const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (closing > 0) {
        const swap = closing * 0.75;
        a.vx -= nx * swap;
        a.vz -= nz * swap;
        b.vx += nx * swap;
        b.vz += nz * swap;
      }
    }
  }
}
