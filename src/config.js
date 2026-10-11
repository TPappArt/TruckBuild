// Single source of truth for anything that depends on the game's name.
// The name is a working title: run `npm run rename -- "New Name"` to change it
// here and in the static files that cannot import this module.
export const GAME = {
  name: 'Fizzbang Rally',

  // Rendering resolution is capped so high-density phone screens do not
  // render four times the pixels for little visible gain.
  maxPixelRatio: 2,

  // Draw fewer pixels on devices that cannot keep up at full sharpness
  // (see governor.js). Off, every device draws at its full pixel density,
  // up to maxPixelRatio, however slowly.
  adaptiveResolution: true,

  // Longest simulation step, in seconds. Stops a huge jump after the tab
  // was in the background.
  maxFrameTime: 0.1,

  // Laps in a race.
  laps: 2,

  // Art budget: the most triangles a single part mesh may use.
  // `npm run check` enforces it.
  triangleBudget: 200,

  // Show each part's triangle count on its card in the garage.
  // Handy while modelling; off for players, who see prices there instead.
  showTriangleCounts: false,

  // The pictures of the tracks on the track picker are taken once and kept
  // in the browser. Raise this number whenever the tracks change how they
  // look, and every player's pictures are taken again.
  picturesVersion: 4,
};
