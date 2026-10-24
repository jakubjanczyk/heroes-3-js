// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { confirmTileClickByDispatch, expectHeroAt } from './adventure-map.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { aHero, aScenario } from './builders.js'

const aPanScenario = () => aScenario().withSize(60, 40).withEntities(aHero().at(20, 15))

describe('camera behavior', () => {
  test('given app boots near map edge then camera starts at top-left map boundary', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aPanScenario().withEntities(aHero().at(1, 1)).build(),
      viewportSize: { width: 1000, height: 700 }
    })

    const worldElement = document.querySelector('.world')
    expect(worldElement).toBeTruthy()

    expect(worldElement?.style?.transform).toBe('translate(0px, 0px)')
  })

  test('given player presses arrow keys when viewing the map then the camera pans and the world transform changes', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aPanScenario().build(),
      viewportSize: { width: 1000, height: 700 }
    })

    const worldElement = document.querySelector('.world')
    expect(worldElement).toBeTruthy()
    const before = worldElement?.style?.transform

    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }))

    expect(worldElement?.style?.transform).not.toBe(before)
  })

  test('given cursor touches viewport edge briefly when player moves away quickly then camera does not pan', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aPanScenario().build(),
      viewportSize: { width: 1000, height: 700 }
    })

    const worldElement = document.querySelector('.world')
    const viewport = document.querySelector('.viewport')
    expect(worldElement).toBeTruthy()
    expect(viewport).toBeTruthy()
    const before = worldElement?.style?.transform

    viewport?.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }))
    window.dispatchEvent(
      new window.MouseEvent('mousemove', {
        clientX: 10,
        clientY: 10
      })
    )

    expect(worldElement?.style?.transform).toBe(before)
  })

  test('given cursor stays near viewport edge past delay when player keeps moving there then edge scroll pans the camera', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aPanScenario().build(),
      viewportSize: { width: 1000, height: 700 }
    })

    const worldElement = document.querySelector('.world')
    const viewport = document.querySelector('.viewport')
    expect(worldElement).toBeTruthy()
    expect(viewport).toBeTruthy()
    const before = worldElement?.style?.transform

    viewport?.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }))
    window.dispatchEvent(
      new window.MouseEvent('mousemove', {
        clientX: 10,
        clientY: 10
      })
    )
    await waitMs(360)
    window.dispatchEvent(
      new window.MouseEvent('mousemove', {
        clientX: 10,
        clientY: 10
      })
    )

    expect(worldElement?.style?.transform).not.toBe(before)
  })

  test('given cursor is not over viewport when player moves mouse near viewport edges then edge scroll does not pan the camera', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aPanScenario().build(),
      viewportSize: { width: 1000, height: 700 }
    })

    const worldElement = document.querySelector('.world')
    expect(worldElement).toBeTruthy()
    const before = worldElement?.style?.transform

    window.dispatchEvent(
      new window.MouseEvent('mousemove', {
        clientX: 10,
        clientY: 10
      })
    )

    expect(worldElement?.style?.transform).toBe(before)
  })

  test('given hero moves when movement completes then camera remains centered on latest hero tile', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aPanScenario().build(),
      viewportSize: { width: 1000, height: 700 }
    })

    const worldElement = document.querySelector('.world')
    expect(worldElement).toBeTruthy()
    const before = worldElement?.style?.transform

    confirmTileClickByDispatch(22, 15)
    await flushMicrotasks()

    expectHeroAt(22, 15)

    expect(worldElement?.style?.transform).not.toBe(before)
  })

  test('given session is restored on refresh when hero has moved then camera centers on restored hero tile', async () => {
    const eventLog = createMemoryEventLog()
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: aPanScenario().build(),
      viewportSize: { width: 1000, height: 700 }
    }

    await setupMovementBehaviorApp(sharedAppOptions)
    confirmTileClickByDispatch(22, 15)
    await flushMicrotasks()
    expectHeroAt(22, 15)

    await setupMovementBehaviorApp(sharedAppOptions)

    const worldElement = document.querySelector('.world')
    expect(worldElement).toBeTruthy()
    expectHeroAt(22, 15)
    expect(worldElement?.style?.transform).toBe('translate(-220px, -146px)')
  })
})
