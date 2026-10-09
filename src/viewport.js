import { GAME } from './config.js';

// Keeps the canvas backing store matched to its on-screen size, on any
// screen density, through rotation, window resizes and fullscreen changes.
//
// `view.width` / `view.height` are in CSS pixels, which is the unit the game
// should think in. The context is pre-scaled so drawing in CSS pixels comes
// out sharp on high-density screens.
export function createViewport(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { width: 0, height: 0, pixelRatio: 1, ctx };
  const listeners = new Set();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, GAME.maxPixelRatio);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    if (width === view.width && height === view.height && pixelRatio === view.pixelRatio) {
      return;
    }

    view.width = width;
    view.height = height;
    view.pixelRatio = pixelRatio;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    for (const listener of listeners) listener(view);
  }

  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('orientationchange', resize);
  resize();

  view.onResize = (listener) => {
    listeners.add(listener);
    listener(view);
  };

  return view;
}
