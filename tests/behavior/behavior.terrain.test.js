// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import {
  confirmMove,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewCornerAt,
  expectPreviewTargetAt,
  flushMicrotasks,
  getPreviewCornerAt,
  getPreviewDashAt,
  getTerrainTile,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aScenario } from './builders.js'

// Tile codes in scenario JSON. 0 and 1 keep their V1 meaning (open ground / blocked)
// so existing scenarios load unchanged.
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

const TERRAINS = [
  { code: GRASS, name: 'grass', passable: true },
  { code: ROCK, name: 'rock', passable: false },
  { code: DIRT, name: 'dirt', passable: true },
  { code: SAND, name: 'sand', passable: true },
  { code: SNOW, name: 'snow', passable: true },
  { code: SWAMP, name: 'swamp', passable: true },
  { code: ROUGH, name: 'rough', passable: true },
  { code: SUBTERRANEAN, name: 'subterranean', passable: true },
  { code: LAVA, name: 'lava', passable: true },
  { code: WATER, name: 'water', passable: false }
]

function getMinimapTile(x, y) {
  return document.querySelector(`.minimap-tile[data-x="${x}"][data-y="${y}"]`)
}

describe('terrain behavior', () => {
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

  test.each(
    TERRAINS
  )('given a $name tile in the scenario when the map renders then the tile is drawn as $name', async ({
    code,
    name
  }) => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withTiles([GRASS, code]).build()
    })

    expect(getTerrainTile(1, 0).className).toContain(`terrain-tile--${name}`)
  })

  test.each(
    TERRAINS
  )('given a $name tile in the scenario when the minimap renders then the minimap tile is drawn as $name', async ({
    code,
    name
  }) => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2).withTiles([GRASS, code]).build()
    })

    expect(getMinimapTile(1, 0).className).toContain(`minimap-tile--${name}`)
  })

  test('given a water tile when player clicks it then no preview is shown and hero stays', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(3).withTiles([GRASS, GRASS, WATER]).build()
    })

    dispatchTileClick(2, 0)
    await flushMicrotasks()

    expectNoPreview()
    expectHeroAt(0, 0)
  })

  test('given a lake between hero and destination when player previews a move then the route goes around the water', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(4, 2)
        .withTiles([GRASS, WATER, WATER, GRASS, GRASS, GRASS, GRASS, GRASS])
        .build()
    })

    dispatchTileClick(3, 0)
    await flushMicrotasks()

    expectPreviewTargetAt(3, 0)
    expectPreviewCornerAt(0, 1)
    expect(getPreviewDashAt(1, 0)).toBeFalsy()
    expect(getPreviewDashAt(2, 0)).toBeFalsy()
  })

  test('given water on both sides of a diagonal when player moves diagonally then hero does not cut the corner', async () => {
    // G W
    // W G   -> (1,1) is unreachable: no corner cutting between two water tiles
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario().withSize(2, 2).withTiles([GRASS, WATER, WATER, GRASS]).build()
    })

    dispatchTileClick(1, 1)
    await flushMicrotasks()

    expectNoPreview()
    expect(getPreviewCornerAt(1, 1)).toBeFalsy()
  })

  test('given a route over mixed passable terrain when player confirms the move then hero crosses it at one point per tile', async () => {
    // Terrain-specific costs arrive with roadmap 4.6; until then every passable terrain costs 1.
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(6)
        .withTiles([GRASS, DIRT, SAND, SNOW, SWAMP, LAVA])
        .build()
    })

    await confirmMove(user, 5, 0)
    await flushMicrotasks()

    expectHeroAt(5, 0)
    expectMovementPoints(10)
  })
})
