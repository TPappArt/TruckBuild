# TruckBuild

A browser game for desktop and mobile that plays fullscreen. "TruckBuild" is a
working title; see [Renaming the game](#renaming-the-game).

The repository currently holds the shell the game will be built in: a
full-viewport canvas, fullscreen handling, unified mouse and touch input, and a
game loop. The scene on screen is a placeholder that reports viewport size,
frame rate and live pointers.

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
index.html              page shell, start screen, meta tags
manifest.webmanifest    home screen install: name, icons, fullscreen display
styles/main.css         full-viewport layout, safe areas, touch behaviour
src/config.js           game name and tuning constants
src/main.js             boot: wires everything together
src/fullscreen.js       Fullscreen API wrapper
src/viewport.js         canvas sizing for any screen size and density
src/input.js            mouse, touch and pen through Pointer Events
src/loop.js             frame loop, paused while the tab is hidden
src/game.js             placeholder scene; the real game goes here
icons/                  placeholder icons
scripts/                dev server and rename script
```

The game should work in CSS pixels (`view.width`, `view.height`); the viewport
takes care of screen density.

## Renaming the game

```sh
npm run rename -- "New Game Name"
```

This updates `src/config.js`, `index.html`, `manifest.webmanifest`,
`package.json` and this README. It does not rename the repository folder or
change a git remote.
