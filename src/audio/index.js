import { createCore } from './core.js';
import { createMusic } from './music.js';
import { FOR_EVENT, RECIPES } from './sounds.js';

// The game's ears. Everything that makes a noise goes through here:
//
//   audio.unlock()                 from the first tap (browsers insist)
//   audio.play('boost')            a sound effect (sounds.js)
//   audio.song('garage')           the music (songs.js)
//   audio.race(session, ...)       once a frame during a race: works out
//                                  what just happened and makes the noises
//   audio.setVolume('music', 0.5)  from the settings
//
// If the browser has no Web Audio, every one of those quietly does nothing.
// Nothing is built until unlock(): browsers complain about an audio context
// made before the player has touched the page.

// Sounds that would otherwise machine-gun: the least time between two of them.
const REST = { wall: 0.22, bump: 0.14, blip: 0.09, sneer: 0.4, click: 0.03, splat: 0.2, rumble: 0.5 };

const HEARING = 70; // metres: beyond this, another car's noises are not heard
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function createAudio() {
  let built = null;
  let failed = false;
  // What was asked for before there was anything to ask it of.
  const levels = { music: 0.6, sound: 0.8 };
  let wanted = null;
  return {
    get available() {
      return !failed;
    },
    get core() {
      return built?.core ?? null;
    },
    unlock() {
      if (!built && !failed) {
        try {
          built = build(levels);
        } catch {
          built = null;
        }
        if (!built) failed = true;
        else built.song(wanted);
      }
      built?.unlock();
    },
    play: (name, options) => built?.play(name, options),
    song(id) {
      wanted = id;
      built?.song(id);
    },
    race: (session, lines, input) => built?.race(session, lines, input),
    quiet: () => built?.quiet(),
    setVolume(kind, value) {
      levels[kind] = value;
      built?.setVolume(kind, value);
    },
  };
}

function build(levels) {
  const core = createCore();
  if (!core) return null;
  const ctx = core.ctx;
  const music = createMusic(core);
  let wanted = null; // the song asked for, kept until sound is allowed
  const lastPlayed = new Map();

  function play(name, { loud = 1, at = ctx.currentTime, voice = 0 } = {}) {
    const recipe = RECIPES[name];
    if (!recipe || ctx.state !== 'running' || loud <= 0.02) return;
    const rest = REST[name];
    if (rest) {
      if (ctx.currentTime - (lastPlayed.get(name) ?? -1) < rest) return;
      lastPlayed.set(name, ctx.currentTime);
    }
    recipe(core, Math.max(at, ctx.currentTime), loud, voice);
  }

  // ---------- Sounds that never stop while driving ----------
  // An engine (two oscillators through a filter that opens with the revs),
  // the wind, tyres sliding, and the rumble of being off the road. Each is
  // always running; only its loudness and pitch change.

  const layer = (level = 0) => {
    const gain = ctx.createGain();
    gain.gain.value = level;
    gain.connect(core.sound);
    return gain;
  };
  const engineGain = layer();
  const engineTone = ctx.createBiquadFilter();
  engineTone.type = 'lowpass';
  engineTone.frequency.value = 400;
  engineTone.connect(engineGain);
  const engine = [
    ['sawtooth', 1, 0.6],
    ['square', 0.5, 0.5],
    ['sawtooth', 1.5, 0.18],
  ].map(([type, ratio, level]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = 60 * ratio;
    gain.gain.value = level;
    osc.connect(gain).connect(engineTone);
    osc.start();
    return { osc, ratio };
  });

  const hissThrough = (kind, freq, q) => {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = layer();
    source.buffer = core.hiss;
    source.loop = true;
    filter.type = kind;
    filter.frequency.value = freq;
    filter.Q.value = q;
    source.connect(filter).connect(gain);
    source.start(0, Math.random());
    return { gain, filter };
  };
  const wind = hissThrough('bandpass', 700, 0.5);
  const skid = hissThrough('bandpass', 1900, 5);
  const rough = hissThrough('lowpass', 190, 0.7);

  const ease = (param, value, time = 0.08) => param.setTargetAtTime(value, ctx.currentTime, time);

  /** Sets the driving sounds from the state of the player's car, or silences them (null). */
  function drive(car, throttle = 0) {
    if (!car) {
      for (const gain of [engineGain, wind.gain, skid.gain, rough.gain]) ease(gain.gain, 0, 0.12);
      return;
    }
    const pace = clamp(Math.abs(car.speed) / car.maxSpeed, 0, 1.5);
    const airborne = Boolean(car.flight) || car.lift > 0.3;
    // Revs climb with speed, and jump when the wheels leave the ground.
    const revs = 52 + 105 * pace + (airborne ? 30 : 0) + 6 * throttle;
    for (const { osc, ratio } of engine) ease(osc.frequency, revs * ratio, 0.07);
    ease(engineTone.frequency, 320 + 1500 * pace + 500 * throttle, 0.1);
    ease(engineGain.gain, car.effects.frozen > 0 ? 0 : 0.045 + 0.05 * throttle + 0.03 * pace, 0.1);

    ease(wind.gain.gain, 0.16 * pace * pace, 0.2);
    ease(wind.filter.frequency, 500 + 900 * pace, 0.2);

    // How far sideways the car is going: sliding round a bend, or on oil.
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const sideways = Math.abs(car.vx * -fz + car.vz * fx);
    const sliding = airborne ? 0 : clamp((sideways - 3.5) / 9, 0, 1) + (car.effects.slip > 0 ? 0.5 : 0);
    ease(skid.gain.gain, 0.2 * clamp(sliding, 0, 1), 0.06);

    ease(rough.gain.gain, !car.onRoad && !airborne ? 0.5 * clamp(pace * 2, 0, 1) : 0, 0.1);
  }

  // ---------- A race, listened to ----------

  let heard = null; // what the session looked like last frame

  /** How loud something at (x, z) is from the player's car: 1 beside it, 0 out of earshot. */
  const near = (car, x, z) => {
    const distance = Math.hypot(x - car.x, z - car.z);
    return distance > HEARING ? 0 : 1 / (1 + distance / 14);
  };

  /**
   * Call once a frame while racing.
   * lines: what the drivers are saying (hud.js), one entry per racer or null.
   * input: the player's controls this frame.
   */
  function race(session, lines = [], input = null) {
    const player = session.player;
    const car = player.car;
    if (!heard || heard.session !== session) {
      heard = {
        session,
        count: Math.ceil(session.countdown),
        phase: session.phase,
        events: session.racers.map((racer) => racer.lastEvent),
        lap: player.lap,
        finished: player.finished,
        // Whatever is already going on is not news.
        shots: new Set(session.combat.shots),
        wall: car.hitWall,
        flying: Boolean(car.flight),
        close: true,
        lines: [...lines],
        wolves: session.hazard?.wolves?.length ?? 0,
        strikes: new Set(session.hazard?.strikes ?? []),
        slicks: session.villain?.dropped ?? 0,
      };
    }
    const was = heard;

    // The lights.
    if (session.phase === 'countdown') {
      const count = Math.ceil(session.countdown);
      if (count !== was.count && count > 0) play('beep');
      was.count = count;
    } else if (was.phase === 'countdown') {
      play('go');
    }
    was.phase = session.phase;

    drive(session.phase === 'racing' && !player.finished ? car : player.finished ? null : { ...car, speed: 0 }, input?.throttle ?? 0);

    // Whatever has just happened to anyone, as loud as it is near.
    session.racers.forEach((racer, i) => {
      const event = racer.lastEvent;
      if (event === was.events[i]) return;
      was.events[i] = event;
      if (!event) return;
      const name = FOR_EVENT[event.kind];
      if (!name) return;
      if (racer === player) play(name);
      else if (event.kind !== 'checkpoint' && event.kind !== 'scored') play(name, { loud: 0.7 * near(car, racer.car.x, racer.car.z) });
    });

    // Laps and the flag.
    if (player.lap !== was.lap) {
      if (player.lap > was.lap && player.lap > 0 && player.lap < session.laps) play(player.lap === session.laps - 1 ? 'final-lap' : 'lap');
      was.lap = player.lap;
    }
    if (player.finished && !was.finished) {
      was.finished = true;
      play(player.place === 1 ? 'win' : player.place === session.racers.length ? 'lose' : 'podium');
    }

    // Shots fired.
    for (const shot of session.combat.shots) {
      if (was.shots.has(shot)) continue;
      was.shots.add(shot);
      play(shot.kind === 'bolts' ? 'pew' : shot.kind === 'cork' ? 'pop' : 'thoom', { loud: shot.owner === player ? 1 : 0.8 * near(car, shot.x, shot.z) });
    }
    if (was.shots.size > 40) was.shots = new Set(session.combat.shots);

    // Scrapes, bumps and coming back down.
    if (car.hitWall && !was.wall && Math.abs(car.speed) > 4) play('wall', { loud: clamp(Math.abs(car.speed) / 20, 0.3, 1) });
    was.wall = car.hitWall;
    const flying = Boolean(car.flight);
    if (was.flying && !flying) play('land');
    was.flying = flying;
    const close = session.racers.some((racer) => racer !== player && !racer.car.flight && Math.hypot(racer.car.x - car.x, racer.car.z - car.z) < 2.75);
    if (close && !was.close) play('bump', { loud: clamp(Math.abs(car.speed) / 18, 0.3, 1) });
    was.close = close;

    // The track's own dangers, heard coming.
    const hazard = session.hazard;
    if (hazard?.wolves) {
      if (hazard.wolves.length > was.wolves) play('howl', { loud: Math.max(0.35, near(car, hazard.wolves[0].x, hazard.wolves[0].z)) });
      was.wolves = hazard.wolves.length;
    }
    if (hazard?.strikes) {
      for (const strike of hazard.strikes) {
        if (strike.age < hazard.timings.warning || was.strikes.has(strike)) continue;
        was.strikes.add(strike);
        play('rumble', { loud: Math.max(0.15, near(car, strike.x, strike.z)) });
      }
      if (was.strikes.size > 30) was.strikes = new Set(hazard.strikes);
    }

    // The villain leaving something on the road.
    const slicks = session.villain?.dropped ?? 0;
    if (slicks > was.slicks) {
      const his = session.villain.racer.car;
      play('splat', { loud: Math.max(0.3, near(car, his.x, his.z)) });
    }
    was.slicks = slicks;

    // Speech bubbles.
    lines.forEach((line, i) => {
      if (line === was.lines[i]) return;
      was.lines[i] = line;
      if (!line) return;
      const racer = session.racers[i];
      const loud = racer === player ? 1 : near(car, racer.car.x, racer.car.z);
      play(racer.villain ? 'sneer' : 'blip', { loud, voice: i });
    });
  }

  // ---------- Volume ----------

  function setVolume(kind, value) {
    levels[kind] = clamp(value, 0, 1);
    // Squared: a slider at half sounds about half as loud.
    const gain = levels[kind] ** 2 * (kind === 'music' ? 1.1 : 1.25);
    core[kind].gain.setTargetAtTime(gain, ctx.currentTime, 0.03);
  }
  setVolume('music', levels.music);
  setVolume('sound', levels.sound);

  // No sound while the game is out of sight.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (unlocked) ctx.resume().catch(() => {});
  });
  let unlocked = false;

  return {
    available: true,
    core,
    unlock() {
      unlocked = true;
      core.unlock();
      if (wanted) music.play(wanted);
    },
    play,
    /** Starts a song (see songs.js), or stops the music (null). */
    song(id) {
      wanted = id;
      if (!id) music.stop();
      else if (unlocked) music.play(id);
    },
    race,
    /** Stops the driving sounds: call on leaving a race, or pausing one. */
    quiet() {
      drive(null);
      heard = null;
    },
    setVolume,
  };
}
