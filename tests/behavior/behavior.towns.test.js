// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  closeInteractionModal,
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectInteractionModalOpen,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewTargetAt,
  expectTownAt,
  expectTownPresent,
  flushMicrotasks,
  getPreviewTargetAt,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js'
import { aHero, aScenario, aTown } from './builders.js'

const aCastleScenario = (hero) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(hero, aTown().at(4, 3))
    .withDefinitions({ towns: { CASTLE: { name: 'Castle' } } })

describe('town interaction behavior', () => {
  test('given scenario contains a town when app boots then town is rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aCastleScenario(aHero()).build()
    })

    expectTownAt(4, 3, 'town-1')
  })

  test('given town is on the map when player previews blocked footprint tiles then each blocked tile has no preview', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aCastleScenario(aHero()).build()
    })

    const blockedTiles = [
      [2, 2],
      [2, 3],
      [3, 1],
      [4, 1],
      [5, 1],
      [3, 2],
      [4, 2],
      [5, 2],
      [3, 3],
      [5, 3],
      [6, 2],
      [6, 3]
    ]

    for (const [x, y] of blockedTiles) {
      dispatchTileClick(x, y)
      await flushMicrotasks()
      expectNoPreview()
    }
  })

  test('given town is on the map when player previews known non-blocked nearby tiles then preview appears', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aCastleScenario(aHero()).build()
    })

    const reachableTiles = [
      [6, 4],
      [7, 3],
      [7, 2],
      [1, 3],
      [4, 0]
    ]

    for (const [x, y] of reachableTiles) {
      dispatchTileClick(x, y)
      await flushMicrotasks()
      expectPreviewTargetAt(x, y)
    }
  })

  test('given player confirms move to town entry when movement resolves then hero steps into town tile and town remains', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aCastleScenario(aHero().at(4, 5)).build(),
      appConfig: {
        interactionModalTransitionMs: 0
      }
    })

    confirmTileClickByDispatch(4, 3)
    await flushMicrotasks()

    expectHeroAt(4, 3)
    expectMovementPoints(13)
    expectInteractionModalOpen('Castle visited')

    await closeInteractionModal(user)
    await flushMicrotasks()

    expectTownPresent('town-1')
  })

  test('given hero leaves and re-enters the same town in one session then the town modal opens again', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aCastleScenario(aHero().at(4, 5)).build(),
      appConfig: {
        interactionModalTransitionMs: 0
      }
    })

    confirmTileClickByDispatch(4, 3)
    await flushMicrotasks()
    expectInteractionModalOpen('Castle visited')

    await closeInteractionModal(user)
    await flushMicrotasks()

    confirmTileClickByDispatch(4, 4)
    await flushMicrotasks()
    expectHeroAt(4, 4)

    confirmTileClickByDispatch(4, 3)
    await flushMicrotasks()

    expectHeroAt(4, 3)
    expectInteractionModalOpen('Castle visited')
  })

  test('given hero steps onto a town tile when modal has not opened yet then the preview target is already cleared', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aCastleScenario(aHero().at(4, 5)).build(),
      movementStepDelayMs: 20,
      appConfig: {
        interactionModalTransitionMs: 0
      }
    })

    confirmTileClickByDispatch(4, 3)
    await waitMs(55)
    await flushMicrotasks()

    expectHeroAt(4, 3)
    expect(getPreviewTargetAt(4, 3)).toBeFalsy()
  })

  test('given default-speed movement when hero is still visually arriving on a town tile then modal stays closed', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aCastleScenario(aHero().at(4, 4)).build(),
      movementStepDelayMs: 220,
      appConfig: {
        interactionModalTransitionMs: 0
      }
    })

    confirmTileClickByDispatch(4, 3)
    await waitMs(250)
    await flushMicrotasks()

    expectHeroAt(4, 3)
    expect(getPreviewTargetAt(4, 3)).toBeFalsy()

    await waitMs(220)
    await flushMicrotasks()

    expectInteractionModalOpen('Castle visited')
  })
})
