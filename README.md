# TruckBuild

A low-poly build-and-race game for the browser, on desktop and mobile,
fullscreen. You start by building a truck, car, tank or stranger contraption
from parts, then race it. "TruckBuild" is a working title; see
[Renaming the game](#renaming-the-game).

**What exists so far:** the build phase, the first race type, and the
things that hold them together: a driver, coins, a shop and tracks to open.

- **Driver:** on a first visit the player picks a face and types a name.
  Both go on the nameplate over their car and in the results.
- **Garage:** pick one part from each of four categories and see the result
  on a turntable. A new player owns a starter set; the rest are bought with
  coins.
- **Race:** a two-lap circuit race against three computer rivals in random
  contraptions, at one of three difficulties, on one of five tracks. Random
  events on the road (pickups, hazards, trampolines and strips), a dangerous
  landmark on each track, and working weapons shake things up. Two more race
  types are planned.

| Category | Parts (price in coins) |
| --- | --- |
| Wheels | Kart Wheels (free), Monster Wheels (150), Spider Legs (220), Tank Treads (260), Mech Legs (340) |
| Body | Kart (free), Pickup (120), Bug (160), Bulldog (220), Tub (280) |
| Extras (optional) | Spoiler (60), Shark Fin (80), Side Pipes (120), Glider Wings (180), Rocket Booster (260) |
| Weapons (optional) | Twin Blaster (free), Flipper (140), Hammer (200), Buzz Saw (240), Cannon (300) |

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
`src/profile.js`): driver, coins, parts owned, tracks open, wins and the
current build. Nothing is sent anywhere. Clearing site data starts again.

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
- **Paint is nearly free.** The ground is flat layers drawn in order with no
  depth test, so tyre marks, cracks, ragged verges, planks, flagstones,
  leaves and strands of grass are all paint (`race/world.js`).
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
3. Run `npm run check`.

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

Each lap is split into four sectors. A gate and a line across the road mark
the end of each of the first three, and light up green as the player goes
through. A small map at the top right shows the circuit, the sectors done
this lap, the landmark in red, and a dot for every racer.

Every car has a nameplate over it with its driver's face and name. Coins
picked up so far are shown under the place number.

For now every build drives the same. Wheels, bodies and extras are looks
only; weapons work (below).

### Weapons

| Weapon | In a race |
| --- | --- |
| Twin Blaster, Cannon | Fired with the fire button, then 10 seconds to reload. The shot follows the road and drifts toward the nearest car ahead, so aiming is forgiving. |
| Hammer, Buzz Saw, Flipper | Always on. Any car that comes within about 3.5 m of the front of yours gets knocked. |

A hit does exactly what a bomb does: the car is tossed in the air and loses
its speed. A car that has just been knocked cannot be knocked again for a
couple of seconds. Rivals use their weapons too, but are slow on the trigger.
The rules are in `src/race/combat.js`.

### Rivals and difficulty

The player picks a difficulty on the track picker (`src/race/grid.js`):

| | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Rivals' pace, as a share of a good driver's | 52 to 66% | 68 to 80% | 87 to 98% |
| Clumsy moments (foot off, drifting off line) | every few seconds | now and then | rare |
| A rival ahead of the player | slows right down and waits | eases off | barely lifts |
| Trigger finger | slow | middling | quick |
| Coins | x1 | x1.5 | x2 |

Easy is for young children: the rivals are meant to lose to anyone who keeps
the car roughly on the road. On Hard they drive properly and do not wait.

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

### Tracks

Tracks are flat and defined by a dozen control points each
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

## 3D engine

Rendering is a small WebGL renderer written for this project (`src/engine/`):
one shader with soft toy-like lighting, distance fog and a flat projected
shadow, plus see-through halos for glowing things. It has no dependencies.

It is fast because of how little it draws. Anything static is merged into a
single mesh with colour stored per vertex (`engine/bake.js`): a whole track's
scenery is one or two draw calls, and a car is two to six however elaborate
the build. A track is 40 to 60 thousand triangles, ground and scenery
together. A race is 170 to 270 draw calls, most of them the pickups on the
road with their rings, halos and shadows. Two built tracks are kept in
memory at a time.

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

Home screen install on Android needs the game served over HTTPS; `localhost`
is the exception.

## Layout

```
index.html              page shell: garage, race HUD, sheets, loading and start screens
manifest.webmanifest    home screen install: name, icons, fullscreen display
styles/main.css         layout for portrait and landscape, safe areas, touch
src/config.js           game name, laps, triangle budget, tuning constants
src/main.js             boot, and moving between the garage and a race
src/profile.js          what is remembered about a player: driver, coins, parts, tracks
src/characters.js       the drivers a player can be, drawn as SVG faces
src/vehicle.js          assembles a vehicle from a build
src/parts/              the part catalogue, prices, and the kit parts are modelled with
src/garage/             build phase: turntable scene, thumbnails, picker and shop
src/ui/                 character screen, loading screen, windscreen effects, icons
src/race/car.js         driving model, computer driver, collisions
src/race/session.js     race rules: grid, countdown, laps, places, finish
src/race/grid.js        who lines up: difficulty levels, rivals' names, faces and builds
src/race/rewards.js     what a race pays in coins
src/race/events.js      random track events: pickups, hazards, trampolines, strips
src/race/features.js    each track's landmark: where it is and what stands in the road
src/race/hazards.js     what comes at a car there: mummy, lightning, storm, werewolf, meteor
src/race/setpieces.js   what the landmarks look like
src/race/combat.js      weapons: shots, always-on melee, reloading
src/race/props.js       what events, creatures and shots look like
src/race/dressing.js    trackside furniture shared by every track
src/race/track.js       the centre line: sampling, projection, curvature
src/race/world.js       builds ground, scenery and sky for a track
src/race/tracks/        the five track themes
src/race/scene.js       3D side of a race, the chase camera, track pictures
src/race/vehicle.js     merges a build into a few meshes for racing
src/race/hud.js         place, lap, time, coins, nameplates, results, track picker
src/race/controls.js    keyboard and one-finger joystick
src/engine/             shape builders, scene nodes, materials, baking, WebGL renderer
src/fullscreen.js       Fullscreen API wrapper
src/viewport.js         canvas size and pixel density tracking
src/loop.js             frame loop, paused while the tab is hidden
icons/                  placeholder icons
scripts/                dev server, part check, race simulation, rename script
```

## Renaming the game

```sh
npm run rename -- "New Game Name"
```

This updates `src/config.js`, `index.html`, `manifest.webmanifest`,
`package.json` and this README. It does not rename the repository folder or
change a git remote.
