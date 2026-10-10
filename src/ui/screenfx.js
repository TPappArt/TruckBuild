// What the "windscreen" picks up in a race: oil round the edges of the
// screen after driving through a slick, sparks when zapped, frost when time
// is frozen, slime after hitting a zombie.
//
// Each effect is one small texture, made here on a canvas at start-up: a
// tile of noise cut off at a threshold so that it comes out as blobs,
// veins or crystals. The tile repeats across the whole screen and a CSS
// mask lets it show only toward the edges. Nothing is drawn per frame; the
// HUD just fades layers in and out.

const SIZE = 128;

/** Smooth noise on a square that wraps: returns sample(u, v) for u, v in 0..1. */
function wrappingNoise(cells, seed) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const grid = Float32Array.from({ length: cells * cells }, random);
  const at = (x, y) => grid[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)];
  const ease = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = u * cells;
    const y = v * cells;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = ease(x - x0);
    const fy = ease(y - y0);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

/** Paints a tile pixel by pixel: shade(u, v) returns [r, g, b, alpha 0..1]. */
function tile(shade) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  const image = context.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = shade(x / SIZE, y / SIZE);
      const i = (y * SIZE + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
    }
  }
  context.putImageData(image, 0, 0);
  return `url(${canvas.toDataURL('image/png')})`;
}

const step = (edge, value, soft = 0.03) => Math.min(1, Math.max(0, (value - edge) / soft));

/** Blobs with a glossy highlight: oil in black and purple, slime in green. */
function splats(seed, dark, sheen) {
  const big = wrappingNoise(4, seed);
  const small = wrappingNoise(9, seed + 7);
  return tile((u, v) => {
    const n = big(u, v) * 0.7 + small(u, v) * 0.3;
    const alpha = step(0.56, n, 0.02);
    const shine = step(0.69, n, 0.02) * (1 - step(0.74, n, 0.02));
    return [dark[0] + (sheen[0] - dark[0]) * shine, dark[1] + (sheen[1] - dark[1]) * shine, dark[2] + (sheen[2] - dark[2]) * shine, alpha * 0.94];
  });
}

/** Thin forking veins: electricity. */
function veins(seed) {
  const a = wrappingNoise(5, seed);
  const b = wrappingNoise(11, seed + 3);
  return tile((u, v) => {
    const n = a(u, v) * 0.75 + b(u, v) * 0.25;
    const core = 1 - Math.min(1, Math.abs(n - 0.5) / 0.022);
    const halo = 1 - Math.min(1, Math.abs(n - 0.5) / 0.08);
    return [190 + 65 * core, 245, 255, Math.max(core, halo * 0.45)];
  });
}

/** Feathery crystals: frost. */
function crystals(seed) {
  const a = wrappingNoise(8, seed);
  const b = wrappingNoise(24, seed + 5);
  const c = wrappingNoise(3, seed + 9);
  return tile((u, v) => {
    // Ridges where two layers of noise cross, thinned by a third.
    const ridge = 1 - Math.abs(a(u, v) - b(u, v)) * 5;
    const body = c(u, v);
    const alpha = Math.max(0, ridge) * (0.35 + body * 0.75);
    return [225 + 30 * ridge, 245, 255, alpha];
  });
}

/**
 * Makes the textures and hands them to the layers in #screen-fx as the
 * CSS variable --tile. Returns set(effects), where effects says which of
 * { oil, slime, frost, zap } are showing.
 */
export function createScreenFx() {
  const root = document.getElementById('screen-fx');
  const layers = {
    oil: root.querySelector('.fx-oil'),
    slime: root.querySelector('.fx-slime'),
    frost: root.querySelector('.fx-frost'),
    zap: root.querySelector('.fx-zap'),
  };
  layers.oil.style.setProperty('--tile', splats(11, [18, 14, 28], [96, 72, 160]));
  layers.slime.style.setProperty('--tile', splats(29, [74, 160, 40], [190, 255, 120]));
  layers.frost.style.setProperty('--tile', crystals(5));
  layers.zap.style.setProperty('--tile', veins(17));

  const showing = { oil: false, slime: false, frost: false, zap: false };
  return {
    set(effects) {
      for (const name of Object.keys(showing)) {
        const on = Boolean(effects[name]);
        if (on === showing[name]) continue;
        showing[name] = on;
        layers[name].classList.toggle('on', on);
      }
    },
    /** The colour the corners of the screen are shaded with, for the mood of the track. */
    tint(colour) {
      root.style.setProperty('--vignette', colour);
    },
  };
}
