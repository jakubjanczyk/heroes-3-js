// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import {
  getDwellingEntity,
  getHeroEntity,
  getMineEntity,
  getTownEntity
} from './adventure-map.utils.js'
import { setupMovementBehaviorApp } from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { aDwelling, aHero, aMine, aScenario, aTown } from './builders.js'

const PLAYER_RED = 'rgb(255, 0, 0)'
const PLAYER_BLUE = 'rgb(49, 82, 255)'
const PLAYER_TAN = 'rgb(156, 115, 82)'

function flagOn(entityElement) {
  return within(entityElement).getByRole('img', { name: /player flag$/ })
}

function readFlag(entityElement) {
  const flag = flagOn(entityElement)
  return {
    name: flag.getAttribute('aria-label'),
    colour: window.getComputedStyle(flag).backgroundColor
  }
}

describe('other players behavior', () => {
  test("given a blue hero on the map then it carries a blue flag, and the player's hero a red one", async () => {
    await loadAppStyles()
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(6, 3)
        .withEntities(aHero().at(0, 0), aHero().withId('hero-2').ownedBy('blue').at(4, 2))
        .build()
    })

    expect(readFlag(getHeroEntity('hero-1'))).toEqual({
      name: 'Red player flag',
      colour: PLAYER_RED
    })
    expect(readFlag(getHeroEntity('hero-2'))).toEqual({
      name: 'Blue player flag',
      colour: PLAYER_BLUE
    })
  })

  test('given a blue town, a tan mine and a blue dwelling then each carries its owner’s flag', async () => {
    await loadAppStyles()
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(12, 4)
        .withEntities(
          aHero().at(0, 3),
          aTown().ownedBy('blue').at(2, 2),
          aMine().ownedBy('tan').at(6, 2),
          aDwelling().ownedBy('blue').at(10, 2)
        )
        .build()
    })

    expect(readFlag(getTownEntity())).toEqual({ name: 'Blue player flag', colour: PLAYER_BLUE })
    expect(readFlag(getMineEntity())).toEqual({ name: 'Tan player flag', colour: PLAYER_TAN })
    expect(readFlag(getDwellingEntity())).toEqual({
      name: 'Blue player flag',
      colour: PLAYER_BLUE
    })
  })
})
