import { GAME } from './config.js';
import {
  enterFullscreen,
  fullscreenSupported,
  isFullscreen,
  isInstalled,
  onFullscreenChange,
  toggleFullscreen,
} from './fullscreen.js';
import { createGame } from './game.js';
import { createInput } from './input.js';
import { createLoop } from './loop.js';
import { createViewport } from './viewport.js';

const canvas = document.getElementById('game');
const startScreen = document.getElementById('start');
const startButton = document.getElementById('start-button');
const startHint = document.getElementById('start-hint');
const fullscreenButton = document.getElementById('fullscreen-button');

document.title = GAME.name;
document.getElementById('start-title').textContent = GAME.name;

const view = createViewport(canvas);
const input = createInput(canvas);
const game = createGame(view, input);
const loop = createLoop(game);

// The corner button offers a way back in after the player leaves fullscreen
// (Esc, a swipe, the back button). It is hidden when it would do nothing.
function refreshFullscreenButton() {
  const started = startScreen.hidden;
  fullscreenButton.hidden = !started || !fullscreenSupported || isInstalled() || isFullscreen();
}

if (!fullscreenSupported && !isInstalled()) {
  startHint.textContent = 'For fullscreen, add this page to your home screen.';
  startHint.hidden = false;
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
