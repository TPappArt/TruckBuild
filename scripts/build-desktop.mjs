// Builds the Windows version of the game: dist/TruckBuild.exe, one program
// with the whole game inside it (see desktop/launcher/main.go), and, where
// the NSIS installer maker is available, dist/TruckBuild-Setup.exe.
//
//   npm run build:windows
//
// Needs Go 1.21 or newer. Go builds Windows programs on any system, so this
// works on Linux and macOS too; only the setup program needs `makensis`
// (https://nsis.sourceforge.io), which is on Windows, and in most Linux
// package managers as "nsis".
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (command, args, options = {}) => execFileSync(command, args, { stdio: 'inherit', cwd: root, ...options });

run(process.execPath, ['scripts/package.mjs']);
const version = (await readFile(`${root}dist/version.txt`, 'utf8')).trim();

// The launcher carries the game inside it: Go embeds this folder.
await rm(`${root}desktop/launcher/www`, { recursive: true, force: true });
await cp(`${root}dist/www`, `${root}desktop/launcher/www`, { recursive: true });

run('go', ['build', '-trimpath', '-ldflags', '-H=windowsgui -s -w', '-o', `${root}dist/TruckBuild.exe`, '.'], {
  cwd: `${root}desktop/launcher`,
  env: { ...process.env, GOOS: 'windows', GOARCH: 'amd64', CGO_ENABLED: '0' },
});
console.log('Built dist/TruckBuild.exe');

const nsis = spawnSync('makensis', ['-VERSION'], { encoding: 'utf8' });
if (nsis.status === 0) {
  run('makensis', ['-V2', `-DVERSION=${version}`, 'desktop/installer.nsi']);
  console.log('Built dist/TruckBuild-Setup.exe');
} else {
  console.log('makensis was not found, so no setup program was made. dist/TruckBuild.exe runs as it is.');
}
