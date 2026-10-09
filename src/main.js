import { GAME } from './config.js';
import { createRenderer } from './engine/renderer.js';
import {
  enterFullscreen,
  fullscreenSupported,
  isFullscreen,
  isInstalled,
  onFullscreenChange,
  toggleFullscreen,
} from './fullscreen.js';
import { createGarageScene } from './garage/scene.js';
import { createThumbnailer } from './garage/thumbnails.js';
import { createGarageUI } from './garage/ui.js';
import { createLoop } from './loop.js';
import { sanitizeBuild } from './parts/catalog.js';
import { createControls } from './race/controls.js';
import { makeGrid } from './race/grid.js';
import { createHud, createTrackPicker } from './race/hud.js';
import { createRaceScene } from './race/scene.js';
import { createViewport } from './viewport.js';

const SAVE_KEY = 'garage.build';
const $ = (id) => document.getElementById(id);

const canvas = $('game');
const startScreen = $('start');
const startButton = $('start-button');
const startHint = $('start-hint');
const fullscreenButton = $('fullscreen-button');

document.title = GAME.name;
$('start-title').textContent = GAME.name;

function showHint(text) {
  startHint.textContent = text;
  startHint.hidden = false;
}

// The player's build survives a reload. Storage can be unavailable (private
// windows, blocked site data), in which case the game just starts fresh.
function loadBuild() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}
function saveBuild(build) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(build));
  } catch {
    // Not saved; nothing else to do.
  }
}

function startGame() {
  const view = createViewport(canvas);
  const renderer = createRenderer(canvas);
  const garage = createGarageScene(renderer, view);
  const race = createRaceScene(renderer, view);
  const controls = createControls();
  const hud = createHud();
  const build = sanitizeBuild(loadBuild());

  // ---------- Garage ----------

  garage.setBuild(build);
  createGarageUI({
    build,
    snapshot: createThumbnailer(),
    onChange(changed, category) {
      garage.setBuild(changed, category);
      saveBuild(changed);
    },
  });

  // Drag to turn the vehicle and tilt the view. One finger or the mouse.
  let dragging = null;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (event) => {
    if (dragging !== null || activeScreen !== 'garage') return;
    dragging = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== dragging) return;
    garage.orbit(event.clientX - lastX, event.clientY - lastY);
    lastX = event.clientX;
    lastY = event.clientY;
  });
  const release = (event) => {
    if (event.pointerId === dragging) dragging = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  // ---------- Moving between the garage and a race ----------

  let activeScreen = 'garage'; // 'garage' | 'race'
  let currentTrack = null;
  let sinceFinish = 0;
  let resultsShown = false;

  function showScreen(name) {
    activeScreen = name;
    document.body.dataset.screen = name;
    $('hud').hidden = name !== 'race';
    controls.setEnabled(name === 'race');
    refreshFullscreenButton();
  }

  function openTrackPicker() {
    $('track-picker-title').textContent = 'Pick a track';
    $('track-picker').hidden = false;
  }

  function startRace(theme) {
    currentTrack = theme;
    // The first visit to a track builds its scenery, which can take a
    // moment on a phone. Say so, and let that message paint before starting.
    $('track-picker-title').textContent = 'Building the track…';
    $('track-picker').hidden = false;
    $('results').hidden = true;
    requestAnimationFrame(() => {
      setTimeout(() => {
        race.start({ theme, drivers: makeGrid(build), laps: GAME.laps });
        hud.reset(race.session);
        hud.update(race.session);
        sinceFinish = 0;
        resultsShown = false;
        $('track-picker').hidden = true;
        showScreen('race');
      }, 0);
    });
  }

  function backToGarage() {
    $('results').hidden = true;
    $('track-picker').hidden = true;
    showScreen('garage');
  }

  createTrackPicker(startRace);
  $('race-button').addEventListener('click', openTrackPicker);
  $('track-back').addEventListener('click', backToGarage);
  $('quit-button').addEventListener('click', backToGarage);
  $('results-again').addEventListener('click', () => startRace(currentTrack));
  $('results-garage').addEventListener('click', backToGarage);
  $('results-tracks').addEventListener('click', () => {
    backToGarage();
    openTrackPicker();
  });

  // ---------- Frame loop ----------

  showScreen('garage');
  return createLoop({
    update(dt) {
      if (activeScreen !== 'race') {
        garage.update(dt);
        return;
      }
      const session = race.session;
      race.update(dt, controls.read());
      hud.update(session);
      // Let the car roll over the line for a moment before the results.
      if (session.phase === 'finished' && !resultsShown) {
        sinceFinish += dt;
        if (sinceFinish > 1.4) {
          resultsShown = true;
          hud.showResults(session);
        }
      }
    },
    render() {
      if (activeScreen === 'race') race.render();
      else garage.render();
    },
  });
}

// The corner button offers a way back in after the player leaves fullscreen
// (Esc, a swipe, the back button). It is hidden when it would do nothing.
function refreshFullscreenButton() {
  const started = startScreen.hidden;
  fullscreenButton.hidden = !started || !fullscreenSupported || isInstalled() || isFullscreen();
}

let loop = null;
try {
  loop = startGame();
} catch (error) {
  console.error(error);
  startButton.disabled = true;
  showHint('This browser cannot show 3D graphics (WebGL), which the game needs.');
}

if (loop && !fullscreenSupported && !isInstalled()) {
  showHint('For fullscreen, add this page to your home screen.');
}

startButton.addEventListener('click', async () => {
  // Has to happen inside the click: browsers refuse fullscreen otherwise.
  if (!isInstalled()) await enterFullscreen();
  startScreen.hidden = true;
  refreshFullscreenButton();
  loop.start();
});

fullscreenButton.addEventListener('click', () => enterFullscreen());
onFullscreenChange(refreshFullscreenButton);

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyF' && !event.repeat && startScreen.hidden) toggleFullscreen();
});
