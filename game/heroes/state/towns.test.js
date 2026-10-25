import { describe, expect, test } from 'vitest'

import { townIdsOf, townOwner, townsSlice } from './towns.js'

const scenario = {
  entities: [
    { id: 'castle', kind: 'TOWN', owner: 'red' },
    { id: 'tower', kind: 'TOWN' }
  ]
}

describe('towns state', () => {
  test('a capture saved before captures named their owner was the red player', () => {
    const towns = townsSlice.on['fact.town.captured'](townsSlice.initial({ scenario }), {
      entityId: 'tower'
    })
    const state = { towns }

    expect(townOwner(state, 'tower')).toBe('red')
    expect(townIdsOf(state, 'red')).toEqual(['castle', 'tower'])
  })
})
