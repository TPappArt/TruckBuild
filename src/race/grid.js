import { CHARACTERS, VILLAIN } from '../characters.js';
import { findPart, isPremium, PAINTS, randomBuild } from '../parts/catalog.js';

// Who lines up for a race: the villain on pole, two more computer rivals in
// random contraptions, and the player at the back of the grid.

const NAMES = ['Sparky', 'Dusty', 'Frosty', 'Nitro', 'Clunk', 'Zippy', 'Rattle', 'Bolt', 'Pickle', 'Gizmo'];

// How good the rivals are. Each level gives the three rivals in grid order,
// pole first:
//   pace    share of a good driver's speed they manage
//   lane    how far right of the centre line they like to run, in metres
//   weave   how far they wander either side of that lane, in metres
//   clumsy  how often they take their foot off and drift off line
//           (1 = every 5 to 11 seconds, 0 = never)
// and how they treat the player:
//   wait     a rival this many metres ahead of the player has slowed to...
//   floor    ...this share of its pace, and goes no slower
//   catchUp  the most extra pace a rival finds when it is behind
//   trigger  chance per second that a rival with a car in its sights shoots
//   reward   coins are multiplied by this
//
// Easy is for young children: the rivals lose to anyone who keeps the car
// roughly on the road. Hard rivals drive properly and do not wait.
// The villain is in every race: Baron Honk, in the same car each time so
// that he is known at a glance. He drives as the first rival of whichever
// level is being played, and on top of that makes it his business to be in
// the player's way (see VILLAIN in session.js for how).
const BARON = {
  name: VILLAIN.name,
  character: VILLAIN.id,
  villain: true,
  // A colour of his own, which is not one a player can pick.
  build: { wheels: 'monster-wheels', body: 'bulldog', extra: 'top-hat', weapon: null, paint: '#6a3fb5' },
};

export const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'Easy',
    rivals: [
      { pace: 0.63, lane: -6.3, weave: 3.6, clumsy: 1.0 },
      { pace: 0.56, lane: 6.3, weave: 5.0, clumsy: 1.3 },
      { pace: 0.5, lane: -2.7, weave: 6.3, clumsy: 1.6 },
    ],
    wait: 72,
    floor: 0.25,
    catchUp: 1.05,
    trigger: 0.2,
    reward: 1,
  },
  {
    id: 'medium',
    name: 'Medium',
    rivals: [
      { pace: 0.8, lane: -6.3, weave: 3.0, clumsy: 0.6 },
      { pace: 0.74, lane: 6.3, weave: 4.0, clumsy: 0.8 },
      { pace: 0.68, lane: -2.7, weave: 5.0, clumsy: 1.0 },
    ],
    wait: 170,
    floor: 0.55,
    catchUp: 1.08,
    trigger: 0.35,
    reward: 1.5,
  },
  {
    id: 'hard',
    name: 'Hard',
    rivals: [
      { pace: 0.98, lane: -5.5, weave: 1.6, clumsy: 0.15 },
      { pace: 0.93, lane: 5.5, weave: 2.2, clumsy: 0.25 },
      { pace: 0.87, lane: -2.0, weave: 3.0, clumsy: 0.4 },
    ],
    wait: 600,
    floor: 0.88,
    catchUp: 1.12,
    trigger: 0.6,
    reward: 2,
  },
];

export const findDifficulty = (id) => DIFFICULTIES.find((level) => level.id === id) || DIFFICULTIES[0];

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * playerBuild: the player's vehicle.
 * player:      { name, character } for the nameplate.
 * difficulty:  one of DIFFICULTIES.
 */
export function makeGrid(playerBuild, player = {}, difficulty = DIFFICULTIES[0]) {
  // Rivals never share the player's colour, name or face, or each other's.
  const paints = shuffled(PAINTS.filter((paint) => paint.hex !== playerBuild.paint));
  const taken = [String(player.name).toLowerCase(), BARON.name.toLowerCase()];
  const names = shuffled(NAMES.filter((name) => !taken.includes(name.toLowerCase())));
  const faces = shuffled(CHARACTERS.filter((character) => character.id !== player.character));
  // What a racer's weapon does in a race comes from the part it has fitted.
  const armed = (driver) => ({ ...driver, attack: findPart('weapon', driver.build.weapon)?.attack ?? null });

  const rivals = difficulty.rivals.map((rival, i) =>
    i === 0
      ? { ...rival, ...BARON, build: { ...BARON.build } }
      : {
          ...rival,
          name: names[i],
          character: faces[i].id,
          // (Premium parts are the player's to show off: rivals never have them.)
          build: { ...randomBuild((category, part) => part === null || !isPremium(findPart(category, part))), paint: paints[i].hex },
        },
  );
  const you = { name: player.name || 'You', character: player.character, isPlayer: true, build: { ...playerBuild } };
  return [...rivals, you].map(armed);
}
