// Driving input: the keyboard (arrow keys or WASD) and a one-finger joystick
// for touch screens.
//
// The joystick floats: it appears wherever the finger lands, so it suits
// either hand and any grip. While the finger is down the car accelerates;
// dragging sideways steers, by as much as you drag; pulling back brakes and
// then reverses. Lifting the finger coasts.
//
// Weapons that fire have one more control: the space bar, or the fire button
// on screen (a second finger, or a quick tap with the first).
//
// read() returns { steer: -1..1, throttle: 0..1, brake: 0..1, fire: boolean }.

const KEYS = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'gas',
  KeyW: 'gas',
  ArrowDown: 'brake',
  KeyS: 'brake',
  Space: 'fire',
};

const REACH = 56; // how far the knob travels from the centre, in CSS pixels
const DEAD_ZONE = 0.12; // ignore tiny wobbles around the centre
const BRAKE_AT = 0.45; // pull back this far (of the reach) to brake

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function createControls() {
  const keys = { left: false, right: false, gas: false, brake: false, fire: false };
  let firing = false; // the on-screen fire button is held
  const stick = { pointer: null, x: 0, y: 0 }; // x right, y back, each -1..1
  let enabled = false;

  window.addEventListener('keydown', (event) => {
    const action = KEYS[event.code];
    if (!action || !enabled) return;
    keys[action] = true;
    event.preventDefault(); // arrow keys would otherwise scroll or move focus
  });
  window.addEventListener('keyup', (event) => {
    const action = KEYS[event.code];
    if (!action) return;
    keys[action] = false;
    // Space would otherwise "click" whichever button was used last.
    if (enabled) event.preventDefault();
  });
  window.addEventListener('blur', release);

  // ---------- Joystick ----------

  const zone = document.getElementById('drive-zone');
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystick-knob');
  let originX = 0;
  let originY = 0;

  // At rest the joystick sits at the bottom of the screen as a hint. It is
  // only shown on touch screens, or once something else has been touched.
  if (window.matchMedia('(pointer: coarse)').matches) joystick.hidden = false;

  function moveKnob() {
    knob.style.transform = `translate(${stick.x * REACH}px, ${stick.y * REACH}px)`;
    joystick.classList.toggle('braking', stick.y > BRAKE_AT);
  }

  zone.addEventListener('pointerdown', (event) => {
    if (stick.pointer !== null || !enabled) return;
    event.preventDefault();
    stick.pointer = event.pointerId;
    zone.setPointerCapture(event.pointerId);

    // Plant the joystick under the finger.
    const bounds = zone.getBoundingClientRect();
    originX = event.clientX;
    originY = event.clientY;
    joystick.style.left = `${originX - bounds.left}px`;
    joystick.style.top = `${originY - bounds.top}px`;
    joystick.hidden = false;
    joystick.classList.add('held');
    stick.x = 0;
    stick.y = 0;
    moveKnob();
  });

  zone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== stick.pointer) return;
    let dx = (event.clientX - originX) / REACH;
    let dy = (event.clientY - originY) / REACH;
    // Keep the knob inside its ring.
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    stick.x = dx;
    stick.y = dy;
    moveKnob();
  });

  function letGo(event) {
    if (event && event.pointerId !== stick.pointer) return;
    const usedTouch = !event || event.pointerType === 'touch';
    stick.pointer = null;
    stick.x = 0;
    stick.y = 0;
    moveKnob();
    joystick.classList.remove('held');
    // Back to its resting place (set in CSS) until the next touch.
    joystick.style.left = '';
    joystick.style.top = '';
    if (!usedTouch && !window.matchMedia('(pointer: coarse)').matches) joystick.hidden = true;
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    zone.addEventListener(type, letGo);
  }
  zone.addEventListener('contextmenu', (event) => event.preventDefault());

  // ---------- Fire button ----------

  const fireButton = document.getElementById('fire-button');
  fireButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    fireButton.setPointerCapture(event.pointerId);
    firing = true;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    fireButton.addEventListener(type, () => {
      firing = false;
    });
  }
  fireButton.addEventListener('contextmenu', (event) => event.preventDefault());

  function release() {
    firing = false;
    for (const action of Object.keys(keys)) keys[action] = false;
    if (stick.pointer !== null) letGo();
  }

  return {
    /** Input is ignored outside a race, so keys do not get swallowed elsewhere. */
    setEnabled(value) {
      enabled = value;
      if (!value) release();
    },

    read() {
      let steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      let throttle = keys.gas ? 1 : 0;
      let brake = keys.brake ? 1 : 0;

      if (stick.pointer !== null) {
        // Past the dead zone, steering grows smoothly from zero to full lock.
        const amount = Math.abs(stick.x);
        if (amount > DEAD_ZONE) steer += Math.sign(stick.x) * ((amount - DEAD_ZONE) / (1 - DEAD_ZONE));
        if (stick.y > BRAKE_AT) brake = 1;
        else throttle = 1;
      }

      return { steer: clamp(steer, -1, 1), throttle, brake, fire: keys.fire || firing };
    },
  };
}
