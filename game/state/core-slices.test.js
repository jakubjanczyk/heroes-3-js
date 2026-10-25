import { describe, expect, test } from 'vitest'

import { combineSlices } from './combine-slices.js'
import { CORE_SLICES } from './core-slices.js'
import { heroMovementPoints } from './queries.js'

const world = {
  scenario: { entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }] },
  config: { maxMovementPoints: 1500 }
}

describe('core game state', () => {
  test('movement points saved before they named their hero were the only hero’s', () => {
    const { initialGameState, applyFact } = combineSlices(CORE_SLICES)

    const state = applyFact(
      initialGameState(world),
      { type: 'fact.hero.movementPoints.changed', detail: { value: 900, max: 1500 } },
      world
    )

    expect(heroMovementPoints(state, 'hero-1')).toEqual({ value: 900, max: 1500 })
  })
})
