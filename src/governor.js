// Keeps the frame rate up on devices that cannot draw the game at full
// sharpness, by drawing fewer pixels. Nothing else about the picture changes:
// the canvas is the same size on screen and the browser scales it up.
//
// It watches how long frames take. If they are slow for half a second it
// steps the sharpness down; if they have been comfortably fast for a while
// it tries a step back up. A step up that turns out to be too much is
// remembered, and not tried again for longer each time, so the picture does
// not keep flickering between two levels.

const STEP = 0.85; // each step down keeps this share of the pixel density
const LOWEST = 0.6; // never below this share of full sharpness
const SLOW = 21; // milliseconds a frame: slower than about 48 a second is too slow
const FAST = 17.6; // comfortably at 60 a second or better
const WINDOW = 30; // frames averaged before deciding anything

export function createGovernor(view) {
  let total = 0;
  let frames = 0;
  let settle = 60; // frames to ignore after a change, a start or a stall
  let fastFor = 0; // seconds of comfortable running in a row
  let patience = 6; // seconds of comfortable running needed before a step up
  let steppedUp = 0; // seconds since the last step up, while it is on trial

  /** Call once a frame with the time since the last one, in seconds. */
  function frame(dt) {
    const ms = dt * 1000;
    // A stall (the tab was hidden, a track was being built) says nothing
    // about how fast the device can draw.
    if (ms > 250) {
      reset();
      return;
    }
    if (settle > 0) {
      settle--;
      return;
    }
    total += ms;
    frames++;
    if (frames < WINDOW) return;
    const average = total / frames;
    const seconds = total / 1000;
    total = 0;
    frames = 0;
    steppedUp += seconds;

    if (average > SLOW && view.quality > LOWEST) {
      // If this follows soon after a step up, that step was a mistake.
      if (steppedUp < 4) patience = Math.min(120, patience * 2.5);
      change(Math.max(LOWEST, view.quality * STEP));
    } else if (average < FAST && view.quality < 1) {
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
    settle = 20;
  }

  /** Forget what has been measured: call when what is being drawn changes. */
  function reset() {
    total = 0;
    frames = 0;
    settle = 60;
    fastFor = 0;
  }

  return { frame, reset };
}
