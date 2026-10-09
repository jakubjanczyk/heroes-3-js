// Copies the runtime files into a static site folder for GitHub Pages.
// Usage: node scripts/build-site.mjs <outDir> [--without-music]
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RUNTIME_PATHS = [
  'index.html',
  'main.js',
  'styles.css',
  'styles',
  'app',
  'engine',
  'game',
  'scenarios',
  'assets'
];

const [outDir = '_site', ...flags] = process.argv.slice(2);
const withoutMusic = flags.includes('--without-music');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const path of RUNTIME_PATHS) {
  cpSync(path, join(outDir, path), {
    recursive: true,
    filter: (source) =>
      !source.endsWith('.test.js') && !(withoutMusic && source.startsWith(join('assets', 'music')))
  });
}

if (withoutMusic) {
  mkdirSync(join(outDir, 'assets', 'music'), { recursive: true });
  writeFileSync(join(outDir, 'assets', 'music', 'tracks.json'), '[]\n');
}

writeFileSync(join(outDir, '.nojekyll'), '');
