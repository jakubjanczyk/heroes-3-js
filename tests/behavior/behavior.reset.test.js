// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  clickResetSession,
  confirmTileClickByDispatch,
  createMemoryEventLog,
  expectHeroAt,
  expectMovementPoints,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aScenario } from './builders.js'

function createWindowWithReloadSpy(baseWindow = window) {
  const reloadCalls = []
  const envWindow = Object.create(baseWindow)
  Object.defineProperty(envWindow, 'location', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: {
      reload() {
        reloadCalls.push('reload')
      }
    }
  })

  return { envWindow, reloadCalls }
}

describe('reset session behavior', () => {
  test('given persisted progress when player clicks Reset then session is cleared and next boot starts from initial scenario', async () => {
    const eventLog = createMemoryEventLog()
    const { envWindow, reloadCalls } = createWindowWithReloadSpy()

    const sharedOptions = {
      eventLog,
      envWindow,
      loadGameOptions: aScenario().withSize(4).build()
    }

    const firstSession = await setupMovementBehaviorApp(sharedOptions)
    confirmTileClickByDispatch(2, 0)
    await flushMicrotasks()

    expectHeroAt(2, 0)
    expectMovementPoints(13)

    await clickResetSession(firstSession.user)
    await flushMicrotasks()

    expect(reloadCalls).toHaveLength(1)

    await setupMovementBehaviorApp({
      ...sharedOptions,
      envWindow: window
    })

    expectHeroAt(0, 0)
    expectMovementPoints(15)
  })
})
