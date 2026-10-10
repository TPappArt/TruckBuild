import { characterSvg } from '../characters.js';
import { buyTrack, trackLock, trackOpen } from '../profile.js';
import { coinIcon, lockIcon, placeArt } from '../ui/icons.js';
import { RELOAD } from './combat.js';
import { DIFFICULTIES } from './grid.js';
import { coinsSoFar, REWARDS } from './rewards.js';
import { SECTORS } from './session.js';
import { createTrack } from './track.js';
import { TRACKS } from './tracks/index.js';

// Everything drawn over the race in HTML: place, lap, time and coins, the
// countdown, nameplates, what is on the windscreen, the results, and the
// track picker shown before a race.

const ORDINALS = ['st', 'nd', 'rd', 'th'];
const ordinal = (place) => ORDINALS[Math.min(place, 4) - 1];

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

// What to say when a track event happens to the player, and whether it is
// good news (shown in green), bad (red) or just news ('info', blue).
const EVENT_NOTES = {
  checkpoint: ['Checkpoint!', 'info'],
  freeze: ['Freeze! Rivals stopped', true],
  coins: [`+${REWARDS.bag} coins!`, true],
  pillar: ['Pillar!', false],
  snowball: ['Snowball!', false],
  skeleton: ['Skeleton!', false],
  zombie: ['Zombie! Slowed down', false],
  boost: ['Speed boost!', true],
  slow: ['Snail! Slowed down', false],
  bomb: ['Boom!', false],
  oil: ['Oil! Slippery', false],
  trampoline: ['Boing!', true],
  'fast-strip': ['Speed strip!', true],
  'slow-strip': ['Sticky strip!', false],
  mummy: ['Mummy!', false],
  werewolf: ['Werewolf!', false],
  meteor: ['Meteor!', false],
  zap: ['Zapped!', false],
  storm: ['Snowstorm! Hold on', false],
  hit: ['Ouch! Hit', false],
  scored: [`Got one! +${REWARDS.hit} coins`, true],
};
const NOTE_TIME = 1.6;

const $ = (id) => document.getElementById(id);

/** Sets text only when it changed, so the page is not re-laid-out every frame. */
function text(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

/** A round badge with a driver's face in it. */
function face(character) {
  const badge = element('span', 'face');
  badge.innerHTML = characterSvg(character);
  return badge;
}

/**
 * fx: the windscreen effects (ui/screenfx.js).
 */
export function createHud({ fx }) {
  const place = $('hud-place-number');
  const suffix = $('hud-place-suffix');
  const lap = $('hud-lap');
  const time = $('hud-time');
  const coins = $('hud-coins-count');
  const banner = $('hud-banner');
  const toast = $('hud-toast');
  const fire = $('fire-button');
  const fireLabel = $('fire-label');
  const plateLayer = $('plates');
  let shownEvent = null;
  let plates = []; // one element per racer, in session order

  for (const holder of document.querySelectorAll('.coin')) holder.innerHTML = coinIcon;

  /** `where` is the scene's plates(): where each racer's nameplate goes on screen. */
  function update(session, where) {
    const player = session.player;
    text(place, String(player.place));
    text(suffix, ordinal(player.place));
    text(lap, `Lap ${Math.min(session.laps, Math.max(1, player.lap + 1))}/${session.laps}`);
    text(time, formatTime(player.finished ? player.finishTime : session.time));
    text(coins, String(coinsSoFar(player)));

    let message = '';
    if (session.phase === 'countdown') message = String(Math.ceil(session.countdown));
    else if (session.phase === 'racing' && session.time < 1) message = 'GO!';
    else if (session.phase === 'racing' && player.lap === session.laps - 1 && lastLapAt(session) < 2) message = 'Final lap';
    banner.hidden = message === '';
    text(banner, message);

    // A short note when something on the track gets the player.
    const event = player.lastEvent;
    if (event && event !== shownEvent) {
      shownEvent = event;
      const [note, tone] = EVENT_NOTES[event.kind];
      text(toast, event.kind === 'checkpoint' ? `Checkpoint ${event.sector} of ${SECTORS - 1}` : note);
      toast.classList.toggle('good', tone === true);
      toast.classList.toggle('bad', tone === false);
      toast.classList.toggle('info', tone === 'info');
    }
    toast.hidden = !shownEvent || session.time - shownEvent.at > NOTE_TIME || player.finished;

    // What is on the windscreen.
    const effects = player.car.effects;
    const since = event ? session.time - event.at : Infinity;
    fx.set({
      oil: effects.slip > 0,
      slime: event?.kind === 'zombie' && effects.slow > 0,
      zap: event?.kind === 'zap' && since < 0.9,
      frost: session.racers.some((racer) => racer !== player && racer.car.effects.frozen > 0),
    });

    // The fire button empties when used and fills back up as the weapon reloads.
    if (!fire.hidden) {
      const left = player.reload ?? 0;
      fire.style.setProperty('--reloaded', (1 - left / RELOAD).toFixed(3));
      fire.classList.toggle('ready', left <= 0);
      text(fireLabel, left > 0 ? String(Math.ceil(left)) : 'Fire');
    }

    // Nameplates ride above the cars.
    plates.forEach((plate, i) => {
      const at = where[i];
      const show = Boolean(at?.visible);
      if (plate.hidden === show) plate.hidden = !show;
      if (show) plate.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${at.scale.toFixed(2)})`;
    });

    // The map does not need redrawing every frame.
    if (mapTick++ % 3 === 0) drawMap(session);
  }

  // ---------- Minimap ----------
  // The circuit seen from above, with a dot for every racer. Sectors the
  // player has been through this lap are picked out in green.

  const map = $('minimap');
  const mapContext = map.getContext('2d');
  let mapTick = 0;
  let mapPoint = null; // (x, z) in the world to [x, y] on the map
  let mapOutline = null; // the circuit, drawn once per race

  function setupMap(track, site) {
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(map.clientWidth * density) || 248;
    const height = Math.round(map.clientHeight * density) || 184;
    map.width = width;
    map.height = height;

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < track.count; i++) {
      minX = Math.min(minX, track.xs[i]);
      maxX = Math.max(maxX, track.xs[i]);
      minZ = Math.min(minZ, track.zs[i]);
      maxZ = Math.max(maxZ, track.zs[i]);
    }
    const margin = 9 * density;
    const scale = Math.min((width - margin * 2) / (maxX - minX), (height - margin * 2) / (maxZ - minZ));
    // Flipped left to right, like the track picker, to match the driver's view.
    mapPoint = (x, z) => [width / 2 - (x - (minX + maxX) / 2) * scale, height / 2 - (z - (minZ + maxZ) / 2) * scale];

    const trace = (context, from, to) => {
      context.beginPath();
      for (let i = from; i <= to; i++) context.lineTo(...mapPoint(track.xs[track.wrap(i)], track.zs[track.wrap(i)]));
      context.stroke();
    };
    // Where each sector ends: the checkpoints, then the start line.
    const ends = [0, ...track.checkpoints, track.count];
    mapOutline = { density, trace, ends };

    // The whole circuit, with a tick at the start line and at each checkpoint.
    const still = document.createElement('canvas');
    still.width = width;
    still.height = height;
    const context = still.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = 'rgb(255 255 255 / 45%)';
    context.lineWidth = 4 * density;
    trace(context, 0, track.count);
    // Where the road climbs, dives or divides, in blue.
    context.strokeStyle = '#7fd0ff';
    for (const section of track.sections) trace(context, section.from, section.from + section.length);
    // The landmark, where the trouble is, in red.
    if (site) {
      context.strokeStyle = '#ff6a5c';
      trace(context, site.from, site.from + track.wrap(site.to - site.from));
    }
    context.fillStyle = '#ffffff';
    for (let k = 0; k < SECTORS; k++) {
      const [x, y] = mapPoint(track.xs[ends[k]], track.zs[ends[k]]);
      context.beginPath();
      context.arc(x, y, (k === 0 ? 3.4 : 2.2) * density, 0, Math.PI * 2);
      context.fill();
    }
    mapOutline.still = still;
  }

  function drawMap(session) {
    if (!mapOutline) return;
    const { density, trace, ends, still } = mapOutline;
    const player = session.player;
    mapContext.clearRect(0, 0, map.width, map.height);
    mapContext.drawImage(still, 0, 0);

    // Sectors completed this lap.
    mapContext.lineCap = 'round';
    mapContext.lineJoin = 'round';
    mapContext.strokeStyle = '#6dff97';
    mapContext.lineWidth = 4 * density;
    const done = player.finished ? SECTORS : player.lap < 0 ? 0 : player.sector;
    if (done > 0) trace(mapContext, 0, ends[done]);

    // Rivals first, so the player's dot is always on top.
    const dot = (racer, radius, ring) => {
      const [x, y] = mapPoint(racer.car.x, racer.car.z);
      mapContext.beginPath();
      mapContext.arc(x, y, radius * density, 0, Math.PI * 2);
      mapContext.fillStyle = racer.build?.paint || '#ffffff';
      mapContext.fill();
      mapContext.lineWidth = ring * density;
      mapContext.strokeStyle = racer.isPlayer ? '#ffffff' : 'rgb(13 29 77 / 80%)';
      mapContext.stroke();
    };
    for (const racer of session.racers) if (!racer.isPlayer) dot(racer, 3.2, 1);
    dot(player, 4.6, 2);
  }

  // Seconds since the player started their final lap.
  let finalLapStarted = null;
  function lastLapAt(session) {
    if (finalLapStarted === null) finalLapStarted = session.time;
    return session.time - finalLapStarted;
  }

  /** Call at the start of a race, with the session about to be run and its world's landmark. */
  function reset(session, site) {
    finalLapStarted = null;
    shownEvent = null;
    banner.hidden = true;
    toast.hidden = true;
    fx.set({});
    // Only weapons that fire need a button; the others are always on.
    fire.hidden = session.player.attack?.type !== 'shot';
    setupMap(session.track, site);
    mapTick = 0;

    plates = session.racers.map((racer) => {
      const plate = element('div', racer.isPlayer ? 'plate plate-you' : 'plate');
      plate.append(face(racer.character), element('span', 'plate-name', racer.name));
      plate.hidden = true;
      return plate;
    });
    plateLayer.replaceChildren(...plates);
  }

  /**
   * Fills in and shows the results sheet.
   * rewards: from raceRewards(). opened: the track this win opened, if any.
   * next: { theme, winsLeft } for the track still locked after this one, if any.
   */
  function showResults(session, { rewards, opened, next }) {
    const player = session.player;
    const sheet = $('results');
    sheet.dataset.place = String(player.place);
    $('results-art').innerHTML = placeArt(player.place);
    $('results-title').textContent = ['You won!', 'Second place!', 'Third place!', 'Fourth place'][player.place - 1];

    const rows = [...session.racers]
      .sort((a, b) => a.place - b.place)
      .map((racer) => {
        const row = element('li', racer.isPlayer ? 'result result-you' : 'result');
        const paint = element('span', 'result-paint');
        paint.style.background = racer.build.paint;
        const badge = face(racer.character);
        badge.append(paint);
        const finish = element('span', 'result-time', racer.finished ? formatTime(racer.finishTime) : 'still racing');
        row.append(`${racer.place}`, badge, element('span', 'result-name', racer.name), finish);
        return row;
      });
    $('results-list').replaceChildren(...rows);

    $('results-lines').replaceChildren(
      ...rewards.lines.map((line) => {
        const item = element('li');
        item.append(element('span', '', line.label), element('span', 'result-coins', `+${line.coins}`));
        return item;
      }),
    );
    $('results-total-coins').textContent = `+${rewards.total}`;

    const note = $('results-note');
    if (opened) note.textContent = `New track open: ${opened.name}!`;
    else if (next) note.textContent = `Win here ${next.winsLeft === 1 ? 'once' : next.winsLeft === 2 ? 'twice' : `${next.winsLeft} times`} more to open ${next.theme.name}.`;
    note.hidden = !opened && !next;
    note.classList.toggle('big-news', Boolean(opened));

    // A win gets confetti.
    const confetti = $('confetti');
    confetti.replaceChildren();
    if (player.place === 1) {
      const colours = ['#ffd23f', '#f23a2f', '#2f7df2', '#31c45a', '#ff6fae', '#ffffff'];
      for (let i = 0; i < 44; i++) {
        const bit = element('i');
        bit.style.left = `${Math.random() * 100}%`;
        bit.style.background = colours[i % colours.length];
        bit.style.animationDelay = `${(-Math.random() * 3.5).toFixed(2)}s`;
        bit.style.animationDuration = `${(2.6 + Math.random() * 2.2).toFixed(2)}s`;
        bit.style.setProperty('--sway', `${(Math.random() * 80 - 40).toFixed(0)}px`);
        confetti.append(bit);
      }
    }
    sheet.hidden = false;
  }

  return { update, reset, showResults };
}

// ---------- Track picker ----------

/**
 * Builds the track picker.
 *   profile             the player (profile.js): which tracks are open, coins, difficulty
 *   pictures            { [trackId]: image URL } taken by the scene, where there is one
 *   onPick(theme)       an open track was chosen
 *   onChange()          the profile changed (a track was bought, the difficulty set)
 * Returns { refresh() }, to call whenever coins or open tracks may have changed.
 */
export function createTrackPicker({ profile, pictures, onPick, onChange }) {
  const list = $('track-list');
  const levels = $('difficulty');

  function renderLevels() {
    levels.replaceChildren(
      ...DIFFICULTIES.map((level) => {
        const button = element('button', 'level');
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(profile.difficulty === level.id));
        button.append(element('span', 'level-name', level.name));
        const prize = element('span', 'level-prize');
        prize.innerHTML = coinIcon;
        prize.append(`x${level.reward}`);
        button.append(prize);
        button.addEventListener('click', () => {
          if (profile.difficulty === level.id) return;
          profile.difficulty = level.id;
          renderLevels();
          onChange();
        });
        return button;
      }),
    );
  }

  function renderTracks() {
    $('picker-coins').textContent = String(profile.coins);
    list.replaceChildren(
      ...TRACKS.map((theme) => {
        const open = trackOpen(profile, theme);
        const card = element('div', open ? 'track-card' : 'track-card locked');

        const play = element('button', 'track-play');
        play.type = 'button';
        play.disabled = !open;
        const art = element('span', 'track-art');
        if (pictures[theme.id]) {
          const picture = element('img');
          picture.alt = '';
          picture.draggable = false;
          picture.src = pictures[theme.id];
          art.append(picture);
        } else {
          art.style.background = theme.preview.ground;
        }
        // The shape of the circuit, in the corner of the picture.
        const map = element('canvas', 'track-map');
        map.width = 160;
        map.height = 120;
        drawOutline(map, theme);
        art.append(map);
        const wins = profile.wins[theme.id] || 0;
        if (open && wins) {
          const cups = element('span', 'track-wins', `${wins} ${wins === 1 ? 'win' : 'wins'}`);
          art.append(cups);
        }
        play.append(art, element('span', 'track-name', theme.name), element('span', 'track-blurb', theme.blurb));
        play.addEventListener('click', () => onPick(theme));
        card.append(play);

        if (!open) {
          // How to open it: win the track before it, or pay.
          const lock = trackLock(profile, theme);
          const panel = element('div', 'track-lock');
          const icon = element('span', 'track-lock-icon');
          icon.innerHTML = lockIcon;
          const how = element('span', 'track-lock-how', `Win ${lock.winsLeft} more on ${lock.before.name}`);
          const buy = element('button', 'track-buy');
          buy.type = 'button';
          buy.disabled = !lock.affordable;
          buy.innerHTML = coinIcon;
          buy.append(lock.affordable ? `Open for ${lock.price}` : String(lock.price));
          buy.setAttribute('aria-label', `Open ${theme.name} for ${lock.price} coins`);
          buy.addEventListener('click', () => {
            if (!buyTrack(profile, theme)) return;
            onChange();
            renderTracks();
          });
          panel.append(icon, how, buy);
          card.append(panel);
        }
        return card;
      }),
    );
  }

  renderLevels();
  renderTracks();
  return {
    refresh() {
      renderLevels();
      renderTracks();
    },
  };
}

/** Draws the shape of a circuit as a bold outline, for the corner of its card. */
function drawOutline(canvas, theme) {
  const track = createTrack(theme.layout);
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < track.count; i++) {
    minX = Math.min(minX, track.xs[i]);
    maxX = Math.max(maxX, track.xs[i]);
    minZ = Math.min(minZ, track.zs[i]);
    maxZ = Math.max(maxZ, track.zs[i]);
  }
  const scale = Math.min((width - 28) / (maxX - minX), (height - 28) / (maxZ - minZ));
  // Flipped left to right so the map matches what the driver sees: +x is
  // the left-hand side when facing +z.
  const px = (x) => width / 2 - (x - (minX + maxX) / 2) * scale;
  const pz = (z) => height / 2 - (z - (minZ + maxZ) / 2) * scale;

  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < track.count; i++) ctx.lineTo(px(track.xs[i]), pz(track.zs[i]));
  ctx.closePath();
  ctx.strokeStyle = 'rgb(13 29 77 / 85%)';
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Start line.
  ctx.beginPath();
  ctx.arc(px(track.xs[0]), pz(track.zs[0]), 6, 0, Math.PI * 2);
  ctx.fillStyle = theme.preview.accent;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
}
