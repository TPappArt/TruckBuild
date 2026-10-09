import { GAME } from './config.js';

// requestAnimationFrame loop that pauses while the tab or app is hidden.
// `update(dt)` gets seconds since the previous frame; `render()` draws.
export function createLoop({ update, render }) {
  let running = false;
  let frame = 0;
  let last = 0;

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, GAME.maxFrameTime);
    last = now;
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
