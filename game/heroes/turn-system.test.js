import { describe, expect, test } from 'vitest'

import { combineSlices } from '../state/combine-slices.js'
import { CORE_SLICES } from '../state/core-slices.js'
import { activePlayer, isDayOver, turnNumber } from '../state/queries.js'
import { kingdomsSlice, resourcesOf } from './state/kingdoms.js'
import { decideNewDay } from './turn-system.js'

const aHero = (id, owner) => ({ id, kind: 'HERO', owner, tile: { x: 0, y: 0 } })

function worldWithHeroesOf(...owners) {
  return {
    scenario: { entities: owners.map((owner) => aHero(`${owner}-hero`, owner)) },
    config: { maxMovementPoints: 1500 },
    definitions: {}
  }
}

function startGame(world) {
  const { initialGameState, applyFact } = combineSlices(CORE_SLICES)
  let state = initialGameState(world)
  return {
    apply(type, detail) {
      state = applyFact(state, { type, detail }, world)
      return state
    },
    get state() {
      return state
    }
  }
}

describe('taking turns', () => {
  test('when red ends their turn it is blue’s turn, on the same day', () => {
    const game = startGame(worldWithHeroesOf('red', 'blue', 'tan'))

    game.apply('fact.player.turn.ended', { player: 'red' })

    expect(activePlayer(game.state)).toBe('blue')
    expect(isDayOver(game.state)).toBe(false)
    expect(turnNumber(game.state)).toBe(1)
  })

  test('the turn skips the colours no player has', () => {
    const game = startGame(worldWithHeroesOf('red', 'tan'))

    game.apply('fact.player.turn.ended', { player: 'red' })

    expect(activePlayer(game.state)).toBe('tan')
  })

  test('when the last player ends their turn the day is over, and the new day is red’s', () => {
    const game = startGame(worldWithHeroesOf('red', 'blue', 'tan'))

    game.apply('fact.player.turn.ended', { player: 'red' })
    game.apply('fact.player.turn.ended', { player: 'blue' })
    game.apply('fact.player.turn.ended', { player: 'tan' })

    expect(isDayOver(game.state)).toBe(true)

    game.apply('fact.turn.ended', { turnNumber: 2 })

    expect(isDayOver(game.state)).toBe(false)
    expect(activePlayer(game.state)).toBe('red')
    expect(turnNumber(game.state)).toBe(2)
  })

  test('a new day saved before players took turns is red’s', () => {
    const game = startGame(worldWithHeroesOf('red', 'blue'))

    game.apply('fact.turn.ended', { turnNumber: 2 })

    expect(activePlayer(game.state)).toBe('red')
  })
})

describe('the new day', () => {
  test('every player’s heroes get their movement points back', () => {
    const game = startGame(worldWithHeroesOf('red', 'blue'))
    game.apply('fact.hero.movementPoints.changed', { heroId: 'red-hero', value: 300, max: 1500 })
    game.apply('fact.hero.movementPoints.changed', { heroId: 'blue-hero', value: 200, max: 1500 })

    const newDay = decideNewDay(game.state, {})

    expect(newDay.turnNumber).toBe(2)
    expect(newDay.movementPoints).toEqual([
      { heroId: 'red-hero', value: 1500, max: 1500 },
      { heroId: 'blue-hero', value: 1500, max: 1500 }
    ])
  })
})

describe('starting resources', () => {
  test('a computer player starts with the computer’s Normal amounts, the human with the scenario’s', () => {
    const scenario = {
      startingResources: { GOLD_PILE: 1000 },
      entities: [aHero('red-hero', 'red'), aHero('blue-hero', 'blue')]
    }

    const state = { kingdoms: kingdomsSlice.initial({ scenario }) }

    expect(resourcesOf(state, 'red')).toEqual({ GOLD_PILE: 1000 })
    expect(resourcesOf(state, 'blue')).toEqual({
      WOOD_PILE: 10,
      MERCURY_PILE: 4,
      ORE_PILE: 10,
      SULFUR_PILE: 4,
      CRYSTAL_PILE: 4,
      GEMS_PILE: 4,
      GOLD_PILE: 7500
    })
  })
})
