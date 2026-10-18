// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  closeInteractionModal,
  confirmTileClickByDispatch,
  flushMicrotasks,
  hoverTile,
  panCamera,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js'
import { aHero, aMine, aMonster, aResource, aScenario, aTown } from './builders.js'
import {
  DIRT,
  GRASS,
  LAVA,
  ROCK,
  ROUGH,
  SAND,
  SNOW,
  SUBTERRANEAN,
  SWAMP,
  WATER
} from './terrain-codes.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  mines: readGameData('mines.json')
}

function expectRolloverText(text) {
  expect(screen.getByRole('status', { name: 'Rollover bar' }).textContent).toBe(text)
}

async function setupApp(scenario, { viewportSize } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    viewportSize,
    appConfig: { fadeOutMsByKind: { MONSTER: 0 } }
  })
}

describe('rollover bar behavior', () => {
  test('given a new game when the mouse has not been over the map then the rollover bar is empty', async () => {
    await setupApp(aScenario().withSize(3))

    expectRolloverText('')
  })

  test.each([
    { terrain: GRASS, name: 'Grass' },
    { terrain: ROCK, name: 'Rock' },
    { terrain: DIRT, name: 'Dirt' },
    { terrain: SAND, name: 'Sand' },
    { terrain: SNOW, name: 'Snow' },
    { terrain: SWAMP, name: 'Swamp' },
    { terrain: ROUGH, name: 'Rough' },
    { terrain: SUBTERRANEAN, name: 'Subterranean' },
    { terrain: LAVA, name: 'Lava' },
    { terrain: WATER, name: 'Water' }
  ])('given an empty $name tile when the mouse is over it then the rollover bar shows the terrain name', async ({
    terrain,
    name
  }) => {
    const { user } = await setupApp(aScenario().withSize(2).withTiles([GRASS, terrain]))

    await hoverTile(user, 1, 0)

    expectRolloverText(name)
  })

  test('given a monster when the mouse is over it then the rollover bar shows its plural name', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero(), aMonster().withType('SKELETON').at(2, 0))
    )

    await hoverTile(user, 2, 0)

    expectRolloverText('Skeletons')
  })

  test('given a resource when the mouse is over it then the rollover bar shows only its name', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero(), aResource().withType('GOLD_PILE').at(2, 0))
    )

    await hoverTile(user, 2, 0)

    expectRolloverText('Gold')
  })

  test.each([
    { part: 'entry tile', x: 2, y: 1 },
    { part: 'building', x: 1, y: 0 }
  ])('given a mine when the mouse is over its $part then the rollover bar shows its name', async ({
    x,
    y
  }) => {
    const { user } = await setupApp(
      aScenario()
        .withSize(5, 3)
        .withEntities(aHero().at(0, 2), aMine().withType('GOLD_MINE').at(2, 1))
    )

    await hoverTile(user, x, y)

    expectRolloverText('Gold Mine')
  })

  test.each([
    { part: 'entry tile', x: 2, y: 2 },
    { part: 'building', x: 0, y: 1 }
  ])('given a town when the mouse is over its $part then the rollover bar shows its name', async ({
    x,
    y
  }) => {
    const { user } = await setupApp(
      aScenario().withSize(5, 4).withEntities(aHero().at(0, 3), aTown().withType('CASTLE').at(2, 2))
    )

    await hoverTile(user, x, y)

    expectRolloverText('Castle')
  })

  test("given the hero when the mouse is over it then the rollover bar shows the hero's name", async () => {
    const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(1, 0)))

    await hoverTile(user, 1, 0)

    expectRolloverText('Hero')
  })

  test("given the hero has moved when the mouse is over its new tile then the rollover bar shows the hero's name", async () => {
    const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(0, 0)))
    confirmTileClickByDispatch(2, 0)
    await flushMicrotasks()

    await hoverTile(user, 2, 0)

    expectRolloverText('Hero')
  })

  test('given the map has scrolled when the mouse is over a tile then the rollover bar names that tile', async () => {
    const tiles = new Array(40).fill(GRASS)
    tiles[25] = WATER
    const { user } = await setupApp(aScenario().withSize(40).withTiles(tiles), {
      viewportSize: { width: 320, height: 64 }
    })
    panCamera('ArrowRight', 40)

    await hoverTile(user, 25, 0)

    expectRolloverText('Water')
  })

  test('given a defeated monster when the mouse is over its tile then the rollover bar shows the terrain name', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero(), aMonster().at(1, 0))
    )
    confirmTileClickByDispatch(1, 0)
    await flushMicrotasks()
    await waitMs()
    await closeInteractionModal(user)
    await waitMs()
    await flushMicrotasks()

    await hoverTile(user, 1, 0)

    expectRolloverText('Grass')
  })

  test('given the mouse is over the map when it leaves the map then the rollover bar empties', async () => {
    const { user } = await setupApp(aScenario().withSize(3))
    await hoverTile(user, 1, 0)

    await user.hover(screen.getByRole('button', { name: 'End turn' }))

    expectRolloverText('')
  })
})
