// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  attackMonsterAt,
  confirmTileClickByDispatch,
  expectHeroAt,
  expectNoPreview,
  expectPreviewTargetAt,
  holdRightButtonOn,
  pointerOverTile
} from './adventure-map.utils.js'
import { readArmySlots } from './adventure-panels.utils.js'
import { flushMicrotasks, readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { winBattle } from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aDwelling,
  aHero,
  aMine,
  aMonster,
  aResource,
  aResourceGenerator,
  aScenario,
  aTown
} from './builders.js'
import { SWAMP } from './terrain-codes.js'

const LONG_PRESS_MS = 20

const gameDefinitions = {
  hero: readGameData('hero.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  mines: readGameData('mines.json'),
  dwellings: readGameData('dwellings.json'),
  resourceGenerators: readGameData('resource-generators.json')
}

async function setupApp(scenario) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    appConfig: { fadeOutMsByKind: { MONSTER: 0 }, longPressMs: LONG_PRESS_MS }
  })
}

async function releaseRightButton(user) {
  await user.pointer({ keys: '[/MouseRight]' })
}

async function pressFingerOn(user, x, y) {
  await user.pointer({ keys: '[TouchA>]', ...pointerOverTile(x, y) })
}

async function longPressOn(user, x, y) {
  await pressFingerOn(user, x, y)
  await waitMs(LONG_PRESS_MS + 10)
}

async function slideFingerTo(user, x, y) {
  await user.pointer({ pointerName: 'TouchA', ...pointerOverTile(x, y) })
}

async function liftFinger(user) {
  await user.pointer({ keys: '[/TouchA]' })
}

async function tapOn(user, x, y) {
  await user.pointer({ keys: '[TouchA]', ...pointerOverTile(x, y) })
}

function queryInfoPopup() {
  return screen.queryByRole('tooltip')
}

function expectInfoPopupLines(lines) {
  const popup = queryInfoPopup()
  expect(popup).not.toBeNull()
  expect([...popup.querySelectorAll('p')].map((line) => line.textContent)).toEqual(lines)
}

function expectInfoPopupPicture(name) {
  expect(within(queryInfoPopup()).getByRole('img', { name })).toBeTruthy()
}

async function defeatMonsterAt(user, x, y) {
  await attackMonsterAt(x, y)
  await winBattle(user)
  await waitMs()
}

describe('info popup behavior', () => {
  describe('holding the right mouse button', () => {
    test('given a pack of monsters when the player holds the right button on it then a popup shows their picture, size and plural name', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(3)
          .withEntities(aHero(), aMonster().withType('SKELETON').withCount(12).at(2, 0))
      )

      await holdRightButtonOn(user, 2, 0)

      expectInfoPopupLines(['Pack of Skeletons'])
      expectInfoPopupPicture('Skeletons')
    })

    test('given a resource when the player holds the right button on it then the popup shows only its name', async () => {
      const { user } = await setupApp(
        aScenario().withSize(3).withEntities(aHero(), aResource().withType('GOLD_PILE').at(2, 0))
      )

      await holdRightButtonOn(user, 2, 0)

      expectInfoPopupLines(['Gold'])
    })

    test('given a mine nobody owns when the player holds the right button on it then the popup shows only its name', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(5, 3)
          .withEntities(aHero().at(0, 2), aMine().withType('GOLD_MINE').at(2, 1))
      )

      await holdRightButtonOn(user, 2, 1)

      expectInfoPopupLines(['Gold Mine'])
    })

    test('given a mine the hero captured when the player holds the right button on it then the popup shows its name and the player colour', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(5, 3)
          .withEntities(aHero().at(2, 2), aMine().withType('GOLD_MINE').at(2, 1))
      )
      confirmTileClickByDispatch(2, 1)
      await flushMicrotasks()

      await holdRightButtonOn(user, 1, 1)

      expectInfoPopupLines(['Gold Mine', '(Red)'])
    })

    test('given a dwelling nobody owns when the player holds the right button on it then the popup shows only its name', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(5, 3)
          .withEntities(aHero().at(0, 2), aDwelling().withType('PORTAL_OF_GLORY').at(2, 1))
      )

      await holdRightButtonOn(user, 2, 1)

      expectInfoPopupLines(['Portal of Glory'])
    })

    test('given a mystical garden when the player holds the right button on it then the popup shows its name', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(5, 3)
          .withEntities(aHero().at(0, 2), aResourceGenerator().withType('MYSTICAL_GARDEN').at(2, 1))
      )

      await holdRightButtonOn(user, 2, 1)

      expectInfoPopupLines(['Mystical Garden'])
    })

    test('given a dwelling the hero flagged when the player holds the right button on it then the popup shows its name and the player colour', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(5, 3)
          .withEntities(aHero().at(2, 2), aDwelling().withType('GRIFFIN_TOWER').at(2, 1))
      )
      confirmTileClickByDispatch(2, 1)
      await flushMicrotasks()

      await holdRightButtonOn(user, 1, 1)

      expectInfoPopupLines(['Griffin Tower', '(Red)'])
    })

    test.each([
      { object: 'mine', part: 'entry tile', x: 2, y: 2, name: 'Gold Mine' },
      { object: 'mine', part: 'building', x: 1, y: 2, name: 'Gold Mine' },
      { object: 'town', part: 'entry tile', x: 2, y: 2, name: 'Castle' },
      { object: 'town', part: 'building', x: 0, y: 1, name: 'Castle' }
    ])('given a $object when the player holds the right button on its $part then the popup names it', async ({
      object,
      x,
      y,
      name
    }) => {
      const entity =
        object === 'mine'
          ? aMine().withType('GOLD_MINE').at(2, 2)
          : aTown().withType('CASTLE').at(2, 2)
      const { user } = await setupApp(
        aScenario().withSize(5, 4).withEntities(aHero().at(0, 3), entity)
      )

      await holdRightButtonOn(user, x, y)

      expectInfoPopupLines([name])
    })

    test('given a town when the player holds the right button on it then the popup shows its name', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(5, 4)
          .withEntities(aHero().at(0, 3), aTown().withType('CASTLE').at(2, 2))
      )

      await holdRightButtonOn(user, 2, 2)

      expectInfoPopupLines(['Castle'])
    })

    test("given the player's own town when the player holds the right button on it then the popup shows its name and garrison", async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(5, 4)
          .withEntities(
            aHero().at(0, 3),
            aTown()
              .named('Whitemoon')
              .ownedByPlayer()
              .withGarrison([null, { creature: 'SWORDSMAN', count: 5 }])
              .at(2, 2)
          )
      )

      await holdRightButtonOn(user, 2, 2)

      const popup = queryInfoPopup()
      expect(within(popup).getByRole('heading').textContent).toBe('Whitemoon')
      expect(readArmySlots(popup, 'Garrison')).toEqual(['', 'Swordsmen 5', '', '', '', '', ''])
    })

    test('given an empty tile when the player holds the right button on it then the popup shows the terrain name', async () => {
      const { user } = await setupApp(aScenario().withSize(3).withTiles([0, 0, SWAMP]))

      await holdRightButtonOn(user, 2, 0)

      expectInfoPopupLines(['Swamp'])
    })

    test('given a defeated monster when the player holds the right button on its tile then the popup shows the terrain name', async () => {
      const { user } = await setupApp(
        aScenario().withSize(3).withEntities(aHero().withArmy(ARMY_THAT_WINS), aMonster().at(1, 0))
      )
      await defeatMonsterAt(user, 1, 0)

      await holdRightButtonOn(user, 1, 0)

      expectInfoPopupLines(['Grass'])
    })

    test('given a popup is open when the player releases the right button then it closes', async () => {
      const { user } = await setupApp(
        aScenario().withSize(3).withEntities(aHero(), aMonster().at(2, 0))
      )
      await holdRightButtonOn(user, 2, 0)

      await releaseRightButton(user)

      expect(queryInfoPopup()).toBeNull()
    })

    test("given the player right-clicks the map then the browser's context menu does not open", async () => {
      await setupApp(aScenario().withSize(3))
      const { target } = pointerOverTile(1, 0)

      const contextMenuAllowed = target.dispatchEvent(
        new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
      )

      expect(contextMenuAllowed).toBe(false)
    })

    test('given the player right-clicks a tile then no path preview appears and the hero does not move', async () => {
      const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(0, 0)))

      await holdRightButtonOn(user, 2, 0)
      await releaseRightButton(user)
      await holdRightButtonOn(user, 2, 0)
      await releaseRightButton(user)

      expectNoPreview()
      expectHeroAt(0, 0)
    })
  })

  describe('long press on a touch screen', () => {
    test('given a pack of monsters when the player presses and holds a finger on it then a popup shows their picture, size and plural name', async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(3)
          .withEntities(aHero(), aMonster().withType('SKELETON').withCount(12).at(2, 0))
      )

      await longPressOn(user, 2, 0)

      expectInfoPopupLines(['Pack of Skeletons'])
      expectInfoPopupPicture('Skeletons')
    })

    test('given a popup opened by a long press when the player lifts the finger then it closes', async () => {
      const { user } = await setupApp(
        aScenario().withSize(3).withEntities(aHero(), aMonster().at(2, 0))
      )
      await longPressOn(user, 2, 0)

      await liftFinger(user)

      expect(queryInfoPopup()).toBeNull()
    })

    test('given the player taps a tile briefly then no popup appears and the path preview shows as before', async () => {
      const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(0, 0)))

      await tapOn(user, 2, 0)
      await waitMs(LONG_PRESS_MS + 10)

      expect(queryInfoPopup()).toBeNull()
      expectPreviewTargetAt(2, 0)
    })

    test('given a long press on a tile when the finger lifts then no path preview appears and the hero does not move', async () => {
      const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(0, 0)))

      await longPressOn(user, 2, 0)
      await liftFinger(user)

      expectNoPreview()
      expectHeroAt(0, 0)
    })

    test('given the player slides a finger before the press is long enough then no popup appears', async () => {
      const { user } = await setupApp(
        aScenario().withSize(3).withEntities(aHero(), aMonster().at(2, 0))
      )
      await pressFingerOn(user, 2, 0)

      await slideFingerTo(user, 1, 0)
      await waitMs(LONG_PRESS_MS + 10)

      expect(queryInfoPopup()).toBeNull()
    })
  })
})
