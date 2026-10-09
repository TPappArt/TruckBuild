import { GAME } from './config.js';
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
import { createViewport } from './viewport.js';

const SAVE_KEY = 'garage.build';

const canvas = document.getElementById('game');
const startScreen = document.getElementById('start');
const startButton = document.getElementById('start-button');
const startHint = document.getElementById('start-hint');
const fullscreenButton = document.getElementById('fullscreen-button');

document.title = GAME.name;
document.getElementById('start-title').textContent = GAME.name;

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

function startGarage() {
  const view = createViewport(canvas);
  const scene = createGarageScene(canvas, view);
  const build = sanitizeBuild(loadBuild());

  scene.setBuild(build);
  createGarageUI({
    build,
    snapshot: createThumbnailer(),
    onChange(changed, category) {
      scene.setBuild(changed, category);
      saveBuild(changed);
    },
  });

  // Drag to turn the vehicle and tilt the view. One finger or the mouse.
  let dragging = null;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (event) => {
    if (dragging !== null) return;
    dragging = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== dragging) return;
    scene.orbit(event.clientX - lastX, event.clientY - lastY);
    lastX = event.clientX;
    lastY = event.clientY;
  });
  const release = (event) => {
    if (event.pointerId === dragging) dragging = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return createLoop(scene);
}

let loop = null;
try {
  loop = startGarage();
} catch (error) {
  console.error(error);
  startButton.disabled = true;
  showHint('This browser cannot show 3D graphics (WebGL), which the game needs.');
}

// The corner button offers a way back in after the player leaves fullscreen
// (Esc, a swipe, the back button). It is hidden when it would do nothing.
function refreshFullscreenButton() {
  const started = startScreen.hidden;
  fullscreenButton.hidden = !started || !fullscreenSupported || isInstalled() || isFullscreen();
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
