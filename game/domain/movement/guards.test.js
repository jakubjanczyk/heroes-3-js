import { describe, expect, test } from 'vitest'

import { createMap } from '../../../engine/map.js'
import { indexGuardedTiles } from './guards.js'

const GRASS = 0
const WATER = 1
const TERRAIN_TYPES = {
  [GRASS]: { name: 'grass', passable: true },
  [WATER]: { name: 'water', passable: false, isWater: true }
}

// Row 0 is grass, row 1 water. Nothing can stand on water yet, so a player can't see this rule.
function aShoreMap() {
  return createMap(
    { width: 3, height: 2, tiles: [GRASS, GRASS, GRASS, WATER, WATER, WATER] },
    TERRAIN_TYPES
  )
}

describe('guarded tiles', () => {
  test('a monster on land does not guard the water next to it', () => {
    const guards = indexGuardedTiles([{ id: 'monster-1', tile: { x: 1, y: 0 } }], aShoreMap())

    expect(guards.getGuardsAt({ x: 1, y: 1 })).toEqual([])
  })

  test('a monster on water does not guard the shore next to it', () => {
    const guards = indexGuardedTiles([{ id: 'monster-1', tile: { x: 1, y: 1 } }], aShoreMap())

    expect(guards.getGuardsAt({ x: 1, y: 0 })).toEqual([])
  })
})
