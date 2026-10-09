import { knock } from './car.js';

// Weapons in a race. What a racer carries comes from its build
// (parts/weapons.js) and arrives here as `racer.attack`:
//
//   { type: 'shot', shot }    Blaster, cannon. Fired on demand, then takes
//                             RELOAD seconds to be ready again. The shot
//                             runs along the road and drifts toward the
//                             nearest car ahead, so aiming is forgiving.
//   { type: 'melee', reach }  Hammer, saw, flipper. Always on: any car that
//                             comes within reach of the front gets knocked.
//
// A hit does exactly what a bomb does (car.js `knock`).

export const RELOAD = 10; // seconds between shots

const SHOT_SPEED = 80; // m/s
const SHOT_LIFE = 1.4; // seconds, so about 110 m
const SHOT_HITS_WITHIN = 2.5; // metres
const SHOT_DRIFT = 12; // sideways homing, m/s
const MELEE_WIDTH = 1.8; // metres either side of the centre line of the car
const MELEE_REST = 1.5; // seconds before a melee weapon can hit again

/** `bang(x, z, kind)` is called when something is hit, for the scene to draw. */
export function createCombat(track, random, bang = () => {}) {
  const shots = [];

  function fire(racer) {
    const car = racer.car;
    shots.push({
      owner: racer,
      kind: racer.attack.shot,
      index: car.index + (car.along + 2.5) / track.spacing,
      offset: car.offset,
      age: 0,
      x: car.x,
      z: car.z,
      heading: car.heading,
    });
    racer.reload = RELOAD;
  }

  /** The nearest other car within `metres` ahead on the road, or null. */
  function carAhead(racer, index, metres, racers) {
    let best = null;
    let bestGap = metres / track.spacing;
    for (const other of racers) {
      if (other === racer || other.car.flight) continue;
      const gap = track.wrap(Math.round(other.car.index - index));
      if (gap > 0 && gap < bestGap) {
        best = other;
        bestGap = gap;
      }
    }
    return best;
  }

  /**
   * `wantsFire` is true while the player holds the fire button.
   * Sets racer.reload (seconds left) for the HUD.
   */
  function update(dt, time, racers, wantsFire) {
    for (const racer of racers) {
      racer.reload = Math.max(0, (racer.reload ?? 0) - dt);
      racer.rest = Math.max(0, (racer.rest ?? 0) - dt);
      const attack = racer.attack;
      const car = racer.car;
      if (!attack || car.flight || car.effects.stun > 0) continue;

      if (attack.type === 'shot' && racer.reload <= 0) {
        if (racer.isPlayer && !racer.finished) {
          if (wantsFire) fire(racer);
        } else {
          // Rivals are slow on the trigger and only shoot at something
          // roughly in front of them.
          const target = carAhead(racer, car.index, 45, racers);
          if (target && Math.abs(target.car.offset - car.offset) < 5 && random() < dt * 0.2) {
            fire(racer);
            racer.reload = RELOAD + random() * 12;
          }
        }
      }

      if (attack.type === 'melee' && racer.rest <= 0) {
        const fx = Math.sin(car.heading);
        const fz = Math.cos(car.heading);
        for (const other of racers) {
          if (other === racer) continue;
          const dx = other.car.x - car.x;
          const dz = other.car.z - car.z;
          const forward = dx * fx + dz * fz;
          const sideways = dx * -fz + dz * fx;
          if (forward < 0.6 || forward > attack.reach || Math.abs(sideways) > MELEE_WIDTH) continue;
          if (!knock(other.car)) continue;
          other.lastEvent = { kind: 'hit', at: time };
          racer.lastEvent = { kind: 'scored', at: time };
          racer.rest = MELEE_REST;
          bang(other.car.x, other.car.z, 'blast');
          break;
        }
      }
    }

    for (const shot of shots) {
      shot.age += dt;
      shot.index += (SHOT_SPEED * dt) / track.spacing;
      const target = carAhead(shot.owner, shot.index, 50, racers);
      if (target) {
        const gap = target.car.offset - shot.offset;
        shot.offset += Math.sign(gap) * Math.min(Math.abs(gap), SHOT_DRIFT * dt);
      }
      const at = track.pointAt(shot.index, shot.offset);
      shot.x = at.x;
      shot.z = at.z;
      shot.heading = at.heading;

      for (const racer of racers) {
        if (racer === shot.owner || racer.car.flight) continue;
        if (Math.hypot(racer.car.x - shot.x, racer.car.z - shot.z) > SHOT_HITS_WITHIN) continue;
        shot.age = SHOT_LIFE; // spent, whether or not the car could be knocked
        bang(shot.x, shot.z, 'blast');
        if (knock(racer.car)) {
          racer.lastEvent = { kind: 'hit', at: time };
          shot.owner.lastEvent = { kind: 'scored', at: time };
        }
        break;
      }
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      if (shots[i].age >= SHOT_LIFE) shots.splice(i, 1);
    }
  }

  return { shots, update };
}
