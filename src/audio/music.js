import { SONGS } from './songs.js';
import { hz } from './sounds.js';

// Plays the songs in songs.js: a little band of five (bass, chords, a busy
// high part, a tune and drums), each a few oscillators or a burst of noise.
//
// A song is written as patterns, sixteen steps to the bar, over a row of
// chords. This file turns the patterns into notes and schedules them a
// quarter of a second ahead on the audio clock, which keeps the beat steady
// even when the page is busy.

const AHEAD = 0.3; // seconds of music kept scheduled
const EVERY = 80; // milliseconds between top-ups
const FADE = 0.5; // seconds for one song to give way to another

// The five notes that always sound right over a chord: 1 2 3 5 6 of a major
// chord, 1 b3 4 5 b7 of a minor one. Tunes are written as steps on this
// ladder, so the same tune fits whichever chord is under it.
const LADDER = { major: [0, 1, 2, 4, 5], minor: [0, 2, 3, 4, 6] };

/**
 * Schedules everything that starts on one step of a song: `step` counts
 * sixteenths from the song's beginning, `at` is when on the audio clock and
 * `out` is where the sound goes.
 */
export function scheduleStep(core, song, step, at, out) {
  /** A scale degree (0 = the key note; may run past 6 or below 0) as a note number. */
  const pitch = (song, degree) => {
    const size = song.scale.length;
    const octave = Math.floor(degree / size);
    return song.root + song.scale[degree - octave * size] + 12 * octave;
  };

  function chordAt(song, bar) {
    const root = song.chords[bar % song.chords.length];
    // Major or minor, from the third that the scale gives it.
    const third = pitch(song, root + 2) - pitch(song, root);
    return { root, ladder: LADDER[third === 4 ? 'major' : 'minor'] };
  }

  /** A step on a chord's ladder as a scale degree. */
  const rung = (chord, index) => chord.root + chord.ladder[((index % 5) + 5) % 5] + 7 * Math.floor(index / 5);

  function drum(kind, at, out, loud) {
    if (kind === 'kick') {
      core.tone({ type: 'sine', freq: 150, to: 44, at, dur: 0.16, vol: 0.5 * loud, out });
    } else if (kind === 'snare') {
      core.noise({ kind: 'bandpass', freq: 1900, q: 0.8, at, dur: 0.13, vol: 0.26 * loud, out });
      core.tone({ type: 'triangle', freq: 190, to: 130, at, dur: 0.08, vol: 0.12 * loud, out });
    } else if (kind === 'hat') {
      core.noise({ kind: 'highpass', freq: 7500, at, dur: 0.035, vol: 0.09 * loud, out });
    } else if (kind === 'bell') {
      core.noise({ kind: 'highpass', freq: 9000, at, dur: 0.09, vol: 0.07 * loud, out });
      core.tone({ type: 'sine', freq: 4200, at, dur: 0.09, vol: 0.02 * loud, out });
    }
  }

  {
    const beat = 60 / song.bpm / 4; // seconds a step
    const bar = Math.floor(step / 16) % song.plan.length;
    const pos = step % 16;
    const chord = chordAt(song, bar);
    const mix = song.mix || {};
    // A song is only eight bars, so each time round is played differently:
    // the tune alone, then with a second voice above it, then a breather
    // with no tune at all, and round again.
    const pass = Math.floor(step / 16 / song.plan.length) % 3;

    for (const [kind, pattern] of Object.entries(song.drums)) {
      const mark = pattern[pos];
      if (mark === 'x') drum(kind, at, out, mix.drums ?? 1);
      else if (mark === 'o') drum(kind, at, out, (mix.drums ?? 1) * 0.5);
    }

    // Bass: r = the chord's root, f = its fifth, o = the root an octave up.
    const low = song.bass.pattern[pos];
    if (low && low !== '.') {
      const degree = chord.root + { r: 0, f: 4, o: 7, t: 2 }[low];
      const freq = hz(pitch(song, degree) - 24);
      core.tone({ type: song.bass.type ?? 'triangle', freq, at, dur: beat * (song.bass.length ?? 1.8), vol: 0.22 * (mix.bass ?? 1), out, cut: song.bass.cut ?? 0 });
      core.tone({ type: 'sine', freq, at, dur: beat * 1.6, vol: 0.16 * (mix.bass ?? 1), out });
    }

    // Chords: the three notes of the triad, short.
    if (song.stab && song.stab.pattern[pos] === 'x') {
      for (const up of [0, 2, 4]) {
        core.tone({ type: song.stab.type ?? 'triangle', freq: hz(pitch(song, chord.root + up) - (song.stab.low ? 12 : 0)), at, dur: beat * (song.stab.length ?? 1.5), vol: 0.06 * (mix.stab ?? 1), out, cut: song.stab.cut ?? 0 });
      }
    }

    // The busy part: one chord note at a time, high up. 0 1 2 3 = root, third, fifth, octave.
    if (song.arp) {
      const mark = song.arp.pattern[pos];
      if (mark !== '.') {
        const degree = chord.root + [0, 2, 4, 7][Number(mark)];
        core.tone({ type: song.arp.type ?? 'triangle', freq: hz(pitch(song, degree) + 12), at, dur: beat * 1.4, vol: 0.055 * (mix.arp ?? 1), out });
      }
    }

    // The tune: a number starts a note on that rung of the chord's ladder,
    // '-' holds it, '.' is silence.
    const tune = song.tunes[song.plan[bar]];
    const mark = tune?.[pos];
    if (typeof mark === 'number' && pass !== 2) {
      let steps = 1;
      while (pos + steps < 16 && tune[pos + steps] === '-') steps++;
      const freq = hz(pitch(song, rung(chord, mark)) + (song.lead.octave ?? 0) * 12);
      const dur = beat * steps * 0.95 + 0.05;
      core.tone({ type: song.lead.type ?? 'triangle', freq, at, dur, vol: 0.15 * (mix.lead ?? 1), out, cut: song.lead.cut ?? 0, attack: song.lead.attack ?? 0.008, wobble: song.lead.wobble ?? null });
      if (song.lead.shine) core.tone({ type: 'sine', freq: freq * 2, at, dur: dur * 0.7, vol: 0.04 * (mix.lead ?? 1), out });
      if (pass === 1) {
        // The second voice: two rungs up the same ladder, and quieter.
        const above = hz(pitch(song, rung(chord, mark + 2)) + (song.lead.octave ?? 0) * 12);
        core.tone({ type: 'triangle', freq: above, at, dur, vol: 0.06 * (mix.lead ?? 1), out });
      }
    }
  }
}

export function createMusic(core) {
  const ctx = core.ctx;
  let playing = null; // { id, song, out, step, next }
  let timer = 0;

  function pump() {
    if (!playing) return;
    const beat = 60 / playing.song.bpm / 4;
    // After a stall (the page was busy, or hidden) carry on from now rather
    // than racing to catch up.
    if (playing.next < ctx.currentTime - 0.1) playing.next = ctx.currentTime + 0.05;
    while (playing.next < ctx.currentTime + AHEAD) {
      scheduleStep(core, playing.song, playing.step, playing.next, playing.out);
      playing.step++;
      playing.next += beat;
    }
  }

  return {
    /** Starts a song by name, fading out whatever was playing. The same song again does nothing. */
    play(id) {
      if (playing?.id === id) return;
      this.stop();
      const song = SONGS[id];
      if (!song) return;
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, ctx.currentTime);
      out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + FADE);
      out.connect(core.music);
      playing = { id, song, out, step: 0, next: ctx.currentTime + 0.1 };
      pump();
      timer = window.setInterval(pump, EVERY);
    },
    stop() {
      if (!playing) return;
      window.clearInterval(timer);
      const { out } = playing;
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
      out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + FADE);
      window.setTimeout(() => out.disconnect(), (FADE + AHEAD + 2) * 1000);
      playing = null;
    },
    get playing() {
      return playing?.id ?? null;
    },
  };
}
