import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import { shouldPersistFactEvent } from '../../app/events.js'
import { gameStateSlices } from '../../app/game-state.js'
import { heroesAppContent } from '../../app/heroes/content.js'
import { combineSlices } from '../../game/state/combine-slices.js'

function appSourceFiles(dir = 'app') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return appSourceFiles(path)
    }
    return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [path] : []
  })
}

function filesMatching(pattern) {
  return appSourceFiles().filter((path) => pattern.test(readFileSync(path, 'utf8')))
}

describe('game state', () => {
  test('only saved facts change the state, so a reload builds the state the player had', () => {
    const { factTypes } = combineSlices(gameStateSlices(heroesAppContent))

    expect(factTypes.size).toBeGreaterThan(0)
    expect([...factTypes].filter((type) => !shouldPersistFactEvent(type))).toEqual([])
  })

  test('two slices cannot share a key', () => {
    const slice = { key: 'towns', initial: () => ({}), on: {} }

    expect(() => combineSlices([slice, slice])).toThrow('Two state slices have the key "towns"')
  })

  test('modules read the hero from the game state, not from the scenario', () => {
    expect(filesMatching(/\bfindHero\b/)).toEqual([])
  })

  test('only the replay emits saved facts without saving them, so live play and a reload agree', () => {
    expect(filesMatching(/log: false/)).toEqual(['app/restore-session.js'])
  })
})
