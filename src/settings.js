// What the player can adjust, kept with their profile.
//
// Every setting is a number on a slider. `SETTINGS` says what each one is
// called, its range and its starting value; the settings screen is built
// from this list (ui/settings.js), so adding one here adds its slider.

export const SETTINGS = [
  { id: 'music', name: 'Music', low: 'Off', high: 'Loud', min: 0, max: 1, step: 0.1, start: 0.6 },
  { id: 'sound', name: 'Sounds', low: 'Off', high: 'Loud', min: 0, max: 1, step: 0.1, start: 0.8 },
  // How far behind the car the camera rides: 1 is as designed.
  { id: 'camera', name: 'Camera distance', low: 'Near', high: 'Far', min: 0.7, max: 1.5, step: 0.1, start: 1 },
  // How wide the lens is: 1 is as designed.
  { id: 'view', name: 'Field of view', low: 'Narrow', high: 'Wide', min: 0.8, max: 1.25, step: 0.05, start: 1 },
];

/** Settings as saved, with anything missing or out of range put right. */
export function cleanSettings(saved) {
  const from = saved && typeof saved === 'object' ? saved : {};
  const settings = {};
  for (const { id, min, max, start } of SETTINGS) {
    const value = Number(from[id]);
    settings[id] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : start;
  }
  return settings;
}
