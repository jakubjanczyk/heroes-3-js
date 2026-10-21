// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { getHeroEntity, hoverTile } from './adventure-map.utils.js'
import { expectStatusBarText } from './adventure-panels.utils.js'
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
  clickBattleHex,
  closeBattleResults,
  getBattleButton,
  moveActiveStackTo,
  queryRetreatDialog,
  readActiveStack,
  readBattleResultsMessage,
  readBattleResultsSide,
  retreat,
  startBattle
} from './battle.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const HERO_NAME = 'Sir Christian'

const gameDefinitions = {
  hero: { name: HERO_NAME },
  monsters: readGameData('monsters.json')
}

const stack = (creature, count) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// Every damage roll lands on the lowest damage.
// One Angel (speed 12) against 20 Swordsmen (speed 5) on row 6, column 15: the Angel goes first.
const aFight = ({ army = [stack('ANGEL', 1)], monsterCount = 20 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType('SWORDSMAN').withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions(gameDefinitions)

function getRetreatDialog() {
  const dialog = queryRetreatDialog()
  expect(dialog).toBeTruthy()
  return dialog
}

describe('battle retreat behavior', () => {
  test('when the player clicks Retreat then a dialog asks whether to retreat', async () => {
    const { user } = await startBattle(aFight())

    await clickBattleButton(user, 'Retreat')

    expect(within(getRetreatDialog()).getByRole('paragraph').textContent).toBe(
      'Are you sure you want to retreat?'
    )
  })

  test('given the retreat dialog is open when the player cancels then the battle goes on with the same stack turn', async () => {
    const { user } = await startBattle(aFight())

    await retreat(user, { confirm: false })

    expect(queryRetreatDialog()).toBeNull()
    expect(readActiveStack()).toEqual(stackAt('Angel 1', 6, 1))
  })

  test('when the player confirms retreat then the results window says the hero fled and shows them Defeated', async () => {
    const { user } = await startBattle(aFight())

    await retreat(user)

    expect(readBattleResultsSide('Attacker')).toEqual([HERO_NAME, 'Defeated'])
    expect(readBattleResultsSide('Defender')).toEqual(['Swordsmen', 'Victorious'])
    expect(readBattleResultsMessage()).toEqual([`The cowardly ${HERO_NAME} flees from battle.`])
  })

  test('given the hero retreated when the window is closed then the hero is gone from the map', async () => {
    const { user } = await startBattle(aFight())
    await retreat(user)

    await closeBattleResults(user)

    expect(getHeroEntity()).toBeNull()
  })

  test('given the hero retreated then the monster stays on the map with the creatures it had left', async () => {
    const { user } = await startBattle(aFight())
    // The Swordsmen walk up and attack the Angel, which kills 2 of them striking back.
    await moveActiveStackTo(user, 6, 9)
    await retreat(user)
    await closeBattleResults(user)

    await hoverTile(user, 1, 0)

    // 20 Swordsmen were Lots; the 18 left are a Pack.
    expectStatusBarText('Pack of Swordsmen')
  })

  test("given the monster's stack is acting then Retreat is disabled", async () => {
    // The Swordsmen are faster than the Skeleton and open the battle walking toward it.
    await startBattle(aFight({ army: [stack('SKELETON', 1)] }), {
      appConfig: { battleStepDelayMs: 30 }
    })

    expect(getBattleButton('Retreat').disabled).toBe(true)
  })

  test("given the hero's stack is moving then Retreat is disabled", async () => {
    const { user } = await startBattle(aFight(), { appConfig: { battleStepDelayMs: 30 } })

    await clickBattleHex(user, 6, 5)
    await waitMs(40)

    expect(getBattleButton('Retreat').disabled).toBe(true)
  })

  test('given Auto combat is on then Retreat is disabled', async () => {
    const { user } = await startBattle(aFight(), { appConfig: { battleStepDelayMs: 30 } })

    await clickBattleButton(user, 'Auto combat')

    expect(getBattleButton('Retreat').disabled).toBe(true)
  })

  test('when the player presses R then the retreat dialog opens', async () => {
    const { user } = await startBattle(aFight())

    await pressKey(user, 'r')

    expect(queryRetreatDialog()).toBeTruthy()
  })

  test('given the hero retreated when the page reloads then the hero is still gone', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await startBattle(aFight(), { eventLog })
    await retreat(user)
    await closeBattleResults(user)

    await setupMovementBehaviorApp({ loadGameOptions: aFight().build(), eventLog })
    await flushMicrotasks()

    expect(getHeroEntity()).toBeNull()
  })
})
