// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectMineAt,
  expectMinePresent,
  expectNoPreview
} from './adventure-map.utils.js'
import {
  endTurns,
  expectInteractionModalClosed,
  expectResourceTotal
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { aHero, aMine, aResource, aScenario } from './builders.js'

const PLAYER_RED = 'rgb(255, 0, 0)'

const gameDefinitions = {
  mines: readGameData('mines.json'),
  resources: readGameData('resources.json')
}

// The hero stands right below the mine's entry tile, so entering it takes one step.
function aMineScenario(...mines) {
  return aScenario()
    .withSize(8, 3)
    .withEntities(aHero().at(2, 2), ...mines)
    .withDefinitions(gameDefinitions)
    .build()
}

async function enterMineAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

function getMineFlag(entityId = 'mine-1') {
  return within(expectMinePresent(entityId)).queryByRole('img', { name: 'Red player flag' })
}

describe('mine interaction behavior', () => {
  test('given scenario contains all mine types when app boots then each mine is rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(20)
        .withEntities(
          aHero(),
          aMine().withId('mine-1').withType('GOLD_MINE').at(2, 0),
          aMine().withId('mine-2').withType('SAWMILL').at(4, 0),
          aMine().withId('mine-3').withType('ORE_PIT').at(6, 0),
          aMine().withId('mine-4').withType('ALCHEMIST_LAB').at(8, 0),
          aMine().withId('mine-5').withType('SULFUR_DUNE').at(10, 0),
          aMine().withId('mine-6').withType('CRYSTAL_CAVERN').at(12, 0),
          aMine().withId('mine-7').withType('GEM_POND').at(14, 0)
        )
        .build()
    })

    expectMineAt(2, 0, 'mine-1')
    expectMineAt(4, 0, 'mine-2')
    expectMineAt(6, 0, 'mine-3')
    expectMineAt(8, 0, 'mine-4')
    expectMineAt(10, 0, 'mine-5')
    expectMineAt(12, 0, 'mine-6')
    expectMineAt(14, 0, 'mine-7')
  })

  test('given hero enters mine bottom-center tile when movement resolves then mine stays and no modal appears', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(6, 3)
        .withEntities(aHero().at(0, 1), aMine().at(2, 1))
        .build()
    })

    confirmTileClickByDispatch(2, 1)
    await flushMicrotasks()

    expectHeroAt(2, 1)
    expectInteractionModalClosed()
    expectMinePresent('mine-1')
  })

  test('given mine is rendered as 3x2 when player previews non-entry footprint tiles then no preview is shown', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(8, 4)
        .withEntities(aHero().at(0, 2), aMine().at(3, 2))
        .build()
    })

    dispatchTileClick(2, 1)
    await flushMicrotasks()
    expectNoPreview()

    dispatchTileClick(3, 1)
    await flushMicrotasks()
    expectNoPreview()

    dispatchTileClick(4, 1)
    await flushMicrotasks()
    expectNoPreview()

    dispatchTileClick(2, 2)
    await flushMicrotasks()
    expectNoPreview()

    dispatchTileClick(4, 2)
    await flushMicrotasks()
    expectNoPreview()
  })

  describe('capture', () => {
    test('shows a mine without an owner flag when the game starts', async () => {
      await setupMovementBehaviorApp({ loadGameOptions: aMineScenario(aMine().at(2, 1)) })

      expect(getMineFlag()).toBeNull()
    })

    test("shows the player's flag on a mine after the hero enters it", async () => {
      await loadAppStyles()
      await setupMovementBehaviorApp({ loadGameOptions: aMineScenario(aMine().at(2, 1)) })

      await enterMineAt(2, 1)

      const flag = getMineFlag()
      expect(flag).not.toBeNull()
      expect(window.getComputedStyle(flag).backgroundColor).toBe(PLAYER_RED)
    })
  })

  describe('income', () => {
    test.each([
      ['GOLD_MINE', 'Gold', 1000],
      ['SAWMILL', 'Wood', 2],
      ['ORE_PIT', 'Ore', 2],
      ['ALCHEMIST_LAB', 'Mercury', 1],
      ['SULFUR_DUNE', 'Sulfur', 1],
      ['CRYSTAL_CAVERN', 'Crystal', 1],
      ['GEM_POND', 'Gems', 1]
    ])('a captured %s adds %s %i when the next day starts', async (mineType, resourceName, amount) => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aMineScenario(aMine().withType(mineType).at(2, 1))
      })
      await enterMineAt(2, 1)

      await endTurns(user, 1)

      expectResourceTotal(resourceName, amount)
    })

    test('pays no income on the day the mine is captured', async () => {
      await setupMovementBehaviorApp({ loadGameOptions: aMineScenario(aMine().at(2, 1)) })

      await enterMineAt(2, 1)

      expectResourceTotal('Gold', 0)
    })

    test('pays the income again on every following day', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aMineScenario(aMine().at(2, 1))
      })
      await enterMineAt(2, 1)

      await endTurns(user, 3)

      expectResourceTotal('Gold', 3000)
    })

    test('pays the income once a day after the hero enters an owned mine again', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aMineScenario(aMine().at(2, 1))
      })
      await enterMineAt(2, 1)
      await enterMineAt(2, 2)
      await enterMineAt(2, 1)

      await endTurns(user, 1)

      expectResourceTotal('Gold', 1000)
    })

    test('adds the income of several owned mines together', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aMineScenario(
          aMine().withId('mine-1').at(2, 1),
          aMine().withId('mine-2').at(6, 1)
        )
      })
      await enterMineAt(2, 1)
      await enterMineAt(6, 1)

      await endTurns(user, 1)

      expectResourceTotal('Gold', 2000)
    })

    test('pays nothing for a mine the hero has not entered', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aMineScenario(aMine().at(2, 1))
      })

      await endTurns(user, 1)

      expectResourceTotal('Gold', 0)
    })

    test('adds income on top of resources collected from piles', async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aMineScenario(aMine().at(2, 1), aResource().at(1, 2)),
        appConfig: { fadeOutMsByKind: { RESOURCE: 0 } }
      })
      await enterMineAt(1, 2)
      await enterMineAt(2, 1)

      await endTurns(user, 1)

      expectResourceTotal('Gold', 1100)
    })
  })

  describe('after a reload', () => {
    function createSession() {
      return { eventLog: createMemoryEventLog(), loadGameOptions: aMineScenario(aMine().at(2, 1)) }
    }

    async function reload(session) {
      const app = await setupMovementBehaviorApp(session)
      await flushMicrotasks()
      return app
    }

    test('keeps the mine owned', async () => {
      const session = createSession()
      await setupMovementBehaviorApp(session)
      await enterMineAt(2, 1)

      await reload(session)

      expect(getMineFlag()).not.toBeNull()
    })

    test('keeps the resource totals including income already paid', async () => {
      const session = createSession()
      const { user } = await setupMovementBehaviorApp(session)
      await enterMineAt(2, 1)
      await endTurns(user, 2)

      await reload(session)

      expectResourceTotal('Gold', 2000)
    })

    test('keeps paying income when the next day starts', async () => {
      const session = createSession()
      const { user } = await setupMovementBehaviorApp(session)
      await enterMineAt(2, 1)
      await endTurns(user, 1)
      const reloaded = await reload(session)

      await endTurns(reloaded.user, 1)

      expectResourceTotal('Gold', 2000)
    })
  })
})
