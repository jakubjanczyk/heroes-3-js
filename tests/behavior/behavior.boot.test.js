// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { expectHeroAt, expectNoPreview, getTerrainTile } from './adventure-map.utils.js'
import { clickEndTurn, expectMovementPoints } from './adventure-panels.utils.js'
import { flushMicrotasks, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario } from './builders.js'

describe('app boot behavior', () => {
  test('given app starts when scenario loads then terrain tiles are rendered from data', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3, 2).withTiles([0, 1, 2, 3, 4, 5]).build()
    })

    const terrainTiles = document.querySelectorAll('.terrain-tile')
    expect(terrainTiles).toHaveLength(6)
    expect(getTerrainTile(0, 0)).toBeTruthy()
    expect(getTerrainTile(2, 1)).toBeTruthy()
  })

  test('given app starts when hero exists then hero is rendered with expected entity id', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(3)
        .withEntities(aHero().withId('hero-custom').at(1, 0))
        .build()
    })

    const heroEntity = document.querySelector('.entity--hero[data-entity-id="hero-custom"]')
    expect(heroEntity).toBeTruthy()
    expect(heroEntity?.dataset.tileX).toBe('1')
    expect(heroEntity?.dataset.tileY).toBe('0')
  })

  test('given app starts when HUD loads then movement points show 1500 out of 1500', async () => {
    await setupMovementBehaviorApp()
    expectMovementPoints(1500)
  })

  test('given HUD is outside viewport when user clicks End turn then no map tile selection occurs', async () => {
    const { user } = await setupMovementBehaviorApp()

    await clickEndTurn(user)
    await flushMicrotasks()

    expectHeroAt(0, 0)
    expectMovementPoints(1500)
    expectNoPreview()
  })
})
