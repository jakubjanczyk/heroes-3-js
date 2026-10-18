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

function getRolloverBar() {
  return screen.getByRole('status', { name: 'Rollover bar' })
}

async function setupApp(scenario, { viewportSize } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    viewportSize,
    appConfig: { fadeOutMsByKind: { MONSTER: 0 } }
  })
}

describe('rollover bar', () => {
  test('is empty before the mouse is over the map', async () => {
    await setupApp(aScenario().withSize(3))

    expect(getRolloverBar().textContent).toBe('')
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
  ])('shows the terrain name when hovering an empty $name tile', async ({ terrain, name }) => {
    const { user } = await setupApp(aScenario().withSize(2).withTiles([GRASS, terrain]))

    await hoverTile(user, 1, 0)

    expect(getRolloverBar().textContent).toBe(name)
  })

  test('shows the plural monster name when hovering a monster', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero(), aMonster().withType('SKELETON').at(2, 0))
    )

    await hoverTile(user, 2, 0)

    expect(getRolloverBar().textContent).toBe('Skeletons')
  })

  test('shows only the resource name when hovering a resource', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero(), aResource().withType('GOLD_PILE').at(2, 0))
    )

    await hoverTile(user, 2, 0)

    expect(getRolloverBar().textContent).toBe('Gold')
  })

  test.each([
    { part: 'entry tile', x: 2, y: 1 },
    { part: 'building', x: 1, y: 0 }
  ])('shows the mine name when hovering its $part', async ({ x, y }) => {
    const { user } = await setupApp(
      aScenario()
        .withSize(5, 3)
        .withEntities(aHero().at(0, 2), aMine().withType('GOLD_MINE').at(2, 1))
    )

    await hoverTile(user, x, y)

    expect(getRolloverBar().textContent).toBe('Gold Mine')
  })

  test.each([
    { part: 'entry tile', x: 2, y: 2 },
    { part: 'building', x: 0, y: 1 }
  ])('shows the town name when hovering its $part', async ({ x, y }) => {
    const { user } = await setupApp(
      aScenario().withSize(5, 4).withEntities(aHero().at(0, 3), aTown().withType('CASTLE').at(2, 2))
    )

    await hoverTile(user, x, y)

    expect(getRolloverBar().textContent).toBe('Castle')
  })

  test("shows the hero's name when hovering the hero", async () => {
    const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(1, 0)))

    await hoverTile(user, 1, 0)

    expect(getRolloverBar().textContent).toBe('Hero')
  })

  test("shows the hero's name where the hero has moved to", async () => {
    const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(0, 0)))
    confirmTileClickByDispatch(2, 0)
    await flushMicrotasks()

    await hoverTile(user, 2, 0)

    expect(getRolloverBar().textContent).toBe('Hero')
  })

  test('names the tile under the mouse after the map has scrolled', async () => {
    const tiles = new Array(40).fill(GRASS)
    tiles[25] = WATER
    const { user } = await setupApp(aScenario().withSize(40).withTiles(tiles), {
      viewportSize: { width: 320, height: 64 }
    })
    panCamera('ArrowRight', 40)

    await hoverTile(user, 25, 0)

    expect(getRolloverBar().textContent).toBe('Water')
  })

  test('shows the terrain name where a defeated monster stood', async () => {
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

    expect(getRolloverBar().textContent).toBe('Grass')
  })

  test('empties when the mouse leaves the map', async () => {
    const { user } = await setupApp(aScenario().withSize(3))
    await hoverTile(user, 1, 0)

    await user.hover(screen.getByRole('button', { name: 'End turn' }))

    expect(getRolloverBar().textContent).toBe('')
  })
})
