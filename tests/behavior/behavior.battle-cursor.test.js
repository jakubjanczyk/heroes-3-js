// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { loadAppStyles } from './app-styles.js'
import {
  attackBattleHexFrom,
  attackMonsterAt,
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
const aFight = ({ army, monsterCount = 50, stacks = 1 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType('PIKEMAN').withCount(monsterCount).withStacks(stacks).at(1, 0)
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
    // Two Angels kill a stack of one Pikeman; the other stack keeps the battle going.
    const { user } = await startBattle(
      aFight({ army: [stack('ANGEL', 2)], monsterCount: 2, stacks: 2 })
    )
    await moveActiveStackTo(user, 4, 12)
    await attackBattleHexFrom(user, 3, 15, 'left')

    await hoverBattleHex(user, 3, 15)

    expect(cursorOverHex(3, 15)).toBe('battle-fly')
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
    await moveActiveStackTo(user, 6, 10)

    await pointAtBattleHexSide(user, MONSTER.row, MONSTER.column, side)

    expect(cursorOverHex(MONSTER.row, MONSTER.column)).toBe(`battle-attack-from-${side}`)
  })

  test('given another stack stands on the side pointed at then the sword attacks from the nearest side the stack can reach', async () => {
    // Both Angel stacks are as fast; the one in the first slot acts first.
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2), stack('ANGEL', 1)] }))
    await moveActiveStackTo(user, 6, 5)
    await moveActiveStackTo(user, 6, 4)
    await moveActiveStackTo(user, 6, 14)

    await pointAtBattleHexSide(user, MONSTER.row, MONSTER.column, 'left')

    expect(cursorOverHex(MONSTER.row, MONSTER.column)).toBe('battle-attack-from-top-left')
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
