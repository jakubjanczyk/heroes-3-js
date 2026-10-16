// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  clickEndTurn,
  confirmMove,
  createMemoryEventLog,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  flushMicrotasks,
  setupLinearMovementApp,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js'
import { aScenario } from './builders.js'

function getMoveButton() {
  return screen.getByRole('button', { name: 'Move' })
}

async function clickMove(user) {
  await user.click(getMoveButton())
  await flushMicrotasks()
}

describe('move button behavior', () => {
  test('given no route is selected then the Move button is disabled', async () => {
    await setupLinearMovementApp({ width: 4 })

    expect(getMoveButton().disabled).toBe(true)
  })

  test('given a route is selected with movement points left when player clicks Move then hero walks the route', async () => {
    const { user } = await setupLinearMovementApp({ width: 4 })

    dispatchTileClick(3, 0)
    await flushMicrotasks()
    expect(getMoveButton().disabled).toBe(false)

    await clickMove(user)

    expectHeroAt(3, 0)
    expectMovementPoints(12)
  })

  test('given hero stopped at the movement point limit with route remaining then the Move button is disabled', async () => {
    const { user } = await setupLinearMovementApp()

    await confirmMove(user, 16, 0)
    await flushMicrotasks()

    expectHeroAt(15, 0)
    expectMovementPoints(0)
    expect(getMoveButton().disabled).toBe(true)
  })

  test('given hero stopped at the limit when player ends the turn and clicks Move then hero continues and reaches the target', async () => {
    const { user } = await setupLinearMovementApp()

    await confirmMove(user, 16, 0)
    await flushMicrotasks()
    expectHeroAt(15, 0)

    await clickEndTurn(user)
    expect(getMoveButton().disabled).toBe(false)

    await clickMove(user)

    expectHeroAt(16, 0)
    expectMovementPoints(14)
  })

  test('given hero is moving then the Move button is disabled', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(4).build(),
      movementStepDelayMs: 200
    })

    dispatchTileClick(3, 0)
    await flushMicrotasks()
    await user.click(getMoveButton())
    await flushMicrotasks(3)

    expect(getMoveButton().disabled).toBe(true)

    await waitMs(700)

    expectHeroAt(3, 0)
  })

  test('given hero reached the target then the Move button is disabled', async () => {
    const { user } = await setupLinearMovementApp({ width: 4 })

    await confirmMove(user, 3, 0)
    await flushMicrotasks()

    expectHeroAt(3, 0)
    expect(getMoveButton().disabled).toBe(true)
  })

  test('given a route was selected when the app reloads then the Move button is enabled and continues the move', async () => {
    const session = {
      eventLog: createMemoryEventLog(),
      loadGameOptions: aScenario().build()
    }
    await setupMovementBehaviorApp(session)

    dispatchTileClick(3, 0)
    await flushMicrotasks()

    const { user } = await setupMovementBehaviorApp(session)
    await flushMicrotasks()
    expect(getMoveButton().disabled).toBe(false)

    await clickMove(user)

    expectHeroAt(3, 0)
    expectMovementPoints(12)
  })
})
