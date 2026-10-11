// The sound system's plumbing: one AudioContext, a volume control each for
// music and for sound effects, and the two building blocks every sound in
// the game is made from, a tone and a burst of noise.
//
// There are no audio files. Everything is synthesised when it is needed,
// which keeps the game a few hundred kilobytes and lets it work offline.
//
// Browsers only allow sound after the player has tapped or clicked
// something: `unlock()` is called from that first tap.

/**
 * `context`: an audio context to use instead of making one (the tests pass
 * one that renders to memory, to measure what comes out).
 */
export function createCore(context = null) {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!context && !Context) return null;
  const ctx = context || new Context();

  // Everything goes through a gentle limiter, so that several loud things
  // at once (a bomb, the engine, the music) squash rather than crackle.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 10;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.2;
  limiter.connect(ctx.destination);

  const bus = (level) => {
    const gain = ctx.createGain();
    gain.gain.value = level;
    return gain;
  };
  const music = bus(0.5);
  const sound = bus(0.8);
  // Music is rounded off at the top so that it sits behind the effects.
  const soften = ctx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 7000;
  music.connect(soften).connect(limiter);
  sound.connect(limiter);

  // Two seconds of hiss, looped wherever noise is wanted.
  const hiss = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = hiss.getChannelData(0);
  let seed = 1234567;
  for (let i = 0; i < samples.length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    samples[i] = seed / 2147483648 - 1;
  }

  /**
   * A note. Rises to `vol` over `attack` seconds and dies away by `dur`.
   *   type   'sine' | 'triangle' | 'square' | 'sawtooth'
   *   freq   Hz at the start; `to` is where it has slid to by the end
   *   at     when, on the context's clock (default: now)
   *   out    where it goes (default: the sound effects bus)
   *   wobble { rate, depth }: vibrato, depth in Hz
   *   cut    low-pass it at this many Hz (takes the buzz off squares and saws)
   */
  function tone({ type = 'sine', freq, to = 0, at = ctx.currentTime, dur = 0.2, vol = 0.3, attack = 0.005, out = sound, wobble = null, cut = 0, detune = 0 }) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), at + dur);
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(vol, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    let last = osc;
    if (cut) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cut;
      last.connect(filter);
      last = filter;
    }
    last.connect(gain).connect(out);
    if (wobble) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = wobble.rate;
      depth.gain.value = wobble.depth;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(at);
      lfo.stop(at + dur + 0.05);
    }
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /**
   * A burst of noise through a filter.
   *   kind   'lowpass' | 'highpass' | 'bandpass'
   *   freq   the filter's frequency; `to` is where it has swept to by the end
   *   q      how narrow a band-pass is
   */
  function noise({ kind = 'lowpass', freq = 1000, to = 0, q = 1, at = ctx.currentTime, dur = 0.2, vol = 0.3, attack = 0.003, out = sound }) {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = hiss;
    source.loop = true;
    filter.type = kind;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, at);
    if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(10, to), at + dur);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(vol, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    source.connect(filter).connect(gain).connect(out);
    source.start(at, (at * 0.37) % 1.5);
    source.stop(at + dur + 0.05);
  }

  return {
    ctx,
    music,
    sound,
    hiss,
    tone,
    noise,
    /** Call from a tap or click: browsers keep sound off until then. */
    unlock() {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    get now() {
      return ctx.currentTime;
    },
  };
}
