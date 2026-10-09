# TruckBuild

A low-poly build-and-race game for the browser, on desktop and mobile,
fullscreen. You start by building a truck, car, tank or stranger contraption
from parts, then race it. "TruckBuild" is a working title; see
[Renaming the game](#renaming-the-game).

**What exists so far:** the build phase. Pick one part from each of four
categories and see the result on a turntable. The race is not built yet.

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

## 3D engine

Rendering is a small WebGL renderer written for this project (`src/engine/`):
one shader with soft toy-like lighting and a flat projected shadow. It was
chosen because it has no dependencies and is plenty for parts this simple.

The part models do not depend on it. Shape builders return plain arrays
(positions, normals, indices), so moving to three.js or another engine later
means replacing `src/engine/renderer.js` and `node.js`, not remodelling parts.
That decision is worth revisiting before the race is built, since tracks,
physics and effects are where an engine starts to pay for itself.

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
index.html              page shell: garage, start screen, meta tags
manifest.webmanifest    home screen install: name, icons, fullscreen display
styles/main.css         layout for portrait and landscape, safe areas, touch
src/config.js           game name, triangle budget, tuning constants
src/main.js             boot: wires everything together, saves the build
src/vehicle.js          assembles a vehicle from a build
src/parts/              the part catalogue and the kit parts are modelled with
src/garage/             build phase: turntable scene, thumbnails, picker UI
src/engine/             shape builders, scene nodes, materials, WebGL renderer
src/fullscreen.js       Fullscreen API wrapper
src/viewport.js         canvas size and pixel density tracking
src/loop.js             frame loop, paused while the tab is hidden
src/input.js            mouse, touch and keyboard state; for the race, unused so far
icons/                  placeholder icons
scripts/                dev server, part check and rename script
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
