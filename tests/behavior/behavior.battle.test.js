// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { loadAppStyles } from './app-styles.js'
import {
  attackMonsterAt,
  confirmTileClickByDispatch,
  createMemoryEventLog,
  expectHeroAt,
  expectInteractionModalClosed,
  expectMonsterNotPresent,
  expectMonsterPresent,
  flushMicrotasks,
  getBattlefield,
  getBattleScreen,
  getMapViewCentreTile,
  getTerrainTile,
  panCamera,
  queryBattleScreen,
  readBattleStacks,
  readGameData,
  setupMovementBehaviorApp,
  winBattle
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'
import { DIRT, GRASS, LAVA, ROUGH, SAND, SNOW, SUBTERRANEAN, SWAMP } from './terrain-codes.js'

const HERO_NAME = 'Sir Christian'

const gameDefinitions = {
  hero: { name: HERO_NAME },
  monsters: readGameData('monsters.json')
}

const appConfig = { interactionModalTransitionMs: 0, fadeOutMsByKind: { MONSTER: 0 } }

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    appConfig,
    ...options
  })
}

const skeletons = (count) => ({ creature: 'SKELETON', count })

// A hero next to a monster, so a single step starts the battle.
const aFight = () => aScenario().withSize(3).withEntities(aHero(), aMonster().at(1, 0))

describe('battle behavior', () => {
  test('given hero attacks a monster when it reaches it then the battle screen opens', async () => {
    await setupApp(aFight())

    await attackMonsterAt(1, 0)

    expect(getBattleScreen()).toBeTruthy()
    expectInteractionModalClosed()
  })

  test('given battle opens then the battlefield is a grid of 15 columns by 11 rows of hexes', async () => {
    await setupApp(aFight())

    await attackMonsterAt(1, 0)

    const rows = within(getBattlefield()).getAllByRole('row')
    expect(rows.map((row) => within(row).getAllByRole('gridcell').length)).toEqual(
      new Array(11).fill(15)
    )
  })

  test.each([
    ['grass', GRASS],
    ['dirt', DIRT],
    ['sand', SAND],
    ['snow', SNOW],
    ['swamp', SWAMP],
    ['rough', ROUGH],
    ['subterranean', SUBTERRANEAN],
    ['lava', LAVA]
  ])('given hero fights a monster standing on %s then the battlefield ground has the colour of that terrain', async (_, terrain) => {
    await loadAppStyles()
    await setupApp(aFight().withTiles([GRASS, terrain, GRASS]))

    await attackMonsterAt(1, 0)

    const groundColour = window.getComputedStyle(
      within(getBattleScreen()).getByLabelText('Battlefield ground')
    ).backgroundColor
    expect(groundColour).toBe(window.getComputedStyle(getTerrainTile(1, 0)).backgroundColor)
  })

  test('given battle opens then the attacking hero is shown on the battlefield', async () => {
    await setupApp(aFight())

    await attackMonsterAt(1, 0)

    expect(within(getBattleScreen()).getByRole('img', { name: HERO_NAME })).toBeTruthy()
  })

  test.each([
    [1, [6]],
    [2, [3, 9]],
    [3, [3, 6, 9]],
    [4, [1, 5, 7, 11]],
    [5, [1, 3, 6, 9, 11]],
    [6, [1, 3, 5, 7, 9, 11]],
    [7, [1, 3, 5, 6, 7, 9, 11]]
  ])('given hero has %i stacks when battle opens then they stand in the first column on rows %j', async (stackCount, rows) => {
    const army = Array.from({ length: stackCount }, (_, index) => skeletons(10 * (index + 1)))
    await setupApp(
      aScenario().withSize(3).withEntities(aHero().withArmy(army), aMonster().at(1, 0))
    )

    await attackMonsterAt(1, 0)

    const heroStacks = readBattleStacks().filter(({ column }) => column === 1)
    expect(heroStacks).toEqual(
      rows.map((row, index) => ({ stack: `Skeletons ${10 * (index + 1)}`, row, column: 1 }))
    )
  })

  test('given hero has an empty slot between two stacks when battle opens then the stacks stand as two stacks do', async () => {
    await setupApp(
      aScenario()
        .withSize(3)
        .withEntities(aHero().withArmy([skeletons(5), null, skeletons(7)]), aMonster().at(1, 0))
    )

    await attackMonsterAt(1, 0)

    expect(readBattleStacks().filter(({ column }) => column === 1)).toEqual([
      { stack: 'Skeletons 5', row: 3, column: 1 },
      { stack: 'Skeletons 7', row: 9, column: 1 }
    ])
  })

  test('given hero has different creatures when battle opens then each stack shows its creature name and exact count', async () => {
    await setupApp(
      aScenario()
        .withSize(3)
        .withEntities(
          aHero().withArmy([
            { creature: 'MARKSMAN', count: 12 },
            { creature: 'ROYAL_GRIFFIN', count: 1 }
          ]),
          aMonster().at(1, 0)
        )
    )

    await attackMonsterAt(1, 0)

    expect(readBattleStacks().filter(({ column }) => column === 1)).toEqual([
      { stack: 'Marksmen 12', row: 3, column: 1 },
      { stack: 'Royal Griffin 1', row: 9, column: 1 }
    ])
  })

  test('given a monster of 37 Pikemen when battle opens then they stand on the right side showing 37', async () => {
    await setupApp(
      aScenario()
        .withSize(3)
        .withEntities(aHero(), aMonster().withType('PIKEMAN').withCount(37).at(1, 0))
    )

    await attackMonsterAt(1, 0)

    expect(readBattleStacks().filter(({ column }) => column === 15)).toEqual([
      { stack: 'Pikemen 37', row: 6, column: 15 }
    ])
  })

  test('given battle opens then the bottom bar shows the battle buttons, the message log and the status bar', async () => {
    await setupApp(aFight())

    await attackMonsterAt(1, 0)

    const battleScreen = within(getBattleScreen())
    expect(
      battleScreen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
    ).toEqual([
      'System options',
      'Surrender',
      'Retreat',
      'Auto combat',
      'Cast spell',
      'Wait',
      'Defend'
    ])
    expect(battleScreen.getByRole('log', { name: 'Combat messages' })).toBeTruthy()
    expect(battleScreen.getByRole('status', { name: 'Battle status bar' })).toBeTruthy()
  })

  test('given battle is open when the player clicks the map then the hero does not move', async () => {
    await setupApp(aScenario().withSize(4).withEntities(aHero().at(1, 0), aMonster().at(0, 0)))
    await attackMonsterAt(0, 0)

    confirmTileClickByDispatch(3, 0)
    await flushMicrotasks()

    expectHeroAt(1, 0)
  })

  test('given battle is open when the player presses arrow keys then the map does not scroll', async () => {
    await setupApp(
      aScenario().withSize(60, 40).withEntities(aHero().at(20, 15), aMonster().at(21, 15)),
      { viewportSize: { width: 1000, height: 700 } }
    )
    await attackMonsterAt(21, 15)

    panCamera('ArrowRight', 20)

    expect(getMapViewCentreTile()).toEqual({ x: 20, y: 15 })
  })

  test('given battle is open when the player clicks Auto combat then the adventure map is back and the monster is defeated', async () => {
    const { user } = await setupApp(aFight())
    await attackMonsterAt(1, 0)

    await winBattle(user)

    expect(queryBattleScreen()).toBeNull()
    expectMonsterNotPresent('monster-1')
  })

  test('given battle is open when the page reloads then the same battle is shown again', async () => {
    const eventLog = createMemoryEventLog()
    await setupApp(aFight(), { eventLog })
    await attackMonsterAt(1, 0)

    await setupApp(aFight(), { eventLog })
    await flushMicrotasks()

    expectMonsterPresent('monster-1')
    expect(readBattleStacks()).toEqual([
      { stack: 'Skeletons 10', row: 6, column: 1 },
      { stack: 'Skeletons 10', row: 6, column: 15 }
    ])
  })
})
