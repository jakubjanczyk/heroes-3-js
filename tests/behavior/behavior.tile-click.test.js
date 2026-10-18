// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import {
  clickEndTurn,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewDashAt,
  expectPreviewTargetAt,
  flushMicrotasks,
  setupLinearMovementApp,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aScenario } from './builders.js'

describe('tile click behavior', () => {
  test('given user clicks rendered terrain tile by data-x/data-y then selected tile matches those coordinates', async () => {
    await setupLinearMovementApp({ width: 4 })

    dispatchTileClick(2, 0)
    await flushMicrotasks()

    expectPreviewTargetAt(2, 0)
    expectPreviewDashAt(1, 0)
    expectHeroAt(0, 0)
  })

  test('given no path exists around blocked tiles when player clicks destination then no preview is shown and no movement occurs', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3).withTiles([0, 1, 0]).build()
    })

    dispatchTileClick(2, 0)
    await flushMicrotasks()

    expectNoPreview()
    expectHeroAt(0, 0)
    expectMovementPoints(1500)
  })

  test('given player clicks a blocked terrain tile when no preview exists then no preview is shown and hero does not move', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withTiles([0, 1]).build()
    })

    dispatchTileClick(1, 0)
    await flushMicrotasks()

    expectNoPreview()
    expectHeroAt(0, 0)
    expectMovementPoints(1500)
  })

  test('given player clicks the hero current tile when no preview exists then no preview is shown and hero does not move', async () => {
    await setupLinearMovementApp({ width: 4 })

    dispatchTileClick(0, 0)
    await flushMicrotasks()

    expectNoPreview()
    expectHeroAt(0, 0)
    expectMovementPoints(1500)
  })

  test('given user clicks outside map bounds then no movement or preview is started', async () => {
    await setupLinearMovementApp({ width: 4 })

    const viewport = document.querySelector('.viewport')
    expect(viewport).toBeTruthy()
    viewport?.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: -999,
        clientY: -999
      })
    )
    await flushMicrotasks()

    expectNoPreview()
    expectHeroAt(0, 0)
    expectMovementPoints(1500)
  })

  test('given user clicks HUD controls then tile click handling is not triggered', async () => {
    const { user } = await setupLinearMovementApp({ width: 4 })

    await user.click(screen.getByRole('region', { name: 'Hero info' }))
    await clickEndTurn(user)
    await flushMicrotasks()

    expectNoPreview()
    expectHeroAt(0, 0)
    expectMovementPoints(1500)
  })
})
