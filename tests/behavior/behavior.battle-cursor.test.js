// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { loadAppStyles } from './app-styles.js'
import {
  attackMonsterAt,
  clickBattleButton,
  clickBattleHex,
  flushMicrotasks,
  getBattleHex,
  getBattleScreen,
  getCursorOver,
  hoverBattleHex,
  moveActiveStackTo,
  pointAtBattleHexSide,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

// Skeletons walk 4 hexes and Angels fly 12. The monster stays one stack.
const aFight = ({ army, monsterType = 'PIKEMAN', monsterCount = 50, stacks = 1 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(stacks).at(1, 0)
    )
    .withDefinitions({ monsters })

async function startBattle(scenario, { battleStepDelayMs = 0 } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: () => 0, battleStepDelayMs }
  })
  await loadAppStyles()
  await attackMonsterAt(1, 0)
  return app
}

// With one stack each, the hero's stack starts on row 6, column 1 and the monster on row 6, column 15.
const MONSTER = { row: 6, column: 15 }

// Once the Angels fly to column 5, the Pikemen walk 4 hexes toward them, to column 11.
const PIKEMEN_CLOSER = { row: 6, column: 11 }

async function flyAngelsCloser(user) {
  await moveActiveStackTo(user, 6, 5)
}

const cursorOverHex = (row, column) => getCursorOver(getBattleHex(row, column))

describe('battle cursor behavior', () => {
  test('given the mouse is over a hex the active walking stack can reach then the cursor is the walk cursor', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await hoverBattleHex(user, 6, 4)

    expect(cursorOverHex(6, 4)).toBe('battle-walk')
  })

  test('given the mouse is over a hex the active flying stack can reach then the cursor is the fly cursor', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2)] }))

    await hoverBattleHex(user, 6, 10)

    expect(cursorOverHex(6, 10)).toBe('battle-fly')
  })

  test('given the mouse is over a corpse the active stack can reach then the cursor is the move cursor', async () => {
    // One Pikeman walks up to the Angels, attacks them from row 4, column 13 and dies to their
    // retaliation; the other stack keeps the battle going.
    const { user } = await startBattle(
      aFight({ army: [stack('ANGEL', 2)], monsterCount: 2, stacks: 2 })
    )
    await moveActiveStackTo(user, 4, 12)

    await hoverBattleHex(user, 4, 13)

    expect(cursorOverHex(4, 13)).toBe('battle-fly')
  })

  test('given the mouse is over a hex out of the active stack reach then the cursor is the blocked cursor', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await hoverBattleHex(user, 6, 10)

    expect(cursorOverHex(6, 10)).toBe('battle-blocked')
  })

  test('given the mouse is over an enemy the active stack cannot reach then the cursor is the blocked cursor', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await hoverBattleHex(user, MONSTER.row, MONSTER.column)

    expect(cursorOverHex(MONSTER.row, MONSTER.column)).toBe('battle-blocked')
  })

  test.each([
    'left',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right'
  ])('given the mouse points at the %s side of an enemy the stack can attack then the sword attacks from that side', async (side) => {
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2)] }))
    await flyAngelsCloser(user)

    await pointAtBattleHexSide(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column, side)

    expect(cursorOverHex(PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)).toBe(
      `battle-attack-from-${side}`
    )
  })

  test('given another stack stands on the side pointed at then the sword attacks from the nearest side the stack can reach', async () => {
    // Both Angel stacks are as fast; the one in the first slot acts first.
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2), stack('ANGEL', 1)] }))
    await moveActiveStackTo(user, 6, 5)
    await moveActiveStackTo(user, 6, 4)
    await moveActiveStackTo(user, 6, 10)

    await pointAtBattleHexSide(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column, 'left')

    expect(cursorOverHex(PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)).toBe(
      'battle-attack-from-top-left'
    )
  })

  describe('shooting', () => {
    // Archers and Pikemen are as fast: once the Archers wait, the Pikemen walk to column 11, 10
    // hexes from them.
    test('given the mouse is over a monster the active shooter can shoot then the cursor is the shoot arrow', async () => {
      const { user } = await startBattle(aFight({ army: [stack('ARCHER', 10)] }))
      await clickBattleButton(user, 'Wait')

      await hoverBattleHex(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)

      expect(cursorOverHex(PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)).toBe('battle-shoot')
    })

    test('given the monster is more than 10 hexes away then the cursor is the broken arrow', async () => {
      const { user } = await startBattle(aFight({ army: [stack('ARCHER', 10)] }))

      await hoverBattleHex(user, MONSTER.row, MONSTER.column)

      expect(cursorOverHex(MONSTER.row, MONSTER.column)).toBe('battle-shoot-penalty')
    })

    // The Swordsman (speed 5) walks to column 10, the Archers to column 5, and the Swordsman next
    // to them, to column 6.
    test('given an enemy stands next to the shooter then the cursor over that enemy is the sword', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ARCHER', 10)], monsterType: 'SWORDSMAN', monsterCount: 1 })
      )
      await moveActiveStackTo(user, 6, 5)

      await pointAtBattleHexSide(user, 6, 6, 'left')

      expect(cursorOverHex(6, 6)).toBe('battle-attack-from-left')
    })
  })

  test('given the mouse is over one of the player own stacks then the cursor is the question mark', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10), stack('ANGEL', 1)] }))

    await hoverBattleHex(user, 3, 1)

    expect(cursorOverHex(3, 1)).toBe('battle-query')
  })

  test('given the mouse is over the hero then the cursor is the hero helmet', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))
    const hero = within(getBattleScreen()).getByRole('img', { name: 'Hero' })

    await user.hover(hero)

    expect(getCursorOver(hero)).toBe('hero')
  })

  test('given a stack is moving then the cursor over the battlefield is the arrow', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }), {
      battleStepDelayMs: 30
    })

    await clickBattleHex(user, 6, 4)
    await hoverBattleHex(user, 6, 3)

    expect(cursorOverHex(6, 3)).toBe('arrow')
    await waitMs(150)
    await flushMicrotasks()
  })

  test('given the mouse stays on the hex a stack moved to when the next stack gets the turn then the cursor changes without the mouse moving', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2), stack('SKELETON', 10)] }))
    await hoverBattleHex(user, 6, 8)

    await moveActiveStackTo(user, 6, 8)

    expect(cursorOverHex(6, 8)).toBe('battle-query')
  })
})
