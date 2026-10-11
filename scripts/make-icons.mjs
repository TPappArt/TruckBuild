// Writes the app icon out as SVG files, from the drawing in src/ui/logo.js:
//
//   icons/icon.svg            the icon, with rounded corners and a gold edge
//   icons/icon-maskable.svg   the same picture filling the square, smaller in
//                             the middle, for systems that crop icons to
//                             their own shape (Android)
//
//   npm run icons
//
// The PNG and ICO files beside them (and under android/res and desktop/)
// are these two drawn at fixed sizes. Nothing in the project can draw an SVG
// to pixels, so that step is done with whatever is to hand: open the SVG in
// a browser or an image editor and export it. The README lists the sizes.
import { writeFileSync } from 'node:fs';
import { iconSvg } from '../src/ui/logo.js';

const root = new URL('..', import.meta.url);
const write = (path, text) => {
  writeFileSync(new URL(path, root), `${text}\n`);
  console.log(`wrote ${path}`);
};

write('icons/icon.svg', iconSvg());
write('icons/icon-maskable.svg', iconSvg({ bleed: true }));
