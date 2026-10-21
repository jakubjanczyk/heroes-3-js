// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleHex,
  moveActiveStackTo,
  readActiveStack,
  readBattleStacks,
  startBattle
} from './battle.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const gameDefinitions = { monsters: readGameData('monsters.json') }

const stack = (creature, count) => ({ creature, count })

// The monster stays one stack.
const aFight = ({ army, monsterType = 'SKELETON', monsterCount = 10 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions(gameDefinitions)

describe('battle turn order behavior', () => {
  test('given battle opens then the fastest stack is the active one and is highlighted', async () => {
    // Skeletons have speed 4, Marksmen 6, Pikemen 4.
    await startBattle(
      aFight({ army: [stack('SKELETON', 10), stack('MARKSMAN', 5)], monsterType: 'PIKEMAN' })
    )

    expect(readActiveStack()).toEqual({ stack: 'Marksmen 5', row: 9, column: 1 })
  })

  test('given a hero stack and the monster have the same speed then the hero stack acts first', async () => {
    await startBattle(aFight({ army: [stack('SKELETON', 10)], monsterType: 'PIKEMAN' }))

    expect(readActiveStack()).toEqual({ stack: 'Skeletons 10', row: 6, column: 1 })
  })

  test('given two hero stacks have the same speed then the one in the earlier army slot acts first', async () => {
    await startBattle(
      aFight({ army: [null, stack('PIKEMAN', 3), stack('SKELETON', 7)], monsterType: 'SWORDSMAN' })
    )

    expect(readActiveStack()).toEqual({ stack: 'Pikemen 3', row: 3, column: 1 })
  })

  test('given a stack is active when it moves then the next fastest stack becomes active', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('SKELETON', 10), stack('MARKSMAN', 5)], monsterType: 'PIKEMAN' })
    )

    await moveActiveStackTo(user, 9, 3)

    expect(readActiveStack()).toEqual({ stack: 'Skeletons 10', row: 3, column: 1 })
  })

  test('given every stack has acted then a new round starts with the fastest stack active again', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('MARKSMAN', 5), stack('SKELETON', 10)], monsterType: 'PIKEMAN' })
    )

    await moveActiveStackTo(user, 3, 3)
    await moveActiveStackTo(user, 9, 3)

    expect(readActiveStack()).toEqual({ stack: 'Marksmen 5', row: 3, column: 3 })
  })

  test('given a battle with moved stacks when the page reloads then the stacks stand where they moved and the same stack is active', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aFight({
      army: [stack('MARKSMAN', 5), stack('SKELETON', 10)],
      monsterType: 'PIKEMAN'
    })
    const { user } = await startBattle(scenario, { eventLog })
    await moveActiveStackTo(user, 3, 3)

    await setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })
    await flushMicrotasks()

    expect(readBattleStacks()).toEqual([
      { stack: 'Marksmen 5', row: 3, column: 3 },
      { stack: 'Pikemen 10', row: 6, column: 15 },
      { stack: 'Skeletons 10', row: 9, column: 1 }
    ])
    expect(readActiveStack()).toEqual({ stack: 'Skeletons 10', row: 9, column: 1 })
  })

  test('given a stack is moving when the page reloads then it stands where it was going and the next stack is active', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aFight({ army: [stack('SKELETON', 10), stack('PIKEMAN', 3)] })
    const { user } = await startBattle(scenario, {
      eventLog,
      appConfig: { battleStepDelayMs: 30 }
    })
    await clickBattleHex(user, 3, 5)
    await waitMs(40)

    await setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })
    await flushMicrotasks()

    expect(readBattleStacks()).toContainEqual({ stack: 'Skeletons 10', row: 3, column: 5 })
    expect(readActiveStack()).toEqual({ stack: 'Pikemen 3', row: 9, column: 1 })
  })
})
