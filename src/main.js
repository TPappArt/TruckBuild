import { characterSvg } from './characters.js';
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
import { createGovernor } from './governor.js';
import { createThumbnailer } from './garage/thumbnails.js';
import { createGarageUI } from './garage/ui.js';
import { createLoop } from './loop.js';
import { loadProfile, recordRace, saveProfile, trackLock, trackOpen } from './profile.js';
import { createControls } from './race/controls.js';
import { findDifficulty, makeGrid } from './race/grid.js';
import { createHud, createTrackPicker } from './race/hud.js';
import { raceRewards } from './race/rewards.js';
import { createRaceScene } from './race/scene.js';
import { TRACKS } from './race/tracks/index.js';
import { createCharacterScreen } from './ui/character.js';
import { createLoading, paint } from './ui/loading.js';
import { createScreenFx } from './ui/screenfx.js';
import { createViewport } from './viewport.js';

const PICTURES_KEY = 'pictures';
const PICTURE_SIZE = [480, 270];
const LOADING_AT_LEAST = 900; // milliseconds a loading screen stays up, so it can be read

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// Pictures of the tracks are taken once and kept, since taking them means
// building every track. A new version of the game takes them again.
function loadPictures() {
  try {
    const saved = JSON.parse(localStorage.getItem(PICTURES_KEY));
    const images = {};
    if (saved?.version === GAME.picturesVersion && saved.images && typeof saved.images === 'object') {
      // Only what is plainly a picture of a track that exists.
      for (const theme of TRACKS) {
        const image = saved.images[theme.id];
        if (typeof image === 'string' && image.startsWith('data:image/')) images[theme.id] = image;
      }
    }
    return images;
  } catch {
    return {};
  }
}
function savePictures(images) {
  try {
    localStorage.setItem(PICTURES_KEY, JSON.stringify({ version: GAME.picturesVersion, images }));
  } catch {
    // No room, or no storage: they will be taken again next time.
  }
}

function startGame() {
  const view = createViewport(canvas);
  const governor = createGovernor(view);
  const renderer = createRenderer(canvas);
  const garage = createGarageScene(renderer, view);
  const race = createRaceScene(renderer, view);
  const controls = createControls();
  const fx = createScreenFx();
  const hud = createHud({ fx });
  const loading = createLoading();
  const characterScreen = createCharacterScreen();
  const profile = loadProfile();
  const pictures = loadPictures();
  const difficulty = () => findDifficulty(profile.difficulty);

  // ---------- Garage ----------

  garage.setBuild(profile.build);
  const garageUI = createGarageUI({
    profile,
    snapshot: createThumbnailer(),
    onChange(shown, category) {
      garage.setBuild(shown, category);
      saveProfile(profile);
    },
    onSpend: refreshMoney,
  });

  function refreshProfileChip() {
    $('profile-face').innerHTML = characterSvg(profile.character);
    $('profile-name').textContent = profile.name;
  }

  /** Call after coins change: everything that shows or depends on them. */
  function refreshMoney() {
    $('wallet-coins').textContent = String(profile.coins);
    saveProfile(profile);
    garageUI.refresh();
    picker.refresh();
  }

  function editCharacter() {
    characterScreen.open(profile, ({ character, name }) => {
      profile.character = character;
      profile.name = name;
      saveProfile(profile);
      refreshProfileChip();
    });
  }
  $('profile-chip').addEventListener('click', editCharacter);

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
  let busy = false; // a loading screen is up
  const plates = [];

  // The sharpness a race settled at is kept for the next one; the garage
  // is always drawn at full sharpness.
  let raceQuality = 1;

  function showScreen(name) {
    if (activeScreen === 'race') raceQuality = view.quality;
    activeScreen = name;
    view.setQuality(name === 'race' ? raceQuality : 1);
    governor.reset();
    document.body.dataset.screen = name;
    $('hud').hidden = name !== 'race';
    controls.setEnabled(name === 'race');
    refreshFullscreenButton();
  }

  function openTrackPicker() {
    // Whatever was being tried on stays in the shop.
    garageUI.stopTrying();
    picker.refresh();
    $('track-picker').hidden = false;
  }

  async function startRace(theme) {
    if (busy || !trackOpen(profile, theme)) return;
    busy = true;
    currentTrack = theme;
    $('track-picker').hidden = true;
    $('results').hidden = true;
    // Building a track takes a moment on a phone the first time. Show its
    // picture meanwhile, and let that paint before the work starts.
    loading.show({ title: theme.name, text: theme.blurb, image: pictures[theme.id] });
    const shownAt = performance.now();
    try {
      loading.progress(0.2);
      await paint();

      race.start({ theme, drivers: makeGrid(profile.build, profile, difficulty()), laps: GAME.laps, rules: difficulty() });
      loading.progress(0.85);
      await paint();
      hud.reset(race.session, race.site);
      fx.tint(theme.vignette || 'rgb(0 0 0 / 38%)');
      hud.update(race.session, race.plates(plates));
      sinceFinish = 0;
      resultsShown = false;

      loading.progress(1);
      await sleep(Math.max(150, LOADING_AT_LEAST - (performance.now() - shownAt)));
      showScreen('race');
    } catch (error) {
      // Better back in the garage than stuck on a loading screen.
      console.error(error);
      showScreen('garage');
    } finally {
      loading.hide();
      busy = false;
    }
  }

  function finishRace(session) {
    const rewards = raceRewards(session, difficulty());
    const opened = recordRace(profile, currentTrack, session.player.place, rewards.total);
    // What is still locked after this track, if anything, and how far off.
    const after = TRACKS[TRACKS.indexOf(currentTrack) + 1];
    const next = after && !trackOpen(profile, after) ? { theme: after, winsLeft: trackLock(profile, after).winsLeft } : null;
    refreshMoney();
    hud.showResults(session, { rewards, opened, next });
  }

  function backToGarage() {
    $('results').hidden = true;
    $('track-picker').hidden = true;
    showScreen('garage');
  }

  const picker = createTrackPicker({
    profile,
    pictures,
    onPick: startRace,
    onChange: refreshMoney,
  });
  $('race-button').addEventListener('click', openTrackPicker);
  $('track-back').addEventListener('click', backToGarage);
  $('quit-button').addEventListener('click', backToGarage);
  $('results-again').addEventListener('click', () => startRace(currentTrack));
  $('results-garage').addEventListener('click', backToGarage);
  $('results-tracks').addEventListener('click', () => {
    backToGarage();
    openTrackPicker();
  });

  // The Android app asks here what its back button should do. True means
  // the game has dealt with it (left a race, closed a sheet); false means
  // there was nothing to go back from, and the app steps aside.
  window.truckbuildBack = () => {
    if (busy) return true;
    if (activeScreen === 'race' || !$('track-picker').hidden) {
      backToGarage();
      return true;
    }
    if (!$('character').hidden && profile.character) {
      $('character').hidden = true;
      return true;
    }
    return false;
  };

  refreshProfileChip();
  $('wallet-coins').textContent = String(profile.coins);

  // ---------- First things after "Play" ----------

  /**
   * Takes any pictures of the tracks that are missing, behind a loading
   * screen, then asks a new player who they are.
   */
  async function welcome() {
    // The first track is photographed last, so that it is the one still
    // built when the player goes to race on it.
    const missing = TRACKS.filter((theme) => !pictures[theme.id]).reverse();
    if (missing.length) {
      busy = true;
      loading.show({ title: GAME.name, text: 'Getting the tracks ready' });
      await paint();
      const shownAt = performance.now();
      const grid = () => makeGrid(profile.build, { name: profile.name, character: profile.character }, difficulty());
      for (let i = 0; i < missing.length; i++) {
        const theme = missing[i];
        loading.text(`Getting ${theme.name} ready`);
        loading.progress(i / missing.length);
        await paint();
        try {
          pictures[theme.id] = race.snapshot({ theme, drivers: grid(), rules: difficulty(), width: PICTURE_SIZE[0], height: PICTURE_SIZE[1] });
        } catch (error) {
          // A track without a picture still races; its card shows a map.
          console.error(error);
        }
        // The picture was drawn on the game's canvas: put the garage back.
        garage.render();
      }
      savePictures(pictures);
      picker.refresh();
      loading.progress(1);
      await sleep(Math.max(150, LOADING_AT_LEAST - (performance.now() - shownAt)));
      loading.hide();
      busy = false;
    }
    if (!profile.character) editCharacter();
  }

  // ---------- Frame loop ----------

  showScreen('garage');
  const loop = createLoop({
    // Only a race is worth turning the sharpness down for: the garage is
    // one vehicle on a turntable.
    measure(seconds) {
      if (GAME.adaptiveResolution && activeScreen === 'race' && !busy) governor.frame(seconds);
    },
    update(dt) {
      if (activeScreen !== 'race') {
        garage.update(dt);
        return;
      }
      const session = race.session;
      race.update(dt, controls.read());
      hud.update(session, race.plates(plates));
      // Let the car roll over the line for a moment before the results.
      if (session.phase === 'finished' && !resultsShown) {
        sinceFinish += dt;
        if (sinceFinish > 1.4) {
          resultsShown = true;
          finishRace(session);
        }
      }
    },
    render() {
      if (activeScreen === 'race') race.render();
      else garage.render();
    },
  });

  return { loop, welcome };
}

// The corner button offers a way back in after the player leaves fullscreen
// (Esc, a swipe, the back button). It is hidden when it would do nothing.
function refreshFullscreenButton() {
  const started = startScreen.hidden;
  fullscreenButton.hidden = !started || !fullscreenSupported || isInstalled() || isFullscreen();
}

let game = null;
try {
  game = startGame();
} catch (error) {
  console.error(error);
  startButton.disabled = true;
  showHint('This browser cannot show 3D graphics (WebGL), which the game needs.');
}

if (game && !fullscreenSupported && !isInstalled()) {
  showHint('For fullscreen, add this page to your home screen.');
}

startButton.addEventListener('click', async () => {
  // Has to happen inside the click: browsers refuse fullscreen otherwise.
  if (!isInstalled()) await enterFullscreen();
  startScreen.hidden = true;
  refreshFullscreenButton();
  game.loop.start();
  game.welcome();
});

fullscreenButton.addEventListener('click', () => enterFullscreen());
onFullscreenChange(refreshFullscreenButton);

window.addEventListener('keydown', (event) => {
  // Not while a name is being typed.
  if (event.target instanceof HTMLInputElement) return;
  if (event.code === 'KeyF' && !event.repeat && startScreen.hidden) toggleFullscreen();
});
