// What the drivers say to each other during a race: one short word in a
// bubble over a car, there for a moment and gone. It is only for fun. Nothing
// here changes a race, so it keeps its own dice and the race rules never
// hear about it.
//
// Words are kept to five letters or fewer, for players who are only just
// reading. Drivers speak when something happens to them (a boost, a bomb,
// being overtaken), and say hello when they find themselves side by side;
// the other driver often answers.
//
// The villain (grid.js) is the exception. He talks in whole sentences of
// three or four words, always at the player and never kindly, though it is
// the sort of rudeness a five-year-old finds funny. `{name}` in one of his
// lines is the player's name.
//
// This file decides who says what and when. Drawing the bubbles is the
// HUD's job (hud.js).

const SAYINGS = {
  go: ['Go!', 'Vroom', 'Wheee', 'Yay!', 'Ready'],
  fast: ['Zoom!', 'Wheee', 'Whee', 'Yay!', 'Fast!', 'Wow!'],
  slow: ['Ugh', 'Aww', 'Slow', 'Hmph', 'Yuck'],
  boom: ['Boom!', 'Ouch', 'Yikes', 'Owww', 'Eek!'],
  slip: ['Whoa!', 'Oops', 'Slip!', 'Eek!', 'Uh oh'],
  bounce: ['Boing', 'Wheee', 'Wow!', 'Fly!', 'Up!'],
  cold: ['Brrr', 'Cold!', 'Hey!', 'Ice?!', 'Brrr!'],
  rich: ['Yay!', 'Shiny', 'Mine!', 'Coins', 'Oooh'],
  ouch: ['Ouch', 'Hey!', 'Oof', 'Rude!', 'Owie'],
  gotcha: ['Ha ha', 'Bonk!', 'Pow!', 'Hehe', 'Boop'],
  scare: ['Eek!', 'Yikes', 'Aaah!', 'Help!', 'Nope', 'Mum!'],
  passing: ['Bye!', 'Beep', 'Later', 'Zoom', 'Ta ta', 'Honk'],
  passed: ['Hey!', 'Wait!', 'Aww', 'Nooo', 'Huh?', 'Hmph'],
  won: ['I won', 'Yay!', 'Woo!', 'Yes!'],
  home: ['Phew', 'Done!', 'Aww', 'Fun!', 'Again'],
};

const TAUNTS = {
  start: ['Out of my way!', 'Eat my dust, {name}!', 'Prepare to lose, {name}!', 'Second place suits you!', 'Honk honk, losers!'],
  passing: ['Toodle-oo, slowpoke!', 'Bye bye, {name}!', 'Too slow, {name}!', 'Mind my shiny bumper!', 'Smell my exhaust, {name}!'],
  passed: ['Curses! Come back here!', "That's cheating, {name}!", 'Lucky, lucky, lucky!', 'I let you pass!', 'My hat slipped!', 'Not fair! Not fair!'],
  trap: ['A present for you!', 'Mind the puddle, {name}!', 'Oops! Butter fingers!', 'Slippy slidey time!', 'Catch this, {name}!'],
  gloat: ['Ha! Serves you right!', 'Oh dear, poor {name}!', 'Hee hee, nice crash!', 'Did that hurt? Good!', 'Clumsy, clumsy {name}!'],
  near: ['You drive like soup!', 'Is that a pram?', 'My granny drives faster!', 'Nice car. Not really!', 'Boo to you, {name}!', 'Honk honk, coming through!', 'Go home, {name}!', 'You smell of socks!'],
  ouch: ['My beautiful hat!', 'Who put that there?', 'Your fault, {name}!', 'I meant to do that!', 'Ow! My moustache!'],
  won: ['Baron Honk wins again!', 'Better luck never, {name}!', 'Bow to the Baron!'],
  lost: ['I was not ready!', 'You cheated, {name}! Probably!', 'Next time, {name}!', 'My car was sleepy!'],
};
// Things that happen to the player which he enjoys.
const SERVES_YOU_RIGHT = new Set(['bomb', 'meteor', 'oil', 'slick', 'slow', 'zombie', 'hit', 'pillar', 'snowball', 'skeleton', 'mummy', 'werewolf', 'zap']);

// Hello, and what the other driver says back.
const HELLOS = [
  ['Hello', 'Hi!'],
  ['Hi!', 'Hello'],
  ['Beep', 'Honk'],
  ['Wow', 'Nice!'],
  ['Race?', 'Yes!'],
  ['Hey!', 'Yo!'],
  ['Hiya', 'Howdy'],
  ['Nice!', 'Ta!'],
  ['Boo!', 'Eek!'],
];

// Which set of words goes with each thing that can happen to a racer
// (the `kind` of its lastEvent: see events.js, features.js, hazards.js).
const FOR_EVENT = {
  boost: 'fast',
  'fast-strip': 'fast',
  slow: 'slow',
  'slow-strip': 'slow',
  zombie: 'slow',
  bomb: 'boom',
  meteor: 'boom',
  oil: 'slip',
  trampoline: 'bounce',
  coins: 'rich',
  hit: 'ouch',
  scored: 'gotcha',
  pillar: 'scare',
  snowball: 'scare',
  skeleton: 'scare',
  mummy: 'scare',
  werewolf: 'scare',
  zap: 'scare',
  storm: 'cold',
};

export const BUBBLE_TIME = 1.7; // seconds a bubble stays up
export const TAUNT_TIME = 3.2; // and one of the villain's, which takes longer to read
const TAUNT_REST = 6; // seconds before he speaks again
const TAUNT_NEAR = 16; // metres from the player at which he has something to say
const NEAR_REST = 13; // seconds between remarks made just for being close
const REST = 3.5; // seconds before the same driver speaks again
const AT_ONCE = 2; // bubbles up at the same time, at most
const NEAR = 6.5; // metres apart counts as side by side
const HELLO_REST = 14; // seconds before the same two say hello again

/**
 * Returns { update(session), lines }. Call update once a frame; `lines` is
 * then one entry per racer, in session order: null, or { text, at } for
 * what that driver is saying (`at` is the race time it was said).
 */
export function createChatter(random = Math.random) {
  let lines = [];
  let memory = null; // what each racer was doing last time, to spot changes
  let greeted = new Map(); // "i-j" -> race time the pair last said hello
  let replies = []; // [{ who, text, at }] waiting to be said
  let started = false;
  let his = null; // what the villain was up to last time: { dropped, remarked, last }

  const pick = (list) => list[Math.floor(random() * list.length)];

  function update(session) {
    const racers = session.racers;
    const now = session.time;
    if (!memory || memory.length !== racers.length) {
      memory = racers.map((racer) => ({ event: racer.lastEvent, place: racer.place, frozen: false, finished: racer.finished, spoke: -Infinity }));
      lines = racers.map(() => null);
      greeted = new Map();
      replies = [];
      started = false;
      his = { dropped: session.villain?.dropped ?? 0, remarked: 0, last: null };
    }

    // Bubbles that have had their moment come down.
    lines.forEach((line, i) => {
      if (line && now - line.at > (line.taunt ? TAUNT_TIME : BUBBLE_TIME)) lines[i] = null;
    });
    if (session.phase === 'countdown') return;

    const villain = racers.findIndex((racer) => racer.villain);
    const player = session.player;
    const you = player ? racers.indexOf(player) : -1;
    /**
     * The villain says one of his lines, if he has not just spoken. He does
     * not wait his turn: his bubble goes up whoever else is talking.
     */
    const taunt = (kind, chance = 1) => {
      if (villain < 0 || you < 0 || now - memory[villain].spoke < TAUNT_REST || random() > chance) return false;
      // Not the same line twice running.
      let text = pick(TAUNTS[kind]);
      if (text === his.last) text = pick(TAUNTS[kind]);
      his.last = text;
      lines[villain] = { text: text.replace('{name}', player.name || 'you'), at: now, taunt: true };
      memory[villain].spoke = now;
      return true;
    };

    const showing = () => lines.filter((line) => line && !line.taunt).length;
    /** Driver `i` says something from `words`, if free to. `sure` skips the dice. */
    const say = (i, words, chance = 1, text = null) => {
      if (showing() >= AT_ONCE || now - memory[i].spoke < REST || random() > chance) return false;
      lines[i] = { text: text ?? pick(SAYINGS[words]), at: now };
      memory[i].spoke = now;
      return true;
    };

    // Off the line, once "GO!" has cleared: one of them has something to say.
    if (now < 1.1) return;
    if (!started) {
      started = true;
      if (!taunt('start')) say(Math.floor(random() * racers.length), 'go');
      return;
    }

    // Answers to an earlier hello.
    replies = replies.filter((reply) => {
      if (now < reply.at) return true;
      say(reply.who, null, 1, reply.text);
      return false;
    });

    const apart = villain >= 0 && you >= 0 ? Math.hypot(racers[villain].car.x - player.car.x, racers[villain].car.z - player.car.z) : Infinity;

    racers.forEach((racer, i) => {
      const before = memory[i];
      const mine = i === villain;

      // Something on the track got them.
      if (racer.lastEvent && racer.lastEvent !== before.event) {
        const kind = racer.lastEvent.kind;
        const words = FOR_EVENT[kind];
        if (mine) {
          if (words && words !== 'fast' && words !== 'bounce' && words !== 'gotcha' && !racer.finished) taunt('ouch', 0.5);
        } else {
          if (words) say(i, words, racer.isPlayer ? 0.6 : 0.8);
          // And the villain, if he is near enough to see, is delighted.
          if (i === you && SERVES_YOU_RIGHT.has(kind) && apart < 45) taunt('gloat', kind === 'slick' ? 1 : 0.6);
        }
      }
      before.event = racer.lastEvent;

      // Frozen solid by the player's snowflake.
      const frozen = racer.car.effects.frozen > 0;
      if (frozen && !before.frozen && !mine) say(i, 'cold', 0.7);
      before.frozen = frozen;

      // Over the line.
      if (racer.finished && !before.finished) {
        if (mine) taunt(player && !player.finished ? 'won' : 'lost');
        else say(i, racer.place === 1 ? 'won' : 'home');
      }
      before.finished = racer.finished;
    });

    // The villain has just left something on the road.
    if (session.villain && session.villain.dropped !== his.dropped) {
      his.dropped = session.villain.dropped;
      taunt('trap', 0.75);
    }

    // Overtaking, once the scramble off the grid is over. Whoever went up
    // a place gloats; whoever they passed complains.
    if (now > 4) {
      // The villain and the player swapping places is a matter between them.
      if (villain >= 0 && you >= 0 && !racers[villain].finished && !player.finished) {
        const wasAhead = memory[villain].place < memory[you].place;
        const isAhead = racers[villain].place < racers[you].place;
        if (wasAhead !== isAhead && apart < 40) taunt(isAhead ? 'passing' : 'passed');
      }
      racers.forEach((racer, i) => {
        if (i === villain || racer.finished || racer.place === memory[i].place) return;
        if (racer.place < memory[i].place) say(i, 'passing', 0.55);
        else say(i, 'passed', 0.4);
      });
    }

    // Close to the player with nothing else to say: he thinks of something.
    if (now > 5 && apart < TAUNT_NEAR && now - his.remarked > NEAR_REST && !racers[villain].finished && !player.finished && taunt('near')) his.remarked = now;
    racers.forEach((racer, i) => {
      memory[i].place = racer.place;
    });

    // Side by side: hello.
    if (now > 2.5) {
      for (let i = 0; i < racers.length; i++) {
        for (let j = i + 1; j < racers.length; j++) {
          const a = racers[i].car;
          const b = racers[j].car;
          if (racers[i].finished || racers[j].finished || a.flight || b.flight) continue;
          // The villain does not say hello.
          if (i === villain || j === villain) continue;
          if (Math.hypot(a.x - b.x, a.z - b.z) > NEAR) continue;
          const pair = `${i}-${j}`;
          if (now - (greeted.get(pair) ?? -Infinity) < HELLO_REST) continue;
          greeted.set(pair, now);
          const [hello, answer] = pick(HELLOS);
          // Either may speak first.
          const [first, second] = random() < 0.5 ? [i, j] : [j, i];
          if (say(first, null, 0.75, hello) && random() < 0.7) replies.push({ who: second, text: answer, at: now + 0.7 });
        }
      }
    }
  }

  return {
    update,
    get lines() {
      return lines;
    },
  };
}
