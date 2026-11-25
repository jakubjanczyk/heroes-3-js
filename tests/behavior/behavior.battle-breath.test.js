// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  castSpellAt,
  moveActiveStackTo,
  readBattleStacks,
  readCombatMessages,
  readStackCountColour,
  reloadBattle,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import { aCaster, aFight, stack } from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition } from './builders.js'

const aBreather = ({ name = 'Breather', attack = 3, speed = 20, flying = true } = {}) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(attack)
    .withDamage({ min: 10, max: 10 })
    .withHealth(100)
    .withSpeed(speed)
    .withAbilities(flying ? ['flying', 'doubleWide'] : ['doubleWide'])
    .withBreath(true)
    .build()

const CREATURES = {
  BREATHER: aBreather(),
  SLOW_BREATHER: aBreather({ name: 'Slow Breather', attack: 5, speed: 2, flying: false }),
  RUNNER: aCreatureDefinition()
    .withName('Runner')
    .withNamePlural('Runners')
    .withAttack(1)
    .withDefense(3)
    .withSpeed(21)
    .withAbilities(['flying'])
    .build(),
  HITTER: aCreatureDefinition()
    .withName('Hitter')
    .withNamePlural('Hitters')
    .withHealth(100)
    .withSpeed(19)
    .withAbilities(['flying'])
    .build(),
  WAITER: aCreatureDefinition()
    .withName('Waiter')
    .withNamePlural('Waiters')
    .withHealth(100)
    .withSpeed(10)
    .build(),
  BULK: aCreatureDefinition()
    .withName('Bulk')
    .withNamePlural('Bulks')
    .withAbilities(['doubleWide'])
    .build()
}

const aBreathFight = ({ army, monster = 'PIKEMAN', count = 10, stacks = 1 }) =>
  aFight({
    hero: aCaster({ army, spells: ['BLIND'] }),
    monster,
    count,
    stacks,
    creatures: CREATURES
  })

const BREATHERS_AND_A_WAITER = [stack('BREATHER', 3), stack('WAITER', 1)]
const A_RUNNER_BREATHERS_AND_A_WAITER = [
  stack('RUNNER', 10),
  stack('BREATHER', 3),
  stack('WAITER', 1)
]

const SEVEN_STACKS_OF_TEN = { count: 70, stacks: 7 }

const TARGET = { row: 6, column: 15 }
const BEYOND_THE_TARGET_FROM_BOTTOM_LEFT = { row: 5, column: 15 }

const stackOn = ({ row, column }) =>
  readBattleStacks().find((found) => found.row === row && found.column === column)?.stack

async function breatheOnTheTargetFrom(user, side, target = TARGET) {
  await attackBattleHexFrom(user, target.row, target.column, side)
  await waitMs(1000)
}

async function moveTheRunnerTo(user, { row, column }) {
  await moveActiveStackTo(user, row, column)
  await waitMs(1000)
}

const THREE_DIE_OF_TEN = 7
const WITHOUT_SPELLS = 'purple'
const pikemenHits = () =>
  readCombatMessages().filter((message) => message.startsWith('The Pikemen do'))

describe('battle breath behavior', () => {
  test('given the Breathers attack the Pikemen with other Pikemen standing beyond them then both stacks lose creatures', async () => {
    const { user } = await startBattle(
      aBreathFight({ army: BREATHERS_AND_A_WAITER, ...SEVEN_STACKS_OF_TEN })
    )

    await breatheOnTheTargetFrom(user, 'bottom-left')

    expect(stackOn(TARGET)).toBe(`Pikemen ${THREE_DIE_OF_TEN}`)
    expect(stackOn(BEYOND_THE_TARGET_FROM_BOTTOM_LEFT)).toBe(`Pikemen ${THREE_DIE_OF_TEN}`)
  })

  test("given the stack beyond the target is the Breathers' own then it loses creatures too", async () => {
    const { user } = await startBattle(aBreathFight({ army: A_RUNNER_BREATHERS_AND_A_WAITER }))
    await moveTheRunnerTo(user, BEYOND_THE_TARGET_FROM_BOTTOM_LEFT)

    await breatheOnTheTargetFrom(user, 'bottom-left')

    expect(stackOn(BEYOND_THE_TARGET_FROM_BOTTOM_LEFT)).toBe(`Runners ${THREE_DIE_OF_TEN}`)
  })

  test("given the hex beyond the target is empty then the log names the target's losses", async () => {
    const { user } = await startBattle(aBreathFight({ army: BREATHERS_AND_A_WAITER }))

    await breatheOnTheTargetFrom(user, 'bottom-left')

    expect(readCombatMessages()).toContain('The Breathers do 30 damage. 3 Pikemen perish.')
  })

  test('given the hex beyond the target is off the battlefield then only the target loses creatures', async () => {
    const { user } = await startBattle(
      aBreathFight({ army: BREATHERS_AND_A_WAITER, ...SEVEN_STACKS_OF_TEN })
    )

    await breatheOnTheTargetFrom(user, 'bottom-left', { row: 1, column: 15 })

    expect(readCombatMessages()).toContain('The Breathers do 30 damage. 3 Pikemen perish.')
  })

  test('given the Breathers attack a two-hex stack along its length then it takes the hit once', async () => {
    const { user } = await startBattle(
      aBreathFight({ army: BREATHERS_AND_A_WAITER, monster: 'BULK' })
    )

    await breatheOnTheTargetFrom(user, 'left')

    expect(stackOn(TARGET)).toBe(`Bulks ${THREE_DIE_OF_TEN}`)
    expect(readCombatMessages()).toContain('The Breathers do 30 damage. 3 Bulks perish.')
  })

  test('given the Breathers attack a two-hex stack from below then the stack beyond it loses creatures', async () => {
    const { user } = await startBattle(
      aBreathFight({ army: BREATHERS_AND_A_WAITER, monster: 'BULK', ...SEVEN_STACKS_OF_TEN })
    )

    await breatheOnTheTargetFrom(user, 'bottom-left')

    expect(stackOn(BEYOND_THE_TARGET_FROM_BOTTOM_LEFT)).toBe(`Bulks ${THREE_DIE_OF_TEN}`)
  })

  test("given the Breathers' hit kills the whole target then the stack beyond still loses creatures", async () => {
    const { user } = await startBattle(
      aBreathFight({ army: A_RUNNER_BREATHERS_AND_A_WAITER, count: 6, stacks: 3 })
    )
    await moveTheRunnerTo(user, BEYOND_THE_TARGET_FROM_BOTTOM_LEFT)

    await breatheOnTheTargetFrom(user, 'bottom-left')

    expect(stackOn(BEYOND_THE_TARGET_FROM_BOTTOM_LEFT)).toBe(`Runners ${THREE_DIE_OF_TEN}`)
  })

  test('given the breath hits a second stack then the log says the whole damage once and counts the creatures that perish', async () => {
    const { user } = await startBattle(
      aBreathFight({ army: BREATHERS_AND_A_WAITER, ...SEVEN_STACKS_OF_TEN })
    )

    await breatheOnTheTargetFrom(user, 'bottom-left')

    expect(readCombatMessages()).toContain('The Breathers do 60 damage. 6 creatures perish.')
  })

  test('given the breath hits a second stack then that stack does not strike back', async () => {
    const { user } = await startBattle(
      aBreathFight({ army: BREATHERS_AND_A_WAITER, ...SEVEN_STACKS_OF_TEN })
    )

    await breatheOnTheTargetFrom(user, 'bottom-left')

    expect(pikemenHits()).toHaveLength(1)
  })

  test("given the Hitters attack the enemy's Breathers and are struck back then the stack beyond the Hitters loses creatures", async () => {
    const { user } = await startBattle(
      aBreathFight({
        army: [stack('RUNNER', 10), stack('HITTER', 5), stack('WAITER', 1)],
        monster: 'SLOW_BREATHER',
        count: 3
      })
    )
    await moveTheRunnerTo(user, { row: 6, column: 13 })

    await breatheOnTheTargetFrom(user, 'left')

    expect(stackOn({ row: 6, column: 13 })).toBe(`Runners ${THREE_DIE_OF_TEN}`)
  })

  test.each([
    ['top-right', { row: 7, column: 14 }, { row: 7, column: 15 }],
    ['top-left', { row: 7, column: 15 }, { row: 7, column: 14 }]
  ])('given the Breathers come to stand above the target with both hexes when the sword points from its %s then the breath goes on from that side', async (side, burnt, spared) => {
    const { user } = await startBattle(
      aBreathFight({
        army: [
          stack('RUNNER', 10),
          stack('RUNNER', 10),
          stack('RUNNER', 10),
          stack('BREATHER', 3),
          stack('WAITER', 1)
        ]
      })
    )
    await moveTheRunnerTo(user, { row: 7, column: 14 })
    await moveTheRunnerTo(user, { row: 7, column: 15 })
    await moveTheRunnerTo(user, { row: 5, column: 13 })

    await breatheOnTheTargetFrom(user, side)

    expect(stackOn(burnt)).toBe(`Runners ${THREE_DIE_OF_TEN}`)
    expect(stackOn(spared)).toBe('Runners 10')
  })

  test('given the breath hits a blinded stack then it is no longer blind', async () => {
    const { user } = await startBattleWithStyles(
      aBreathFight({ army: BREATHERS_AND_A_WAITER, ...SEVEN_STACKS_OF_TEN })
    )
    await castSpellAt(user, 'Blind', BEYOND_THE_TARGET_FROM_BOTTOM_LEFT)

    await breatheOnTheTargetFrom(user, 'bottom-left')

    expect(
      readStackCountColour(
        BEYOND_THE_TARGET_FROM_BOTTOM_LEFT.row,
        BEYOND_THE_TARGET_FROM_BOTTOM_LEFT.column
      )
    ).toBe(WITHOUT_SPELLS)
  })

  test('given the Breathers breathed on a stack when the page reloads then both stacks show the same counts', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aBreathFight({ army: BREATHERS_AND_A_WAITER, ...SEVEN_STACKS_OF_TEN })
    const { user } = await startBattle(scenario, { eventLog })
    await breatheOnTheTargetFrom(user, 'bottom-left')

    await reloadBattle(scenario, { eventLog })

    expect(stackOn(TARGET)).toBe(`Pikemen ${THREE_DIE_OF_TEN}`)
    expect(stackOn(BEYOND_THE_TARGET_FROM_BOTTOM_LEFT)).toBe(`Pikemen ${THREE_DIE_OF_TEN}`)
  })
})
