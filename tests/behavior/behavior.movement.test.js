// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import {
  clickEndTurn,
  clickTile,
  confirmMove,
  confirmTileClickByDispatch,
  expectHasOverLimitTargetMarker,
  expectHeroAt,
  expectMovementPoints,
  expectPreviewTargetAt,
  flushMicrotasks,
  setupLinearMovementApp,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js'
import { aScenario } from './builders.js'

describe('movement behavior', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame

  beforeAll(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: (callback) => {
        callback(0)
        return 0
      },
      configurable: true,
      writable: true
    })
  })

  afterAll(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: originalRequestAnimationFrame,
      configurable: true,
      writable: true
    })
  })

  test('given a fresh turn when player confirms a reachable destination then hero moves and movement points decrease by path length', async () => {
    const { user } = await setupMovementBehaviorApp()

    await confirmMove(user, 2, 0)
    await flushMicrotasks()

    expectHeroAt(2, 0)
    expectMovementPoints(1300)
  })

  test('given a multi-step move when movement is in progress then movement points decrease one-by-one per traversed tile', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3).build(),
      movementStepDelayMs: 100
    })

    await confirmMove(user, 2, 0)

    expectHeroAt(0, 0)
    expectMovementPoints(1500)

    await waitMs(120)

    expectHeroAt(1, 0)
    expectMovementPoints(1400)

    await waitMs(120)

    expectHeroAt(2, 0)
    expectMovementPoints(1300)
  })

  test('given path longer than remaining MP when player confirms then hero moves only up to limit and stops', async () => {
    const { user } = await setupLinearMovementApp()

    await confirmMove(user, 16, 0)
    await flushMicrotasks()

    expectHeroAt(15, 0)
    expectMovementPoints(0)
  })
  test('given hero stopped at MP limit when player confirms same red target again then path remains and hero does not move', async () => {
    const { user } = await setupLinearMovementApp()

    await confirmMove(user, 16, 0)
    await flushMicrotasks()

    expectHeroAt(15, 0)
    expectMovementPoints(0)
    expectHasOverLimitTargetMarker()

    await clickTile(user, 16, 0)
    await flushMicrotasks()

    expectHeroAt(15, 0)
    expectMovementPoints(0)
    expectHasOverLimitTargetMarker()
  })

  test('given MP is zero when player confirms any move then hero does not move', async () => {
    const { user } = await setupLinearMovementApp()

    await confirmMove(user, 16, 0)
    await flushMicrotasks()

    expectHeroAt(15, 0)
    expectMovementPoints(0)

    await confirmMove(user, 14, 0)
    await flushMicrotasks()

    expectHeroAt(15, 0)
    expectMovementPoints(0)
  })

  test('given a detour route around blocked terrain when player confirms then hero reaches destination via that route and MP decreases by the detour cost', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(4, 2).withTiles([0, 1, 1, 0, 0, 0, 0, 0]).build()
    })

    await confirmMove(user, 3, 0)
    await flushMicrotasks()

    expectHeroAt(3, 0)
    // Diagonal down, straight, diagonal up: 141 + 100 + 141.
    expectMovementPoints(1118)
  })

  test('given move is in progress when player clicks End turn then End turn is ignored until movement completes', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3).build(),
      movementStepDelayMs: 200
    })

    confirmTileClickByDispatch(2, 0)
    await flushMicrotasks(3)

    await clickEndTurn(user)
    expectMovementPoints(1500)

    await waitMs(660)

    expectHeroAt(2, 0)
    expectMovementPoints(1300)

    await clickEndTurn(user)
    expectMovementPoints(1500)
  })

  test('given movement completed when player clicks End turn then MP resets to 1500', async () => {
    const { user } = await setupMovementBehaviorApp()

    await confirmMove(user, 2, 0)
    await flushMicrotasks()

    expectHeroAt(2, 0)
    expectMovementPoints(1300)

    await clickEndTurn(user)

    expectMovementPoints(1500)
  })

  test('given queued red remainder after End turn then affordable part becomes green based on refreshed MP', async () => {
    const { user } = await setupLinearMovementApp()

    await confirmMove(user, 16, 0)
    await flushMicrotasks()

    expectHeroAt(15, 0)
    expectMovementPoints(0)
    expectHasOverLimitTargetMarker()

    await clickEndTurn(user)

    expectMovementPoints(1500)
    expect(document.querySelector('.path-preview-target-line-over-limit')).toBeFalsy()
    expect(document.querySelector('.path-preview-target-line')).toBeTruthy()
  })

  test('given a destination is selected when player clicks a different tile then the selection changes and hero stays', async () => {
    const { user } = await setupMovementBehaviorApp()

    await clickTile(user, 2, 0)
    await clickTile(user, 3, 0)
    await flushMicrotasks()

    expectHeroAt(0, 0)
    expectMovementPoints(1500)
    expectPreviewTargetAt(3, 0)

    await clickTile(user, 3, 0)
    await flushMicrotasks()

    expectHeroAt(3, 0)
    expectMovementPoints(1200)
  })
})
