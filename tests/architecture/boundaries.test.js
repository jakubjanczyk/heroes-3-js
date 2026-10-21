import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const REPO_ROOT = process.cwd()

const IMPORT_SPECIFIER_PATTERN =
  /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g

function walkJsFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkJsFiles(fullPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(relative(REPO_ROOT, fullPath))
    }
  }

  return files
}

// Relative imports as repo-relative paths; package imports are left out.
function importsOf(filePath) {
  const source = readFileSync(join(REPO_ROOT, filePath), 'utf8')
  return [...source.matchAll(IMPORT_SPECIFIER_PATTERN)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => relative(REPO_ROOT, resolve(REPO_ROOT, dirname(filePath), specifier)))
}

function findViolations(files, isForbidden) {
  return files.flatMap((filePath) =>
    importsOf(filePath)
      .filter(isForbidden)
      .map((imported) => `${filePath} -> ${imported}`)
  )
}

const isUnder = (filePath, ...dirs) => dirs.some((dir) => filePath.startsWith(`${dir}/`))
const isTest = (filePath) => filePath.endsWith('.test.js')
const isHeroesContent = (filePath) => isUnder(filePath, 'app/heroes', 'game/heroes')

describe('architecture boundaries', () => {
  test('import parsing finds relative imports, so the rules below cannot pass vacuously', () => {
    expect(importsOf('app/heroes/content.js')).toContain('app/heroes/modules/battle.module.js')
    expect(importsOf('app/heroes/modules/battle.module.js')).toContain('app/events.js')
  })

  test('engine layer never imports game or app modules', () => {
    const violations = findViolations(walkJsFiles('engine'), (imported) =>
      isUnder(imported, 'app', 'game')
    )

    expect(violations, 'engine files must stay infra-only').toEqual([])
  })

  test('game layer never imports app modules', () => {
    const violations = findViolations(walkJsFiles('game'), (imported) => isUnder(imported, 'app'))

    expect(violations, 'game files must not depend on app layer').toEqual([])
  })

  test('app runtime modules do not import each other directly', () => {
    const moduleFiles = [
      ...walkJsFiles('app/modules'),
      ...walkJsFiles('app/heroes/modules')
    ].filter((filePath) => !isTest(filePath) && filePath !== 'app/modules/register-modules.js')

    const violations = findViolations(moduleFiles, (imported) => imported.endsWith('.module.js'))

    expect(violations, 'runtime modules should communicate over bus events only').toEqual([])
  })

  test('core game code never imports heroes content', () => {
    const coreGameFiles = walkJsFiles('game').filter((filePath) => !isHeroesContent(filePath))

    expect(
      findViolations(coreGameFiles, isHeroesContent),
      'heroes content is chosen at boot and passed in, so a different game can reuse the core'
    ).toEqual([])
  })

  test('core app code never imports heroes content; only boot picks it', () => {
    const coreAppFiles = walkJsFiles('app').filter(
      (filePath) => !isHeroesContent(filePath) && filePath !== 'app/boot-app.js'
    )

    expect(
      findViolations(coreAppFiles, isHeroesContent),
      'core app modules get heroes content through config.content'
    ).toEqual([])
  })

  test('only the world module builds the static world', () => {
    const moduleFiles = walkJsFiles('app/modules').filter(
      (filePath) => !isTest(filePath) && filePath !== 'app/modules/world.module.js'
    )

    expect(
      findViolations(moduleFiles, (imported) => imported === 'game/build-world.js'),
      'modules read the frozen world-ready snapshot and track changes from facts'
    ).toEqual([])
  })
})
