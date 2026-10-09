// Driving input from the keyboard (arrow keys or WASD) and from the
// on-screen arrow buttons. Both feed the same four switches, so they can be
// mixed freely.
//
// read() returns { steer: -1..1, throttle: 0|1, brake: 0|1 }.

const KEYS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'gas',
  KeyW: 'gas',
  ArrowDown: 'brake',
  KeyS: 'brake',
};

export function createControls() {
  const keys = { left: false, right: false, gas: false, brake: false };
  const touch = { left: false, right: false, gas: false, brake: false };
  let enabled = false;

  window.addEventListener('keydown', (event) => {
    const action = KEYS[event.code];
    if (!action || !enabled) return;
    keys[action] = true;
    event.preventDefault(); // arrow keys would otherwise scroll or move focus
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYS[event.code];
    if (action) keys[action] = false;
  });
  window.addEventListener('blur', release);

  // On-screen buttons. Each tracks its own finger, so steering and
  // accelerating at the same time works.
  for (const action of Object.keys(touch)) {
    const button = document.getElementById(`touch-${action}`);
    const set = (held) => {
      touch[action] = held;
      button.classList.toggle('held', held);
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      set(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(type, () => set(false));
    }
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  // Show the buttons on touch screens, and on anything else the moment it is touched.
  const pad = document.getElementById('touch-controls');
  if (window.matchMedia('(pointer: coarse)').matches) pad.hidden = false;
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') pad.hidden = false;
  });

  function release() {
    for (const state of [keys, touch]) {
      for (const action of Object.keys(state)) state[action] = false;
    }
    for (const button of pad.querySelectorAll('.held')) button.classList.remove('held');
  }

  return {
    /** Keys are ignored outside a race, so they do not get swallowed elsewhere. */
    setEnabled(value) {
      enabled = value;
      if (!value) release();
    },
    read() {
      const left = keys.left || touch.left;
      const right = keys.right || touch.right;
      return {
        steer: (right ? 1 : 0) - (left ? 1 : 0),
        throttle: keys.gas || touch.gas ? 1 : 0,
        brake: keys.brake || touch.brake ? 1 : 0,
      };
    },
  };
}
