import { GAME } from '../config.js';
import { setPaint } from '../engine/materials.js';
import { CATEGORIES, PAINTS, randomBuild } from '../parts/catalog.js';

// The picker: category tabs, a card per part, paint swatches and shuffle.
// It owns no game state of its own. It edits `build` and reports each
// change through `onChange(build, changedCategoryId)`.
export function createGarageUI({ build, snapshot, onChange }) {
  const tabs = document.getElementById('tabs');
  const parts = document.getElementById('parts');
  const paints = document.getElementById('paints');
  const shuffle = document.getElementById('shuffle-button');

  let active = CATEGORIES[0].id;
  const thumbnails = new Map();
  const triangleCounts = new Map();

  function triangles(part) {
    if (!triangleCounts.has(part)) triangleCounts.set(part, part.unit().triangles);
    return triangleCounts.get(part);
  }

  // Thumbnails show the current paint, so they are cached per colour.
  function thumbnail(category, part) {
    const key = `${category.id}/${part.id}/${build.paint}`;
    if (!thumbnails.has(key)) {
      setPaint(build.paint);
      thumbnails.set(key, snapshot(part.unit()));
    }
    return thumbnails.get(key);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderTabs() {
    tabs.replaceChildren(
      ...CATEGORIES.map((category) => {
        const tab = element('button', 'tab', category.name);
        tab.type = 'button';
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(category.id === active));
        tab.addEventListener('click', () => {
          active = category.id;
          renderTabs();
          renderParts();
          parts.scrollTo({ left: 0, top: 0 });
        });
        return tab;
      }),
    );
  }

  function renderParts() {
    const category = CATEGORIES.find((entry) => entry.id === active);
    const cards = [];

    const card = (id, name, fill) => {
      const button = element('button', 'card');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(build[category.id] === id));
      fill(button);
      button.append(element('span', 'card-name', name));
      button.addEventListener('click', () => {
        if (build[category.id] === id) return;
        build[category.id] = id;
        for (const other of parts.children) other.setAttribute('aria-selected', String(other === button));
        onChange(build, category.id);
      });
      return button;
    };

    if (category.optional) {
      cards.push(card(null, 'None', (button) => button.append(element('span', 'card-empty'))));
    }
    for (const part of category.parts) {
      cards.push(
        card(part.id, part.name, (button) => {
          const image = element('img', 'card-image');
          image.alt = '';
          image.draggable = false;
          image.src = thumbnail(category, part);
          button.append(image);
          if (GAME.showTriangleCounts) {
            button.append(element('span', 'card-count', `${triangles(part)} tris`));
          }
        }),
      );
    }
    parts.replaceChildren(...cards);
    parts.setAttribute('aria-label', category.name);
  }

  function renderPaints() {
    paints.replaceChildren(
      ...PAINTS.map((paint) => {
        const swatch = element('button', 'swatch');
        swatch.type = 'button';
        swatch.style.setProperty('--swatch', paint.hex);
        swatch.setAttribute('role', 'radio');
        swatch.setAttribute('aria-label', paint.name);
        swatch.setAttribute('aria-checked', String(build.paint === paint.hex));
        swatch.addEventListener('click', () => {
          if (build.paint === paint.hex) return;
          build.paint = paint.hex;
          refresh();
          onChange(build, null);
        });
        return swatch;
      }),
    );
  }

  function refresh() {
    renderTabs();
    renderParts();
    renderPaints();
  }

  shuffle.addEventListener('click', () => {
    Object.assign(build, randomBuild());
    refresh();
    onChange(build, 'body');
  });

  refresh();
}
