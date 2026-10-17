// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { loadAppStyles } from './app-styles.js'
import {
  confirmMove,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  expectNoPreview,
  flushMicrotasks,
  getTerrainTile,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aScenario } from './builders.js'
import {
  ALL_TERRAINS,
  DIRT,
  GRASS,
  LAVA,
  ROUGH,
  SAND,
  SNOW,
  SUBTERRANEAN,
  SWAMP,
  WATER
} from './terrain-codes.js'

describe('terrain behavior', () => {
  test('given every terrain type in the scenario when the map renders then each terrain is drawn in its own colour', async () => {
    await loadAppStyles()
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(ALL_TERRAINS.length).withTiles(ALL_TERRAINS).build()
    })

    const colours = ALL_TERRAINS.map(
      (_, x) => window.getComputedStyle(getTerrainTile(x, 0)).backgroundColor
    )

    expect(colours).not.toContain('rgba(0, 0, 0, 0)')
    expect(new Set(colours).size).toBe(ALL_TERRAINS.length)
  })

  test('given player clicks a water tile then no preview is shown and hero does not move', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withTiles([GRASS, WATER]).build()
    })

    dispatchTileClick(1, 0)
    await flushMicrotasks()

    expectNoPreview()
    expectHeroAt(0, 0)
    expectMovementPoints(15)
  })

  test('given hero starts on snow when player confirms a move across dirt, sand, swamp, rough, subterranean and lava then hero reaches the destination', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(7)
        .withTiles([SNOW, DIRT, SAND, SWAMP, ROUGH, SUBTERRANEAN, LAVA])
        .withEntities(aHero().at(0, 0))
        .build()
    })

    await confirmMove(user, 6, 0)
    await flushMicrotasks()

    expectHeroAt(6, 0)
  })
})
