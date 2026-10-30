// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectNoPreview,
  holdRightButtonOn,
  hoverTile,
  readInfoPopupLines,
  readObstacleTiles,
  readPreviewPathTiles
} from './adventure-map.utils.js'
import { expectStatusBarText } from './adventure-panels.utils.js'
import { flushMicrotasks, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, anObstacle, aScenario } from './builders.js'

// A mountain shaped like the game's smaller ones, two rows of two set one apart:
//   .##
//   ##.   with its bottom-right corner, which it doesn't block, at (4, 2).
const MOUNTAIN = {
  name: 'Mountain',
  look: 'mountain',
  blocks: [
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: -2, y: 0 },
    { x: -1, y: 0 }
  ]
}

const BLOCKED_TILES = [
  { x: 3, y: 1 },
  { x: 4, y: 1 },
  { x: 2, y: 2 },
  { x: 3, y: 2 }
]

function setupMapWithMountain() {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(6, 4)
      .withEntities(aHero().at(1, 2), anObstacle().withType('MOUNTAIN').at(4, 2))
      .withDefinitions({ obstacles: { MOUNTAIN } })
      .build()
  })
}

describe('obstacles', () => {
  test('shows the obstacle on each tile it blocks', async () => {
    await setupMapWithMountain()

    expect(readObstacleTiles()).toEqual(BLOCKED_TILES)
  })

  test.each(BLOCKED_TILES)('shows no route to the tile it blocks at ($x, $y)', async ({ x, y }) => {
    await setupMapWithMountain()

    dispatchTileClick(x, y)

    expectNoPreview()
  })

  test("walks the hero onto a tile of the obstacle's picture that it doesn't block", async () => {
    await setupMapWithMountain()

    confirmTileClickByDispatch(4, 2)
    await flushMicrotasks()

    expectHeroAt(4, 2)
  })

  test('routes the hero around the obstacle', async () => {
    await setupMapWithMountain()

    dispatchTileClick(4, 2)

    expect(readPreviewPathTiles()).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 2 }
    ])
  })

  test('names the obstacle in the status bar over a tile it blocks', async () => {
    const { user } = await setupMapWithMountain()

    await hoverTile(user, 3, 1)

    expectStatusBarText('Mountain')
  })

  test("shows the terrain in the status bar over a tile of its picture that it doesn't block", async () => {
    const { user } = await setupMapWithMountain()

    await hoverTile(user, 4, 2)

    expectStatusBarText('Grass')
  })

  test("shows the obstacle's name in the right-click popup", async () => {
    const { user } = await setupMapWithMountain()

    await holdRightButtonOn(user, 2, 2)

    expect(readInfoPopupLines()).toEqual(['Mountain'])
  })
})
