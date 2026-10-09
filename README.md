# TruckBuild

A low-poly build-and-race game for the browser, on desktop and mobile,
fullscreen. You start by building a truck, car, tank or stranger contraption
from parts, then race it. "TruckBuild" is a working title; see
[Renaming the game](#renaming-the-game).

**What exists so far:** the build phase and the first race type.

- **Garage:** pick one part from each of four categories and see the result
  on a turntable.
- **Race:** a three-lap circuit race against three computer rivals in random
  contraptions, on one of three tracks: Electric Swamp, Pyramid Desert and
  Snowy Mountains. Two more race types are planned.

| Category | Parts |
| --- | --- |
| Wheels | Kart Wheels, Monster Wheels, Tank Treads, Mech Legs, Spider Legs |
| Body | Kart, Pickup, Bulldog, Bug, Tub |
| Extras (optional) | Spoiler, Glider Wings, Rocket Booster, Shark Fin, Side Pipes |
| Weapons (optional) | Twin Blaster, Cannon, Flipper, Hammer, Buzz Saw |

Any part fits any body: bodies declare mount points and parts attach to them.

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

lists every part's triangle count and fails if any is over budget. The garage
also shows the count on each card while `GAME.showTriangleCounts` is on.

There are no model files. Parts are written in code with a small shape kit
(`src/parts/kit.js`), so they are quick to tweak and cost nothing to download.

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

| | Keyboard | Touch screen |
| --- | --- | --- |
| Steer | Left / Right, or A / D | Left and right arrows, bottom left |
| Accelerate | Up, or W | Up arrow, bottom right |
| Brake, then reverse | Down, or S | Down arrow, bottom right |

The on-screen arrows appear on touch devices, and on anything else the first
time the screen is touched.

Driving is deliberately forgiving (`src/race/car.js`): a car is a point with
a heading and a velocity, and sideways speed bleeds away at a rate set by the
track's grip. Turning too hard scrubs speed off rather than spinning the car,
so holding the accelerator and steering gets a beginner round. Leaving the
road is slow, and a soft wall at the edge of the shoulder keeps everyone on
the circuit. Snow has less than half the grip of the desert.

For now every build drives the same. Parts are looks only.

Tracks are flat and defined by a dozen control points each
(`src/race/tracks/`). A theme also sets its sky, fog, lighting, road colours
and scenery. Adding a track means adding one file there and listing it in
`tracks/index.js`.

```sh
npm run simulate
```

runs a full race on every track with computer drivers and no graphics, and
reports times and how long each car spent off the road or on the wall. Run it
after changing the driving model, the rivals or a layout.

## 3D engine

Rendering is a small WebGL renderer written for this project (`src/engine/`):
one shader with soft toy-like lighting, distance fog and a flat projected
shadow. It has no dependencies and no textures.

It is fast because of how little it draws. Anything static is merged into a
single mesh with colour stored per vertex (`engine/bake.js`): a whole track's
scenery is one draw call, and a car is two to five however elaborate the
build. A race is around 40 draw calls and 25-35 thousand triangles. The
ground is a stack of flat painted layers drawn without a depth test.

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
index.html              page shell: garage, race HUD, sheets, start screen
manifest.webmanifest    home screen install: name, icons, fullscreen display
styles/main.css         layout for portrait and landscape, safe areas, touch
src/config.js           game name, laps, triangle budget, tuning constants
src/main.js             boot, and moving between the garage and a race
src/vehicle.js          assembles a vehicle from a build
src/parts/              the part catalogue and the kit parts are modelled with
src/garage/             build phase: turntable scene, thumbnails, picker UI
src/race/car.js         driving model, computer driver, collisions
src/race/session.js     race rules: grid, countdown, laps, places, finish
src/race/track.js       the centre line: sampling, projection, curvature
src/race/world.js       builds ground, scenery and sky for a track
src/race/tracks/        the three track themes
src/race/scene.js       3D side of a race and the chase camera
src/race/vehicle.js     merges a build into a few meshes for racing
src/race/hud.js         place, lap, time, countdown, results, track picker
src/race/controls.js    keyboard and on-screen driving controls
src/race/grid.js        who lines up: rivals' names, builds and pace
src/engine/             shape builders, scene nodes, materials, baking, WebGL renderer
src/fullscreen.js       Fullscreen API wrapper
src/viewport.js         canvas size and pixel density tracking
src/loop.js             frame loop, paused while the tab is hidden
icons/                  placeholder icons
scripts/                dev server, part check, race simulation, rename script
```

The player's build is saved in the browser (`localStorage`) and restored on
the next visit.

## Renaming the game

```sh
npm run rename -- "New Game Name"
```

This updates `src/config.js`, `index.html`, `manifest.webmanifest`,
`package.json` and this README. It does not rename the repository folder or
change a git remote.
