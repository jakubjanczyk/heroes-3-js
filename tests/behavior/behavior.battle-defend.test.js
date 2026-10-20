// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  attackMonsterAt,
  clickBattleButton,
  clickBattleHex,
  createMemoryEventLog,
  flushMicrotasks,
  getBattleButton,
  moveActiveStackTo,
  pressKey,
  readActiveStack,
  readCombatMessages,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// Every damage roll lands on the lowest damage.
const LOWEST_ROLLS = () => 0

// The monster is one stack on row 6, column 15.
const aFight = ({ army, monsterType = 'SWORDSMAN', monsterCount = 10 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions({ monsters })

async function startBattle(scenario, { eventLog, appConfig = {} } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS, ...appConfig }
  })
  await attackMonsterAt(1, 0)
  return app
}

async function reload(scenario, eventLog) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS }
  })
  await flushMicrotasks()
  return app
}

// The Angel (speed 12) acts first, then the Skeletons (speed 4, ahead of the Pikemen on a tie).
const anAngelAndSkeletons = () =>
  aFight({ army: [stack('ANGEL', 1), stack('SKELETON', 10)], monsterType: 'PIKEMAN' })

// The Angel (Defense 20) flies next to the Swordsmen, which walk up and do 45 damage to it; it
// strikes back for 70 and 2 of the 10 die.
async function fightAngelAgainstSwordsmen() {
  const app = await startBattle(aFight({ army: [stack('ANGEL', 1)] }))
  await moveActiveStackTo(app.user, 6, 9)
  return app
}

describe('battle Defend behavior', () => {
  test('given a hero stack is active when the player clicks Defend then the next stack becomes active', async () => {
    const { user } = await startBattle(anAngelAndSkeletons())

    await clickBattleButton(user, 'Defend')

    expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 9, 1))
  })

  test('given a stack is defending when the monster attacks it then it takes 20% more Defense into account', async () => {
    const { user } = await fightAngelAgainstSwordsmen()

    await clickBattleButton(user, 'Defend')

    // 8 Swordsmen deal 48: -35% for 10 Attack against 24 Defense, where 20 would be -25% (36).
    expect(readCombatMessages().slice(2)).toEqual([
      'The Swordsmen do 31 damage.',
      'The Angel does 70 damage. 2 Swordsmen perish.'
    ])
  })

  test('given a stack is defending then the bonus is at least 1 Defense point even when 20% rounds down to 0', async () => {
    const { user } = await startBattle(aFight({ army: [stack('SKELETON', 30)] }))

    // The Swordsmen (speed 5) walk up over two rounds while the Skeletons (Defense 4) defend.
    await clickBattleButton(user, 'Defend')
    await clickBattleButton(user, 'Defend')

    // 10 Swordsmen deal 60: +25% for 10 Attack against 5 Defense, where 4 would be +30% (80).
    expect(readCombatMessages()[0]).toBe('The Swordsmen do 75 damage. 12 Skeletons perish.')
  })

  test('given a stack defended when its next turn comes then the monster attacks deal full damage again', async () => {
    const { user } = await fightAngelAgainstSwordsmen()
    await clickBattleButton(user, 'Defend')

    await clickBattleButton(user, 'Wait')

    // 6 Swordsmen deal 36, -25% for 10 Attack against 20 Defense.
    expect(readCombatMessages().slice(4)).toEqual([
      'The Swordsmen do 27 damage.',
      'The Angel does 70 damage. 2 Swordsmen perish.'
    ])
  })

  test('given a monster stack is acting then Defend is disabled', async () => {
    const { user } = await startBattle(aFight({ army: [stack('ANGEL', 1)] }), {
      appConfig: { battleStepDelayMs: 30 }
    })
    await clickBattleHex(user, 6, 2)

    // The Angel has landed and the Swordsmen are walking.
    await waitMs(60)

    expect(getBattleButton('Defend').disabled).toBe(true)
  })

  test('given a stack is defending when the page reloads then it still takes the reduced damage', async () => {
    // Two Angels for the hero, so the second one's turn comes between the first defending and the
    // monster's Angel attacking it. Equal Attack and Defense: 50 damage, or 45 against 24 Defense.
    const eventLog = createMemoryEventLog()
    const scenario = aFight({
      army: [stack('ANGEL', 1), stack('ANGEL', 1)],
      monsterType: 'ANGEL',
      monsterCount: 1
    })
    const first = await startBattle(scenario, { eventLog })
    await moveActiveStackTo(first.user, 6, 9)
    await clickBattleButton(first.user, 'Defend')
    await clickBattleButton(first.user, 'Defend')

    const { user } = await reload(scenario, eventLog)
    await clickBattleButton(user, 'Defend')

    expect(readCombatMessages().slice(2)).toEqual([
      'The Angel does 45 damage.',
      'The Angel does 50 damage.'
    ])
  })

  test.each([
    ['D', 'd'],
    ['Space', ' ']
  ])('when the player presses %s then the active stack defends', async (_, key) => {
    const { user } = await startBattle(anAngelAndSkeletons())

    await pressKey(user, key)

    expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 9, 1))
  })
})
