import { GAME } from './config.js';

// Tracks the canvas's on-screen size and the pixel density to render at,
// through rotation, window resizes, fullscreen changes and layout changes.
//
// `view.width` / `view.height` are in CSS pixels. Multiply by
// `view.pixelRatio` for the backing-store size.
//
// `view.quality` (1 = full) scales the pixel density down on devices that
// cannot keep up: see governor.js, which calls `view.setQuality`.
export function createViewport(canvas) {
  const view = { width: 1, height: 1, pixelRatio: 1, quality: 1 };
  const listeners = new Set();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, GAME.maxPixelRatio) * view.quality;
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

  view.setQuality = (quality) => {
    view.quality = quality;
    resize();
  };

  view.onResize = (listener) => {
    listeners.add(listener);
    listener(view);
  };

  return view;
}
