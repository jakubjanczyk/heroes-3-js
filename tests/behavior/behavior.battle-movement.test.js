// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  attackMonsterAt,
  clickBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  isBattleHexReachable,
  moveActiveStackTo,
  readActiveStack,
  readBattleStacks,
  readGameData,
  readReachableHexes,
  recordStackHexes,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const gameDefinitions = { monsters: readGameData('monsters.json') }

const stack = (creature, count) => ({ creature, count })

const aFight = ({ army, monsterType = 'SKELETON' }) =>
  aScenario()
    .withSize(3)
    .withEntities(aHero().withArmy(army), aMonster().withType(monsterType).at(1, 0))
    .withDefinitions(gameDefinitions)

async function startBattle(scenario, { battleStepDelayMs = 0 } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { battleStepDelayMs }
  })
  await attackMonsterAt(1, 0)
  return app
}

const hexesByRow = (columnRangeByRow) =>
  Object.entries(columnRangeByRow).flatMap(([row, [first, last]]) =>
    Array.from({ length: last - first + 1 }, (_, index) => ({
      row: Number(row),
      column: first + index
    }))
  )

describe('battle movement behavior', () => {
  test('given a stack is active then the hexes it can reach within its speed are highlighted', async () => {
    // Skeletons have speed 4.
    await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    expect(readReachableHexes()).toEqual(
      hexesByRow({
        2: [1, 3],
        3: [1, 3],
        4: [1, 4],
        5: [1, 4],
        6: [2, 5],
        7: [1, 4],
        8: [1, 4],
        9: [1, 3],
        10: [1, 3]
      })
    )
  })

  test('given a stack of speed 4 then a hex 4 steps away is reachable and one 5 steps away is not', async () => {
    await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    expect(isBattleHexReachable(6, 5)).toBe(true)
    expect(isBattleHexReachable(6, 6)).toBe(false)
  })

  test('given another stack stands in the way then the active stack cannot move onto it and reaches hexes beyond it only by walking around it', async () => {
    // Marksmen have speed 6 and go first; then the Skeletons, with the Marksmen right in front.
    const { user } = await startBattle(
      aFight({ army: [stack('MARKSMAN', 5), stack('SKELETON', 10)] })
    )
    await moveActiveStackTo(user, 9, 2)

    expect(readActiveStack()).toEqual({ stack: 'Skeletons 10', row: 9, column: 1 })
    expect(isBattleHexReachable(9, 2)).toBe(false)
    expect(isBattleHexReachable(9, 4)).toBe(true)
    expect(isBattleHexReachable(9, 5)).toBe(false)
  })

  test('given a flying stack then it reaches any free hex within its speed even behind other stacks', async () => {
    // Angels fly with speed 12. The Marksmen end up right in front of them.
    const { user } = await startBattle(
      aFight({ army: [stack('ANGEL', 2), stack('MARKSMAN', 5)], monsterType: 'PIKEMAN' })
    )
    await moveActiveStackTo(user, 6, 2)
    await moveActiveStackTo(user, 6, 3)

    expect(readActiveStack()).toEqual({ stack: 'Angels 2', row: 6, column: 2 })
    expect(isBattleHexReachable(6, 14)).toBe(true)
    expect(isBattleHexReachable(6, 3)).toBe(false)
  })

  test('when the player clicks a highlighted hex then the active stack moves there', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await moveActiveStackTo(user, 4, 3)

    expect(readBattleStacks()).toContainEqual({ stack: 'Skeletons 10', row: 4, column: 3 })
  })

  test('given a walking stack when it moves then it passes through each hex of its path in turn', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('SKELETON', 10)], monsterType: 'PIKEMAN' }),
      { battleStepDelayMs: 5 }
    )
    const stopRecording = recordStackHexes('Skeletons')

    await clickBattleHex(user, 6, 5)
    await waitMs(60)

    expect(stopRecording()).toEqual([
      { row: 6, column: 2 },
      { row: 6, column: 3 },
      { row: 6, column: 4 },
      { row: 6, column: 5 }
    ])
  })

  test('given a flying stack when it moves then it goes straight to the target hex', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2)] }), {
      battleStepDelayMs: 5
    })
    const stopRecording = recordStackHexes('Angels')

    await clickBattleHex(user, 6, 8)
    await waitMs(60)

    expect(stopRecording()).toEqual([{ row: 6, column: 8 }])
  })

  test('given a stack is moving when the player clicks another hex then nothing changes and the next stack becomes active only after the move ends', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('SKELETON', 10), stack('PIKEMAN', 3)] }),
      { battleStepDelayMs: 30 }
    )

    await clickBattleHex(user, 3, 5)
    await clickBattleHex(user, 2, 1)

    expect(readActiveStack().stack).toBe('Skeletons 10')

    await waitMs(200)

    expect(readBattleStacks()).toContainEqual({ stack: 'Skeletons 10', row: 3, column: 5 })
    expect(readActiveStack()).toEqual({ stack: 'Pikemen 3', row: 9, column: 1 })
  })

  test('when the player clicks a hex out of reach then the stack stays and is still active', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await moveActiveStackTo(user, 6, 6)

    expect(readActiveStack()).toEqual({ stack: 'Skeletons 10', row: 6, column: 1 })
  })

  test('when the player hovers a reachable hex then the status bar says Move Skeletons here', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await hoverBattleHex(user, 6, 3)

    expect(getBattleStatusBarText()).toBe('Move Skeletons here')
  })

  test('given a flying stack when the player hovers a reachable hex then the status bar says Fly Angels here', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 2)] }))

    await hoverBattleHex(user, 6, 3)

    expect(getBattleStatusBarText()).toBe('Fly Angels here')
  })

  test('when the player hovers a hex out of reach then the status bar is empty', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 10)] }))

    await hoverBattleHex(user, 6, 3)
    await hoverBattleHex(user, 6, 10)

    expect(getBattleStatusBarText()).toBe('')
  })

  test('given the player hovers a hex when the stack moves onto it then the status bar is empty', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('SKELETON', 10)], monsterType: 'PIKEMAN' })
    )
    await hoverBattleHex(user, 6, 3)

    await moveActiveStackTo(user, 6, 3)

    expect(getBattleStatusBarText()).toBe('')
  })
})
