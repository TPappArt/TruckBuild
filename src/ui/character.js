import { CHARACTERS, characterSvg, cleanName, DEFAULT_CHARACTER, NAME_LENGTH } from '../characters.js';

// The "who is driving?" screen: pick a face, type a name.
// open(current, onDone) shows it; onDone gets { character, name }.

const $ = (id) => document.getElementById(id);

export function createCharacterScreen() {
  const root = $('character');
  const list = $('character-list');
  const input = $('character-name');
  const done = $('character-done');
  let chosen = DEFAULT_CHARACTER;
  let finish = null;

  input.maxLength = NAME_LENGTH;

  const buttons = CHARACTERS.map((character) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character';
    button.setAttribute('role', 'radio');
    button.innerHTML = `${characterSvg(character.id)}<span></span>`;
    button.lastElementChild.textContent = character.name;
    button.addEventListener('click', () => choose(character.id));
    return button;
  });
  list.replaceChildren(...buttons);

  function choose(id) {
    chosen = id;
    buttons.forEach((button, i) => button.setAttribute('aria-checked', String(CHARACTERS[i].id === id)));
  }

  function close() {
    root.hidden = true;
    input.blur();
    finish?.({ character: chosen, name: cleanName(input.value) });
  }
  done.addEventListener('click', close);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') close();
  });

  return {
    open(current, onDone) {
      finish = onDone;
      choose(current.character || DEFAULT_CHARACTER);
      input.value = current.name || '';
      root.hidden = false;
    },
    get isOpen() {
      return !root.hidden;
    },
  };
}
