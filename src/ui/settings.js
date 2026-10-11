import { SETTINGS } from '../settings.js';

// The settings screen: a slider for each setting in settings.js.
//
// It is a small panel over whatever is behind it rather than a full screen,
// so that the camera sliders can be judged against the race they were
// opened from (which is paused meanwhile: see main.js).

const $ = (id) => document.getElementById(id);

/**
 * settings: the object to change (the profile's).
 * onChange(id, value) is called as a slider moves; onClose() when the panel
 * is dismissed.
 */
export function createSettingsScreen({ settings, onChange, onClose }) {
  const root = $('settings');
  const list = $('settings-list');
  let closing = null;

  for (const setting of SETTINGS) {
    const row = document.createElement('label');
    row.className = 'setting';
    const name = document.createElement('span');
    name.className = 'setting-name';
    name.textContent = setting.name;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(setting.min);
    slider.max = String(setting.max);
    slider.step = String(setting.step);
    slider.value = String(settings[setting.id]);
    const ends = document.createElement('span');
    ends.className = 'setting-ends';
    const low = document.createElement('span');
    low.textContent = setting.low;
    const high = document.createElement('span');
    high.textContent = setting.high;
    ends.append(low, high);
    // How full the slider is, for the coloured part of its track.
    const fill = () => slider.style.setProperty('--fill', `${((slider.value - setting.min) / (setting.max - setting.min)) * 100}%`);
    fill();
    slider.addEventListener('input', () => {
      settings[setting.id] = Number(slider.value);
      fill();
      onChange(setting.id, settings[setting.id]);
    });
    row.append(name, slider, ends);
    list.append(row);
  }

  function close() {
    if (root.hidden) return;
    root.hidden = true;
    onClose?.();
    closing?.();
    closing = null;
  }
  $('settings-done').addEventListener('click', close);
  // A tap outside the panel closes it too.
  root.addEventListener('pointerdown', (event) => {
    if (event.target === root) close();
  });

  return {
    /** Shows the panel. `then` is called once it is closed again. */
    open(then = null) {
      closing = then;
      root.hidden = false;
    },
    close,
    get isOpen() {
      return !root.hidden;
    },
  };
}
