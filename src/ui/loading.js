// The loading screen: a turning wheel, a bar and something to read.
//
// Building a track blocks the page for a moment, so the bar cannot be
// driven frame by frame. Callers say how far along they are between jobs,
// and yield to the browser (see `paint`) so that it can show it.

const TIPS = [
  'Green rings help you. Red rings hurt.',
  'Hit a rival with your weapon to win coins.',
  'Win a track twice to open the next one.',
  'A coin bag turns up on the road now and then. Grab it!',
  'Pull the joystick back to brake.',
  'The snowflake freezes everyone but you.',
  'Every track has one dangerous place. Take care there.',
  'New parts cost coins. Win races to earn them.',
  'Boosts sit in a row across the road. Aim for a gap in the traffic.',
];

const $ = (id) => document.getElementById(id);

/** Lets the browser draw what has changed before carrying on. */
export const paint = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

export function createLoading() {
  const root = $('loading');
  const art = $('loading-art');
  const bar = $('loading-bar');
  const fill = $('loading-fill');
  let tip = Math.floor(Math.random() * TIPS.length);

  return {
    /** title: big line. text: small line under it. image: optional picture behind it all. */
    show({ title, text = '', image = null }) {
      $('loading-title').textContent = title;
      $('loading-text').textContent = text;
      $('loading-tip').textContent = TIPS[tip++ % TIPS.length];
      art.style.backgroundImage = image ? `url(${image})` : '';
      root.classList.toggle('with-art', Boolean(image));
      this.progress(0);
      root.hidden = false;
    },
    /** share: 0..1. */
    progress(share) {
      const percent = Math.round(Math.min(1, Math.max(0, share)) * 100);
      fill.style.width = `${percent}%`;
      bar.setAttribute('aria-valuenow', String(percent));
    },
    text(text) {
      $('loading-text').textContent = text;
    },
    hide() {
      root.hidden = true;
    },
  };
}
