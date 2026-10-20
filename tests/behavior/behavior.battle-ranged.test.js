// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { attackMonsterAt } from './adventure-map.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  attackBattleHexFrom,
  clickBattleButton,
  clickBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  moveActiveStackTo,
  readBattleStacks,
  readCombatMessages
} from './battle.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const monsters = readGameData('monsters.json')

const stack = (creature, count) => ({ creature, count })

// Every damage roll lands on the lowest damage.
const LOWEST_ROLLS = () => 0

// The monster stays one stack unless a test says otherwise. It stands on map tile (1, 0).
const aFight = ({ army, monsterType = 'PIKEMAN', monsterCount = 50, monsterStacks = 1 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(monsterStacks).at(1, 0)
    )
    .withDefinitions({ monsters })

async function startBattle(scenario, { eventLog } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } }
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

async function shootAt(user, row, column) {
  await clickBattleHex(user, row, column)
  await waitMs()
  await flushMicrotasks()
}

// With one stack each, the hero's stack starts on row 6, column 1 and the monster on row 6,
// column 15: 14 hexes away. Pikemen (speed 4) walk 4 hexes a turn toward the shooter, to column
// 11, 10 hexes from it.
const PIKEMEN_AT_START = { row: 6, column: 15 }
const PIKEMEN_CLOSER = { row: 6, column: 11 }

const tenArchersAgainstPikemen = () => aFight({ army: [stack('ARCHER', 10)] })

// Archers and Pikemen are as fast; the Archers, the attacker's, go first. Waiting lets the
// Pikemen walk within 10 hexes before the Archers act.
async function waitForPikemenToComeCloser(user) {
  await clickBattleButton(user, 'Wait')
}

// A Swordsman (speed 5) goes first: it walks to column 10, the Archers to column 5, and then it
// walks next to them, to column 6, and attacks them.
const tenArchersAgainstASwordsman = () =>
  aFight({ army: [stack('ARCHER', 10)], monsterType: 'SWORDSMAN', monsterCount: 1 })

const SWORDSMAN_NEXT_TO_ARCHERS = { row: 6, column: 6 }

async function letTheSwordsmanComeNextToTheArchers(user) {
  await moveActiveStackTo(user, 6, 5)
}

describe('battle ranged attack behavior', () => {
  describe('shooting', () => {
    test('given an Archer stack with shots when the player clicks a monster across the battlefield then it shoots without moving', async () => {
      const { user } = await startBattle(tenArchersAgainstPikemen())

      await shootAt(user, PIKEMEN_AT_START.row, PIKEMEN_AT_START.column)

      expect(readBattleStacks()).toContainEqual(
        expect.objectContaining({ stack: expect.stringMatching(/^Archers/), row: 6, column: 1 })
      )
      expect(readCombatMessages()[0]).toMatch(/^The Archers do/)
    })

    test('given a stack is shot then it does not strike back', async () => {
      const { user } = await startBattle(tenArchersAgainstPikemen())

      await shootAt(user, PIKEMEN_AT_START.row, PIKEMEN_AT_START.column)

      expect(readCombatMessages()).toHaveLength(1)
    })

    // 10 Archers do 20 at their lowest roll, +5% for 6 Attack against 5 Defense: 21, halved for
    // the 14 hexes to the Pikemen: 10.
    test('given the target is more than 10 hexes away then the shot does half damage', async () => {
      const { user } = await startBattle(tenArchersAgainstPikemen())

      await shootAt(user, PIKEMEN_AT_START.row, PIKEMEN_AT_START.column)

      expect(readCombatMessages()[0]).toBe('The Archers do 10 damage. One Pikeman perishes.')
    })

    test('given the target is 10 hexes away then the shot does full damage', async () => {
      const { user } = await startBattle(tenArchersAgainstPikemen())
      await waitForPikemenToComeCloser(user)

      await shootAt(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)

      expect(readCombatMessages()[0]).toBe('The Archers do 21 damage. 2 Pikemen perish.')
    })

    test('given Marksmen shoot then they shoot twice', async () => {
      const { user } = await startBattle(aFight({ army: [stack('MARKSMAN', 10)] }))

      await shootAt(user, PIKEMEN_AT_START.row, PIKEMEN_AT_START.column)

      expect(readCombatMessages()).toEqual([
        'The Marksmen do 10 damage. One Pikeman perishes.',
        'The Marksmen do 10 damage. One Pikeman perishes.'
      ])
    })
  })

  describe('shots', () => {
    test('given a shooter shoots then it has one shot fewer', async () => {
      const { user } = await startBattle(tenArchersAgainstPikemen())
      await shootAt(user, PIKEMEN_AT_START.row, PIKEMEN_AT_START.column)

      await hoverBattleHex(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)

      expect(getBattleStatusBarText()).toBe('Shoot Pikemen (11 shots left, damage 21-31)')
    })

    test('given Marksmen shoot twice then they use two shots', async () => {
      const { user } = await startBattle(aFight({ army: [stack('MARKSMAN', 10)] }))
      await shootAt(user, PIKEMEN_AT_START.row, PIKEMEN_AT_START.column)

      await hoverBattleHex(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)

      expect(getBattleStatusBarText()).toBe('Shoot Pikemen (22 shots left, damage 21-31)')
    })
  })

  describe('melee penalty', () => {
    // The Archers' 17 (20, -15% for 6 Attack against 12 Defense) are halved: 8.
    test('given an enemy stands next to the shooter when the player clicks that enemy then it attacks in melee at half damage', async () => {
      const { user } = await startBattle(tenArchersAgainstASwordsman())
      await letTheSwordsmanComeNextToTheArchers(user)

      await attackBattleHexFrom(
        user,
        SWORDSMAN_NEXT_TO_ARCHERS.row,
        SWORDSMAN_NEXT_TO_ARCHERS.column,
        'left'
      )

      expect(readCombatMessages()[2]).toBe('The Archers do 8 damage.')
    })

    // The Archers walk to row 4, column 4, then to row 3, column 7. The upper Pikemen stack walks
    // next to them and attacks; the lower one stops on row 6, column 9.
    test('given an enemy stands next to the shooter then it cannot shoot another enemy further away', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ARCHER', 10)], monsterCount: 20, monsterStacks: 2 })
      )
      await moveActiveStackTo(user, 4, 4)
      await moveActiveStackTo(user, 3, 7)

      await hoverBattleHex(user, 6, 9)

      expect(getBattleStatusBarText()).not.toContain('Shoot')
    })

    // A Zealot (speed 7) walks to column 8, the Swordsman to column 10; the Zealot steps next to
    // it, the Swordsman attacks, and the Zealot strikes back. 10 damage at 12 Attack against 10
    // Defense, which would be 5 with the melee penalty.
    test('given Zealots attack in melee then they do full damage', async () => {
      const { user } = await startBattle(
        aFight({ army: [stack('ZEALOT', 1)], monsterType: 'SWORDSMAN', monsterCount: 1 })
      )
      await moveActiveStackTo(user, 6, 8)
      await moveActiveStackTo(user, 6, 9)

      await attackBattleHexFrom(user, 6, 10, 'left')

      expect(readCombatMessages()[2]).toBe('The Zealot does 10 damage.')
    })
  })

  describe('status bar', () => {
    test('given the mouse is over a monster the shooter can shoot then the status bar shows the shot', async () => {
      const { user } = await startBattle(tenArchersAgainstPikemen())
      await waitForPikemenToComeCloser(user)

      await hoverBattleHex(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)

      expect(getBattleStatusBarText()).toBe('Shoot Pikemen (12 shots left, damage 21-31)')
    })

    // 20-30, +5%: 21-31, halved: 10-15.
    test('given the target is more than 10 hexes away then the status bar shows the halved damage', async () => {
      const { user } = await startBattle(tenArchersAgainstPikemen())

      await hoverBattleHex(user, PIKEMEN_AT_START.row, PIKEMEN_AT_START.column)

      expect(getBattleStatusBarText()).toBe('Shoot Pikemen (12 shots left, damage 10-15)')
    })
  })

  describe('reload', () => {
    test('given a shooter has shot when the page reloads then it has the same shots left', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = tenArchersAgainstPikemen()
      const { user: firstUser } = await startBattle(scenario, { eventLog })
      await shootAt(firstUser, PIKEMEN_AT_START.row, PIKEMEN_AT_START.column)

      const { user } = await reload(scenario, eventLog)
      await hoverBattleHex(user, PIKEMEN_CLOSER.row, PIKEMEN_CLOSER.column)

      expect(getBattleStatusBarText()).toBe('Shoot Pikemen (11 shots left, damage 21-31)')
    })
  })
})
