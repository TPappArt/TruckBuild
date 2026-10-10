// Gathers the files that make up the game, and nothing else, into dist/www.
// The Android app and the Windows app are both wrapped round that folder
// (see android/ and desktop/), and it is also all a web server needs.
//
//   npm run package
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}dist/www`;
const SHIPPED = ['index.html', 'manifest.webmanifest', 'styles', 'src', 'icons'];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const name of SHIPPED) await cp(`${root}${name}`, `${out}/${name}`, { recursive: true });

const { version } = JSON.parse(await readFile(`${root}package.json`, 'utf8'));
await writeFile(`${root}dist/version.txt`, `${version}\n`);
console.log(`dist/www is ready: version ${version}.`);
