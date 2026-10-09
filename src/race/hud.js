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
  }

  // Seconds since the player started their final lap.
  let finalLapStarted = null;
  function lastLapAt(session) {
    if (finalLapStarted === null) finalLapStarted = session.time;
    return session.time - finalLapStarted;
  }

  function reset() {
    finalLapStarted = null;
    banner.hidden = true;
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
