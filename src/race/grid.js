import { PAINTS, randomBuild } from '../parts/catalog.js';

// Who lines up for a race: three computer rivals in random contraptions,
// with the player at the back of the grid.

const NAMES = ['Sparky', 'Dusty', 'Frosty', 'Nitro', 'Clunk', 'Zippy', 'Rattle', 'Bolt', 'Pickle', 'Gizmo'];

// Grid order, pole first. `pace` is the share of full speed a rival drives
// at; `lane` is how far right of the centre line it likes to run, in metres.
const RIVALS = [
  { pace: 0.985, lane: -2.8 },
  { pace: 0.955, lane: 2.8 },
  { pace: 0.925, lane: -1.2 },
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
  const rivals = RIVALS.map((rival, i) => ({
    ...rival,
    name: names[i],
    build: { ...randomBuild(), paint: paints[i].hex },
  }));
  return [...rivals, { name: 'You', isPlayer: true, build: { ...playerBuild } }];
}
