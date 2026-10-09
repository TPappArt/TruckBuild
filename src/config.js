// Single source of truth for anything that depends on the game's name.
// The name is a working title: run `npm run rename -- "New Name"` to change it
// here and in the static files that cannot import this module.
export const GAME = {
  name: 'TruckBuild',

  // Rendering resolution is capped so high-density phone screens do not
  // render four times the pixels for little visible gain.
  maxPixelRatio: 2,

  // Longest simulation step, in seconds. Stops a huge jump after the tab
  // was in the background.
  maxFrameTime: 0.1,

  // Laps in a race.
  laps: 3,

  // Art budget: the most triangles a single part mesh may use.
  // `npm run check` enforces it.
  triangleBudget: 200,

  // Show each part's triangle count on its card in the garage.
  // Handy while modelling; turn off for players.
  showTriangleCounts: true,
};
