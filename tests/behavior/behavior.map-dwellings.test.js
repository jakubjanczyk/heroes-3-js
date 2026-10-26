// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectDwellingAt,
  expectHeroAt,
  expectNoPreview,
  getDwellingEntity,
  readPreviewPathTiles
} from './adventure-map.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { aDwelling, aHero, aScenario } from './builders.js'

const PLAYER_RED = 'rgb(255, 0, 0)'

const gameDefinitions = {
  monsters: readGameData('monsters.json'),
  dwellings: readGameData('dwellings.json')
}

// The hero stands right below the dwelling's entrance, so entering it takes one step.
function aDwellingScenario(dwelling = aDwelling().at(2, 1)) {
  return aScenario()
    .withSize(5, 3)
    .withEntities(aHero().at(2, 2), dwelling)
    .withDefinitions(gameDefinitions)
    .build()
}

async function enterDwellingAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

function getDwellingFlag(entityId = 'dwelling-1') {
  return within(getDwellingEntity(entityId)).queryByRole('img', { name: 'Red player flag' })
}

describe('creature dwellings on the map', () => {
  test('shows each of the seven Castle dwellings on the map', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(22, 3)
        .withEntities(
          aHero().at(0, 2),
          aDwelling().withId('dwelling-1').withType('GUARDHOUSE').at(2, 1),
          aDwelling().withId('dwelling-2').withType('ARCHERS_TOWER').at(5, 1),
          aDwelling().withId('dwelling-3').withType('GRIFFIN_TOWER').at(8, 1),
          aDwelling().withId('dwelling-4').withType('BARRACKS').at(11, 1),
          aDwelling().withId('dwelling-5').withType('MONASTERY').at(14, 1),
          aDwelling().withId('dwelling-6').withType('TRAINING_GROUNDS').at(17, 1),
          aDwelling().withId('dwelling-7').withType('PORTAL_OF_GLORY').at(20, 1)
        )
        .withDefinitions(gameDefinitions)
        .build()
    })

    expectDwellingAt(2, 1, 'dwelling-1')
    expectDwellingAt(5, 1, 'dwelling-2')
    expectDwellingAt(8, 1, 'dwelling-3')
    expectDwellingAt(11, 1, 'dwelling-4')
    expectDwellingAt(14, 1, 'dwelling-5')
    expectDwellingAt(17, 1, 'dwelling-6')
    expectDwellingAt(20, 1, 'dwelling-7')
  })

  test("shows the dwelling's name on the map", async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aDwellingScenario(aDwelling().withType('GRIFFIN_TOWER').at(2, 1))
    })

    expect(getDwellingEntity().textContent).toBe('Griffin Tower')
  })

  test("the hero walks onto the dwelling's entrance", async () => {
    await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario() })

    await enterDwellingAt(2, 1)

    expectHeroAt(2, 1)
  })

  // A dwelling blocks the tile left of its entrance, and the Guardhouse the one above that too;
  // the rest of its picture can be walked on.
  test.each([
    { type: 'GRIFFIN_TOWER', x: 1, y: 1 },
    { type: 'GUARDHOUSE', x: 1, y: 1 },
    { type: 'GUARDHOUSE', x: 1, y: 0 }
  ])('shows no route to the tile the $type blocks at ($x, $y)', async ({ type, x, y }) => {
    await setupMovementBehaviorApp({
      loadGameOptions: aDwellingScenario(aDwelling().withType(type).at(2, 1))
    })

    dispatchTileClick(x, y)

    expectNoPreview()
  })

  test.each([
    { type: 'GRIFFIN_TOWER', x: 1, y: 0 },
    { type: 'GRIFFIN_TOWER', x: 3, y: 1 },
    { type: 'GUARDHOUSE', x: 2, y: 0 }
  ])('the hero walks across the rest of the $type picture to ($x, $y)', async ({ type, x, y }) => {
    await setupMovementBehaviorApp({
      loadGameOptions: aDwellingScenario(aDwelling().withType(type).at(2, 1))
    })

    await enterDwellingAt(x, y)

    expectHeroAt(x, y)
  })

  test('the hero leaves the entrance by the side, not by the row above it', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aDwellingScenario(aDwelling().withType('GRIFFIN_TOWER').at(2, 1))
    })
    await enterDwellingAt(2, 1)

    dispatchTileClick(2, 0)

    expect(readPreviewPathTiles()).toContainEqual({ x: 3, y: 1 })
  })

  test('the hero enters the entrance from the side, not from the row above it', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(5, 3)
        .withEntities(aHero().at(2, 0), aDwelling().withType('GRIFFIN_TOWER').at(2, 1))
        .withDefinitions(gameDefinitions)
        .build()
    })

    dispatchTileClick(2, 1)

    expect(readPreviewPathTiles()).toContainEqual({ x: 3, y: 1 })
  })

  describe('flag', () => {
    test('shows a dwelling nobody owns without a flag', async () => {
      await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario() })

      expect(getDwellingFlag()).toBeNull()
    })

    test("shows the player's flag on a dwelling the scenario gives to the player", async () => {
      await setupMovementBehaviorApp({
        loadGameOptions: aDwellingScenario(aDwelling().ownedByPlayer().at(2, 1))
      })

      expect(getDwellingFlag()).not.toBeNull()
    })

    test("shows the player's flag on a dwelling after the hero enters it", async () => {
      await loadAppStyles()
      await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario() })

      await enterDwellingAt(2, 1)

      const flag = getDwellingFlag()
      expect(flag).not.toBeNull()
      expect(window.getComputedStyle(flag).backgroundColor).toBe(PLAYER_RED)
    })

    test('keeps one flag when the hero enters a dwelling the player already owns', async () => {
      await setupMovementBehaviorApp({ loadGameOptions: aDwellingScenario() })
      await enterDwellingAt(2, 1)
      await enterDwellingAt(2, 2)

      await enterDwellingAt(2, 1)

      expect(
        within(getDwellingEntity()).getAllByRole('img', { name: 'Red player flag' })
      ).toHaveLength(1)
    })

    test('keeps the dwelling flagged after a reload', async () => {
      const session = { eventLog: createMemoryEventLog(), loadGameOptions: aDwellingScenario() }
      await setupMovementBehaviorApp(session)
      await enterDwellingAt(2, 1)

      await setupMovementBehaviorApp(session)

      expect(getDwellingFlag()).not.toBeNull()
    })
  })
})
