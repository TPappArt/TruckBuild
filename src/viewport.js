import { GAME } from './config.js';

// Tracks the canvas's on-screen size and the pixel density to render at,
// through rotation, window resizes, fullscreen changes and layout changes.
//
// `view.width` / `view.height` are in CSS pixels. Multiply by
// `view.pixelRatio` for the backing-store size.
export function createViewport(canvas) {
  const view = { width: 1, height: 1, pixelRatio: 1 };
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
