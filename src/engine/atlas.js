// Every texture in the game, on one sheet: the atlas.
//
// Small square pictures (32 to 128 pixels) packed side by side into one
// image, which goes to the graphics card as a single texture. There are no
// image files: the game draws the sheet itself at start-up, in a few
// milliseconds, so there is nothing to download and it works offline.
//
// Three kinds of picture live on it:
//
//   detail   A grey pattern that repeats without a seam (grass, tarmac,
//            brick...). It is laid over a surface by where the surface is in
//            the world, so nothing needs unwrapping, and it multiplies the
//            surface's own colour: 50% grey changes nothing, lighter
//            lightens, darker darkens. One grass tile serves green grass,
//            dead grass and swamp grass alike. A surface asks for one by
//            name in its material: material('#4a8a3a', { tex: 'grass' }).
//   decal    A picture with see-through parts, stuck on once: graffiti, a
//            crack, a drain cover. It brings its own colours.
//   sprite   A soft white shape for particles (dust, sparks), coloured by
//            whatever uses it.
//
// Each picture is drawn with a two-pixel border. A detail tile's border is a
// copy of its opposite edges, so it still has no seam when the graphics card
// blends neighbouring pixels; the others' borders are clear.
//
// The list of pictures and where each one sits (TILES, tileOf, ATLAS) can be
// used anywhere, including the scripts that run without a browser. Drawing
// the sheet (drawAtlas) needs a browser.

const GUTTER = 2;

// metres: how much ground one repeat of a detail tile covers.
// strength: how strongly it shows (0 to 1), unless a material says otherwise.
const DETAIL = {
  asphalt: { size: 64, metres: 3, strength: 0.75 },
  gravel: { size: 64, metres: 2.4, strength: 0.7 },
  grass: { size: 64, metres: 2.2, strength: 0.9 },
  sand: { size: 64, metres: 4, strength: 0.75 },
  snow: { size: 64, metres: 3.5, strength: 0.6 },
  dirt: { size: 64, metres: 3, strength: 0.75 },
  rock: { size: 64, metres: 4, strength: 0.7 },
  stone: { size: 64, metres: 3.2, strength: 0.75 },
  brick: { size: 64, metres: 2.4, strength: 0.8 },
  planks: { size: 64, metres: 2.4, strength: 0.65 },
  concrete: { size: 64, metres: 3.2, strength: 0.75 },
  leaves: { size: 64, metres: 1.8, strength: 0.7 },
  cobbles: { size: 128, metres: 4.5, strength: 0.7 },
  mud: { size: 64, metres: 3.5, strength: 0.55 },
  ice: { size: 64, metres: 5, strength: 0.5 },
  bark: { size: 32, metres: 1.2, strength: 0.6 },
  metal: { size: 32, metres: 0.9, strength: 0.45 },
};

const DECAL = {
  tagZap: [128, 64],
  tagVroom: [128, 64],
  tagHonk: [128, 64],
  tagBoo: [128, 64],
  tagFizz: [128, 64],
  smiley: [64, 64],
  crown: [64, 64],
  bolt: [64, 64],
  star: [64, 64],
  poster: [64, 64],
  hieroglyphs: [64, 128],
  chevrons: [64, 32],
  manhole: [32, 32],
  crack: [64, 64],
  oil: [64, 64],
  puddle: [64, 64],
  cobweb: [64, 64],
  paws: [64, 64],
  moss: [64, 64],
  drift: [128, 64],
  icePatch: [64, 64],
};

const SPRITE = {
  puff: [32, 32],
  spark: [32, 32],
  chunk: [16, 16],
  flake: [16, 16],
};

/** Every picture by name: { id, kind, width, height, metres?, strength? }. Ids start at 1; 0 means none. */
export const TILES = {};
for (const [name, info] of Object.entries(DETAIL)) TILES[name] = { kind: 'detail', width: info.size, height: info.size, metres: info.metres, strength: info.strength };
for (const [name, [width, height]] of Object.entries(DECAL)) TILES[name] = { kind: 'decal', width, height };
for (const [name, [width, height]] of Object.entries(SPRITE)) TILES[name] = { kind: 'sprite', width, height };
Object.values(TILES).forEach((tile, i) => {
  tile.id = i + 1;
});

/** The tile called `name`, or an error if there is none (a typo should not fail quietly). */
export function tileOf(name) {
  const tile = TILES[name];
  if (!tile) throw new Error(`No texture called "${name}"`);
  return tile;
}

/**
 * Where everything sits on the sheet, worked out without drawing anything:
 * { width, height, rects }, where `rects` has four numbers per tile id
 * (left, top, width, height, as fractions of the sheet), the picture
 * itself without its border. Index 0 is empty.
 */
export const ATLAS = (() => {
  const width = 512;
  const entries = Object.entries(TILES).sort(([, a], [, b]) => b.height - a.height || b.width - a.width);
  let x = 0;
  let y = 0;
  let row = 0;
  const places = {};
  for (const [name, tile] of entries) {
    const w = tile.width + GUTTER * 2;
    const h = tile.height + GUTTER * 2;
    if (x + w > width) {
      x = 0;
      y += row;
      row = 0;
    }
    places[name] = [x + GUTTER, y + GUTTER];
    x += w;
    row = Math.max(row, h);
  }
  let height = 64;
  while (height < y + row) height *= 2;
  const rects = new Float32Array((Object.keys(TILES).length + 1) * 4);
  for (const [name, tile] of Object.entries(TILES)) {
    const [left, top] = places[name];
    rects.set([left / width, top / height, tile.width / width, tile.height / height], tile.id * 4);
    tile.x = left;
    tile.y = top;
  }
  return { width, height, rects, count: Object.keys(TILES).length };
})();

// ---------- Drawing ----------

/** A small seeded random generator, so the sheet is the same every time. */
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth noise that repeats every 1 in u and v: random values on a `cells` grid, blended. */
function noise(cells, rand) {
  const grid = Float32Array.from({ length: cells * cells }, rand);
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

/** Fills a tile pixel by pixel: shade(u, v) gives a grey from 0 to 1, or [r, g, b]. */
function shadePixels(ctx, size, shade) {
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = shade(x / size, y / size, x, y);
      const [r, g, b] = Array.isArray(value) ? value : [value, value, value];
      const i = (y * size + x) * 4;
      image.data[i] = Math.max(0, Math.min(255, r * 255));
      image.data[i + 1] = Math.max(0, Math.min(255, g * 255));
      image.data[i + 2] = Math.max(0, Math.min(255, b * 255));
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** Draws something nine times, shifted by a tile each way, so what crosses an edge comes back in at the other. */
function wrapped(ctx, size, draw) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      ctx.save();
      ctx.translate(dx, dy);
      draw();
      ctx.restore();
    }
  }
}

const grey = (value, alpha = 1) => {
  const c = Math.round(Math.max(0, Math.min(1, value)) * 255);
  return `rgba(${c},${c},${c},${alpha})`;
};

/** Points scattered over a tile, for cell patterns. Returned with their eight wrapped copies. */
function scatter(count, rand, size) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const shade = rand();
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) points.push({ x: x + dx, y: y + dy, shade, id: i });
  }
  return points;
}

/** For cell patterns: the nearest and second-nearest scattered point to (x, y). */
function nearest(points, x, y) {
  let first = Infinity;
  let second = Infinity;
  let cell = null;
  for (const p of points) {
    const dx = p.x - x;
    const dy = p.y - y;
    const d = dx * dx + dy * dy;
    if (d < first) {
      second = first;
      first = d;
      cell = p;
    } else if (d < second) {
      second = d;
    }
  }
  return { first: Math.sqrt(first), second: Math.sqrt(second), cell };
}

const DRAW = {
  asphalt(ctx, s, rand) {
    const fine = noise(16, rand);
    const broad = noise(4, rand);
    shadePixels(ctx, s, (u, v) => 0.5 + (fine(u, v) - 0.5) * 0.22 + (broad(u, v) - 0.5) * 0.12 + (rand() - 0.5) * 0.12);
    // Stones in the mix: light and dark specks.
    for (let i = 0; i < 230; i++) {
      ctx.fillStyle = grey(rand() < 0.55 ? 0.66 + rand() * 0.12 : 0.3, 0.9);
      ctx.fillRect(Math.floor(rand() * s), Math.floor(rand() * s), rand() < 0.2 ? 2 : 1, 1);
    }
    // A hairline crack or two.
    ctx.strokeStyle = grey(0.28, 0.55);
    ctx.lineWidth = 0.8;
    for (let c = 0; c < 2; c++) {
      let x = rand() * s;
      let y = rand() * s;
      const path = [[x, y]];
      for (let k = 0; k < 6; k++) {
        x += (rand() - 0.5) * 12;
        y += 4 + rand() * 6;
        path.push([x, y]);
      }
      wrapped(ctx, s, () => {
        ctx.beginPath();
        path.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
      });
    }
  },

  gravel(ctx, s, rand) {
    const fine = noise(8, rand);
    shadePixels(ctx, s, (u, v) => 0.44 + (fine(u, v) - 0.5) * 0.15 + (rand() - 0.5) * 0.1);
    for (let i = 0; i < 150; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const r = 0.8 + rand() * 1.8;
      const tone = 0.42 + rand() * 0.3;
      wrapped(ctx, s, () => {
        ctx.fillStyle = grey(tone - 0.18, 0.8);
        ctx.beginPath();
        ctx.ellipse(x + 0.4, y + 0.6, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = grey(tone);
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = grey(tone + 0.18, 0.7);
        ctx.fillRect(x - r * 0.4, y - r * 0.5, Math.max(1, r * 0.6), 1);
      });
    }
  },

  grass(ctx, s, rand) {
    const patches = noise(4, rand);
    shadePixels(ctx, s, (u, v) => 0.44 + (patches(u, v) - 0.5) * 0.2 + (rand() - 0.5) * 0.08);
    // Blades: short strokes at every angle, some lighter (catching the sun),
    // some darker (in shade), a few yellowish.
    for (let i = 0; i < 520; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const angle = -Math.PI / 2 + (rand() - 0.5) * 1.8;
      const length = 2.5 + rand() * 5;
      const light = rand();
      const tone = light < 0.45 ? 0.3 + rand() * 0.1 : 0.58 + rand() * 0.2;
      const yellow = rand() < 0.15 ? 0.08 : 0;
      wrapped(ctx, s, () => {
        ctx.strokeStyle = `rgba(${Math.round((tone + yellow) * 255)},${Math.round((tone + yellow * 0.6) * 255)},${Math.round((tone - yellow) * 255)},0.85)`;
        ctx.lineWidth = 0.9 + rand() * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      });
    }
  },

  sand(ctx, s, rand) {
    const wobble = noise(4, rand);
    const fine = noise(32, rand);
    // Ripples blown by the wind, three to a tile so that they meet themselves at the edges.
    shadePixels(ctx, s, (u, v) => {
      const ripple = Math.sin(Math.PI * 2 * (3 * u + v + (wobble(u, v) - 0.5) * 0.6));
      const crest = ripple > 0.7 ? (ripple - 0.7) * 0.3 : 0;
      return 0.5 + ripple * 0.06 + crest + (fine(u, v) - 0.5) * 0.12 + (rand() - 0.5) * 0.08;
    });
  },

  snow(ctx, s, rand) {
    const lumps = noise(6, rand);
    const fine = noise(16, rand);
    shadePixels(ctx, s, (u, v) => {
      const value = 0.5 + (lumps(u, v) - 0.5) * 0.16 + (fine(u, v) - 0.5) * 0.08;
      // A blue tint in the hollows.
      return [value - 0.02, value, value + 0.03];
    });
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = grey(0.95);
      ctx.fillRect(Math.floor(rand() * s), Math.floor(rand() * s), 1, 1);
    }
  },

  dirt(ctx, s, rand) {
    const clods = noise(8, rand);
    const broad = noise(3, rand);
    shadePixels(ctx, s, (u, v) => {
      const c = clods(u, v);
      return 0.48 + (c - 0.5) * 0.3 + (broad(u, v) - 0.5) * 0.12 + (rand() - 0.5) * 0.1 - (c < 0.32 ? 0.08 : 0);
    });
    for (let i = 0; i < 50; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const r = 0.6 + rand() * 1.4;
      wrapped(ctx, s, () => {
        ctx.fillStyle = grey(0.7, 0.8);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  },

  rock(ctx, s, rand) {
    const points = scatter(9, rand, s);
    const fine = noise(16, rand);
    shadePixels(ctx, s, (u, v, x, y) => {
      const { first, second, cell } = nearest(points, x, y);
      const edge = second - first;
      const crack = edge < 1.6 ? -0.25 : edge < 3 ? -0.08 : 0;
      return 0.42 + cell.shade * 0.18 + (fine(u, v) - 0.5) * 0.18 + crack + (rand() - 0.5) * 0.06;
    });
  },

  stone(ctx, s, rand) {
    // Big dressed blocks, two to a row, every other row shifted half a block.
    const rows = 3;
    const h = s / rows;
    const fine = noise(16, rand);
    const shades = Array.from({ length: rows * 3 }, () => rand());
    shadePixels(ctx, s, (u, v, x, y) => {
      const row = Math.floor(y / h);
      const shift = row % 2 ? s / 4 : 0;
      const bx = (x + shift) % (s / 2);
      const col = Math.floor(((x + shift) % s) / (s / 2));
      const by = y - row * h;
      const joint = bx < 1.4 || by < 1.4;
      const lip = by < 3 || bx < 3;
      const base = 0.46 + shades[row * 3 + col] * 0.14 + (fine(u, v) - 0.5) * 0.16;
      return joint ? 0.26 : lip ? base + 0.08 : base - (by > h - 3 ? 0.06 : 0);
    });
  },

  brick(ctx, s, rand) {
    const rows = 8;
    const h = s / rows;
    const w = s / 4;
    const shades = Array.from({ length: rows * 5 }, () => rand());
    shadePixels(ctx, s, (u, v, x, y) => {
      const row = Math.floor(y / h);
      const shift = row % 2 ? w / 2 : 0;
      const bx = (x + shift) % w;
      const col = Math.floor(((x + shift) % s) / w);
      const by = y - row * h;
      if (by < 1.3 || bx < 1.3) return 0.66; // mortar
      return 0.4 + shades[row * 5 + col] * 0.16 + (by < 2.5 ? 0.06 : 0) + (rand() - 0.5) * 0.08;
    });
  },

  planks(ctx, s, rand) {
    const rows = 6;
    const h = s / rows;
    const grain = noise(16, rand);
    const offsets = Array.from({ length: rows }, () => rand());
    shadePixels(ctx, s, (u, v, x, y) => {
      const row = Math.floor(y / h);
      const by = y - row * h;
      if (by < 1.2) return 0.22; // the gap between boards
      const end = (x + offsets[row] * s) % s;
      if (end < 1) return 0.3; // a board's end
      const streak = Math.sin((y + grain(u * 0.25 + offsets[row], v) * 9) * 1.9) * 0.05;
      const nail = (Math.abs(end - 3.5) < 1 || Math.abs(end - s + 4.5) < 1) && Math.abs(by - h / 2) < 1;
      return nail ? 0.25 : 0.46 + offsets[row] * 0.12 + streak + (grain(u, v) - 0.5) * 0.12 + (by < 2.4 ? 0.05 : 0);
    });
  },

  concrete(ctx, s, rand) {
    const blotch = noise(5, rand);
    const fine = noise(32, rand);
    shadePixels(ctx, s, (u, v, x, y) => {
      // Lines left by the boards it was cast against, and the holes of their ties.
      const line = y % (s / 2) < 1 ? -0.07 : 0;
      const tie = Math.hypot((x % (s / 2)) - s / 4, (y % (s / 2)) - s / 4) < 1.4 ? -0.16 : 0;
      return 0.5 + (blotch(u, v) - 0.5) * 0.18 + (fine(u, v) - 0.5) * 0.12 + line + tie + (rand() - 0.5) * 0.05;
    });
    // Streaks of damp running down.
    for (let i = 0; i < 5; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const length = 10 + rand() * 20;
      wrapped(ctx, s, () => {
        const gradient = ctx.createLinearGradient(x, y, x, y + length);
        gradient.addColorStop(0, grey(0.3, 0.35));
        gradient.addColorStop(1, grey(0.3, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, 1.5 + rand() * 2, length);
      });
    }
  },

  leaves(ctx, s, rand) {
    ctx.fillStyle = grey(0.36);
    ctx.fillRect(0, 0, s, s);
    // Overlapping leaves, each lit from the upper left.
    for (let i = 0; i < 170; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const r = 2.2 + rand() * 3;
      const turn = rand() * Math.PI;
      const tone = 0.38 + rand() * 0.26;
      wrapped(ctx, s, () => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(turn);
        ctx.fillStyle = grey(tone - 0.14);
        ctx.beginPath();
        ctx.ellipse(0.6, 0.8, r, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = grey(tone);
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = grey(tone + 0.14, 0.7);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-r * 0.8, 0);
        ctx.lineTo(r * 0.8, 0);
        ctx.stroke();
        ctx.restore();
      });
    }
  },

  cobbles(ctx, s, rand) {
    const points = scatter(34, rand, s);
    const fine = noise(32, rand);
    shadePixels(ctx, s, (u, v, x, y) => {
      const { first, second, cell } = nearest(points, x, y);
      const edge = (second - first) / 2;
      if (edge < 1.3) return 0.24 + (rand() - 0.5) * 0.05; // the gaps between stones
      // Each stone rounded: lighter toward its top left.
      const dome = Math.min(1, edge / 6);
      const lit = (cell.x - x + cell.y - y) / 22;
      return 0.36 + cell.shade * 0.14 + dome * 0.12 + lit * 0.1 + (fine(u, v) - 0.5) * 0.1;
    });
  },

  mud(ctx, s, rand) {
    const blotch = noise(5, rand);
    const fine = noise(16, rand);
    shadePixels(ctx, s, (u, v) => {
      const b = blotch(u, v);
      const wet = b > 0.66 ? 0.12 : 0; // a sheen where it is wettest
      const value = 0.44 + (b - 0.5) * 0.2 + (fine(u, v) - 0.5) * 0.12 + wet;
      return [value - 0.02, value + 0.02, value - 0.03];
    });
  },

  ice(ctx, s, rand) {
    const cloud = noise(4, rand);
    shadePixels(ctx, s, (u, v) => {
      const value = 0.5 + (cloud(u, v) - 0.5) * 0.14;
      return [value - 0.03, value, value + 0.04];
    });
    // Long light streaks, and dark cracks.
    for (let i = 0; i < 9; i++) {
      const x = rand() * s;
      const y = rand() * s;
      const length = 12 + rand() * 30;
      const turn = -0.6 + rand() * 0.3;
      const crack = rand() < 0.35;
      wrapped(ctx, s, () => {
        ctx.strokeStyle = crack ? grey(0.32, 0.55) : grey(0.8, 0.5);
        ctx.lineWidth = crack ? 0.8 : 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(turn) * length, y + Math.sin(turn) * length);
        ctx.stroke();
      });
    }
  },

  bark(ctx, s, rand) {
    const streak = noise(8, rand);
    shadePixels(ctx, s, (u, v) => {
      const value = streak(u, v * 0.125);
      return 0.42 + (value - 0.5) * 0.4 + (value < 0.35 ? -0.12 : 0) + (rand() - 0.5) * 0.06;
    });
  },

  metal(ctx, s, rand) {
    // Tread plate: raised diamonds in alternating directions.
    shadePixels(ctx, s, (u, v, x, y) => {
      const cx = x % 8;
      const cy = y % 8;
      const flip = (Math.floor(x / 8) + Math.floor(y / 8)) % 2;
      const along = flip ? cx - cy : cx + cy - 8;
      const across = flip ? cx + cy - 8 : cx - cy;
      const raised = Math.abs(along) < 4.2 && Math.abs(across) < 1.1;
      return raised ? 0.62 + (across < 0 ? 0.08 : -0.06) : 0.47 + (rand() - 0.5) * 0.06;
    });
  },
};

// ---------- Decals ----------

/** Graffiti: a word in fat letters, with an outline, a shine and a few drips. */
function tag(word, fill, outline, extra) {
  return (ctx, w, h, rand) => {
    ctx.save();
    ctx.translate(w / 2, h / 2 + 4);
    ctx.rotate(-0.08 + rand() * 0.06);
    const size = h * 0.62;
    ctx.font = `italic 900 ${size}px 'Arial Black', Impact, 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = Math.min(w - 16, ctx.measureText(word).width);
    const fit = (w - 16) / Math.max(1, ctx.measureText(word).width);
    if (fit < 1) ctx.scale(fit, 1);
    // A cloud of spray behind it.
    ctx.fillStyle = extra;
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.arc((rand() - 0.5) * width * 1.05, (rand() - 0.5) * h * 0.55, 1 + rand() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 9;
    ctx.strokeText(word, 0, 0);
    // Drips running down from the outline.
    ctx.fillStyle = outline;
    for (let i = 0; i < 4; i++) {
      const x = (rand() - 0.5) * width * 0.8;
      const length = 5 + rand() * 9;
      ctx.fillRect(x - 1.2, size * 0.3, 2.4, length);
      ctx.beginPath();
      ctx.arc(x, size * 0.3 + length, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    const gradient = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.25, fill[0]);
    gradient.addColorStop(1, fill[1]);
    ctx.fillStyle = gradient;
    ctx.fillText(word, 0, 0);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.strokeText(word, -1, -1);
    ctx.restore();
  };
}

/** A shape spray-painted on a wall: an outline, a fill and a few drips. */
function sprayed(path, fill, outline) {
  return (ctx, w, h, rand) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    path(ctx);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = outline;
    for (let i = 0; i < 3; i++) {
      const x = (rand() - 0.5) * w * 0.5;
      const length = 4 + rand() * 7;
      ctx.fillRect(x - 1, h * 0.28, 2, length);
    }
    ctx.restore();
  };
}

/** A soft-edged blob: a puddle, a patch of moss, a drift of sand. */
function blob(colours, rand, w, h, ctx, { count = 7, spread = 0.3, soft = 0.25 } = {}) {
  for (let i = 0; i < count; i++) {
    const x = w / 2 + (rand() - 0.5) * w * spread;
    const y = h / 2 + (rand() - 0.5) * h * spread;
    const r = Math.min(w, h) * (0.18 + rand() * 0.16);
    const gradient = ctx.createRadialGradient(x, y, r * (1 - soft), x, y, r);
    gradient.addColorStop(0, colours[i % colours.length]);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (w / h > 1.5 ? 1.8 : 1), r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const STAR = (ctx, r = 22, inner = 9) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const radius = i % 2 ? inner : r;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
};

const DRAW_DECAL = {
  tagZap: tag('ZAP!', ['#ffe24a', '#ff8a1f'], '#2a1458', '#ff4fa3'),
  tagVroom: tag('VROOM', ['#7af0ff', '#2f7df2'], '#14204a', '#ffd23f'),
  tagHonk: tag('HONK', ['#c9a2ff', '#6a3fb5'], '#1a0d33', '#ffd23f'),
  tagBoo: tag('BOO!', ['#d8ffb0', '#6fe07a'], '#1d2440', '#a14fff'),
  tagFizz: tag('FIZZ', ['#ffd0e6', '#ff4f8a'], '#2a0a2a', '#7af0ff'),
  smiley(ctx, w, h, rand) {
    sprayed(
      (c) => {
        c.beginPath();
        c.arc(0, -2, 22, 0, Math.PI * 2);
      },
      '#ffd23f',
      '#1d2440',
    )(ctx, w, h, rand);
    ctx.fillStyle = '#1d2440';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 8, h / 2 - 8, 3, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(w / 2 + 8, h / 2 - 8, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#1d2440';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2 - 2, 13, 0.25, Math.PI - 0.25);
    ctx.stroke();
  },
  crown: sprayed(
    (c) => {
      c.beginPath();
      c.moveTo(-22, 14);
      c.lineTo(-24, -12);
      c.lineTo(-11, 0);
      c.lineTo(0, -18);
      c.lineTo(11, 0);
      c.lineTo(24, -12);
      c.lineTo(22, 14);
      c.closePath();
    },
    '#ffc928',
    '#3a1f6b',
  ),
  bolt: sprayed(
    (c) => {
      c.beginPath();
      c.moveTo(4, -24);
      c.lineTo(-14, 4);
      c.lineTo(-2, 4);
      c.lineTo(-8, 24);
      c.lineTo(14, -6);
      c.lineTo(2, -6);
      c.closePath();
    },
    '#ffe24a',
    '#14204a',
  ),
  star: sprayed((c) => STAR(c), '#ff6fae', '#2a0a2a'),
  poster(ctx, w, h, rand) {
    // A race poster, a bit torn: a car, a chequered strip and RACE!
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(0.05);
    ctx.fillStyle = '#f4ecd2';
    ctx.beginPath();
    ctx.moveTo(-26, -29);
    ctx.lineTo(26, -29);
    ctx.lineTo(26, 18);
    ctx.lineTo(18, 22);
    ctx.lineTo(22, 29);
    ctx.lineTo(-26, 29);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e4463a';
    ctx.fillRect(-22, -25, 44, 22);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, -8, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#14204a';
    ctx.fillRect(-14, -9, 28, 6);
    ctx.beginPath();
    ctx.arc(-8, -3, 3.5, 0, Math.PI * 2);
    ctx.arc(8, -3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 11; i++) {
      ctx.fillStyle = i % 2 ? '#14204a' : '#ffffff';
      ctx.fillRect(-22 + i * 4, 0, 4, 4);
    }
    ctx.fillStyle = '#14204a';
    ctx.font = `italic 900 13px 'Arial Black', Impact, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('RACE!', 0, 19);
    ctx.restore();
  },
  hieroglyphs(ctx, w, h, rand) {
    // Two columns of carved pictures: an eye, a bird, waves, an ankh, a sun.
    ctx.strokeStyle = 'rgba(70,40,15,0.85)';
    ctx.fillStyle = 'rgba(70,40,15,0.85)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    const glyphs = [
      (x, y) => {
        ctx.beginPath();
        ctx.ellipse(x, y, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 2, y + 4.5);
        ctx.lineTo(x - 5, y + 10);
        ctx.stroke();
      },
      (x, y) => {
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 6);
        ctx.quadraticCurveTo(x - 2, y - 8, x + 6, y - 6);
        ctx.lineTo(x + 9, y - 4);
        ctx.moveTo(x - 2, y + 2);
        ctx.lineTo(x - 2, y + 9);
        ctx.moveTo(x + 2, y + 1);
        ctx.lineTo(x + 2, y + 9);
        ctx.stroke();
      },
      (x, y) => {
        ctx.beginPath();
        for (let row = -1; row <= 1; row++) {
          ctx.moveTo(x - 9, y + row * 5);
          for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(x - 7 + k * 4.5, y + row * 5 - 3, x - 4.5 + k * 4.5, y + row * 5);
        }
        ctx.stroke();
      },
      (x, y) => {
        ctx.beginPath();
        ctx.ellipse(x, y - 5, 3.5, 4.5, 0, 0, Math.PI * 2);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 10);
        ctx.moveTo(x - 6, y + 2);
        ctx.lineTo(x + 6, y + 2);
        ctx.stroke();
      },
      (x, y) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      },
    ];
    ctx.fillRect(w / 2 - 0.8, 4, 1.6, h - 8);
    for (let column = 0; column < 2; column++) {
      for (let row = 0; row < 5; row++) {
        glyphs[(row * 2 + column * 3 + Math.floor(rand() * 2)) % glyphs.length](w * (0.27 + column * 0.46), 14 + row * 24);
      }
    }
  },
  chevrons(ctx, w, h) {
    ctx.fillStyle = '#ffc928';
    ctx.fillRect(1, 1, w - 2, h - 2);
    ctx.fillStyle = '#1d2026';
    for (let i = -1; i < 5; i++) {
      ctx.beginPath();
      const x = i * 16;
      ctx.moveTo(x, 4);
      ctx.lineTo(x + 7, 4);
      ctx.lineTo(x + 15, h / 2);
      ctx.lineTo(x + 7, h - 4);
      ctx.lineTo(x, h - 4);
      ctx.lineTo(x + 8, h / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#1d2026';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
  },
  manhole(ctx, w, h) {
    ctx.fillStyle = '#2b2c31';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#55575f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 3, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 4.5, 7);
      ctx.lineTo(w / 2 + i * 4.5, h - 7);
      ctx.stroke();
    }
  },
  crack(ctx, w, h, rand) {
    ctx.strokeStyle = 'rgba(22,22,26,0.95)';
    ctx.lineCap = 'round';
    const branch = (x, y, angle, length, width, depth) => {
      if (depth > 4 || length < 3) return;
      const x2 = x + Math.cos(angle) * length;
      const y2 = y + Math.sin(angle) * length;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      branch(x2, y2, angle + (rand() - 0.5) * 0.9, length * 0.8, width * 0.75, depth + 1);
      if (rand() < 0.5) branch(x2, y2, angle + (rand() < 0.5 ? 0.9 : -0.9), length * 0.55, width * 0.6, depth + 2);
    };
    for (let i = 0; i < 4; i++) branch(w / 2, h / 2, (i / 4) * Math.PI * 2 + rand(), 9, 2.6, 0);
  },
  oil(ctx, w, h, rand) {
    blob(['rgba(18,16,24,0.95)', 'rgba(30,26,40,0.9)', 'rgba(60,40,90,0.85)'], rand, w, h, ctx, { count: 8, spread: 0.5, soft: 0.3 });
    ctx.fillStyle = 'rgba(120,200,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.4, 7, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
  },
  puddle(ctx, w, h, rand) {
    blob(['rgba(70,90,110,0.9)', 'rgba(90,110,130,0.85)'], rand, w, h, ctx, { count: 6, spread: 0.45, soft: 0.2 });
    ctx.strokeStyle = 'rgba(230,240,255,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.3 + i * 6, h * 0.42 + i * 3);
      ctx.lineTo(w * 0.42 + i * 6, h * 0.38 + i * 3);
      ctx.stroke();
    }
  },
  cobweb(ctx, w, h) {
    // In the corner of something: threads out from one corner and a sag of spiral.
    ctx.strokeStyle = 'rgba(240,240,250,0.9)';
    ctx.lineWidth = 1.1;
    const spokes = 7;
    for (let i = 0; i <= spokes; i++) {
      const angle = (i / spokes) * (Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(1, 1);
      ctx.lineTo(1 + Math.cos(angle) * (w - 4), 1 + Math.sin(angle) * (h - 4));
      ctx.stroke();
    }
    for (let ring = 1; ring <= 5; ring++) {
      const r = ring * (w / 6);
      ctx.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const angle = (i / spokes) * (Math.PI / 2);
        const sag = i > 0 && i < spokes + 1 ? r * 0.92 : r;
        const x = 1 + Math.cos(angle) * sag;
        const y = 1 + Math.sin(angle) * sag;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  paws(ctx, w, h) {
    // A trail of paw prints, from bottom left to top right.
    ctx.fillStyle = 'rgba(40,30,30,0.85)';
    for (let i = 0; i < 4; i++) {
      const x = 10 + i * 14 + (i % 2) * 4;
      const y = h - 10 - i * 14 + (i % 2) * 6;
      ctx.beginPath();
      ctx.ellipse(x, y, 3.6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let toe = 0; toe < 3; toe++) {
        ctx.beginPath();
        ctx.arc(x - 3.5 + toe * 3.5, y - 5 + (toe === 1 ? -1.2 : 0), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  moss(ctx, w, h, rand) {
    blob(['rgba(70,120,40,0.95)', 'rgba(110,150,50,0.9)', 'rgba(50,90,40,0.9)'], rand, w, h, ctx, { count: 9, spread: 0.55, soft: 0.45 });
  },
  drift(ctx, w, h, rand) {
    blob(['rgba(236,206,150,0.95)', 'rgba(222,190,130,0.9)'], rand, w, h, ctx, { count: 8, spread: 0.6, soft: 0.55 });
    ctx.strokeStyle = 'rgba(255,240,210,0.5)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.25, h * (0.4 + i * 0.1));
      ctx.quadraticCurveTo(w * 0.5, h * (0.32 + i * 0.1), w * 0.75, h * (0.42 + i * 0.1));
      ctx.stroke();
    }
  },
  icePatch(ctx, w, h, rand) {
    blob(['rgba(200,235,255,0.9)', 'rgba(170,215,245,0.85)'], rand, w, h, ctx, { count: 6, spread: 0.45, soft: 0.25 });
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.3 + i * 0.1), h * 0.35);
      ctx.lineTo(w * (0.38 + i * 0.1), h * 0.6);
      ctx.stroke();
    }
  },
};

const DRAW_SPRITE = {
  puff(ctx, w, h, rand) {
    // A lumpy ball of dust: a few soft circles.
    for (let i = 0; i < 6; i++) {
      const x = w / 2 + (rand() - 0.5) * w * 0.3;
      const y = h / 2 + (rand() - 0.5) * h * 0.3;
      const r = w * (0.2 + rand() * 0.12);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.6, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  spark(ctx, w, h) {
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.3, 'rgba(255,255,255,0.55)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 2.4 : w / 2 - 1;
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  chunk(ctx, w, h, rand) {
    // A shard of something: lit on one side.
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      const r = w * (0.3 + rand() * 0.18);
      return [w / 2 + Math.cos(angle) * r, h / 2 + Math.sin(angle) * r];
    });
    ctx.fillStyle = '#9a9a9a';
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(...points[3]);
    ctx.lineTo(...points[4]);
    ctx.lineTo(...points[5]);
    ctx.lineTo(w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
  },
  flake(ctx, w, h) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  },
};

let drawn = null;

/**
 * Draws the sheet and returns its canvas (once: later calls return the same
 * one). Needs a browser.
 */
export function drawAtlas() {
  if (drawn) return drawn;
  const sheet = document.createElement('canvas');
  sheet.width = ATLAS.width;
  sheet.height = ATLAS.height;
  const out = sheet.getContext('2d');
  const piece = document.createElement('canvas');
  const ctx = piece.getContext('2d', { willReadFrequently: true });

  let seed = 1;
  for (const [name, tile] of Object.entries(TILES)) {
    const { width: w, height: h } = tile;
    piece.width = w;
    piece.height = h;
    ctx.clearRect(0, 0, w, h);
    const rand = random(seed++ * 7919);
    if (tile.kind === 'detail') DRAW[name](ctx, w, rand);
    else if (tile.kind === 'decal') DRAW_DECAL[name](ctx, w, h, rand);
    else DRAW_SPRITE[name](ctx, w, h, rand);

    if (tile.kind === 'detail') {
      // The border is the opposite edges, so the tile still meets itself seamlessly.
      out.save();
      out.beginPath();
      out.rect(tile.x - GUTTER, tile.y - GUTTER, w + GUTTER * 2, h + GUTTER * 2);
      out.clip();
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) out.drawImage(piece, tile.x + dx, tile.y + dy);
      out.restore();
    } else {
      out.drawImage(piece, tile.x, tile.y);
    }
  }
  drawn = sheet;
  return sheet;
}
