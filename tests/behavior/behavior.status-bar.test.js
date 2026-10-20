// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, test } from 'vitest'

import {
  attackMonsterAt,
  confirmTileClickByDispatch,
  hoverTile,
  panCamera
} from './adventure-map.utils.js'
import { expectStatusBarText } from './adventure-panels.utils.js'
import { flushMicrotasks, readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { winBattle } from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, aMine, aMonster, aResource, aScenario, aTown } from './builders.js'
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

async function setupApp(scenario, { viewportSize } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    viewportSize,
    appConfig: { fadeOutMsByKind: { MONSTER: 0 } }
  })
}

describe('status bar behavior', () => {
  test('given a new game when the mouse has not been over the map then the status bar is empty', async () => {
    await setupApp(aScenario().withSize(3))

    expectStatusBarText('')
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
  ])('given an empty $name tile when the mouse is over it then the status bar shows the terrain name', async ({
    terrain,
    name
  }) => {
    const { user } = await setupApp(aScenario().withSize(2).withTiles([GRASS, terrain]))

    await hoverTile(user, 1, 0)

    expectStatusBarText(name)
  })

  test.each([
    { count: 1, text: 'Few Skeletons' },
    { count: 4, text: 'Few Skeletons' },
    { count: 5, text: 'Several Skeletons' },
    { count: 9, text: 'Several Skeletons' },
    { count: 10, text: 'Pack of Skeletons' },
    { count: 19, text: 'Pack of Skeletons' },
    { count: 20, text: 'Lots of Skeletons' },
    { count: 49, text: 'Lots of Skeletons' },
    { count: 50, text: 'Horde of Skeletons' },
    { count: 99, text: 'Horde of Skeletons' },
    { count: 100, text: 'Throng of Skeletons' },
    { count: 249, text: 'Throng of Skeletons' },
    { count: 250, text: 'Swarm of Skeletons' },
    { count: 499, text: 'Swarm of Skeletons' },
    { count: 500, text: 'Zounds of Skeletons' },
    { count: 999, text: 'Zounds of Skeletons' },
    { count: 1000, text: 'Legion of Skeletons' },
    { count: 5000, text: 'Legion of Skeletons' }
  ])('given $count skeletons when the mouse is over them then the status bar shows $text', async ({
    count,
    text
  }) => {
    const { user } = await setupApp(
      aScenario()
        .withSize(3)
        .withEntities(aHero(), aMonster().withType('SKELETON').withCount(count).at(2, 0))
    )

    await hoverTile(user, 2, 0)

    expectStatusBarText(text)
  })

  test('given a pack of Griffins when the mouse is over them then the status bar shows Pack of Griffins', async () => {
    const { user } = await setupApp(
      aScenario()
        .withSize(3)
        .withEntities(aHero(), aMonster().withType('GRIFFIN').withCount(12).at(2, 0))
    )

    await hoverTile(user, 2, 0)

    expectStatusBarText('Pack of Griffins')
  })

  test('given a resource when the mouse is over it then the status bar shows only its name', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero(), aResource().withType('GOLD_PILE').at(2, 0))
    )

    await hoverTile(user, 2, 0)

    expectStatusBarText('Gold')
  })

  test.each([
    { part: 'entry tile', x: 2, y: 1 },
    { part: 'building', x: 1, y: 0 }
  ])('given a mine when the mouse is over its $part then the status bar shows its name', async ({
    x,
    y
  }) => {
    const { user } = await setupApp(
      aScenario()
        .withSize(5, 3)
        .withEntities(aHero().at(0, 2), aMine().withType('GOLD_MINE').at(2, 1))
    )

    await hoverTile(user, x, y)

    expectStatusBarText('Gold Mine')
  })

  test.each([
    { part: 'entry tile', x: 2, y: 2 },
    { part: 'building', x: 0, y: 1 }
  ])('given a town when the mouse is over its $part then the status bar shows its name', async ({
    x,
    y
  }) => {
    const { user } = await setupApp(
      aScenario().withSize(5, 4).withEntities(aHero().at(0, 3), aTown().withType('CASTLE').at(2, 2))
    )

    await hoverTile(user, x, y)

    expectStatusBarText('Castle')
  })

  test("given the hero when the mouse is over it then the status bar shows the hero's name", async () => {
    const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(1, 0)))

    await hoverTile(user, 1, 0)

    expectStatusBarText('Hero')
  })

  test("given the hero has moved when the mouse is over its new tile then the status bar shows the hero's name", async () => {
    const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(0, 0)))
    confirmTileClickByDispatch(2, 0)
    await flushMicrotasks()

    await hoverTile(user, 2, 0)

    expectStatusBarText('Hero')
  })

  test('given the map has scrolled when the mouse is over a tile then the status bar names that tile', async () => {
    const tiles = new Array(40).fill(GRASS)
    tiles[25] = WATER
    const { user } = await setupApp(aScenario().withSize(40).withTiles(tiles), {
      viewportSize: { width: 320, height: 64 }
    })
    panCamera('ArrowRight', 40)

    await hoverTile(user, 25, 0)

    expectStatusBarText('Water')
  })

  test('given a defeated monster when the mouse is over its tile then the status bar shows the terrain name', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero().withArmy(ARMY_THAT_WINS), aMonster().at(1, 0))
    )
    await attackMonsterAt(1, 0)
    await winBattle(user)
    await waitMs()
    await flushMicrotasks()

    await hoverTile(user, 1, 0)

    expectStatusBarText('Grass')
  })

  test('given the mouse is over the map when it leaves the map then the status bar empties', async () => {
    const { user } = await setupApp(aScenario().withSize(3))
    await hoverTile(user, 1, 0)

    await user.hover(screen.getByRole('button', { name: 'End turn' }))

    expectStatusBarText('')
  })
})
