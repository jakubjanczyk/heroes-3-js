// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmMove,
  dispatchTileClick,
  expectHeroAt,
  expectMonsterAt,
  expectNoPreview,
  getFogOver,
  getMapCursor,
  holdRightButtonOn,
  hoverTile,
  isTileExplored,
  readPreviewPathTiles
} from './adventure-map.utils.js'
import { expectStatusBarText } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import { aHero, aMine, aMonster, aScenario, aTown } from './builders.js'
import { GRASS, ROCK } from './terrain-codes.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  monsters: readGameData('monsters.json'),
  towns: readGameData('towns.json'),
  mines: readGameData('mines.json')
}

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    ...options
  })
}

const aFoggyScenario = () => aScenario().withFogOfWar(true)

describe('fog of war behavior', () => {
  test('given a new game when the map renders then tiles beyond the hero sight are covered in black', async () => {
    await loadAppStyles()
    await setupApp(aFoggyScenario().withSize(20))

    const fog = getFogOver(19, 0)
    expect(fog).toBeTruthy()
    expect(window.getComputedStyle(fog).backgroundColor).toBe('rgb(0, 0, 0)')
  })

  // A tile is in sight when its distance from the hero, rounded to a whole number, is at most 5.
  test.each([
    { x: 6, y: 1, distance: '5', explored: true },
    { x: 6, y: 3, distance: '5.39', explored: true },
    { x: 5, y: 4, distance: '5', explored: true },
    { x: 7, y: 1, distance: '6', explored: false },
    { x: 6, y: 4, distance: '5.83', explored: false },
    { x: 5, y: 5, distance: '5.66', explored: false }
  ])('given a new game when the map renders then the tile ($x, $y) at distance $distance from the hero is explored: $explored', async ({
    x,
    y,
    explored
  }) => {
    await setupApp(aFoggyScenario().withSize(13, 13).withEntities(aHero().at(1, 1)))

    expect(isTileExplored(x, y)).toBe(explored)
  })

  test('given the player owns a town when the map renders then the tiles within 5 of its entrance are explored', async () => {
    await setupApp(
      aFoggyScenario()
        .withSize(30)
        .withEntities(aHero().at(0, 0), aTown().ownedByPlayer().at(20, 0))
    )

    expect([14, 15, 25, 26].map((x) => isTileExplored(x, 0))).toEqual([false, true, true, false])
  })

  test('given a neutral town when the map renders then the tiles around it stay unexplored', async () => {
    await setupApp(aFoggyScenario().withSize(30).withEntities(aHero().at(0, 0), aTown().at(20, 0)))

    expect([15, 20, 25].map((x) => isTileExplored(x, 0))).toEqual([false, false, false])
  })

  test('given the player owns a mine when the map renders then the tiles within 3 of its entrance are explored', async () => {
    await setupApp(
      aFoggyScenario()
        .withSize(30)
        .withEntities(aHero().at(0, 0), aMine().ownedByPlayer().at(20, 0))
    )

    expect([16, 17, 23, 24].map((x) => isTileExplored(x, 0))).toEqual([false, true, true, false])
  })

  test('given the hero walks when it is partway then the tiles around each tile it stepped on are explored', async () => {
    const { user } = await setupApp(aFoggyScenario().withSize(20), { movementStepDelayMs: 100 })

    await confirmMove(user, 3, 0)
    await waitMs(120)

    expect([6, 7].map((x) => isTileExplored(x, 0))).toEqual([true, false])
  })

  test('given the hero walked away when it stops then the tiles it saw before stay explored', async () => {
    const { user } = await setupApp(aFoggyScenario().withSize(20))
    await confirmMove(user, 5, 0)

    await confirmMove(user, 10, 0)

    expectHeroAt(10, 0)
    expect(isTileExplored(0, 0)).toBe(true)
  })

  test('given a monster on an unexplored tile when the map renders then the fog covers it', async () => {
    await setupApp(
      aFoggyScenario().withSize(20).withEntities(aHero().at(0, 0), aMonster().at(10, 0))
    )

    expect(isTileExplored(10, 0)).toBe(false)
  })

  test('given a monster on an unexplored tile when the hero comes within sight then the monster shows', async () => {
    const { user } = await setupApp(
      aFoggyScenario().withSize(20).withEntities(aHero().at(0, 0), aMonster().at(10, 0))
    )

    await confirmMove(user, 5, 0)

    expect(isTileExplored(10, 0)).toBe(true)
    expectMonsterAt(10, 0)
  })

  test('given an unexplored tile when the player clicks it then no route is shown', async () => {
    await setupApp(aFoggyScenario().withSize(20))

    dispatchTileClick(10, 0)

    expectNoPreview()
  })

  // The heroes at (0, 4) and (11, 4) each see 5 tiles around them, which leaves column 5 explored
  // only on rows 2 to 6, where rock fills rows 2 to 5. The shortest way to (8, 1) would cross
  // column 5 at row 1, which neither hero sees, so the route goes down through (5, 6) instead.
  test('given the shortest route crosses unexplored tiles when the player clicks its target then the route goes around them', async () => {
    const width = 14
    const tiles = new Array(width * 9).fill(GRASS)
    for (const y of [2, 3, 4, 5]) {
      tiles[y * width + 5] = ROCK
    }
    await setupApp(
      aFoggyScenario()
        .withSize(width, 9)
        .withTiles(tiles)
        .withEntities(aHero().at(0, 4), aHero().withId('hero-2').at(11, 4))
    )

    dispatchTileClick(8, 1)

    const route = readPreviewPathTiles()
    expect(route).toContainEqual({ x: 5, y: 6 })
    expect(route.filter((tile) => !isTileExplored(tile.x, tile.y))).toEqual([])
  })

  test('given an unexplored tile when the mouse is over it then the cursor is the arrow', async () => {
    await loadAppStyles()
    const { user } = await setupApp(aFoggyScenario().withSize(20))

    await hoverTile(user, 10, 0)

    expect(getMapCursor()).toBe('arrow')
  })

  test('given the mouse was over an explored tile when it moves over an unexplored one then the status bar is empty', async () => {
    const { user } = await setupApp(aFoggyScenario().withSize(20))
    await hoverTile(user, 3, 0)

    await hoverTile(user, 10, 0)

    expectStatusBarText('')
  })

  test('given an unexplored tile when the player right-clicks it then the popup shows Uncharted Territory', async () => {
    const { user } = await setupApp(
      aFoggyScenario().withSize(20).withEntities(aHero().at(0, 0), aMonster().at(10, 0))
    )

    await holdRightButtonOn(user, 10, 0)

    expect(screen.getByRole('tooltip').textContent).toBe('Uncharted Territory')
  })

  test('given the hero explored tiles when the game reloads then they stay explored', async () => {
    const session = {
      eventLog: createMemoryEventLog(),
      loadGameOptions: aFoggyScenario().withSize(20).withDefinitions(gameDefinitions).build()
    }
    const { user } = await setupMovementBehaviorApp(session)
    await confirmMove(user, 5, 0)
    await confirmMove(user, 10, 0)

    await setupMovementBehaviorApp(session)

    expect([0, 15, 16].map((x) => isTileExplored(x, 0))).toEqual([true, true, false])
  })

  test('given the scenario turns fog of war off when the map renders then every tile is explored', async () => {
    await setupApp(aScenario().withFogOfWar(false).withSize(20))

    expect(isTileExplored(19, 0)).toBe(true)
  })
})
