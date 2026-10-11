// Every sound effect in the game, as a recipe: a few tones and bursts of
// noise (core.js) that together read as a bonk, a boing or a coin.
//
// Each recipe is called as recipe(core, when, loud), where `when` is on the
// audio clock and `loud` scales the whole thing (things further from the
// player's car are quieter). The names on the left are what the rest of the
// game asks for: sounds.play('boost').

/** A note number (60 = middle C) as a frequency. */
export const hz = (note) => 440 * 2 ** ((note - 69) / 12);

/** Plays notes one after another: [[note, seconds], ...]. */
function run(core, at, loud, notes, { type = 'triangle', vol = 0.22, gap = 0, cut = 0 } = {}) {
  let when = at;
  for (const [note, dur] of notes) {
    if (note !== null) core.tone({ type, freq: hz(note), at: when, dur: dur * 1.6, vol: vol * loud, cut });
    when += dur + gap;
  }
  return when;
}

export const RECIPES = {
  // ---------- Buttons ----------
  click(core, at, loud) {
    core.tone({ type: 'triangle', freq: 660, to: 990, at, dur: 0.06, vol: 0.16 * loud });
  },
  tab(core, at, loud) {
    core.tone({ type: 'sine', freq: 520, at, dur: 0.07, vol: 0.14 * loud });
  },
  equip(core, at, loud) {
    core.noise({ kind: 'lowpass', freq: 900, at, dur: 0.05, vol: 0.3 * loud });
    core.tone({ type: 'sine', freq: 220, to: 150, at, dur: 0.12, vol: 0.3 * loud });
  },
  buy(core, at, loud) {
    core.tone({ type: 'square', freq: hz(83), at, dur: 0.09, vol: 0.14 * loud, cut: 5000 });
    core.tone({ type: 'square', freq: hz(88), at: at + 0.08, dur: 0.5, vol: 0.16 * loud, cut: 5000 });
    core.tone({ type: 'sine', freq: hz(100), at: at + 0.08, dur: 0.7, vol: 0.06 * loud });
  },
  denied(core, at, loud) {
    core.tone({ type: 'sawtooth', freq: 160, to: 110, at, dur: 0.2, vol: 0.2 * loud, cut: 900 });
  },
  open(core, at, loud) {
    run(core, at, loud, [[72, 0.06], [76, 0.06], [79, 0.1]], { vol: 0.16 });
  },
  close(core, at, loud) {
    run(core, at, loud, [[76, 0.05], [72, 0.09]], { vol: 0.14 });
  },

  // ---------- The start ----------
  beep(core, at, loud) {
    core.tone({ type: 'sine', freq: 440, at, dur: 0.22, vol: 0.3 * loud });
  },
  go(core, at, loud) {
    core.tone({ type: 'sine', freq: 880, at, dur: 0.55, vol: 0.32 * loud });
    core.tone({ type: 'triangle', freq: 1320, at, dur: 0.4, vol: 0.12 * loud });
  },

  // ---------- Things on the road ----------
  boost(core, at, loud) {
    core.noise({ kind: 'bandpass', freq: 500, to: 5000, q: 1.5, at, dur: 0.5, vol: 0.3 * loud, attack: 0.05 });
    core.tone({ type: 'sawtooth', freq: 220, to: 700, at, dur: 0.4, vol: 0.12 * loud, cut: 2400 });
    run(core, at + 0.05, loud, [[81, 0.06], [85, 0.06], [88, 0.06], [93, 0.12]], { vol: 0.13 });
  },
  slow(core, at, loud) {
    for (const start of [0, 0.3]) {
      core.tone({ type: 'triangle', freq: 300 - start * 200, to: 150 - start * 100, at: at + start, dur: 0.32, vol: 0.28 * loud, wobble: { rate: 9, depth: 8 } });
    }
  },
  bomb(core, at, loud) {
    core.noise({ kind: 'lowpass', freq: 1800, to: 90, at, dur: 0.7, vol: 0.75 * loud });
    core.tone({ type: 'sine', freq: 130, to: 34, at, dur: 0.55, vol: 0.7 * loud });
    core.noise({ kind: 'highpass', freq: 3000, at, dur: 0.05, vol: 0.3 * loud });
  },
  oil(core, at, loud) {
    core.tone({ type: 'sawtooth', freq: 620, to: 170, at, dur: 0.5, vol: 0.24 * loud, cut: 1800, wobble: { rate: 17, depth: 60 } });
    core.noise({ kind: 'bandpass', freq: 1900, to: 600, q: 6, at, dur: 0.45, vol: 0.4 * loud, attack: 0.03 });
  },
  trampoline(core, at, loud) {
    core.tone({ type: 'sine', freq: 170, to: 540, at, dur: 0.14, vol: 0.4 * loud });
    core.tone({ type: 'sine', freq: 540, to: 240, at: at + 0.13, dur: 0.4, vol: 0.34 * loud, wobble: { rate: 22, depth: 40 } });
  },
  land(core, at, loud) {
    core.tone({ type: 'sine', freq: 95, to: 48, at, dur: 0.16, vol: 0.5 * loud });
    core.noise({ kind: 'lowpass', freq: 700, at, dur: 0.09, vol: 0.3 * loud });
  },
  freeze(core, at, loud) {
    [1870, 2390, 2810, 3340, 3900, 4420].forEach((freq, i) => {
      core.tone({ type: 'sine', freq, at: at + i * 0.035, dur: 0.5, vol: 0.07 * loud });
    });
    core.noise({ kind: 'highpass', freq: 6500, at, dur: 0.25, vol: 0.14 * loud });
  },
  coins(core, at, loud) {
    for (const start of [0, 0.11]) {
      core.tone({ type: 'square', freq: hz(88), at: at + start, dur: 0.07, vol: 0.12 * loud, cut: 6000 });
      core.tone({ type: 'square', freq: hz(91), at: at + start + 0.05, dur: 0.2, vol: 0.12 * loud, cut: 6000 });
    }
  },
  // A golden thing: brighter and longer than a coin, so it feels like more.
  gold(core, at, loud) {
    const end = run(core, at, loud, [[84, 0.07], [88, 0.07], [91, 0.07], [96, 0.07], [100, 0.3]], { vol: 0.16 });
    core.tone({ type: 'sine', freq: hz(108), at: end - 0.3, dur: 1.0, vol: 0.07 * loud, wobble: { rate: 7, depth: 30 } });
    core.noise({ kind: 'highpass', freq: 8000, at, dur: 0.6, vol: 0.05 * loud, attack: 0.1 });
  },
  'fast-strip'(core, at, loud) {
    core.noise({ kind: 'bandpass', freq: 900, to: 3600, q: 2, at, dur: 0.35, vol: 0.34 * loud, attack: 0.04 });
    run(core, at, loud, [[76, 0.05], [81, 0.09]], { vol: 0.1 });
  },
  'slow-strip'(core, at, loud) {
    core.noise({ kind: 'lowpass', freq: 500, to: 180, at, dur: 0.4, vol: 0.5 * loud, attack: 0.04 });
    core.tone({ type: 'triangle', freq: 190, to: 120, at, dur: 0.3, vol: 0.2 * loud });
  },

  // ---------- Weapons ----------
  pew(core, at, loud) {
    core.tone({ type: 'square', freq: 1500, to: 280, at, dur: 0.14, vol: 0.28 * loud, cut: 4500 });
  },
  thoom(core, at, loud) {
    core.tone({ type: 'sine', freq: 170, to: 45, at, dur: 0.3, vol: 0.55 * loud });
    core.noise({ kind: 'lowpass', freq: 1200, to: 200, at, dur: 0.22, vol: 0.4 * loud });
  },
  hit(core, at, loud) {
    core.noise({ kind: 'bandpass', freq: 800, q: 1.2, at, dur: 0.14, vol: 0.5 * loud });
    core.tone({ type: 'square', freq: 210, to: 75, at, dur: 0.26, vol: 0.22 * loud, cut: 1400 });
  },
  scored(core, at, loud) {
    core.noise({ kind: 'bandpass', freq: 1400, q: 1, at, dur: 0.07, vol: 0.3 * loud });
    run(core, at + 0.03, loud, [[79, 0.06], [84, 0.06], [88, 0.14]], { type: 'square', vol: 0.1, cut: 5000 });
  },

  // ---------- Knocks and scrapes ----------
  wall(core, at, loud) {
    core.noise({ kind: 'bandpass', freq: 420, q: 0.9, at, dur: 0.16, vol: 0.8 * loud, attack: 0.01 });
  },
  bump(core, at, loud) {
    core.tone({ type: 'sine', freq: 120, to: 64, at, dur: 0.11, vol: 0.4 * loud });
    core.noise({ kind: 'lowpass', freq: 1500, at, dur: 0.05, vol: 0.22 * loud });
  },

  // ---------- Round the lap ----------
  checkpoint(core, at, loud) {
    run(core, at, loud, [[79, 0.08], [84, 0.16]], { type: 'sine', vol: 0.2 });
  },
  lap(core, at, loud) {
    run(core, at, loud, [[72, 0.08], [76, 0.08], [79, 0.08], [84, 0.24]], { vol: 0.2 });
  },
  'final-lap'(core, at, loud) {
    const next = run(core, at, loud, [[76, 0.07], [79, 0.07], [84, 0.07], [88, 0.12]], { vol: 0.2 });
    run(core, next + 0.03, loud, [[79, 0.07], [84, 0.07], [88, 0.07], [91, 0.26]], { vol: 0.2 });
  },

  // ---------- The finish ----------
  // First place: a fanfare, and a cork.
  win(core, at, loud) {
    const end = run(core, at, loud, [[67, 0.12], [72, 0.12], [76, 0.12], [79, 0.12]], { type: 'square', vol: 0.11, cut: 3800 });
    for (const note of [72, 76, 79, 84]) core.tone({ type: 'triangle', freq: hz(note), at: end, dur: 1.1, vol: 0.13 * loud });
    RECIPES.pop(core, end + 0.25, loud);
  },
  podium(core, at, loud) {
    const end = run(core, at, loud, [[72, 0.1], [76, 0.1], [79, 0.2]], { vol: 0.18 });
    for (const note of [72, 79]) core.tone({ type: 'triangle', freq: hz(note), at: end, dur: 0.6, vol: 0.1 * loud });
  },
  lose(core, at, loud) {
    run(core, at, loud, [[64, 0.18], [62, 0.18], [60, 0.18], [55, 0.5]], { vol: 0.2 });
  },
  // A cork out of a bottle, and the fizz after it.
  pop(core, at, loud) {
    core.tone({ type: 'sine', freq: 320, to: 1100, at, dur: 0.04, vol: 0.5 * loud });
    core.noise({ kind: 'bandpass', freq: 1500, q: 0.8, at, dur: 0.06, vol: 0.4 * loud });
    core.noise({ kind: 'highpass', freq: 5500, at: at + 0.04, dur: 1.3, vol: 0.14 * loud, attack: 0.05 });
  },

  // ---------- Each track's own dangers ----------
  zap(core, at, loud) {
    core.noise({ kind: 'highpass', freq: 3200, at, dur: 0.1, vol: 0.4 * loud });
    core.tone({ type: 'sawtooth', freq: 95, at, dur: 0.35, vol: 0.2 * loud, cut: 2500, wobble: { rate: 55, depth: 30 } });
  },
  rumble(core, at, loud) {
    core.noise({ kind: 'lowpass', freq: 420, to: 90, at, dur: 1.3, vol: 0.6 * loud, attack: 0.02 });
  },
  howl(core, at, loud) {
    core.tone({ type: 'sine', freq: 380, to: 720, at, dur: 0.4, vol: 0.2 * loud, attack: 0.08, wobble: { rate: 6, depth: 12 } });
    core.tone({ type: 'sine', freq: 720, to: 330, at: at + 0.38, dur: 0.7, vol: 0.2 * loud, wobble: { rate: 6, depth: 14 } });
  },
  rattle(core, at, loud) {
    [1100, 1500, 950, 1350, 1200].forEach((freq, i) => {
      core.tone({ type: 'sine', freq, at: at + i * 0.05, dur: 0.04, vol: 0.26 * loud });
    });
  },
  groan(core, at, loud) {
    core.tone({ type: 'sawtooth', freq: 120, to: 85, at, dur: 0.6, vol: 0.22 * loud, cut: 520, attack: 0.08, wobble: { rate: 5, depth: 5 } });
  },
  squelch(core, at, loud) {
    core.noise({ kind: 'bandpass', freq: 380, to: 900, q: 3, at, dur: 0.2, vol: 0.5 * loud });
    core.tone({ type: 'sawtooth', freq: 150, to: 95, at: at + 0.05, dur: 0.3, vol: 0.14 * loud, cut: 600 });
  },
  thud(core, at, loud) {
    core.noise({ kind: 'lowpass', freq: 520, to: 140, at, dur: 0.4, vol: 0.55 * loud });
    core.tone({ type: 'sine', freq: 70, to: 40, at, dur: 0.3, vol: 0.5 * loud });
  },
  wind(core, at, loud) {
    core.noise({ kind: 'bandpass', freq: 400, to: 1100, q: 1.4, at, dur: 1.4, vol: 0.3 * loud, attack: 0.4 });
  },

  // ---------- Talking ----------
  // A driver's speech bubble: two quick notes. `loud` above 1 is not used
  // here; the pitch is set by the caller through `voice` (see index.js).
  blip(core, at, loud, voice = 0) {
    const base = 74 + voice * 3;
    run(core, at, loud, [[base, 0.045], [base + 4, 0.07]], { type: 'triangle', vol: 0.1 });
  },
  // The villain has something to say, and announces it on his horn first:
  // an old brass one, two notes at once, twice. "Honk honk."
  sneer(core, at, loud) {
    for (const [start, dur] of [[0, 0.1], [0.15, 0.2]]) {
      for (const note of [53, 57]) core.tone({ type: 'square', freq: hz(note), to: hz(note) * 0.97, at: at + start, dur, vol: 0.075 * loud, cut: 1500, attack: 0.012 });
    }
  },
  splat(core, at, loud) {
    core.noise({ kind: 'lowpass', freq: 800, to: 250, at, dur: 0.18, vol: 0.4 * loud });
    core.tone({ type: 'sine', freq: 320, to: 110, at, dur: 0.16, vol: 0.2 * loud });
  },
};

// Which recipe goes with each thing that can happen to a racer (the `kind`
// of its lastEvent: see events.js, features.js, hazards.js, combat.js).
export const FOR_EVENT = {
  boost: 'boost',
  slow: 'slow',
  bomb: 'bomb',
  oil: 'oil',
  trampoline: 'trampoline',
  freeze: 'freeze',
  coins: 'coins',
  gold: 'gold',
  'fast-strip': 'fast-strip',
  'slow-strip': 'slow-strip',
  hit: 'hit',
  scored: 'scored',
  checkpoint: 'checkpoint',
  pillar: 'thud',
  snowball: 'thud',
  skeleton: 'rattle',
  zombie: 'squelch',
  mummy: 'groan',
  werewolf: 'howl',
  meteor: 'bomb',
  zap: 'zap',
  storm: 'wind',
  slick: 'oil',
};
