// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  attackBattleHexFrom,
  attackMonsterAt,
  createMemoryEventLog,
  flushMicrotasks,
  isBattleHexReachable,
  moveActiveStackTo,
  readActiveStack,
  readBattleStacks,
  readCombatMessages,
  readGameData,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

// Every damage roll lands on the lowest damage.
const LOWEST_ROLLS = () => 0

// Cavaliers, Champions and Royal Griffins are double-wide; Angels, Pikemen and Skeletons are not.
// The monster stays one stack.
const aFight = ({ army, monsterType = 'PIKEMAN', monsterCount = 10 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions({ monsters })

async function startBattle(scenario, { eventLog } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS }
  })
  await attackMonsterAt(1, 0)
  return app
}

const stackAt = (name, row, column) => ({ stack: name, row, column })

describe('battle double-wide creatures behavior', () => {
  test('given double-wide creatures on both sides when battle opens then each stands on two hexes with its back half behind it', async () => {
    await startBattle(aFight({ army: [stack('CAVALIER', 5)], monsterType: 'CHAMPION' }))

    expect(readBattleStacks()).toEqual(
      expect.arrayContaining([
        stackAt('Cavaliers (back half)', 6, 0),
        stackAt('Cavaliers 5', 6, 1),
        stackAt('Champions 10', 6, 15),
        stackAt('Champions (back half)', 6, 16)
      ])
    )
  })

  test('given a double-wide stack when the player moves it then its front half goes to the hex and its back half follows', async () => {
    const { user } = await startBattle(aFight({ army: [stack('CAVALIER', 5)] }))

    await moveActiveStackTo(user, 6, 5)

    expect(readBattleStacks()).toEqual(
      expect.arrayContaining([stackAt('Cavaliers (back half)', 6, 4), stackAt('Cavaliers 5', 6, 5)])
    )
  })

  test('given a double-wide stack when the player clicks a hex only its back half fits on then it moves with its back half there', async () => {
    // The Skeletons stand on 9,1, so the Cavalier's back half would have nowhere to go on 9,2.
    const { user } = await startBattle(
      aFight({ army: [stack('CAVALIER', 1), stack('SKELETON', 1)] })
    )

    await moveActiveStackTo(user, 9, 2)

    expect(readBattleStacks()).toEqual(
      expect.arrayContaining([stackAt('Cavalier (back half)', 9, 2), stackAt('Cavalier 1', 9, 3)])
    )
  })

  test('given a free hex within reach with stacks on both sides then a double-wide stack cannot move there', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('CAVALIER', 1), stack('SKELETON', 1), stack('SKELETON', 1)] })
    )
    await moveActiveStackTo(user, 3, 3)
    await moveActiveStackTo(user, 7, 1)
    await moveActiveStackTo(user, 7, 3)

    expect(readActiveStack()).toEqual(stackAt('Cavalier 1', 3, 3))
    expect(isBattleHexReachable(7, 2)).toBe(false)
  })

  test('given a double-wide stack then other stacks cannot move onto either half of it', async () => {
    // Angels are faster than Cavaliers, so they act first in every round.
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 1), stack('CAVALIER', 1)] }))
    await moveActiveStackTo(user, 3, 2)
    await moveActiveStackTo(user, 9, 5)

    expect([isBattleHexReachable(9, 4), isBattleHexReachable(9, 5)]).toEqual([false, false])
  })

  test('given a double-wide monster when the player clicks its back half then the stack attacks it', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('ANGEL', 2)], monsterType: 'CHAMPION', monsterCount: 5 })
    )
    await moveActiveStackTo(user, 6, 5)

    await attackBattleHexFrom(user, 6, 16, 'top-left')

    // 100 damage, +20% for 20 Attack against 16 Defense, against 100 health each.
    expect(readCombatMessages()[0]).toBe('The Angels do 120 damage. One Champion perishes.')
  })

  test('given the front half has no room on the side pointed at then a double-wide stack attacks with its back half there', async () => {
    // Angels are faster than Royal Griffins; on 5,13 they leave no room for the back half of
    // Royal Griffins standing on 5,14.
    const { user } = await startBattle(
      aFight({ army: [stack('ANGEL', 1), stack('ROYAL_GRIFFIN', 10)] })
    )
    await moveActiveStackTo(user, 4, 8)
    await moveActiveStackTo(user, 7, 8)
    await moveActiveStackTo(user, 5, 13)

    await attackBattleHexFrom(user, 6, 15, 'top-left')

    expect(readBattleStacks()).toEqual(
      expect.arrayContaining([
        stackAt('Royal Griffins (back half)', 5, 14),
        stackAt('Royal Griffins 10', 5, 15)
      ])
    )
  })

  test('given a double-wide stack moved when the page reloads then it still stands on both hexes', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aFight({ army: [stack('CAVALIER', 5)] })
    const { user } = await startBattle(scenario, { eventLog })
    await moveActiveStackTo(user, 6, 5)

    await setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })
    await flushMicrotasks()

    expect(readBattleStacks()).toEqual(
      expect.arrayContaining([stackAt('Cavaliers (back half)', 6, 4), stackAt('Cavaliers 5', 6, 5)])
    )
  })
})
