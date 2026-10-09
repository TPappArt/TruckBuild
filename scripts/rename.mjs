// Renames the game everywhere its name is written down.
//
//   npm run rename -- "New Game Name"
//
// src/config.js is the source of truth at runtime, but the page title, the
// web app manifest, package.json and the README are static files that cannot
// read it, so this script keeps them in step. The repository folder and any
// git remote are left alone.
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

// [file, text to find, replacement]
const edits = [
  ['src/config.js', oldName, newName],
  ['index.html', oldName, newName],
  ['manifest.webmanifest', oldName, newName],
  ['README.md', oldName, newName],
  ['package.json', `"name": "${slug(oldName)}"`, `"name": "${slug(newName)}"`],
];

for (const [file, find, replacement] of edits) {
  const url = new URL(file, root);
  const before = await readFile(url, 'utf8');
  const after = before.split(find).join(replacement);
  if (after === before) {
    console.warn(`  unchanged  ${file} (no "${find}" found)`);
    continue;
  }
  await writeFile(url, after);
  console.log(`  updated    ${file}`);
}

console.log(`\nRenamed "${oldName}" to "${newName}" in ${fileURLToPath(root)}`);
