import { describe, expect, test } from 'vitest'

import { createMap } from '../../engine/map.js'
import { heroesMovementRules } from './movement-rules.js'
import { heroesTerrainTypes } from './terrain-types.js'

const GRASS = 0
const SWAMP = 5

function aRowMap(tiles) {
  return createMap({ width: tiles.length, height: 1, tiles }, heroesTerrainTypes)
}

function aGrassMap(width, height) {
  return createMap(
    { width, height, tiles: new Array(width * height).fill(GRASS) },
    heroesTerrainTypes
  )
}

function rowPath(length) {
  return Array.from({ length }, (_, x) => ({ x, y: 0 }))
}

describe('heroes movement rules', () => {
  test('charges every step its cost when no points limit applies yet', () => {
    const charges = heroesMovementRules.chargeSteps({
      map: aRowMap([SWAMP, GRASS, GRASS]),
      path: rowPath(3),
      remainingMovementPoints: Number.POSITIVE_INFINITY
    })

    expect(charges).toEqual([175, 100])
  })

  test('allows no step with no points left', () => {
    const charges = heroesMovementRules.chargeSteps({
      map: aRowMap([GRASS, GRASS]),
      path: rowPath(2),
      remainingMovementPoints: 0
    })

    expect(charges).toEqual([])
  })

  test('refuses a diagonal step when not even a straight step would fit', () => {
    const charges = heroesMovementRules.chargeSteps({
      map: aGrassMap(2, 2),
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ],
      remainingMovementPoints: 99
    })

    expect(charges).toEqual([])
  })

  test('takes the last points on a step when what is left would not pay the next straight step', () => {
    const charges = heroesMovementRules.chargeSteps({
      map: aRowMap([GRASS, SWAMP, SWAMP]),
      path: rowPath(3),
      remainingMovementPoints: 250
    })

    expect(charges).toEqual([250])
  })
})
