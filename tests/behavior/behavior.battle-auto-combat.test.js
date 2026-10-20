// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { attackMonsterAt, expectMonsterNotPresent, getHeroEntity } from './adventure-map.utils.js'
import { getHeroInfoBox, readArmySlots } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  pressKey,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleButton,
  queryBattleScreen,
  readActiveStack,
  readBattleStacks,
  readCombatMessages,
  waitForBattleToEnd
} from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// Every damage roll lands on the lowest damage.
const LOWEST_ROLLS = () => 0

// The monster is one stack on row 6, column 15.
const aFight = ({ army, monsterType = 'PIKEMAN', monsterCount = 10 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions({ monsters })

// The Angel starts on row 6, column 1, out of the Pikemen's reach: it flies up to them, takes
// their attack and kills 8 of them striking back.
const anAngelAgainstPikemen = () => aFight({ army: [stack('ANGEL', 1)] })

async function startBattle(scenario, { eventLog, appConfig = {} } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 }, ...appConfig }
  })
  await attackMonsterAt(1, 0)
  return app
}

async function playAutoCombat(user) {
  await clickBattleButton(user, 'Auto combat')
  await waitForBattleToEnd()
}

describe('battle Auto combat behavior', () => {
  test("when the player clicks Auto combat then the hero's stack moves on its own toward the monster", async () => {
    const { user } = await startBattle(anAngelAgainstPikemen(), {
      appConfig: { battleStepDelayMs: 30 }
    })

    await clickBattleButton(user, 'Auto combat')

    expect(readBattleStacks()).not.toContainEqual(stackAt('Angel 1', 6, 1))
  })

  // 10 Archers do 20, +5% for 6 Attack against 5 Defense: 21, halved for the 14 hexes away: 10.
  test("given Auto combat is on then the hero's shooters shoot", async () => {
    const { user } = await startBattle(aFight({ army: [stack('ARCHER', 10)] }), {
      appConfig: { battleStepDelayMs: 30 }
    })

    await clickBattleButton(user, 'Auto combat')

    expect(readCombatMessages()[0]).toBe('The Archers do 10 damage. One Pikeman perishes.')
  })

  test('given Auto combat with a stronger army then the battle is won and the monster is gone', async () => {
    const { user } = await startBattle(aFight({ army: ARMY_THAT_WINS }))

    await playAutoCombat(user)

    expect(queryBattleScreen()).toBeNull()
    expectMonsterNotPresent('monster-1')
  })

  test('given Auto combat with a weaker army then the battle is lost and the hero is gone from the map', async () => {
    const { user } = await startBattle(
      aFight({ army: [stack('SKELETON', 1)], monsterType: 'SWORDSMAN' })
    )

    await playAutoCombat(user)

    expect(queryBattleScreen()).toBeNull()
    expect(getHeroEntity()).toBeNull()
  })

  test('given Auto combat wins after losing creatures then the army keeps what it has left', async () => {
    // The 10 Swordsmen kill the 30 Pikemen in three rounds and lose one of their own to them.
    const { user } = await startBattle(aFight({ army: [stack('SWORDSMAN', 10)], monsterCount: 30 }))

    await playAutoCombat(user)

    expect(readArmySlots(getHeroInfoBox())[0]).toBe('Swordsmen 9')
  })

  test('given Auto combat is running when the player clicks Auto combat again then the next hero stack waits for the player', async () => {
    const { user } = await startBattle(anAngelAgainstPikemen(), {
      appConfig: { battleStepDelayMs: 30 }
    })
    await clickBattleButton(user, 'Auto combat')

    await clickBattleButton(user, 'Auto combat')
    await waitMs(600)
    await flushMicrotasks()

    // Played on, the Angel would have killed the 2 Pikemen left and won.
    expect(readActiveStack().stack).toBe('Angel 1')
  })

  test('given Auto combat is running when the page reloads then it plays on until the battle ends', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = anAngelAgainstPikemen()
    const { user } = await startBattle(scenario, {
      eventLog,
      appConfig: { battleStepDelayMs: 30 }
    })
    await clickBattleButton(user, 'Auto combat')

    await setupMovementBehaviorApp({
      loadGameOptions: scenario.build(),
      eventLog,
      appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } }
    })
    await waitForBattleToEnd()

    expect(queryBattleScreen()).toBeNull()
    expectMonsterNotPresent('monster-1')
  })

  test('when the player presses A then Auto combat plays the battle', async () => {
    const { user } = await startBattle(aFight({ army: ARMY_THAT_WINS }))

    await pressKey(user, 'a')
    await waitForBattleToEnd()

    expect(queryBattleScreen()).toBeNull()
  })
})
