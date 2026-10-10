import { GAME } from './config.js';

// requestAnimationFrame loop that pauses while the tab or app is hidden.
// `update(dt)` gets seconds since the previous frame; `render()` draws.
// `measure(seconds)`, if given, gets the true time since the previous frame,
// however long that was.
export function createLoop({ update, render, measure }) {
  let running = false;
  let frame = 0;
  let last = 0;

  function tick(now) {
    if (!running) return;
    const elapsed = (now - last) / 1000;
    const dt = Math.min(elapsed, GAME.maxFrameTime);
    last = now;
    measure?.(elapsed);
    update(dt);
    render();
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }

  let wasRunning = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasRunning = running;
      stop();
    } else if (wasRunning) {
      start();
    }
  });

  return { start, stop };
}
