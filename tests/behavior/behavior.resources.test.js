// @vitest-environment jsdom
import { describe, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectNoPreview,
  expectResourceAt,
  expectResourceCollecting,
  expectResourceNotPresent,
  expectResourcePresent
} from './adventure-map.utils.js'
import {
  expectInteractionModalClosed,
  expectMovementPoints,
  expectResourceTotal
} from './adventure-panels.utils.js'
import { flushMicrotasks, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { aHero, aResource, aScenario } from './builders.js'

const goldDefinitions = { resources: { GOLD_PILE: { name: 'Gold pile', amount: 100 } } }

describe('resource interaction behavior', () => {
  test('given scenario contains resources when app boots then resources are rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3).withEntities(aHero(), aResource()).build()
    })

    expectResourceAt(1, 0, 'resource-1')
  })

  test('given resource blocks direct path when player clicks tile behind it then no path preview is shown', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3).withEntities(aHero(), aResource()).build()
    })

    dispatchTileClick(2, 0)

    expectNoPreview()
    expectHeroAt(0, 0)
  })

  test('given player confirms collecting a resource when movement finishes then hero stops before it and HUD total updates immediately', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(3)
        .withEntities(aHero(), aResource())
        .withDefinitions(goldDefinitions)
        .build(),
      appConfig: {
        fadeOutMsByKind: { RESOURCE: 20 }
      }
    })

    confirmTileClickByDispatch(1, 0)
    await flushMicrotasks()

    expectHeroAt(0, 0)
    expectMovementPoints(1400)
    expectResourceCollecting('resource-1')
    expectResourceTotal('Gold pile', 100)
    expectInteractionModalClosed()

    await waitMs(25)

    expectResourceNotPresent('resource-1')
    expectResourceTotal('Gold pile', 100)
  })

  test('given two resource kinds are collected when each interaction resolves then HUD tracks totals independently', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(5)
        .withEntities(
          aHero(),
          aResource(),
          aResource().withId('resource-2').withType('WOOD_PILE').at(3, 0)
        )
        .withDefinitions({
          resources: {
            GOLD_PILE: { name: 'Gold pile', amount: 100 },
            WOOD_PILE: { name: 'Wood pile', amount: 5 }
          }
        })
        .build(),
      appConfig: {
        fadeOutMsByKind: { RESOURCE: 20 }
      }
    })

    confirmTileClickByDispatch(1, 0)
    await flushMicrotasks()

    expectHeroAt(0, 0)
    expectResourceCollecting('resource-1')
    expectResourcePresent('resource-2')
    expectInteractionModalClosed()

    await waitMs(25)

    expectResourceNotPresent('resource-1')
    expectResourceTotal('Gold pile', 100)
    expectResourceTotal('Wood pile', 0)

    confirmTileClickByDispatch(3, 0)
    await flushMicrotasks()

    expectHeroAt(2, 0)
    expectMovementPoints(1100)

    await waitMs(25)

    expectResourceNotPresent('resource-2')
    expectResourceTotal('Gold pile', 100)
    expectResourceTotal('Wood pile', 5)
    expectInteractionModalClosed()
  })

  test('given final step before resource resolves when movement is still animating then collection waits until hero fully reaches the last tile', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(4)
        .withEntities(aHero(), aResource().at(2, 0))
        .withDefinitions(goldDefinitions)
        .build(),
      movementStepDelayMs: 20,
      appConfig: {
        fadeOutMsByKind: { RESOURCE: 0 }
      }
    })

    confirmTileClickByDispatch(2, 0)
    await waitMs(25)

    expectHeroAt(1, 0)
    expectResourcePresent('resource-1')
    expectInteractionModalClosed()

    await waitMs(25)

    expectResourceNotPresent('resource-1')
    expectResourceTotal('Gold pile', 100)
  })

  test('given default-speed movement when hero is still visually arriving at a resource then collection has not started yet', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(4)
        .withEntities(aHero(), aResource().at(2, 0))
        .withDefinitions(goldDefinitions)
        .build(),
      movementStepDelayMs: 220,
      appConfig: {
        fadeOutMsByKind: { RESOURCE: 0 }
      }
    })

    confirmTileClickByDispatch(2, 0)
    await waitMs(250)

    expectResourcePresent('resource-1')
    expectInteractionModalClosed()

    await waitMs(220)

    expectResourceNotPresent('resource-1')
    expectResourceTotal('Gold pile', 100)
  })
})
