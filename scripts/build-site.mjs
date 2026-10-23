// Copies the runtime files into a static site folder for GitHub Pages.
// Usage: node scripts/build-site.mjs <outDir> [--without-music]
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

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
]

const [outDir = '_site', ...flags] = process.argv.slice(2)
const withoutMusic = flags.includes('--without-music')

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

for (const path of RUNTIME_PATHS) {
  cpSync(path, join(outDir, path), {
    recursive: true,
    filter: (source) =>
      !source.endsWith('.test.js') && !(withoutMusic && source.startsWith(join('assets', 'music')))
  })
}

if (withoutMusic) {
  mkdirSync(join(outDir, 'assets', 'music'), { recursive: true })
  writeFileSync(join(outDir, 'assets', 'music', 'tracks.json'), '[]\n')
}

// The browser only finds a file's imports once it has downloaded that file, so a phone waits
// one round trip per level of the import tree. Listing every stylesheet and module up front
// lets them all download at once; the stylesheets go first so they are not queued behind the
// modules and hold back the first paint.
const STATIC_IMPORT = /(?:\bfrom\s*|\bimport\s*)['"](\.{1,2}\/[^'"]+)['"]/g
const CSS_IMPORT = /@import\s+url\(["']?([^"')]+)["']?\)/g

function collectImports(entry, importPattern, found = new Set()) {
  if (found.has(entry)) return found
  found.add(entry)
  for (const [, specifier] of readFileSync(entry, 'utf8').matchAll(importPattern)) {
    collectImports(join(dirname(entry), specifier), importPattern, found)
  }
  return found
}

function preloadLinks(entry, importPattern, toLink) {
  return [...collectImports(entry, importPattern)]
    .slice(1)
    .map((path) => `    ${toLink(`./${relative('.', path)}`)}`)
}

const preloads = [
  ...preloadLinks(
    'styles.css',
    CSS_IMPORT,
    (href) => `<link rel="preload" href="${href}" as="style" />`
  ),
  ...preloadLinks('main.js', STATIC_IMPORT, (href) => `<link rel="modulepreload" href="${href}" />`)
].join('\n')
const indexPath = join(outDir, 'index.html')
writeFileSync(
  indexPath,
  readFileSync(indexPath, 'utf8').replace('  </head>', `${preloads}\n  </head>`)
)

writeFileSync(join(outDir, '.nojekyll'), '')
