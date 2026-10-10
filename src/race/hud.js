import { RELOAD } from './combat.js';
import { SECTORS } from './session.js';
import { createTrack } from './track.js';
import { TRACKS } from './tracks/index.js';

// Everything drawn over the race in HTML: place, lap and time, the countdown,
// the results, and the track picker shown before a race.

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
  pillar: ['Pillar!', false],
  snowball: ['Snowball!', false],
  boost: ['Speed boost!', true],
  slow: ['Snail! Slowed down', false],
  bomb: ['Boom!', false],
  oil: ['Oil! Slippery', false],
  trampoline: ['Boing!', true],
  'fast-strip': ['Speed strip!', true],
  'slow-strip': ['Sticky strip!', false],
  mummy: ['Mummy!', false],
  zap: ['Zapped!', false],
  storm: ['Snowstorm! Hold on', false],
  hit: ['Ouch! Hit', false],
  scored: ['Got one!', true],
};
const NOTE_TIME = 1.6;

/** Sets text only when it changed, so the page is not re-laid-out every frame. */
function text(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const place = $('hud-place-number');
  const suffix = $('hud-place-suffix');
  const lap = $('hud-lap');
  const time = $('hud-time');
  const banner = $('hud-banner');
  const toast = $('hud-toast');
  const fire = $('fire-button');
  const fireLabel = $('fire-label');
  let shownEvent = null;

  function update(session) {
    const player = session.player;
    text(place, String(player.place));
    text(suffix, ordinal(player.place));
    text(lap, `Lap ${Math.min(session.laps, Math.max(1, player.lap + 1))}/${session.laps}`);
    text(time, formatTime(player.finished ? player.finishTime : session.time));

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

    // The fire button empties when used and fills back up as the weapon reloads.
    if (!fire.hidden) {
      const left = player.reload ?? 0;
      fire.style.setProperty('--reloaded', (1 - left / RELOAD).toFixed(3));
      fire.classList.toggle('ready', left <= 0);
      text(fireLabel, left > 0 ? String(Math.ceil(left)) : 'Fire');
    }

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

  function setupMap(track) {
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
    mapOutline = { density, trace, sector: track.count / SECTORS };

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
    context.fillStyle = '#ffffff';
    for (let k = 0; k < SECTORS; k++) {
      const [x, y] = mapPoint(track.xs[Math.round(k * mapOutline.sector) % track.count], track.zs[Math.round(k * mapOutline.sector) % track.count]);
      context.beginPath();
      context.arc(x, y, (k === 0 ? 3.4 : 2.2) * density, 0, Math.PI * 2);
      context.fill();
    }
    mapOutline.still = still;
  }

  function drawMap(session) {
    if (!mapOutline) return;
    const { density, trace, sector, still } = mapOutline;
    const player = session.player;
    mapContext.clearRect(0, 0, map.width, map.height);
    mapContext.drawImage(still, 0, 0);

    // Sectors completed this lap.
    mapContext.lineCap = 'round';
    mapContext.lineJoin = 'round';
    mapContext.strokeStyle = '#6dff97';
    mapContext.lineWidth = 4 * density;
    const done = player.finished ? SECTORS : player.lap < 0 ? 0 : player.sector;
    if (done > 0) trace(mapContext, 0, Math.round(done * sector));

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

  /** Call at the start of a race, with the session about to be run. */
  function reset(session) {
    finalLapStarted = null;
    shownEvent = null;
    banner.hidden = true;
    toast.hidden = true;
    // Only weapons that fire need a button; the others are always on.
    fire.hidden = session.player.attack?.type !== 'shot';
    setupMap(session.track);
    mapTick = 0;
  }

  /** Fills in and shows the results sheet. */
  function showResults(session) {
    const player = session.player;
    $('results-title').textContent =
      player.place === 1 ? 'You won!' : `You finished ${player.place}${ordinal(player.place)}`;
    const rows = [...session.racers]
      .sort((a, b) => a.place - b.place)
      .map((racer) => {
        const row = document.createElement('li');
        row.className = racer.isPlayer ? 'result result-you' : 'result';
        const dot = document.createElement('span');
        dot.className = 'result-paint';
        dot.style.background = racer.build.paint;
        const name = document.createElement('span');
        name.className = 'result-name';
        name.textContent = racer.isPlayer ? 'You' : racer.name;
        const finish = document.createElement('span');
        finish.className = 'result-time';
        finish.textContent = racer.finished ? formatTime(racer.finishTime) : 'still racing';
        row.append(`${racer.place}`, dot, name, finish);
        return row;
      });
    $('results-list').replaceChildren(...rows);
    $('results').hidden = false;
  }

  return { update, reset, showResults };
}

/** Builds the track picker cards. `onPick(theme)` is called when one is chosen. */
export function createTrackPicker(onPick) {
  const list = document.getElementById('track-list');
  const cards = TRACKS.map((theme) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'track-card';

    // A map of the circuit, drawn from the same centre line the race uses.
    const map = document.createElement('canvas');
    map.width = 320;
    map.height = 240;
    drawMap(map, theme);

    const name = document.createElement('span');
    name.className = 'track-name';
    name.textContent = theme.name;
    card.append(map, name);
    card.addEventListener('click', () => onPick(theme));
    return card;
  });
  list.replaceChildren(...cards);
}

function drawMap(canvas, theme) {
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
  const scale = Math.min((width - 56) / (maxX - minX), (height - 56) / (maxZ - minZ));
  // Flipped left to right so the map matches what the driver sees: +x is
  // the left-hand side when facing +z.
  const px = (x) => width / 2 - (x - (minX + maxX) / 2) * scale;
  const pz = (z) => height / 2 - (z - (minZ + maxZ) / 2) * scale;

  ctx.fillStyle = theme.preview.ground;
  ctx.fillRect(0, 0, width, height);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < track.count; i++) ctx.lineTo(px(track.xs[i]), pz(track.zs[i]));
  ctx.closePath();
  ctx.strokeStyle = theme.preview.accent;
  ctx.lineWidth = 17;
  ctx.stroke();
  ctx.strokeStyle = theme.preview.road;
  ctx.lineWidth = 11;
  ctx.stroke();

  // Start line.
  ctx.save();
  ctx.translate(px(track.xs[0]), pz(track.zs[0]));
  ctx.rotate(Math.atan2(-track.tz[0], -track.tx[0]));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2.5, -10, 5, 20);
  ctx.restore();
}
