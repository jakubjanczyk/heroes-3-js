// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmMove,
  confirmTileClickByDispatch,
  expectHeroAt,
  expectMovementPoints,
  expectNoPreview,
  flushMicrotasks,
  getMapViewCentreTile,
  getResourceBarItems,
  openSystemOptions,
  panCamera,
  readGameData,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aScenario } from './builders.js'

const LARGE_VIEWPORT_SIZE = { width: 1000, height: 700 }

const aLargeMapScenario = () => aScenario().withSize(60, 40).withEntities(aHero().at(20, 15))

function getSystemOptionsDialog() {
  return screen.queryByRole('dialog', { name: 'System options' })
}

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
        loadGameOptions: aScenario()
          .withDefinitions({ hero: { name: 'Sir Christian' } })
          .build()
      })

      const heroList = screen.getByRole('list', { name: 'Heroes' })
      expect(within(heroList).getByRole('button', { name: 'Sir Christian' })).toBeTruthy()
      expectMovementPoints(1500)
    })

    test('given the hero moves when movement points are spent then the movement bar goes down', async () => {
      const { user } = await setupMovementBehaviorApp()

      await confirmMove(user, 1, 0)
      await flushMicrotasks()

      expectMovementPoints(1400)
    })

    test('given the player panned away from the hero when they click the hero in the hero list then the camera centres on the hero', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aLargeMapScenario()
          .withDefinitions({ hero: { name: 'Sir Christian' } })
          .build(),
        viewportSize: LARGE_VIEWPORT_SIZE
      })
      panCamera('ArrowRight', 20)

      const heroList = screen.getByRole('list', { name: 'Heroes' })
      await user.click(within(heroList).getByRole('button', { name: 'Sir Christian' }))

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

      await user.click(screen.getByRole('button', { name: 'Next hero' }))

      expect(getMapViewCentreTile()).toEqual({ x: 20, y: 15 })
    })

    test('given the hero has spent all movement points when the move finishes then Next hero is disabled', async () => {
      await setupMovementBehaviorApp({ loadGameOptions: aScenario().withSize(20).build() })

      confirmTileClickByDispatch(15, 0)
      await flushMicrotasks()

      expectMovementPoints(0)
      expect(screen.getByRole('button', { name: 'Next hero' }).disabled).toBe(true)
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

      await user.click(screen.getByRole('button', { name: 'System options' }))

      const dialog = getSystemOptionsDialog()
      expect(dialog).toBeTruthy()
      expect(within(dialog).getByRole('button', { name: 'Music: Off' })).toBeTruthy()
      expect(within(dialog).getByRole('button', { name: 'Reset' })).toBeTruthy()
    })

    test('given System options is open when the player clicks Return to game then it closes', async () => {
      const { user } = await setupMovementBehaviorApp()
      await openSystemOptions(user)

      await user.click(screen.getByRole('button', { name: 'Return to game' }))

      expect(getSystemOptionsDialog()).toBeNull()
    })

    test('given System options is open when the player presses Escape then it closes', async () => {
      const { user } = await setupMovementBehaviorApp()
      await openSystemOptions(user)

      await user.keyboard('{Escape}')

      expect(getSystemOptionsDialog()).toBeNull()
    })

    test('given System options is open when the player clicks the map then the hero does not move', async () => {
      const { user } = await setupMovementBehaviorApp()
      await openSystemOptions(user)

      confirmTileClickByDispatch(2, 0)
      await flushMicrotasks()

      expectHeroAt(0, 0)
      expectNoPreview()
    })
  })

  describe('info box', () => {
    test('given a hero when the HUD loads then the info box shows the hero name', async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withDefinitions({ hero: { name: 'Sir Christian' } })
          .build()
      })

      const infoBox = screen.getByRole('region', { name: 'Hero info' })
      expect(within(infoBox).getByRole('heading', { name: 'Sir Christian' })).toBeTruthy()
    })
  })
})
