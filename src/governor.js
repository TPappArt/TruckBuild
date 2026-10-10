// Keeps the frame rate up on devices that cannot draw the game at full
// sharpness, by drawing fewer pixels. Nothing else about the picture changes:
// the canvas is the same size on screen and the browser scales it up.
//
// It watches how long frames take. If most of them are slow for half a
// second it steps the sharpness down; if they have all been comfortably
// fast for a while it tries a step back up. A step up that turns out to be too much is
// remembered, and not tried again for longer each time, so the picture does
// not keep flickering between two levels.

const STEP = 0.85; // each step down keeps this share of the pixel density
const LOWEST = 0.6; // never below this share of full sharpness
const SLOW = 21; // milliseconds: a frame slower than this (under about 48 a second) is too slow
const FAST = 17.6; // a frame this quick is comfortably at 60 a second or better
const STALL = 1000; // a frame this long is not the device drawing slowly: something else held it up
const WINDOW = 30; // frames looked at before deciding anything...
const WINDOW_TIME = 2000; // ...or this many milliseconds, if that comes first
const FEWEST = 8; // but never fewer frames than this

export function createGovernor(view) {
  let frames = 0;
  let slow = 0;
  let fast = 0;
  let total = 0;
  let settle = 60; // frames to ignore after a change, a start or a stall
  let fastFor = 0; // seconds of comfortable running in a row
  let patience = 6; // seconds of comfortable running needed before a step up
  let steppedUp = Infinity; // seconds since the last step up

  /** Call once a frame with the time since the last one, in seconds. */
  function frame(dt) {
    const ms = dt * 1000;
    // A stall (the tab was hidden, a track was being built) says nothing
    // about how fast the device can draw.
    if (ms > STALL) {
      reset();
      return;
    }
    if (settle > 0) {
      settle--;
      return;
    }
    // Frames are counted, not averaged, so that one hiccup among thirty
    // good frames does not look like a slow device.
    frames++;
    total += ms;
    if (ms > SLOW) slow++;
    else if (ms < FAST) fast++;
    if (frames < FEWEST || (frames < WINDOW && total < WINDOW_TIME)) return;
    const mostlySlow = slow > frames * 0.6;
    const allFast = fast > frames * 0.9;
    const seconds = total / 1000;
    frames = 0;
    slow = 0;
    fast = 0;
    total = 0;
    steppedUp += seconds;

    if (mostlySlow && view.quality > LOWEST) {
      // If this follows soon after a step up, that step was a mistake.
      if (steppedUp < 4) patience = Math.min(120, patience * 2.5);
      change(Math.max(LOWEST, view.quality * STEP));
    } else if (allFast && view.quality < 1) {
      fastFor += seconds;
      if (fastFor >= patience) {
        change(Math.min(1, view.quality / STEP));
        steppedUp = 0;
      }
    } else {
      fastFor = 0;
    }
  }

  function change(quality) {
    view.setQuality(quality);
    fastFor = 0;
    settle = 12;
  }

  /** Forget what has been measured: call when what is being drawn changes. */
  function reset() {
    frames = 0;
    slow = 0;
    fast = 0;
    total = 0;
    settle = 30;
    fastFor = 0;
  }

  return { frame, reset };
}
