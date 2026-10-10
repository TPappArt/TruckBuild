import { GAME } from '../config.js';
import { setPaint } from '../engine/materials.js';
import { CATEGORIES, findPart, PAINTS, priceOf, randomBuild } from '../parts/catalog.js';
import { buyPart, owns } from '../profile.js';
import { coinIcon, lockIcon } from '../ui/icons.js';

// The garage picker: category tabs, a card per part, paint swatches,
// shuffle, and the shop.
//
// The player's build (profile.build) only ever holds parts they own. A part
// they do not own can be tapped to try it on: it shows on the turntable and
// a bar offers it for sale, but it is not part of the build until bought.
//
//   onChange(shown, changedCategoryId)   the vehicle on show changed
//   onSpend()                            coins were spent; save and refresh
export function createGarageUI({ profile, snapshot, onChange, onSpend }) {
  const $ = (id) => document.getElementById(id);
  const tabs = $('tabs');
  const parts = $('parts');
  const paints = $('paints');
  const shuffle = $('shuffle-button');
  const buyBar = $('buy-bar');
  const buyName = $('buy-name');
  const buyButton = $('buy-button');
  const build = profile.build;

  let active = CATEGORIES[0].id;
  // Parts being tried on: { [categoryId]: partId }, and which was tried last.
  let trying = {};
  let offered = null; // { category, part }
  const thumbnails = new Map();
  const triangleCounts = new Map();

  const shown = () => ({ ...build, ...trying });
  const has = (categoryId, partId) => owns(profile, categoryId, partId);

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

  /** Fits a part the player owns, or tries on one they do not. */
  function pick(category, id) {
    if (has(category.id, id)) {
      if (build[category.id] === id && !(category.id in trying)) return;
      build[category.id] = id;
      delete trying[category.id];
      if (offered?.category === category) offered = null;
    } else {
      if (trying[category.id] === id) return;
      trying[category.id] = id;
      offered = { category, part: findPart(category.id, id) };
    }
    renderParts();
    renderOffer();
    onChange(shown(), category.id);
  }

  function renderParts() {
    const category = CATEGORIES.find((entry) => entry.id === active);
    const now = shown()[category.id];
    const cards = [];

    const card = (id, name, fill) => {
      const button = element('button', 'card');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(now === id));
      const footer = fill(button);
      button.append(element('span', 'card-name', name));
      if (footer) button.append(footer);
      button.addEventListener('click', () => pick(category, id));
      return button;
    };

    if (category.optional) {
      cards.push(
        card(null, 'None', (button) => {
          button.append(element('span', 'card-empty'));
          return null;
        }),
      );
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
          if (has(category.id, part.id)) return null;
          // For sale: a padlock on the picture, and a price under the name.
          button.classList.add('locked');
          const lock = element('span', 'card-lock');
          lock.innerHTML = lockIcon;
          button.append(lock);
          button.setAttribute('aria-label', `${part.name}, ${priceOf(part)} coins`);
          const price = element('span', 'card-price');
          price.innerHTML = coinIcon;
          price.append(String(priceOf(part)));
          return price;
        }),
      );
    }
    parts.replaceChildren(...cards);
    parts.setAttribute('aria-label', category.name);
  }

  /** The bar that offers the part being tried on. */
  function renderOffer() {
    buyBar.hidden = !offered;
    if (!offered) return;
    const price = priceOf(offered.part);
    const short = price - profile.coins;
    buyName.textContent = offered.part.name;
    buyButton.disabled = short > 0;
    buyButton.innerHTML = coinIcon;
    buyButton.append(short > 0 ? `${short} more to go` : `Buy for ${price}`);
  }

  buyButton.addEventListener('click', () => {
    if (!offered) return;
    const { category, part } = offered;
    if (!buyPart(profile, category.id, part.id)) return;
    build[category.id] = part.id;
    delete trying[category.id];
    // Anything else still being tried on stays on offer.
    const [nextCategory] = Object.keys(trying);
    offered = nextCategory ? { category: CATEGORIES.find((entry) => entry.id === nextCategory), part: findPart(nextCategory, trying[nextCategory]) } : null;
    refresh();
    onSpend();
    onChange(shown(), category.id);
  });

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
          onChange(shown(), null);
        });
        return swatch;
      }),
    );
  }

  function refresh() {
    renderTabs();
    renderParts();
    renderPaints();
    renderOffer();
  }

  shuffle.addEventListener('click', () => {
    // From what the player owns: a shuffle should never be a tease.
    Object.assign(build, randomBuild(has));
    trying = {};
    offered = null;
    refresh();
    onChange(shown(), 'body');
  });

  refresh();

  return {
    /** Call when coins change, so prices show what can be afforded. */
    refresh,
    /** Takes off anything being tried on. Returns true if there was something. */
    stopTrying() {
      if (!Object.keys(trying).length) return false;
      trying = {};
      offered = null;
      refresh();
      onChange(shown(), 'body');
      return true;
    },
  };
}
