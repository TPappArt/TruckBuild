// One input path for mouse, touch and pen, using Pointer Events.
// Positions are in CSS pixels relative to the canvas, matching the viewport.
export function createInput(canvas) {
  const pointers = new Map();
  const keys = new Set();

  function track(event) {
    const rect = canvas.getBoundingClientRect();
    pointers.set(event.pointerId, {
      id: event.pointerId,
      type: event.pointerType,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      down: event.buttons !== 0 || event.pointerType === 'touch',
    });
  }

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    track(event);
  });
  canvas.addEventListener('pointermove', track);

  const release = (event) => {
    if (event.pointerType === 'mouse') {
      track(event);
    } else {
      pointers.delete(event.pointerId);
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', (event) => pointers.delete(event.pointerId));
  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') pointers.delete(event.pointerId);
  });

  // Long-press and right-click menus get in the way of play.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => keys.add(event.code));
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  return {
    /** Live pointers: one for a mouse, one per finger on touch screens. */
    get pointers() {
      return [...pointers.values()];
    },
    isKeyDown: (code) => keys.has(code),
  };
}
