// The game's music, written out as patterns for music.js to play.
//
// A song:
//   bpm      beats a minute
//   root     the key note, as a note number (60 = middle C)
//   scale    the key's seven notes, as semitones above the root
//   chords   one chord for each bar, as a step of the scale (0 = on the key
//            note); the row repeats
//   plan     which tune goes over each bar; its length is the song's length
//   tunes    each a bar of sixteen steps. A number starts a note (a rung of
//            the chord's five-note ladder: 0 is the chord's root, 5 the same
//            an octave up), '-' holds it and '.' is silence
//   bass     r = root, f = fifth, o = octave, t = third, '.' = rest
//   stab     x where the chord is played
//   arp      0 1 2 3 = root, third, fifth, octave of the chord, high up
//   drums    x = hit, o = soft hit
//   mix      how loud each part is against the others (1 = as written)
//
// Because tunes are written against the chord rather than as fixed notes,
// the same bar can be reused over every chord in the row and still fit.

/** "2 - 3 - . . 1 2 ..." as a bar of sixteen steps. */
const bar = (text) => text.split(/\s+/).map((mark) => (mark === '-' || mark === '.' ? mark : Number(mark)));

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
const SNAKE_CHARMER = [0, 1, 4, 5, 7, 8, 10]; // phrygian dominant

export const SONGS = {
  // The garage and the menus: easy-going, bouncing along.
  garage: {
    bpm: 104,
    root: 60,
    scale: MAJOR,
    chords: [0, 5, 3, 4],
    plan: ['a', 'b', 'a', 'c', 'a', 'b', 'c', 'd'],
    tunes: {
      a: bar('2 - 3 - 4 - 3 - 2 - - - . . 1 2'),
      b: bar('3 - - 2 3 - 5 - 4 - - - 3 - . .'),
      c: bar('5 - 4 3 2 - 3 - 1 - - - . . . .'),
      d: bar('0 - 2 - 3 - 2 - 0 - - - - - . .'),
    },
    lead: { type: 'triangle', octave: 1, shine: true },
    bass: { pattern: 'r.....r.f.....r.' },
    stab: { pattern: '..x...x...x...x.', length: 1.2 },
    drums: { kick: 'x.......x.......', snare: '....o.......o...', hat: 'o.o.o.o.o.o.o.o.' },
    mix: { drums: 0.7, lead: 0.9 },
  },

  // Pyramid Desert: a snake charmer's scale over a steady thump.
  desert: {
    bpm: 132,
    root: 62,
    scale: SNAKE_CHARMER,
    chords: [0, 0, 1, 0, 0, 0, 6, 0],
    plan: ['a', 'c', 'a', 'b', 'a', 'c', 'b', 'd'],
    tunes: {
      a: bar('0 - 1 2 1 0 - - 3 - 2 1 2 - - -'),
      b: bar('5 - 4 3 4 - 3 2 3 2 1 0 1 - 0 -'),
      c: bar('3 - - 3 4 3 2 - 3 - - 2 1 - 0 -'),
      d: bar('0 - - - . . 0 1 2 - 1 - 0 - - -'),
    },
    lead: { type: 'square', cut: 2600, octave: 1, wobble: { rate: 6, depth: 5 } },
    bass: { pattern: 'r.r.r.r.r.r.f.r.', length: 1.4 },
    stab: { pattern: '....x.......x...', length: 1.6 },
    arp: { pattern: '0.2.3.2.0.2.3.2.' },
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'o.xoo.xoo.xoo.xo' },
    mix: { arp: 0.7 },
  },

  // Electric Swamp: slinky and a bit funky, with bubbles.
  swamp: {
    bpm: 118,
    root: 57,
    scale: MINOR,
    chords: [0, 0, 5, 6, 0, 3, 5, 6],
    plan: ['a', 'b', 'a', 'c', 'a', 'b', 'd', 'c'],
    tunes: {
      a: bar('0 . 2 . 3 . 2 0 . . 0 2 3 - . .'),
      b: bar('4 . 3 . 2 . 0 . 2 3 2 0 - - . .'),
      c: bar('5 . . 4 . 3 . 2 3 - 2 - 0 - . .'),
      d: bar('0 0 . 0 . 2 . 3 . 2 . 0 . . . .'),
    },
    lead: { type: 'triangle', octave: 2, shine: true },
    bass: { pattern: 'r..r..r...r.f.r.', type: 'sawtooth', cut: 420, length: 1.2 },
    stab: { pattern: '..x.....x.x.....', length: 0.9 },
    arp: { pattern: '....3.......2...' },
    drums: { kick: 'x..x....x.x.....', snare: '....x.......x..o', hat: 'xoxoxoxoxoxoxoxo' },
    mix: { stab: 1.2 },
  },

  // Snowy Mountains: bright, with sleigh bells.
  snow: {
    bpm: 138,
    root: 67,
    scale: MAJOR,
    chords: [0, 4, 5, 3],
    plan: ['a', 'b', 'a', 'c', 'a', 'b', 'd', 'c'],
    tunes: {
      a: bar('2 - 3 - 5 - - 3 4 - 3 - 2 - - -'),
      b: bar('3 - 5 - 7 - 6 5 4 - 5 - 3 - - -'),
      c: bar('5 - 4 3 2 - 1 - 2 - 3 - 0 - - -'),
      d: bar('0 - 2 - 3 - 5 - 4 - 3 - 5 - - -'),
    },
    lead: { type: 'triangle', octave: 1, shine: true },
    bass: { pattern: 'r...f...r...f...' },
    stab: { pattern: '..x...x...x...x.', length: 1.0 },
    arp: { pattern: '0.2.1.2.0.2.3.2.' },
    drums: { kick: 'x.......x.......', snare: '....x.......x...', bell: 'x.x.x.x.x.x.x.x.', hat: '..o...o...o...o.' },
    mix: { arp: 1.1 },
  },

  // Haunted Hollow: slow, minor, and a wobbly voice for the tune.
  haunted: {
    bpm: 108,
    root: 64,
    scale: HARMONIC_MINOR,
    chords: [0, 0, 3, 4, 0, 5, 3, 4],
    plan: ['a', 'b', 'a', 'c', 'a', 'b', 'c', 'd'],
    tunes: {
      a: bar('0 - - - 2 - - - 3 - 2 - 0 - - -'),
      b: bar('3 - - 2 3 - 5 - 4 - - - 3 - - -'),
      c: bar('5 - 4 - 3 - 2 - 1 - 2 - 0 - - -'),
      d: bar('0 . 0 . 1 - 0 - . . . . . . . .'),
    },
    lead: { type: 'sine', octave: 1, attack: 0.05, wobble: { rate: 5.5, depth: 9 }, shine: true },
    bass: { pattern: 'r.......f...r...', length: 3 },
    stab: { pattern: '....x.x.....x.x.', type: 'square', cut: 1500, length: 0.8 },
    arp: { pattern: '3...2...1...2...' },
    drums: { kick: 'x.......x.......', snare: '....o.......o...', hat: '..o...o...o...o.' },
    mix: { stab: 0.8, drums: 0.8, lead: 1.2 },
  },

  // Zombie City: fast and urgent.
  city: {
    bpm: 146,
    root: 62,
    scale: MINOR,
    chords: [0, 5, 2, 6],
    plan: ['a', 'b', 'a', 'c', 'a', 'b', 'c', 'd'],
    tunes: {
      a: bar('0 - - 3 - - 2 - 3 - - - . . 2 3'),
      b: bar('4 - 3 - 2 - 3 - 0 - - - - - . .'),
      c: bar('5 - - 4 3 - 2 - 3 - 4 - 5 - - -'),
      d: bar('3 - 2 0 - - 2 - 0 - - - . . . .'),
    },
    lead: { type: 'square', cut: 3000, octave: 1 },
    bass: { pattern: 'r.r.r.r.r.r.r.f.', type: 'sawtooth', cut: 520, length: 1.3 },
    stab: { pattern: 'x..x..x...x..x..', type: 'sawtooth', cut: 1400, length: 1.3, low: true },
    drums: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    mix: { stab: 0.9 },
  },
};
