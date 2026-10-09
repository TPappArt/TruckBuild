import { Node } from '../engine/node.js';
import { createRenderer } from '../engine/renderer.js';

// Renders a part on its own to a small image, for the picker cards.
// Uses a separate offscreen canvas so the main view is never disturbed.

const FOV = 0.45;
const LIGHT = (() => {
  const v = [-0.45, 0.85, 0.5];
  const len = Math.hypot(...v);
  return v.map((value) => value / len);
})();

export function createThumbnailer(size = 192) {
  const canvas = document.createElement('canvas');
  const renderer = createRenderer(canvas);
  renderer.setSize(size, size);

  /** Returns a PNG data URL of `node`, framed to fill the image. */
  return function snapshot(node) {
    // Three-quarter view: the part's front and its outer (+x) side.
    const holder = new Node();
    holder.rotation[1] = -0.8;
    holder.add(node);

    const box = holder.worldBounds();
    const distance = (box.radius / Math.sin(FOV / 2)) * 0.92;
    const pitch = 0.42;
    renderer.render({
      camera: {
        eye: [box.center[0], box.center[1] + Math.sin(pitch) * distance, box.center[2] + Math.cos(pitch) * distance],
        target: box.center,
        fov: FOV,
        near: Math.max(0.05, distance - box.radius * 2),
        far: distance + box.radius * 2,
      },
      light: LIGHT,
      solids: [holder],
    });
    return canvas.toDataURL('image/png');
  };
}
