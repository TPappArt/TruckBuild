import { GAME } from './config.js';

// Placeholder scene. It only exists to prove the shell works on a given
// device: it shows the viewport size, frame rate and live pointers.
// Replace `update` and `render` with the real game.
export function createGame(view, input) {
  const ctx = view.ctx;
  let time = 0;
  let fps = 0;

  function update(dt) {
    time += dt;
    if (dt > 0) fps += (1 / dt - fps) * 0.05;
  }

  function render() {
    const { width, height } = view;

    ctx.fillStyle = '#14171c';
    ctx.fillRect(0, 0, width, height);

    // Scrolling grid, so dropped frames are easy to see.
    const cell = 48;
    const offset = (time * 24) % cell;
    ctx.strokeStyle = '#1f242c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -offset; x < width; x += cell) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
    }
    for (let y = 0; y < height; y += cell) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2b233';
    ctx.font = `700 ${Math.round(Math.min(width, height) * 0.1)}px system-ui, sans-serif`;
    ctx.fillText(GAME.name, width / 2, height / 2);

    ctx.fillStyle = '#8b94a3';
    ctx.font = '14px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText(
      `${width} × ${height} @${view.pixelRatio}x · ${Math.round(fps)} fps`,
      width / 2,
      height / 2 + Math.min(width, height) * 0.1,
    );

    for (const pointer of input.pointers) {
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, pointer.down ? 28 : 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#f2b233';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  return { update, render };
}
