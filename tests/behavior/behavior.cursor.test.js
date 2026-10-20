// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { loadAppStyles } from './app-styles.js'
import {
  confirmTileClickByDispatch,
  flushMicrotasks,
  getCursorOver,
  getMapCursor,
  holdMouseOverMap,
  hoverTile,
  moveMouseOntoTile,
  readGameData,
  setupMovementBehaviorApp,
  waitMs,
  winBattle
} from './behavior.utils.js'
import {
  ARMY_THAT_WINS,
  aHero,
  aMine,
  aMonster,
  aResource,
  aScenario,
  aTown,
  aTreasureChest
} from './builders.js'
import { GRASS, ROCK, WATER } from './terrain-codes.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  mines: readGameData('mines.json')
}

async function setupApp(scenario) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    appConfig: { fadeOutMsByKind: { MONSTER: 0, RESOURCE: 0 } }
  })
  await loadAppStyles()
  return app
}

// On grass the hero walks 15 tiles a day.
function aLongRow() {
  return aScenario().withSize(70)
}

async function moveHeroTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
  await waitMs()
  await flushMicrotasks()
}

describe('adventure map cursor behavior', () => {
  test('given the mouse is over the HUD then the cursor is the Heroes 3 arrow', async () => {
    const { user } = await setupApp(aScenario().withSize(3))
    const endTurnButton = screen.getByRole('button', { name: 'End turn' })

    await user.hover(endTurnButton)

    expect(getCursorOver(endTurnButton)).toBe('arrow')
  })

  test('given the mouse is over the map when it leaves the map then the cursor is the arrow', async () => {
    const { user } = await setupApp(aScenario().withSize(3))
    await hoverTile(user, 1, 0)
    const endTurnButton = screen.getByRole('button', { name: 'End turn' })

    await user.hover(endTurnButton)

    expect(getCursorOver(endTurnButton)).toBe('arrow')
    expect(getMapCursor()).toBe('arrow')
  })

  test('given an empty tile the hero can reach today when the mouse is over it then the cursor is the horse', async () => {
    const { user } = await setupApp(aLongRow())

    await hoverTile(user, 15, 0)

    expect(getMapCursor()).toBe('move')
  })

  test.each([
    { x: 16, cursor: 'move-2' },
    { x: 30, cursor: 'move-2' },
    { x: 31, cursor: 'move-3' },
    { x: 46, cursor: 'move-4' }
  ])('given an empty tile the hero reaches later when the mouse is over x=$x then the cursor is $cursor', async ({
    x,
    cursor
  }) => {
    const { user } = await setupApp(aLongRow())

    await hoverTile(user, x, 0)

    expect(getMapCursor()).toBe(cursor)
  })

  test('given an empty tile more than 4 days away when the mouse is over it then the horse shows 4', async () => {
    const { user } = await setupApp(aLongRow())

    await hoverTile(user, 65, 0)

    expect(getMapCursor()).toBe('move-4')
  })

  test('given a tile enclosed by water when the mouse is over it then the cursor is the arrow', async () => {
    const { user } = await setupApp(aScenario().withSize(4).withTiles([GRASS, WATER, GRASS, GRASS]))

    await hoverTile(user, 2, 0)

    expect(getMapCursor()).toBe('arrow')
  })

  test.each([
    { name: 'water', terrain: WATER },
    { name: 'rock', terrain: ROCK }
  ])('given $name when the mouse is over it then the cursor is the arrow', async ({ terrain }) => {
    const { user } = await setupApp(aScenario().withSize(3).withTiles([GRASS, terrain, GRASS]))

    await hoverTile(user, 1, 0)

    expect(getMapCursor()).toBe('arrow')
  })

  test('given a monster when the mouse is over it then the cursor is the crossed swords', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero(), aMonster().at(2, 0))
    )

    await hoverTile(user, 2, 0)

    expect(getMapCursor()).toBe('attack')
  })

  test('given a monster 2 days away when the mouse is over it then the swords show 2', async () => {
    const { user } = await setupApp(aLongRow().withEntities(aHero(), aMonster().at(20, 0)))

    await hoverTile(user, 20, 0)

    expect(getMapCursor()).toBe('attack-2')
  })

  test.each([
    {
      name: 'a resource',
      scenario: () => aScenario().withSize(5, 3).withEntities(aHero(), aResource().at(2, 1)),
      x: 2,
      y: 1
    },
    {
      name: 'a treasure chest',
      scenario: () => aScenario().withSize(5, 3).withEntities(aHero(), aTreasureChest().at(2, 1)),
      x: 2,
      y: 1
    },
    {
      name: "a mine's entrance",
      scenario: () => aScenario().withSize(5, 3).withEntities(aHero().at(0, 2), aMine().at(2, 1)),
      x: 2,
      y: 1
    },
    {
      name: "a town's entrance",
      scenario: () => aScenario().withSize(5, 4).withEntities(aHero().at(0, 3), aTown().at(2, 2)),
      x: 2,
      y: 2
    }
  ])('given $name when the mouse is over it then the cursor is the rearing horse', async ({
    scenario,
    x,
    y
  }) => {
    const { user } = await setupApp(scenario())

    await hoverTile(user, x, y)

    expect(getMapCursor()).toBe('visit')
  })

  test.each([
    {
      name: 'mine',
      scenario: () => aScenario().withSize(5, 3).withEntities(aHero().at(0, 2), aMine().at(2, 1)),
      x: 1,
      y: 0
    },
    {
      name: 'town',
      scenario: () => aScenario().withSize(5, 4).withEntities(aHero().at(0, 3), aTown().at(2, 2)),
      x: 0,
      y: 1
    }
  ])('given the building of a $name when the mouse is over it then the cursor is the arrow', async ({
    scenario,
    x,
    y
  }) => {
    const { user } = await setupApp(scenario())

    await hoverTile(user, x, y)

    expect(getMapCursor()).toBe('arrow')
  })

  test('given the hero when the mouse is over it then the cursor is the hero helmet', async () => {
    const { user } = await setupApp(aScenario().withSize(3).withEntities(aHero().at(1, 0)))

    await hoverTile(user, 1, 0)

    expect(getMapCursor()).toBe('hero')
  })

  test('given the hero has used all its movement when the mouse is over the next tile then the horse shows 2', async () => {
    const { user } = await setupApp(aLongRow())
    await moveHeroTo(15, 0)

    await hoverTile(user, 16, 0)

    expect(getMapCursor()).toBe('move-2')
  })

  test("given the hero has moved when the mouse is over a tile then the day counts from the hero's new tile", async () => {
    const { user } = await setupApp(aLongRow())
    await moveHeroTo(10, 0)

    await hoverTile(user, 15, 0)

    expect(getMapCursor()).toBe('move')
  })

  test('given the mouse is over the tile the hero walks to when the hero arrives then the cursor is the hero helmet', async () => {
    const { user } = await setupApp(aScenario().withSize(4))
    await hoverTile(user, 2, 0)

    await moveHeroTo(2, 0)

    expect(getMapCursor()).toBe('hero')
  })

  test('given a defeated monster when the mouse is over its tile then the cursor is the horse', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero().withArmy(ARMY_THAT_WINS), aMonster().at(1, 0))
    )
    await moveHeroTo(1, 0)
    await winBattle(user)
    await waitMs()
    await flushMicrotasks()

    await hoverTile(user, 1, 0)

    expect(getMapCursor()).toBe('move')
  })

  test('given a collected resource when the mouse is over its tile then the cursor is the horse', async () => {
    const { user } = await setupApp(
      aScenario().withSize(3).withEntities(aHero(), aResource().at(1, 0))
    )
    await moveHeroTo(1, 0)
    await waitMs()
    await flushMicrotasks()

    await hoverTile(user, 1, 0)

    expect(getMapCursor()).toBe('move')
  })

  describe('edge scrolling', () => {
    // 1000x700 map view over a 60x40 map, with the hero in the middle so it can scroll every way.
    async function setupScrollableMap(hero = aHero().at(30, 20)) {
      return setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(60, 40)
          .withEntities(hero)
          .withDefinitions(gameDefinitions)
          .build(),
        viewportSize: { width: 1000, height: 700 }
      }).then(async (app) => {
        await loadAppStyles()
        return app
      })
    }

    test.each([
      { edge: 'top', x: 500, y: 5, cursor: 'scroll-n' },
      { edge: 'top right corner', x: 995, y: 5, cursor: 'scroll-ne' },
      { edge: 'right', x: 995, y: 350, cursor: 'scroll-e' },
      { edge: 'bottom right corner', x: 995, y: 695, cursor: 'scroll-se' },
      { edge: 'bottom', x: 500, y: 695, cursor: 'scroll-s' },
      { edge: 'bottom left corner', x: 5, y: 695, cursor: 'scroll-sw' },
      { edge: 'left', x: 5, y: 350, cursor: 'scroll-w' },
      { edge: 'top left corner', x: 5, y: 5, cursor: 'scroll-nw' }
    ])('given the mouse stays at the $edge of the map when the map scrolls then the cursor is $cursor', async ({
      x,
      y,
      cursor
    }) => {
      await setupScrollableMap()

      await holdMouseOverMap(x, y)

      expect(getMapCursor()).toBe(cursor)
    })

    test('given the map is at its left border when the mouse stays at the left edge then the cursor is not a scroll arrow', async () => {
      await setupScrollableMap(aHero().at(1, 20))

      await holdMouseOverMap(5, 350)

      expect(getMapCursor()).toBe('move')
    })

    test('given the map is at its top border when the mouse stays in the top left corner then the cursor points left only', async () => {
      await setupScrollableMap(aHero().at(30, 1))

      await holdMouseOverMap(5, 5)

      expect(getMapCursor()).toBe('scroll-w')
    })

    test('given the map is scrolling when the mouse moves onto the hero then the cursor is the hero helmet', async () => {
      await setupScrollableMap()
      await holdMouseOverMap(5, 350)

      moveMouseOntoTile(30, 20)

      expect(getMapCursor()).toBe('hero')
    })
  })
})
