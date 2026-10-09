// Fullscreen handling.
//
// Browsers only allow fullscreen from a user gesture, so the game asks for it
// on the first tap or click. iPhone Safari has no Fullscreen API for pages at
// all; there the only fullscreen route is installing to the home screen, which
// the web app manifest and the apple-* meta tags in index.html take care of.

const root = document.documentElement;

const request =
  root.requestFullscreen ||
  root.webkitRequestFullscreen ||
  null;

const exit =
  document.exitFullscreen ||
  document.webkitExitFullscreen ||
  null;

/** True when the page can be put into fullscreen by script. */
export const fullscreenSupported = Boolean(request);

/** True when the game was launched from the home screen or as an installed app. */
export function isInstalled() {
  return (
    window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

/** Must be called from inside a user gesture handler. Resolves to success. */
export async function enterFullscreen() {
  if (!request || isFullscreen()) return isFullscreen();
  try {
    await request.call(root, { navigationUI: 'hide' });
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen() {
  if (!exit || !isFullscreen()) return;
  try {
    await exit.call(document);
  } catch {
    // Nothing useful to do: the browser decides.
  }
}

export function toggleFullscreen() {
  return isFullscreen() ? exitFullscreen() : enterFullscreen();
}

/** Calls `listener(isFullscreen)` whenever fullscreen is entered or left. */
export function onFullscreenChange(listener) {
  const handler = () => listener(isFullscreen());
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
}
