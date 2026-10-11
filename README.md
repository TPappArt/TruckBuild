# Fizzbang Rally

A low-poly build-and-race game for the browser, on desktop and mobile,
fullscreen. You start by building a truck, car, tank or stranger contraption
from parts, then race it. The name is one command to change; see
[Renaming the game](#renaming-the-game).

**What exists so far:** the build phase, the first race type, and the
things that hold them together: a driver, coins, a shop and tracks to open.

- **Driver:** on a first visit the player picks a face and types a name.
  Both go on the nameplate over their car and in the results.
- **Garage:** pick one part from each of four categories and see the result
  on a turntable. A new player owns a starter set; the rest are bought with
  coins.
- **Race:** a two-lap circuit race against three computer rivals, at one of
  three difficulties, on one of five tracks. One of the three is always the
  villain, [Baron Honk](#the-villain); the other two turn up in random
  contraptions. Random events on the road (pickups, hazards, trampolines and
  strips), a dangerous landmark on each track, bridges, tunnels and two-lane
  stretches, and working weapons shake things up. Two more race types are
  planned.
- **Golden things:** three hidden on every track, which buy the four
  [premium parts](#golden-things-and-premium-parts).
- **Sound:** music for the garage and for each track, and a sound for
  everything that happens, all [made by the game as it goes](#sound-and-music).
- **Settings:** music and sound volume, how far back the camera rides and
  how wide its view is. See [Settings](#settings).
- **Installers:** an Android app and a Windows setup program, built and
  tried out by a workflow. See [Installing it](#installing-it).

| Category | Parts (price in coins) | Premium (price in golden things) |
| --- | --- | --- |
| Wheels | Kart Wheels (free), Monster Wheels (150), Spider Legs (220), Tank Treads (260), Mech Legs (340) | Gold Rims (3) |
| Body | Kart (free), Pickup (120), Bug (160), Bulldog (220), Tub (280) | Hot Rod (4) |
| Extras (optional) | Spoiler (60), Shark Fin (80), Side Pipes (120), Glider Wings (180), Rocket Booster (260) | Champion Wing (3) |
| Weapons (optional) | Twin Blaster (free), Flipper (140), Hammer (200), Buzz Saw (240), Cannon (300) | Fizz Cannon (4) |

Any part fits any body: bodies declare mount points and parts attach to them.

## Coins, parts and tracks

Coins come from three places (`src/race/rewards.js`):

| For | Coins |
| --- | --- |
| Finishing 1st, 2nd, 3rd, 4th | 60, 30, 15, 5 |
| Each hit on a rival with a weapon | 5 |
| A coin bag, which turns up on the road now and then | 20 |

The whole lot is multiplied by 1.5 on Medium and 2 on Hard. Leaving a race
early pays nothing.

In the garage, a part the player does not own has a padlock and a price.
Tapping it tries it on; a bar then offers to sell it. Parts being tried on
are taken off again when the player goes racing. Prices are in
`src/parts/catalog.js`.

Tracks open in order. Pyramid Desert is open from the start; each of the
others opens when the track before it has been won twice, or can be bought
outright:

| Track | Opens after two wins on | Or costs |
| --- | --- | --- |
| Pyramid Desert | open from the start | |
| Electric Swamp | Pyramid Desert | 300 |
| Snowy Mountains | Electric Swamp | 400 |
| Haunted Hollow | Snowy Mountains | 500 |
| Zombie City | Haunted Hollow | 600 |

Everything about a player is kept in the browser (`localStorage`, see
`src/profile.js`): driver, coins, parts owned, tracks open, wins, golden
things found, settings and the current build. Nothing is sent anywhere.
Clearing site data starts again.

### Golden things and premium parts

Every track has three golden things on it: a star, a spanner and a crown.
They are always in the same three places, out toward the kerb where it takes
a little steering to fetch them, and each can be picked up once, ever. One
is the player's from the moment the car touches it, whether or not the race
is finished. The stars under the coin count during a race, and in the corner
of each track's picture, show which have been found; the minimap shows where
the rest are (`src/race/gold.js`).

Golden things buy the four premium parts, which coins cannot. There are
fifteen in the game and the four parts cost fourteen between them, so
nothing has to be chosen between: find them all and everything can be had.
Spending never takes a golden thing away (the stars stay lit); what has been
spent is worked out from which premium parts are owned.

| Premium part | Costs | |
| --- | --- | --- |
| Gold Rims | 3 | whitewall tyres on gold rims |
| Champion Wing | 3 | two decks of gold and a star |
| Hot Rod | 4 | long nose, the engine out in the open |
| Fizz Cannon | 4 | a bottle of fizz that fires its cork, and reloads in 7 seconds rather than 10 |

Rivals never have premium parts: they are the player's to show off.

## Running it

There is no build step and there are no dependencies. Any static file server
works; one is included:

```sh
npm run dev
```

It prints a `localhost` address and a network address. Open the network address
on a phone on the same Wi-Fi to test on a real device.

Opening `index.html` straight from disk does not work, because browsers block
JavaScript modules on `file://` pages.

## Installing it

The game is a web page, and the installers are that page wrapped up so that
it can be put on a device like any other app. Neither goes online: there is
nothing to sign in to and nothing is sent anywhere.

| | File | What it is |
| --- | --- | --- |
| Android | `FizzbangRally.apk` | An app for Android 6 and newer, about a quarter of a megabyte. It asks for no permissions at all, not even the network. |
| Windows | `FizzbangRally-Setup.exe` | A setup program for Windows 10 and 11. Installs for the current user (no administrator password), with Start menu and desktop shortcuts and an entry under "Installed apps" to remove it. |
| Windows | `FizzbangRally.exe` | The same game as one program that runs where it is, with no setup. |

**Where they come from.** Pushing a version tag (`git tag v0.7.0 && git push
origin v0.7.0`) runs the *Installers* workflow, which builds all three,
installs and starts the Android app on an emulator, installs, runs and
removes the Windows one on a Windows machine, and puts the files in a draft
release for someone to look over and publish. It can also be started by hand
from the repository's Actions tab.

**Installing on Android.** Open the `.apk` on the phone or tablet. Android
asks once for permission to install apps from that source (the browser or
file manager it was opened from), since it did not come from a store.

**Installing on Windows.** Run the setup program. It is not signed with a
publisher's certificate, so Windows may show "Windows protected your PC":
choose *More info*, then *Run anyway*.

On Windows the game shows in a window of its own using Microsoft Edge, which
every Windows 10 and 11 machine has (or Chrome, or failing both the default
browser). The program serves the game to that window from inside itself, to
this computer only, and stops when the window is closed. Saved games are
kept in a browser profile of the game's own
(`%LOCALAPPDATA%\truckbuild\Profile`, named after the game's first working
title so that renaming the game never loses them); uninstalling removes
them.

**Building them yourself.**

```sh
npm run build:windows   # needs Go; and makensis for the setup program
npm run build:android   # needs a JDK and an Android SDK (ANDROID_HOME)
```

Both start from `npm run package`, which gathers the game's files into
`dist/www`. That folder is also all a web server needs to host the game.

**The Android signing key.** Android only lets an app be updated by one
signed with the same key. The key in `android/sideload.jks` is used by
default and is in this repository for anyone to read: fine for handing the
app to family and friends, no good for a store. To use a key of your own,
keep it out of the repository and give the workflow three secrets:
`ANDROID_KEYSTORE_BASE64` (the keystore file, base64 encoded),
`ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_ALIAS`. An app already installed
with the old key has to be uninstalled once before one signed with the new
key will go on, which loses its saved game.

## Art style and the triangle budget

Parts are cartoon-style and low-poly: at most **200 triangles** each
(`GAME.triangleBudget` in `src/config.js`). The soft, rounded look comes from
shading, not polygons: a box gets one chamfer per edge and the lighting is
blended across it, which reads as a rounded corner at 44 triangles.

The budget applies to one unit of a part: a single wheel, track or leg, or one
side of a mirrored pair. A vehicle reuses that mesh for every copy.

```sh
npm run check
```

lists every part's triangle count and fails if any is over budget. Turn on
`GAME.showTriangleCounts` to see the count on each card in the garage.

There are no model files. Parts are written in code with a small shape kit
(`src/parts/kit.js`), so they are quick to tweak and cost nothing to download.

### Detail on a budget

Things are made to look busier than they are, and the tricks are worth
knowing before modelling anything new:

- **A stripe is a slab.** A line down both flanks of a body is one thin
  slab a finger wider than the body, so only its two edges show: 12
  triangles. Bands round posts, logs on a cabin, ribs on a container and
  hoops on a drum are all made the same way.
- **Windows are a band.** A storey of windows on a building is one slab of
  glass a touch bigger than the walls, cut into panes by uprights that stand
  proud of it. Four walls of windows cost 12 triangles a storey.
- **Stripes are separate pieces of colour.** A barrier board is six small
  slabs in two colours, not a texture.
- **Paint is nearly free.** The ground is flat layers drawn in order, each
  over the last, so tyre marks, cracks, ragged verges, planks, flagstones,
  leaves and strands of grass are all paint (`race/world.js`).
- **No two the same.** Every copy of a prop is a touch lighter or darker
  and warmer or cooler than the next, and scattered ones are a little
  taller or squatter, decided by where each stands. Everything is shaded
  darker toward the ground it stands on, car bodies included. All of it is
  worked into the colours when the meshes are merged (`engine/bake.js`), so
  it costs nothing to draw.
- **Scenery comes in groups.** Each track places a dozen little scenes
  round the lap (a ruined colonnade, an oasis, a roadblock, a pumpkin patch)
  and only a thin scatter between them. See `spots()` in `race/world.js`
  and `decorate()` in each track file.

Shared trackside furniture (barriers, cones, crates, drums, lamp posts,
fences, bunting, arrow boards) is in `src/race/dressing.js`.

### Adding a part

1. Write a function in the matching file under `src/parts/` that builds the
   part with the kit and returns its node. Model it around the origin: for
   extras and weapons that is the attachment point.
2. Add an entry to that file's exported list with an `id`, a `name` and, for
   extras and weapons, the body mount it uses (`slot`).
3. Give it a price in `src/parts/catalog.js`: coins in `PRICES`, or golden
   things in `GOLD_PRICES` to make it a premium part.
4. Run `npm run check`.

A new body also needs `mounts`: where the axles, weapons and extras attach.
`src/parts/bodies.js` documents them.

## Racing

| | Keyboard | Touch screen (one finger) |
| --- | --- | --- |
| Steer | Left / Right, or A / D | Drag left or right; further turns harder |
| Accelerate | Up, or W | Automatic while the finger is down |
| Brake, then reverse | Down, or S | Pull the finger back |
| Fire (blaster, cannon) | Space | Fire button, middle left |

On a touch screen the whole race view is a floating joystick: it appears
wherever the finger lands, so it suits either hand. Lifting the finger coasts.
The ring shown at the bottom of the screen at rest is only a hint.

Driving is deliberately forgiving (`src/race/car.js`): a car is a point with
a heading and a velocity, and sideways speed bleeds away at a rate set by the
track's grip. Turning too hard scrubs speed off rather than spinning the car,
so holding the accelerator and steering gets a beginner round. Leaving the
road is slow, and a soft wall at the edge of the shoulder keeps everyone on
the circuit. Snow has about half the grip of the desert.

A car can never point more than about 25 degrees away from the way it is
travelling (`TUNING.maxSlide`; snow allows more), which is what keeps it from
feeling slippery however hard the steering is held over.

The player also gets a helping hand, so that the road does not need watching
every moment and there is time to look at the track (`ASSIST` in
`src/race/car.js`). The car leans toward the way the road runs a little way
ahead, less the harder the steering is held over, and is eased back toward
the middle as it nears the edge of the tarmac. It is slight on purpose: a
car with nobody steering gets about four times as far before it meets the
wall, and still does not make it round the lap. A car pointing well away
from the road is left alone, as the driver evidently means it. Rivals get
none.

The camera rides about ten metres behind the car and four above it, far
enough back to see what is coming up beside the road as well as on it.

Each lap is split into four sectors. A gate and a line across the road mark
the end of each of the first three, and light up green as the player goes
through. A small map at the top right shows the circuit, the sectors done
this lap, the landmark in red, bridges, tunnels and two-lane stretches in
light blue, and a dot for every racer.

Every car has a nameplate over it with its driver's face and name. Coins
picked up so far are shown under the place number.

Drivers talk. A bubble with one short word pops up over a car when
something happens to it ("Zoom!" for a boost, "Oops" for oil, "Brrr" when
frozen, "Bye!" for an overtake), and two cars side by side say hello, with
the other often answering ("Beep", "Honk"). Words are five letters or
fewer, for players who are only just reading; at most two bubbles show at
once. It is decoration only and changes nothing about a race
(`src/race/chatter.js`).

For now every build drives the same. Wheels, bodies and extras are looks
only; weapons work (below).

### Weapons

| Weapon | In a race |
| --- | --- |
| Twin Blaster, Cannon, Fizz Cannon | Fired with the fire button, then 10 seconds to reload (7 for the Fizz Cannon). The shot follows the road and drifts toward the nearest car ahead, so aiming is forgiving. |
| Hammer, Buzz Saw, Flipper | Always on. Any car that comes within about 3.5 m of the front of yours gets knocked. |

A hit does exactly what a bomb does: the car is tossed in the air and loses
its speed. A car that has just been knocked cannot be knocked again for a
couple of seconds. Rivals use their weapons too, but are slow on the trigger.
The rules are in `src/race/combat.js`.

### Rivals and difficulty

The player picks a difficulty on the track picker (`src/race/grid.js`):

| | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Rivals' pace, as a share of a good driver's | 50 to 63% | 68 to 80% | 87 to 98% |
| Clumsy moments (foot off, drifting off line) | every few seconds | now and then | rare |
| A rival ahead of the player | slows right down and waits | eases off | barely lifts |
| Trigger finger | slow | middling | quick |
| Coins | x1 | x1.5 | x2 |

Easy is for young children: the rivals are meant to lose to anyone who keeps
the car roughly on the road. On Hard they drive properly and do not wait.

### The villain

One rival is in every race: **Baron Honk**, in a top hat, in the same purple
car each time so that he is known at a glance. He starts on pole and drives
as the quickest rival of whichever difficulty is being played, with four
differences, all of them aimed at the player and all of them mild
(`VILLAIN` in `src/race/session.js`):

| | |
| --- | --- |
| He blocks | Just ahead of the player, he drifts over to whichever side of the road the player is on. He only looks in his mirror about once a second, so a change of side gets past him. |
| He lurks | He waits for the player sooner than the other rivals do, and tries a little harder to catch up, so he is usually somewhere near. |
| He drips | When he is a little way ahead, every ten seconds or so he leaves a small purple slick behind him. It only ever catches the player, for half as long as a proper oil patch, and it is gone after one car or nine seconds. |
| He tires | Over the last third of the last lap he eases off, so that a player who has kept up gets to go past him at the end. (Less so the harder the level.) |

He has no weapon. He also talks: where the other drivers say one short word,
he says three or four, always at the player, by name where it fits, and
never kindly ("My granny drives faster!", "You drive like soup!"). He
sounds his horn first. What he says and when is in `src/race/chatter.js`.

`npm run simulate` and `npm run fuzz` both race against him.

### Track events

Each race has these on the road (`src/race/events.js`):

| Family | Event | What it does |
| --- | --- | --- |
| Pickup | Lightning bolt | Speed boost for a few seconds. Bolts sit in two rows of five across the road, in the same places every race. |
| Pickup | Snowflake | Freezes every other car for 4 seconds. Only the player can pick it up. |
| Pickup | Coin bag | 20 coins. Rare: one on the track at a time. Only the player can pick it up. |
| Pickup | Snail | Slows the car for a few seconds |
| Hazard | Bomb | Tosses the car in the air; it loses its speed |
| Hazard | Oil | Grip and steering go for a moment |
| Modifier | Trampoline | Throws the car about 70 m down the track |
| Modifier | Strip | One side of the road speeds cars up (green arrows) or slows them down (red bars) while they are on it, and flips between the two every 6 to 12 seconds |

Apart from the bolt rows, everything is placed at random each race. Bolts
come back where they were a few seconds after being taken; other pickups and
bombs reappear somewhere else; oil moves on after a while. There are more
good things than bad. Rivals do not avoid anything, which is part of why
they lose.

Everything is colour coded with a halo and a ring on the road, so it can be
read without reading: **green** helps, **red** hurts, **blue** bounces,
**gold** is money.

### Landmarks

Every track has one landmark: a stretch that looks like nowhere else on the
lap and is the dangerous part of it. The track's traps are there and nowhere
else, so the rest of the lap is for racing. It is marked in red on the
minimap, and it is where the track's picture is taken.

| Track | Landmark | What happens there |
| --- | --- | --- |
| Pyramid Desert | The Great Pyramid. The road runs straight through it, between sphinxes. | Stone pillars rise out of the floor (the floor glows red first; a raised pillar is solid). Mummies climb out of the floor ahead of a car and take a swing. |
| Electric Swamp | Thunder Bridge, a long wooden bridge over a glowing lake. | Three towers each hang a curtain of electricity over one half of the deck; the live half swaps sides every couple of seconds. Lightning strikes the deck, with a ring showing where a second before. |
| Snowy Mountains | Avalanche Pass, a gorge between cliffs with an arch of ice at each end. | Giant snowballs roll out of the cliffs across three lanes of ice. Gusts of snow push cars sideways and close in the view. |
| Haunted Hollow | The graveyard of the old manor. | Skeletons climb out of graves in the road and clout anything in reach. A werewolf crouches at the roadside, then bounds across. |
| Zombie City | The ruined high street, under a fallen walkway. | Zombies wander across the road; running one down sends it flying but gums the car up for a moment. Burning wreckage falls from the sky onto ringed spots. |

The rules for what stands in the road are in `src/race/features.js`, the
rules for what comes at a car are in `src/race/hazards.js`, and what it all
looks like is in `src/race/setpieces.js` and `src/race/props.js`. Everything
gives warning, so it can be dodged.

The pyramid needs a straight stretch of road; the others follow the road
round whatever bend it is on. Landmarks are placed clear of the checkpoints.

### Two lanes, bridges and tunnels

Every track has two stretches where the road stops being one flat ribbon:

| Kind | What it is |
| --- | --- |
| `split` | The road divides round an island for about 100 m: two lanes, each wide enough to overtake in, with a barrier and a row of something (palms, pines, lanterns) between them. |
| `over` | The whole road climbs onto a viaduct 6 m up, with arches underneath and a parapet. |
| `under` | The whole road dives 7 m into a cutting and then a tunnel, lit by lamps along the walls. |
| `fork` | Both at once: the left lane goes over, the right lane goes under, and they meet again at the far end. |

| Track | Stretches, in lap order |
| --- | --- |
| Pyramid Desert | Two lanes round a row of palms; a fork |
| Electric Swamp | Two lanes round a bank of mushrooms; a viaduct |
| Snowy Mountains | A fork; two lanes round a line of pines |
| Haunted Hollow | Two lanes round a row of lanterns; a tunnel |
| Zombie City | A flyover; a fork |

A layout lists them as `sections: [{ kind, around, metres }]`: the kind, where
on the lap its middle is (0 to 1) and how long it is. `src/race/track.js`
turns that into a height for each half of the road and a width for the
island at every point (`heightAt`, `dividerAt`, `roofAt`), with 38 m ramps
and a 12 m nose where an island opens out. `src/race/roadworks.js` builds
what is seen: the road surface, viaduct walls, retaining walls, ceilings,
tunnel mouths and the island's barrier, in colours the theme chooses
(`works`). What stands along an island is the theme's `median`.

The race is still decided on the flat: a car is a point on the map, and its
height is looked up from where it is. The island is solid and cars glance
off it. Rivals pick a lane before they reach one. Bolt rows, strips and
trampolines are kept off these stretches, and nothing is left on a slope.
In a tunnel the camera stays under the roof and the light dims.

### Tracks

Tracks are defined by a dozen control points each, plus the stretches above
(`src/race/tracks/`). A theme also sets its sky, fog, lighting, road colours,
scenery, what is in the air and where its picture is taken from. Adding a
track means adding one file there and listing it in `tracks/index.js`; a new
kind of landmark also needs its rules, its hazard and its looks.

The picture of each track on the track picker is a real view of it, with
cars going through the landmark. Pictures are taken the first time the game
runs (behind a loading screen) and kept in the browser. Raise
`GAME.picturesVersion` in `src/config.js` after changing how a track looks,
and they are taken again.

```sh
npm run simulate
```

runs seeded races on every track at every difficulty with no graphics: the
three rivals against two stand-ins for the player, a tidy driver and a
sloppy one. It reports wins, places and times, and fails if any car does not
finish. Run it after changing the driving model, the rivals, the events, a
landmark or a layout.

```sh
npm run fuzz
```

tries to break a race instead: it puts a driver who does anything at all in
the player's seat (random stabs at the controls, reversing round the lap,
parking across the road on the nose of an island, never letting go of the
fire button) and checks sixty times a second that nothing impossible has
happened: every number is a number, no car is through a wall or inside an
island, places are 1 to 4 with no ties, and the rivals keep moving.

```sh
npm run check:contrast
```

checks that what a driver has to tell apart can be told apart. It works out
the colour the road, its verge, the ground, the kerbs, the centre line, the
pickups' rings and every car paint come out on screen on each track (the
same sums as the shader: that track's light, sky and fog), near the car and
well down the road, and measures how different each pair looks. The road
against what lies beside it matters most: it is what a child steers by. Run
it after changing a track's colours, lighting or fog.

```sh
npm run check:tracks            # every track
npm run check:tracks -- snow    # one track
```

looks for scenery standing where cars drive. It builds each track as the
game does and tests every triangle of scenery: anything over the tarmac at a
height a car or the camera could reach fails, and anything over the verge is
listed (gate posts and the landmarks' own furniture are meant to be there;
anything else is a mistake). It also checks that bridges, tunnels and
two-lane stretches are clear of the start, the checkpoints, the landmark and
each other. Run it after adding scenery, moving a landmark or changing a
layout.

### The start screen

Behind the logo and the Play button the player's own car and the rivals
come over the brow of a hill and jump at the camera, which lies in the road
at the bottom looking up through a wide lens. Most land just in front of it
and tear past; one goes over the top. Their time in the air is slowed down,
while streaks of light rush by at full speed. It is a small scene of its
own (`src/intro.js`), drawn on the game's canvas until Play is pressed.

If a loading screen follows (the first time, while pictures of the tracks
are taken), the last frame of that scene stays behind it. Every loading
screen has lines of light fanning outward as if at speed. They are moved by
CSS alone, and only by `transform` and `opacity`, so the browser keeps them
going while the page is busy building a track.

Someone who has asked their device for less movement gets one held frame of
the scene and no lines.

### The logo and the icon

The logo is drawn by `src/ui/logo.js` as SVG, around whatever the game is
called: the last word of the name goes on the ribbon and the rest across the
middle in big letters, so it survives a rename. Behind the letters are a
bottle of fizz that has just popped its own cork, a tyre and a chequered
flag. The letters are ordinary text in the game's font, stacked in layers to
look solid: a shadow, a gold side for depth, a gold trim, a dark outline,
the face of the letter and a shine. There are two arrangements, one for wide
screens and one for tall; the stylesheet shows whichever fits.

The app icon is the bottle looking out of the tyre. `npm run icons` writes
it to `icons/icon.svg` (rounded, with a gold edge) and
`icons/icon-maskable.svg` (filling the square, for Android to crop). The
other icon files are those two drawn at fixed sizes, a step nothing in the
project can do for itself; open the SVG in a browser or an image editor and
export:

| File | From | Size |
| --- | --- | --- |
| `icons/icon-192.png`, `icons/icon-512.png` | `icon.svg` | 192, 512 |
| `icons/icon-maskable-512.png` | `icon-maskable.svg` | 512 |
| `icons/apple-touch-icon.png` | `icon-maskable.svg`, with the picture a little larger | 180 |
| `android/res/mipmap-*/ic_launcher.png` | `icon.svg` | 48, 72, 96, 144, 192 |
| `desktop/truckbuild.ico` | `icon.svg` | 16 to 256 in one file |

## Sound and music

There are no audio files. Every sound is made when it is wanted with the
browser's Web Audio (`src/audio/`), which keeps the game small and lets it
work offline.

- **`core.js`** is the plumbing: one audio context, a volume control each
  for music and for effects, a limiter so that several loud things at once
  squash rather than crackle, and the two building blocks everything else
  is made of, a tone and a burst of filtered noise.
- **`sounds.js`** has a recipe for each sound effect, a few tones and
  bursts apiece: buttons, the countdown, every pickup and hazard, weapons,
  bumps and scrapes, laps, and a fanfare for the finish.
- **`songs.js`** is the music, written out as patterns: a tune for the
  garage and menus and one for each track (a snake charmer's scale for the
  desert, sleigh bells for the mountains, something minor and wobbly for
  the haunted one). Tunes are written against the chord under them rather
  than as fixed notes, so a bar can be reused over every chord and still
  fit. **`music.js`** plays them, a quarter of a second ahead on the audio
  clock so that the beat holds while the page is busy. Each song is eight
  bars; it is played three ways in turn (the tune, the tune with a second
  voice, then no tune) so that it does not wear thin so quickly.
- **`index.js`** is what the rest of the game talks to. During a race it is
  shown the session once a frame and works out for itself what has just
  happened: an engine note that follows the revs, wind, tyres sliding, the
  rumble of being off the road, and one-off sounds for everything else.
  Things that happen to other cars are heard too, quieter the further away.

Browsers only allow sound once the player has touched the page, so nothing
is built until Play is pressed. With no Web Audio the game is silent and
otherwise the same.

The music and the effects were written and balanced by measurement (how
loud, whether anything clips), not by ear. Treat the tunes as a first draft.

## Settings

The slider button in the garage, and the pause button in a race, open the
settings (`src/settings.js`, `src/ui/settings.js`):

| Setting | From | To |
| --- | --- | --- |
| Music | off | loud |
| Sounds | off | loud |
| Camera distance | near (70% of the usual) | far (150%) |
| Field of view | narrow (80%) | wide (125%) |

A race stands still while they are open, and the view behind keeps being
drawn, so the two camera sliders can be judged as they move. Settings are
kept with the player's profile. Adding an entry to the list in
`src/settings.js` adds its slider.

## 3D engine

Rendering is a small WebGL renderer written for this project (`src/engine/`):
one shader with soft toy-like lighting, distance fog and a flat projected
shadow, plus see-through halos for glowing things. It has no dependencies.

It is fast because of how little it draws. Anything static is merged into a
single mesh with colour stored per vertex (`engine/bake.js`): a whole track's
scenery is one or two draw calls, and a car is two to six however elaborate
the build, and so is the sky, stars and all. A track is 35 to 60 thousand
triangles, ground, scenery and built road together. A race is about 90
draw calls, most of them the cars and the pickups near them with their
rings, halos and shadows; pickups out of sight are not drawn. Two built
tracks are kept in memory at a time.

What a phone runs out of first is pixels, not triangles: every pixel of
ground is lit, fogged and gamma corrected, some of them several times over.
So on a device that cannot keep up, the game draws fewer of them
(`src/governor.js`). It watches how long frames take; if most are slow it
lowers the pixel density a step, down to 60% of full, and if they have all
been comfortably fast for a while it tries a step back up. Nothing else
about the picture changes. `GAME.adaptiveResolution` in `src/config.js`
turns it off.

A frame is drawn in this order (`engine/renderer.js`):

1. The sky.
2. Openings: where the road dives below ground, the shape of the hole is
   marked in the stencil buffer and nothing else.
3. The ground: flat layers of paint, each drawn over the last, everywhere
   except the openings. The ground records its depth, so anything that dips
   below it (the foot of a cliff sunk into the snow, say) is hidden by it.
4. Built road: viaducts, cuttings and tunnels, as ordinary solid shapes.
5. Shadows, flattened onto the ground or onto the road a car is on.
6. Everything solid, then everything that glows.

### Atmosphere

All of it is cheap, and none of it is drawn per object:

- **Mist and grain.** The renderer makes one 64 x 64 tile of noise at
  start-up, the only texture in the 3D view. It is looked up by position on
  the ground, so nothing needs unwrapping. One lookup puts drifting banks of
  thicker fog near the ground; another mottles flat ground so that big areas
  are never one tone. A theme sets how much of each (`mist`, `grain`).
- **Things in the air.** Snow, dust, fireflies, leaves or ash: a block of
  specks that repeats in every direction. The four copies nearest the camera
  are drawn and slid along with the wind (`air` in a theme).
- **Sky.** Clouds, stars, and a sun or moon with a ring of haze are part of
  the sky dome's mesh.
- **Windscreen.** Oil round the edges of the screen after a slick, sparks
  when zapped, frost when time is frozen, slime after hitting a zombie.
  Each is one small tile of noise made on a canvas at start-up, cut off at a
  threshold so that it comes out as blobs, veins or crystals, repeated
  across the screen and masked to its edges in CSS (`src/ui/screenfx.js`).
  Nothing is drawn per frame; the HUD fades layers in and out. The corners
  of the screen are always shaded a little.

The part models do not depend on the renderer. Shape builders return plain
arrays (positions, normals, indices), so the models could move to another
engine without being remade.

## How fullscreen works

Browsers only allow fullscreen in response to a tap or click, so it cannot
happen the instant the page loads. The start screen's Play button is that tap.

| Where | What happens |
| --- | --- |
| Desktop browsers, Android, iPad | Play puts the page into fullscreen. `F` toggles it; after leaving, a corner button offers a way back in. |
| iPhone Safari | Safari has no fullscreen for web pages. The game fills the browser viewport, and the start screen suggests adding it to the home screen. |
| Installed to a home screen (any device) | Launches fullscreen with no browser chrome, via `manifest.webmanifest` and the `apple-*` meta tags. |
| The Android app | Always fullscreen: the app hides the system bars itself, and tells the page so (`?app` on the address) that it does not ask. The back button leaves a race or closes whatever is open, and at the garage puts the app in the background. |
| The Windows app | Opens maximised in a window of its own. Play puts it into fullscreen and Esc brings the window back, as in a browser. |

Home screen install on Android needs the game served over HTTPS; `localhost`
is the exception.

## Layout

```
index.html              page shell: garage, race HUD, sheets, loading and start screens
manifest.webmanifest    home screen install: name, icons, fullscreen display
styles/main.css         layout for portrait and landscape, safe areas, touch
src/config.js           game name, laps, triangle budget, tuning constants
src/main.js             boot, and moving between the garage and a race
src/intro.js            the scene behind the start screen: cars jumping a hill at the camera
src/profile.js          what is remembered about a player: driver, coins, parts, tracks, gold, settings
src/settings.js         what the player can adjust: volumes and the camera
src/audio/              sound effects and music, all synthesised: core, sounds, songs, music, index
src/characters.js       the drivers a player can be, drawn as SVG faces
src/vehicle.js          assembles a vehicle from a build
src/parts/              the part catalogue, prices, and the kit parts are modelled with
src/garage/             build phase: turntable scene, thumbnails, picker and shop
src/ui/                 character and settings screens, loading screen, windscreen effects, icons, the logo
src/race/car.js         driving model, computer driver, collisions
src/race/session.js     race rules: grid, countdown, laps, places, finish, and what the villain gets up to
src/race/grid.js        who lines up: difficulty levels, the villain, rivals' names, faces and builds
src/race/gold.js        the three golden things on each track
src/race/rewards.js     what a race pays in coins
src/race/events.js      random track events: pickups, hazards, trampolines, strips
src/race/features.js    each track's landmark: where it is and what stands in the road
src/race/hazards.js     what comes at a car there: mummy, lightning, storm, werewolf, meteor
src/race/setpieces.js   what the landmarks look like
src/race/combat.js      weapons: shots, always-on melee, reloading
src/race/chatter.js     what the drivers say in their speech bubbles, and when
src/race/props.js       what events, creatures and shots look like
src/race/dressing.js    trackside furniture shared by every track
src/race/track.js       the centre line: sampling, projection, curvature, heights, islands
src/race/roadworks.js   viaducts, cuttings, tunnels and islands, built from a track
src/race/world.js       builds ground, scenery and sky for a track
src/race/tracks/        the five track themes
src/race/scene.js       3D side of a race, the chase camera, track pictures
src/race/vehicle.js     merges a build into a few meshes for racing
src/race/hud.js         place, lap, time, coins, nameplates, results, track picker
src/race/controls.js    keyboard and one-finger joystick
src/engine/             shape builders, scene nodes, materials, baking, WebGL renderer
src/fullscreen.js       Fullscreen API wrapper
src/viewport.js         canvas size and pixel density tracking
src/governor.js         lowers the pixel density on devices that cannot keep up
src/loop.js             frame loop, paused while the tab is hidden
icons/                  the app icon, as SVG and at the sizes browsers ask for
scripts/                dev server, checks (parts, tracks, contrast), race simulation and fuzz, packaging, rename, icons
android/                the Android app: one WebView round the game, its build and its test
desktop/                the Windows app: a launcher with the game inside it, and its setup program
.github/workflows/      checks on every push; installers built and tried on a version tag
```

## Renaming the game

```sh
npm run rename -- "New Game Name"
```

This updates `src/config.js`, `index.html`, `manifest.webmanifest`,
`package.json`, the installers' names and this README. The logo redraws
itself around the new name. It does not rename the repository folder or
change a git remote, and saved games are kept.
