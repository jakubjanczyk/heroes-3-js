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

const GRASS = 0
const ROCK = 1
const DIRT = 2
const SAND = 3
const SNOW = 4
const SWAMP = 5
const ROUGH = 6
const SUBTERRANEAN = 7
const LAVA = 8
const WATER = 9

const ALL_TERRAINS = [GRASS, ROCK, DIRT, SAND, SNOW, SWAMP, ROUGH, SUBTERRANEAN, LAVA, WATER]

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
