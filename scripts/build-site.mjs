// Builds the static site for GitHub Pages: the JS and CSS are bundled and minified so a phone
// downloads two files instead of every module and stylesheet one after another.
// Usage: node scripts/build-site.mjs <outDir> [--without-music]
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'

const COPIED_PATHS = ['index.html', 'scenarios', 'game/data', 'assets']

const [outDir = '_site', ...flags] = process.argv.slice(2)
const withoutMusic = flags.includes('--without-music')

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

for (const path of COPIED_PATHS) {
  cpSync(path, join(outDir, path), {
    recursive: true,
    filter: (source) =>
      !source.endsWith('.test.js') && !(withoutMusic && source.startsWith(join('assets', 'music')))
  })
}

await build({
  entryPoints: ['main.js', 'styles.css'],
  outdir: outDir,
  outbase: '.',
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'es2022',
  // The cursors keep their paths, so the stylesheet points at the copies already in assets/.
  loader: { '.png': 'file' },
  assetNames: '[dir]/[name]',
  logLevel: 'warning'
})

if (withoutMusic) {
  mkdirSync(join(outDir, 'assets', 'music'), { recursive: true })
  writeFileSync(join(outDir, 'assets', 'music', 'tracks.json'), '[]\n')
}

writeFileSync(join(outDir, '.nojekyll'), '')
