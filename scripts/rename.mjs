// Renames the game everywhere its name is written down.
//
//   npm run rename -- "New Game Name"
//
// src/config.js is the source of truth at runtime, but the page title, the
// web app manifest, package.json and the README are static files that cannot
// read it, so this script keeps them in step, along with what the Android
// and Windows apps are called. The repository folder, any git remote and the
// Android app's id (io.github...truckbuild, which must never change once the
// app is on people's phones) are left alone.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const newName = process.argv.slice(2).join(' ').trim();

if (!newName) {
  console.error('Usage: npm run rename -- "New Game Name"');
  process.exit(1);
}
if (/['"\\<>&]/.test(newName)) {
  console.error('The name cannot contain quotes, backslashes, <, > or &.');
  process.exit(1);
}

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const configUrl = new URL('src/config.js', root);
const config = await readFile(configUrl, 'utf8');
const match = config.match(/name:\s*'([^']*)'/);
if (!match) {
  console.error("Could not find `name: '...'` in src/config.js.");
  process.exit(1);
}
const oldName = match[1];

if (oldName === newName) {
  console.log(`The game is already called "${newName}".`);
  process.exit(0);
}

// The name with its spaces taken out, which is what the installers' files
// are called: "Fizzbang Rally" is built as FizzbangRally.apk.
const fileForm = (name) => name.replace(/\s+/g, '');

// [file, text to find, replacement]. Where a file holds both forms of the
// name, the one without spaces is listed (and so replaced) first.
const edits = [
  ['src/config.js', oldName, newName],
  ['index.html', oldName, newName],
  ['manifest.webmanifest', oldName, newName],
  ['README.md', oldName, newName],
  ['package.json', `"name": "${slug(oldName)}"`, `"name": "${slug(newName)}"`],
  // The installers: what the files are called, then what the apps are called.
  ...['android/build.sh', 'android/smoke-test.sh', 'desktop/installer.nsi', 'desktop/smoke-test.ps1', 'scripts/build-desktop.mjs', '.github/workflows/installers.yml', 'README.md']
    .filter(() => fileForm(oldName) !== oldName || fileForm(newName) !== newName)
    .flatMap((file) => [`${fileForm(oldName)}.apk`, `${fileForm(oldName)}-Setup.exe`, `${fileForm(oldName)}.exe`].map((find) => [file, find, find.replace(fileForm(oldName), fileForm(newName)), true])),
  ['android/res/values/strings.xml', oldName, newName],
  ['android/build.sh', oldName, newName, true],
  ['android/smoke-test.sh', oldName, newName, true],
  ['desktop/installer.nsi', oldName, newName],
  ['desktop/launcher/main.go', oldName, newName, true],
  ['desktop/smoke-test.ps1', oldName, newName],
  ['scripts/build-desktop.mjs', oldName, newName, true],
  ['.github/workflows/installers.yml', oldName, newName],
];

// A few lines say outright which form they hold, and are set rather than
// searched for: with a one-word name the two forms look the same.
const lines = [
  ['desktop/installer.nsi', /^!define NAME ".*"$/m, `!define NAME "${newName}"`],
  ['desktop/installer.nsi', /^!define FILE ".*"$/m, `!define FILE "${fileForm(newName)}"`],
  ['desktop/smoke-test.ps1', /^\$name = '.*'$/m, `$name = '${newName}'`],
  ['desktop/smoke-test.ps1', /^\$file = '[^']*'/m, `$file = '${fileForm(newName)}'`],
  // On a home screen there is room for about a dozen letters.
  ['manifest.webmanifest', /"short_name": ".*"/, `"short_name": "${newName.length > 12 ? newName.split(' ')[0] : newName}"`],
];

// (The fourth item: true where finding nothing is to be expected and not worth a warning.)
for (const [file, find, replacement, quiet] of edits) {
  const url = new URL(file, root);
  const before = await readFile(url, 'utf8');
  const after = before.split(find).join(replacement);
  if (after === before) {
    if (!quiet) console.warn(`  unchanged  ${file} (no "${find}" found)`);
    continue;
  }
  await writeFile(url, after);
  console.log(`  updated    ${file}`);
}

for (const [file, pattern, line] of lines) {
  const url = new URL(file, root);
  const before = await readFile(url, 'utf8');
  // (A function, so that a "$" in the line is not taken as a reference.)
  const after = before.replace(pattern, () => line);
  if (after !== before) await writeFile(url, after);
}

console.log(`\nRenamed "${oldName}" to "${newName}" in ${fileURLToPath(root)}`);
