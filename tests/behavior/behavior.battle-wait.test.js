// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import { createMemoryEventLog, pressKey, readGameData, waitMs } from './app.utils.js'
import {
  clickBattleButton,
  clickBattleHex,
  getBattleButton,
  moveActiveStackTo,
  readActiveStack,
  readBattleStacks,
  reloadBattle,
  startBattle
} from './battle.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// 10 Pikemen (speed 4) stand on row 6, column 15. With two hero stacks the first starts on row 3
// and the second on row 9, both in column 1.
const aFight = ({ army }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType('PIKEMAN').withCount(10).withStacks(1).at(1, 0)
    )
    .withDefinitions({ monsters })

// The Angel (speed 12) acts first, then the Skeletons (speed 4, ahead of the Pikemen on a tie).
const anAngelAndSkeletons = () => aFight({ army: [stack('ANGEL', 1), stack('SKELETON', 10)] })

const anAngel = () => aFight({ army: [stack('ANGEL', 1)] })

describe('battle Wait behavior', () => {
  test('given a hero stack is active when the player clicks Wait then the next stack in the turn order becomes active', async () => {
    const { user } = await startBattle(anAngelAndSkeletons())

    await clickBattleButton(user, 'Wait')

    expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 9, 1))
  })

  test('given a stack waited then it acts after every stack that did not wait, in the same round', async () => {
    const { user } = await startBattle(anAngelAndSkeletons())
    await clickBattleButton(user, 'Wait')

    await moveActiveStackTo(user, 9, 2)

    expect(readBattleStacks()).not.toContainEqual(stackAt('Pikemen 10', 6, 15))
    expect(readActiveStack()).toEqual(stackAt('Angel 1', 3, 1))
  })

  test('given two stacks waited then the slower one acts first', async () => {
    const { user } = await startBattle(anAngelAndSkeletons())
    await clickBattleButton(user, 'Wait')

    await clickBattleButton(user, 'Wait')

    // The Pikemen took their turn in between.
    expect(readBattleStacks()).not.toContainEqual(stackAt('Pikemen 10', 6, 15))
    expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 9, 1))
  })

  test('given a stack waited when its turn comes back then Wait is disabled for it', async () => {
    const { user } = await startBattle(anAngel())

    await clickBattleButton(user, 'Wait')

    expect(readActiveStack()).toEqual(stackAt('Angel 1', 6, 1))
    expect(getBattleButton('Wait').disabled).toBe(true)
  })

  test('given a stack waited this round when the next round starts then it can wait again', async () => {
    const { user } = await startBattle(anAngel())
    await clickBattleButton(user, 'Wait')

    await moveActiveStackTo(user, 6, 2)

    expect(readActiveStack()).toEqual(stackAt('Angel 1', 6, 2))
    expect(getBattleButton('Wait').disabled).toBe(false)
  })

  test('given a monster stack is acting then Wait is disabled', async () => {
    const { user } = await startBattle(anAngel(), { appConfig: { battleStepDelayMs: 30 } })
    await clickBattleHex(user, 6, 2)

    // The Angel has landed and the Pikemen are walking.
    await waitMs(60)

    expect(getBattleButton('Wait').disabled).toBe(true)
  })

  test('given a stack waited when the page reloads then the same stack is active and the waited stack still acts at the end of the round', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = anAngelAndSkeletons()
    const first = await startBattle(scenario, { eventLog })
    await clickBattleButton(first.user, 'Wait')

    const { user } = await reloadBattle(scenario, { eventLog: eventLog })

    expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 9, 1))
    await moveActiveStackTo(user, 9, 2)
    expect(readActiveStack()).toEqual(stackAt('Angel 1', 3, 1))
  })

  test('when the player presses W then the active stack waits', async () => {
    const { user } = await startBattle(anAngelAndSkeletons())

    await pressKey(user, 'w')

    expect(readActiveStack()).toEqual(stackAt('Skeletons 10', 9, 1))
  })
})
