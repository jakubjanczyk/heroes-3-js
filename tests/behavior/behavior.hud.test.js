// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmMove,
  confirmTileClickByDispatch,
  expectHeroAt,
  expectNoPreview,
  getMapViewCentreTile,
  panCamera
} from './adventure-map.utils.js'
import {
  expectMovementPoints,
  getHeroInfoBox,
  getHeroInHeroList,
  getNextHeroButton,
  getResourceBarItems,
  getTownInTownList,
  openSystemOptions,
  querySystemOptions
} from './adventure-panels.utils.js'
import { flushMicrotasks, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'

const LARGE_VIEWPORT_SIZE = { width: 1000, height: 700 }

const HERO_NAME = 'Sir Christian'
const heroDefinitions = { hero: { name: HERO_NAME } }

const aLargeMapScenario = () => aScenario().withSize(60, 40).withEntities(aHero().at(20, 15))

describe('adventure HUD behavior', () => {
  describe('resource bar', () => {
    test('given a new game when the HUD loads then all seven resources show 0 in Heroes 3 order', async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withDefinitions({ resources: readGameData('resources.json') })
          .build()
      })

      expect(getResourceBarItems()).toEqual([
        'Wood 0',
        'Mercury 0',
        'Ore 0',
        'Sulfur 0',
        'Crystal 0',
        'Gems 0',
        'Gold 0'
      ])
    })
  })

  describe('hero list', () => {
    test('given a new game when the HUD loads then the hero is in the hero list with a full movement bar', async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario().withDefinitions(heroDefinitions).build()
      })

      expect(getHeroInHeroList(HERO_NAME)).toBeTruthy()
      expectMovementPoints(1500)
    })

    test('given the hero moves when movement points are spent then the movement bar goes down', async () => {
      const { user } = await setupMovementBehaviorApp()

      await confirmMove(user, 1, 0)

      expectMovementPoints(1400)
    })

    // A click on the hero already selected opens the hero screen instead, as in Heroes 3.
    test('given a town far from the hero is selected when the player clicks the hero in the hero list then the camera centres on the hero', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aLargeMapScenario()
          .withEntities(aHero().at(20, 15), aTown().named('Whitemoon').ownedByPlayer().at(45, 30))
          .withDefinitions({ ...heroDefinitions, towns: readGameData('towns.json') })
          .build(),
        viewportSize: LARGE_VIEWPORT_SIZE
      })
      await user.click(getTownInTownList('Whitemoon'))

      await user.click(getHeroInHeroList(HERO_NAME))

      expect(getMapViewCentreTile()).toEqual({ x: 20, y: 15 })
    })
  })

  describe('adventure buttons', () => {
    test('given the player panned away from the hero when they click Next hero then the camera centres on the hero', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aLargeMapScenario().build(),
        viewportSize: LARGE_VIEWPORT_SIZE
      })
      panCamera('ArrowDown', 20)

      await user.click(getNextHeroButton())

      expect(getMapViewCentreTile()).toEqual({ x: 20, y: 15 })
    })

    test('given the hero has spent all movement points when the move finishes then Next hero is disabled', async () => {
      await setupMovementBehaviorApp({ loadGameOptions: aScenario().withSize(20).build() })

      confirmTileClickByDispatch(15, 0)
      await flushMicrotasks()

      expectMovementPoints(0)
      expect(getNextHeroButton().disabled).toBe(true)
    })

    test.each([
      'Kingdom overview',
      'Underground',
      'Quest log',
      'Sleep hero',
      'Cast spell',
      'Adventure options'
    ])('given a feature that does not exist yet when the HUD loads then %s is shown disabled', async (name) => {
      await setupMovementBehaviorApp()

      expect(screen.getByRole('button', { name }).disabled).toBe(true)
    })
  })

  describe('system options', () => {
    test('given the adventure map when the player clicks System options then a popup with Music and Reset opens', async () => {
      const { user } = await setupMovementBehaviorApp()

      const systemOptions = await openSystemOptions(user)

      expect(within(systemOptions).getByRole('button', { name: 'Music: Off' })).toBeTruthy()
      expect(within(systemOptions).getByRole('button', { name: 'Reset' })).toBeTruthy()
    })

    test('given System options is open when the player clicks Return to game then it closes', async () => {
      const { user } = await setupMovementBehaviorApp()
      const systemOptions = await openSystemOptions(user)

      await user.click(within(systemOptions).getByRole('button', { name: 'Return to game' }))

      expect(querySystemOptions()).toBeNull()
    })

    test('given System options is open when the player presses Escape then it closes', async () => {
      const { user } = await setupMovementBehaviorApp()
      await openSystemOptions(user)

      await user.keyboard('{Escape}')

      expect(querySystemOptions()).toBeNull()
    })

    test('given System options is open when the player presses arrow keys then the map does not scroll', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aLargeMapScenario().build(),
        viewportSize: LARGE_VIEWPORT_SIZE
      })
      await openSystemOptions(user)

      panCamera('ArrowRight', 20)

      expect(getMapViewCentreTile()).toEqual({ x: 20, y: 15 })
    })

    test('given System options is open when the player clicks the map then the hero does not move', async () => {
      const { user } = await setupMovementBehaviorApp()
      await openSystemOptions(user)

      confirmTileClickByDispatch(2, 0)

      expectHeroAt(0, 0)
      expectNoPreview()
    })
  })

  describe('info box', () => {
    test('given a hero when the HUD loads then the info box shows the hero name', async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario().withDefinitions(heroDefinitions).build()
      })

      expect(within(getHeroInfoBox()).getByRole('heading', { name: HERO_NAME })).toBeTruthy()
    })
  })
})
