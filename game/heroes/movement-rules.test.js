import { describe, expect, test } from 'vitest'

import { createMap } from '../../engine/map.js'
import { heroesMovementRules } from './movement-rules.js'
import { heroesRoadTypes } from './road-types.js'
import { heroesTerrainTypes } from './terrain-types.js'

const GRASS = 0
const SAND = 3
const SWAMP = 5
const ROUGH = 6
const WATER = 9
const DIRT_ROAD = 1
const COBBLESTONE_ROAD = 3

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

  // The wiki's flying movement points table: the lesser of the usual cost and 100 + the
  // penalty (40, 20 or 0), and 100 + the penalty off water; × √2 rounded down on a diagonal.
  describe('flying', () => {
    const FLIGHTS = { basic: { penalty: 40 }, advanced: { penalty: 20 }, expert: { penalty: 0 } }

    function flyingStepCost({ terrain, road = 0, flight, diagonal = false }) {
      const map = createMap(
        { width: 2, height: 2, tiles: new Array(4).fill(terrain), roads: new Array(4).fill(road) },
        heroesTerrainTypes,
        heroesRoadTypes
      )
      return heroesMovementRules.stepCost({
        map,
        from: { x: 0, y: 0 },
        to: diagonal ? { x: 1, y: 1 } : { x: 1, y: 0 },
        flight: FLIGHTS[flight],
        canLand: (tile) => map.isPassable(tile)
      })
    }

    test.each([
      ['water', WATER, 'basic', 140, 197],
      ['water', WATER, 'advanced', 120, 169],
      ['water', WATER, 'expert', 100, 141],
      ['swamp', SWAMP, 'basic', 140, 197],
      ['swamp', SWAMP, 'advanced', 120, 169],
      ['sand', SAND, 'basic', 140, 197],
      ['rough', ROUGH, 'basic', 125, 176],
      ['rough', ROUGH, 'expert', 100, 141],
      ['grass', GRASS, 'basic', 100, 141]
    ])('a %s step at %s costs %i straight and %i diagonal', (_name, terrain, flight, straight, diagonal) => {
      expect([
        flyingStepCost({ terrain, flight }),
        flyingStepCost({ terrain, flight, diagonal: true })
      ]).toEqual([straight, diagonal])
    })

    test.each([
      ['dirt', DIRT_ROAD, 75],
      ['cobblestone', COBBLESTONE_ROAD, 50]
    ])('a step along a %s road keeps its cost of %i', (_name, road, cost) => {
      expect(flyingStepCost({ terrain: SWAMP, road, flight: 'basic' })).toBe(cost)
    })

    test('a step off a tile the hero cannot land on costs 100 and the penalty', () => {
      const map = aRowMap([GRASS, GRASS])

      const cost = heroesMovementRules.stepCost({
        map,
        from: { x: 0, y: 0 },
        to: { x: 1, y: 0 },
        flight: FLIGHTS.basic,
        canLand: () => false
      })

      expect(cost).toBe(140)
    })

    // Off sand flying costs 140, so the 145 left after the first step still pays one; walking
    // it costs 150, and the first step would take all 285.
    test('keeps what is left when it pays the cheapest step flying', () => {
      const charges = heroesMovementRules.chargeSteps({
        map: aRowMap([SAND, SAND, SAND]),
        path: rowPath(3),
        remainingMovementPoints: 285,
        flight: FLIGHTS.basic,
        canLand: () => true
      })

      expect(charges).toEqual([140, 145])
    })
  })
})
