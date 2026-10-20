// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { attackMonsterAt } from './adventure-map.utils.js'
import { readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  hoverBattleHex,
  moveActiveStackTo,
  readHighlightedBattleHexes,
  tapBattleHexSide
} from './battle.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

// The monster stays one stack.
const aFight = ({ army, monsterType = 'PIKEMAN', monsterCount = 50 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions({ monsters })

async function startBattle(scenario) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: () => 0, fadeOutMsByKind: { MONSTER: 0 } }
  })
  await loadAppStyles()
  await attackMonsterAt(1, 0)
  return app
}

// With one stack each, the hero's stack starts on row 6, column 1 and the monster on row 6,
// column 15. Once the Angels fly to column 5, the Pikemen walk 4 hexes toward them, to column 11.
const MONSTER = { row: 6, column: 15 }
const PIKEMEN_CLOSER = { row: 6, column: 11 }

describe('battle hover highlight behavior', () => {
  test('given the mouse is over an enemy the active stack can attack then only the enemy hex is highlighted', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2)] }))
    await moveActiveStackTo(user, 6, 5)

    await hoverBattleHex(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)

    expect(readHighlightedBattleHexes()).toEqual([PIKEMEN_CLOSER])
  })

  test('given the mouse is over an enemy the active stack can shoot then the enemy hex is highlighted', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ARCHER', 10)] }))

    await hoverBattleHex(user, MONSTER.row, MONSTER.column)

    expect(readHighlightedBattleHexes()).toEqual([MONSTER])
  })

  // Cavaliers (speed 7) go first and stand on row 6, columns 8 and 9.
  test('given the mouse is over a double-wide enemy then both its hexes are highlighted', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('ARCHER', 10)], monsterType: 'CAVALIER', monsterCount: 2 })
    )

    await hoverBattleHex(user, 6, 9)

    expect(readHighlightedBattleHexes()).toEqual([
      { row: 6, column: 8 },
      { row: 6, column: 9 }
    ])
  })

  test('given the mouse is over an enemy the active stack cannot reach then no hex is highlighted', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await hoverBattleHex(user, MONSTER.row, MONSTER.column)

    expect(readHighlightedBattleHexes()).toEqual([])
  })

  test('given the mouse moves off the enemy then its hex is no longer highlighted', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ARCHER', 10)] }))
    await hoverBattleHex(user, MONSTER.row, MONSTER.column)

    await hoverBattleHex(user, 1, 10)

    expect(readHighlightedBattleHexes()).toEqual([])
  })

  test('given the mouse is over a hex the stack can move to then that hex is highlighted', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await hoverBattleHex(user, 6, 3)

    expect(readHighlightedBattleHexes()).toEqual([{ row: 6, column: 3 }])
  })

  // Both Angel stacks fly closer; the first then attacks the Pikemen with a tap, and the second
  // gets the turn with the Pikemen still in its reach.
  test('given the player taps an enemy on a touch screen then its hex is not highlighted for the next stack', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2), stack('ANGEL', 1)] }))
    await moveActiveStackTo(user, 6, 5)
    await moveActiveStackTo(user, 6, 4)

    await tapBattleHexSide(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column, 'left')

    expect(readHighlightedBattleHexes()).toEqual([])
  })
})
