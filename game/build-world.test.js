import { describe, expect, test } from 'vitest'

import { buildWorld } from './build-world.js'

const TERRAIN_TYPES = {
  0: { name: 'grass', passable: true },
  1: { name: 'rock', passable: false },
  9: { name: 'water', passable: false }
}

describe('buildWorld', () => {
  test.each([
    { terrain: 'water', code: 9 },
    { terrain: 'rock', code: 1 }
  ])('buildWorld rejects scenarios where a footprint covers $terrain', ({ code }) => {
    const scenario = {
      terrain: { width: 3, height: 1, tiles: [0, 0, code] },
      entities: [{ id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } }]
    }
    const entityBehaviors = { getFootprintOffsets: () => [{ x: 1, y: 0 }] }

    expect(() => buildWorld({ scenario, entityBehaviors, terrainTypes: TERRAIN_TYPES })).toThrow(
      'Footprint of town-1 (TOWN) must be on passable terrain: (2, 0)'
    )
  })
})
