import { findPart, PAINTS, randomBuild } from '../parts/catalog.js';

// Who lines up for a race: three computer rivals in random contraptions,
// with the player at the back of the grid.

const NAMES = ['Sparky', 'Dusty', 'Frosty', 'Nitro', 'Clunk', 'Zippy', 'Rattle', 'Bolt', 'Pickle', 'Gizmo'];

// Grid order, pole first. This is a game for young children, so the rivals
// are meant to lose to anyone who keeps the car roughly on the road:
//   pace    share of a good driver's speed they manage
//   lane    how far right of the centre line they like to run, in metres
//   weave   how far they wander either side of that lane, in metres
//   clumsy  how often they take their foot off and drift off line
//           (1 = every 5 to 11 seconds, 0 = never)
export const RIVALS = [
  { pace: 0.66, lane: -6.3, weave: 3.6, clumsy: 1.0 },
  { pace: 0.59, lane: 6.3, weave: 5.0, clumsy: 1.3 },
  { pace: 0.52, lane: -2.7, weave: 6.3, clumsy: 1.6 },
];

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function makeGrid(playerBuild) {
  // Rivals never share the player's colour, or each other's.
  const paints = shuffled(PAINTS.filter((paint) => paint.hex !== playerBuild.paint));
  const names = shuffled(NAMES);
  // What a racer's weapon does in a race comes from the part it has fitted.
  const armed = (driver) => ({ ...driver, attack: findPart('weapon', driver.build.weapon)?.attack ?? null });

  const rivals = RIVALS.map((rival, i) => ({
    ...rival,
    name: names[i],
    build: { ...randomBuild(), paint: paints[i].hex },
  }));
  return [...rivals, { name: 'You', isPlayer: true, build: { ...playerBuild } }].map(armed);
}
