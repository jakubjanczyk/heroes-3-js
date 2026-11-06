// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getHeroInfoBox, readArmySlots } from './adventure-panels.utils.js'
import { createMemoryEventLog, getCursorOver, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  clickBattleHex,
  closeBattleResults,
  getBattleButton,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  pickSpell,
  readBattleCasualties,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  rightClickBattleHex,
  startBattle,
  startBattleWithStyles,
  waitForBattleResults
} from './battle.utils.js'
import { aCaster, aFight, stack } from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition } from './builders.js'
import { readSpellBookMessage } from './spell-book.utils.js'

const creature = ({ name, plural, health, speed, abilities = [] }) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(plural)
    .withHealth(health)
    .withSpeed(speed)
    .withAbilities(abilities)
    .build()

const CREATURES = {
  BRUTE: creature({ name: 'Brute', plural: 'Brutes', health: 10, speed: 7 }),
  SQUIRE: creature({ name: 'Squire', plural: 'Squires', health: 4, speed: 6 }),
  SKELETON: creature({
    name: 'Skeleton',
    plural: 'Skeletons',
    health: 6,
    speed: 6,
    abilities: ['undead']
  })
}

// Three stacks stand on rows 3, 6 and 9 of the first column.
const TOP = { row: 3, column: 1 }
const MIDDLE = { row: 6, column: 1 }
const BOTTOM = { row: 9, column: 1 }

// Knowledge 5: 50 spell points, enough for Fireball (15) and Sacrifice at no skill (25).
const aSacrificer = ({ fire, knowledge = 5, army, spells = [] } = {}) =>
  aCaster({
    spells: ['SACRIFICE', 'FIREBALL', ...spells],
    knowledge,
    secondarySkills: fire ? [{ skill: 'FIRE_MAGIC', level: fire }] : [],
    army: army ?? [stack('BRUTE', 3), stack('SWORDSMAN', 10), stack('SQUIRE', 2)]
  })

const aSacrificeFight = (hero, { count = 50 } = {}) => aFight({ hero, count, creatures: CREATURES })

const stackOn = ({ row, column }) =>
  readBattleStacks().find((shown) => shown.row === row && shown.column === column)?.stack

// The hero casts once a round: each own stack still to act defends until the next round.
async function playOnToNextRound(user) {
  for (let turn = 0; turn < 6 && getBattleButton('Cast spell').disabled; turn += 1) {
    await clickBattleButton(user, 'Defend')
    await waitMs(1000)
  }
}

// Fireball does 15 + 10 × Power 2 = 35 damage to every stack in the hexes around where it lands:
// 3 Brutes of 10 health die, 5 Brutes lose 3 and the top one has 5 health left. It is cast on the
// Brutes' turn, the fastest.
async function fireballOwnStackAt(user, at) {
  await castSpellAt(user, 'Fireball', at)
  await waitMs()
  await playOnToNextRound(user)
}

async function sacrifice(user, raised, sacrificed) {
  await pickSpell(user, 'Sacrifice')
  await clickBattleHex(user, raised.row, raised.column)
  await clickBattleHex(user, sacrificed.row, sacrificed.column)
  await waitMs()
}

describe('battle sacrifice behavior', () => {
  // 10 Swordsmen give (2 + 35 + 3) × 10 = 400 health, more than the 3 Brutes ever had.
  test('given the Brutes died when the hero sacrifices the Swordsmen then all 3 Brutes rise, the Swordsmen are gone, 25 spell points are spent and the combat log says so', async () => {
    const { user } = await startBattle(aSacrificeFight(aSacrificer()))
    await fireballOwnStackAt(user, TOP)

    await sacrifice(user, TOP, MIDDLE)
    const shown = [stackOn(TOP), stackOn(MIDDLE), readCombatMessages().slice(-2)]
    await playOnToNextRound(user)

    expect([...shown, await readBattleSpellPoints(user)]).toEqual([
      'Brutes 3',
      undefined,
      ["Lord Haart casts 'Sacrifice' on the Brutes.", '3 Brutes rise from the dead!'],
      '10'
    ])
  })

  const ONE_SQUIRE = [stack('BRUTE', 3), stack('SWORDSMAN', 10), stack('SQUIRE', 1)]

  // One Squire gives (2 + 4 + 3) × 1 = 9 health: a Brute of 10 with 9 health. Fireball and
  // Sacrifice cost 12 and 20 at Basic, out of 50.
  test('given a hero with Basic Fire Magic sacrifices a Squire for the dead Brutes then one Brute rises and 20 spell points are spent', async () => {
    const hero = aSacrificer({ fire: 'BASIC', army: ONE_SQUIRE })
    const { user } = await startBattle(aSacrificeFight(hero))
    await fireballOwnStackAt(user, TOP)

    await sacrifice(user, TOP, BOTTOM)
    const shown = [stackOn(TOP), readCombatMessages().at(-1)]
    await playOnToNextRound(user)

    expect([...shown, await readBattleSpellPoints(user)]).toEqual([
      'Brute 1',
      '1 Brute rises from the dead!',
      '18'
    ])
  })

  // One Squire gives (2 + 4 + 10) × 1 = 16 health: a whole Brute and one with 6 health.
  test('given a hero with Expert Fire Magic sacrifices a Squire for the dead Brutes then 2 Brutes rise', async () => {
    const hero = aSacrificer({ fire: 'EXPERT', army: ONE_SQUIRE })
    const { user } = await startBattle(aSacrificeFight(hero))
    await fireballOwnStackAt(user, TOP)

    await sacrifice(user, TOP, BOTTOM)

    expect(stackOn(TOP)).toBe('Brutes 2')
  })

  // The 2 Brutes left have 15 health; 2 Squires give (2 + 4 + 3) × 2 = 18 more, 33 in all:
  // 3 whole Brutes and a top one with 3.
  test('given the Brutes lost some creatures when the hero sacrifices 2 Squires then the top Brute is healed first and 2 more rise', async () => {
    const hero = aSacrificer({
      army: [stack('BRUTE', 5), stack('SWORDSMAN', 10), stack('SQUIRE', 2)]
    })
    const { user } = await startBattle(aSacrificeFight(hero))
    await fireballOwnStackAt(user, TOP)

    await sacrifice(user, TOP, BOTTOM)

    expect([stackOn(TOP), readCombatMessages().at(-1)]).toEqual([
      'Brutes 4',
      '2 Brutes rise from the dead!'
    ])
  })

  test('given the Squires were sacrificed then no dead stack is left on their hex', async () => {
    const { user } = await startBattle(aSacrificeFight(aSacrificer()))
    await fireballOwnStackAt(user, TOP)

    await sacrifice(user, TOP, BOTTOM)

    expect(readBattleStacks().map(({ stack }) => stack)).not.toContain('Dead Squires')
    expect(stackOn(BOTTOM)).toBeUndefined()
  })

  describe('aiming', () => {
    const cursorOver = ({ row, column }) => getCursorOver(getBattleHex(row, column))

    async function hoverTo(user, { row, column }) {
      await hoverBattleHex(user, row, column)
      return [getBattleStatusBarText(), cursorOver({ row, column })]
    }

    test('given the Brutes died when Sacrifice is picked then pointing at them casts on them, and at a stack that lost no one or an enemy needs a target', async () => {
      const { user } = await startBattleWithStyles(aSacrificeFight(aSacrificer()))
      await fireballOwnStackAt(user, TOP)
      await pickSpell(user, 'Sacrifice')

      expect([
        await hoverTo(user, TOP),
        await hoverTo(user, MIDDLE),
        await hoverTo(user, { row: 6, column: 15 })
      ]).toEqual([
        ['Cast Sacrifice on Brutes', 'battle-spell'],
        ['Select Spell Target', 'battle-blocked'],
        ['Select Spell Target', 'battle-blocked']
      ])
    })

    test('given the Brutes were picked to rise when the player points at an own stack then it says it sacrifices them, and anywhere else to choose an army', async () => {
      const { user } = await startBattleWithStyles(aSacrificeFight(aSacrificer()))
      await fireballOwnStackAt(user, TOP)
      await pickSpell(user, 'Sacrifice')
      await clickBattleHex(user, TOP.row, TOP.column)

      expect([
        await hoverTo(user, MIDDLE),
        await hoverTo(user, TOP),
        await hoverTo(user, { row: 6, column: 15 })
      ]).toEqual([
        ['Sacrifice the Swordsmen', 'battle-sacrifice'],
        ['Choose an army to sacrifice', 'battle-blocked'],
        ['Choose an army to sacrifice', 'battle-blocked']
      ])
    })

    test('given the hurt Brutes were picked to rise when the player clicks them again then nothing happens, and clicking the Squires sacrifices them', async () => {
      const hero = aSacrificer({
        army: [stack('BRUTE', 5), stack('SWORDSMAN', 10), stack('SQUIRE', 2)]
      })
      const { user } = await startBattle(aSacrificeFight(hero))
      await fireballOwnStackAt(user, TOP)
      await pickSpell(user, 'Sacrifice')
      await clickBattleHex(user, TOP.row, TOP.column)

      await clickBattleHex(user, TOP.row, TOP.column)
      await waitMs()
      const before = stackOn(TOP)
      await clickBattleHex(user, BOTTOM.row, BOTTOM.column)
      await waitMs()

      expect([before, stackOn(TOP), stackOn(BOTTOM)]).toEqual(['Brutes 2', 'Brutes 4', undefined])
    })

    test('given the Brutes were picked to rise when the player points at the undead Skeletons then it says to choose an army', async () => {
      const hero = aSacrificer({
        army: [stack('BRUTE', 3), stack('SWORDSMAN', 10), stack('SKELETON', 4)]
      })
      const { user } = await startBattle(aSacrificeFight(hero))
      await fireballOwnStackAt(user, TOP)
      await pickSpell(user, 'Sacrifice')
      await clickBattleHex(user, TOP.row, TOP.column)

      await hoverBattleHex(user, BOTTOM.row, BOTTOM.column)

      expect(getBattleStatusBarText()).toBe('Choose an army to sacrifice')
    })

    // Fireball on round 1, Clone on round 2: 15 + 24 + 25 spell points, so Knowledge 7.
    test('given the Swordsmen have a clone when the Brutes were picked to rise then the clone cannot be sacrificed', async () => {
      const hero = aSacrificer({ knowledge: 7, spells: ['CLONE'] })
      const { user } = await startBattle(aSacrificeFight(hero))
      await fireballOwnStackAt(user, TOP)
      await castSpellAt(user, 'Clone', MIDDLE)
      await waitMs()
      const clone = readBattleStacks().find(({ stack }) => stack.includes('(clone)'))
      await playOnToNextRound(user)
      await pickSpell(user, 'Sacrifice')
      await clickBattleHex(user, TOP.row, TOP.column)

      await hoverBattleHex(user, clone.row, clone.column)

      expect(getBattleStatusBarText()).toBe('Choose an army to sacrifice')
    })

    test('given the Brutes were picked to rise when the player right-clicks then the spell is cancelled and no spell points are spent', async () => {
      const { user } = await startBattle(aSacrificeFight(aSacrificer()))
      await fireballOwnStackAt(user, TOP)
      await pickSpell(user, 'Sacrifice')
      await clickBattleHex(user, TOP.row, TOP.column)

      await rightClickBattleHex(user, MIDDLE.row, MIDDLE.column)
      const status = getBattleStatusBarText()
      await clickBattleHex(user, MIDDLE.row, MIDDLE.column)
      await waitMs()

      expect([status, stackOn(TOP), await readBattleSpellPoints(user)]).toEqual([
        'Spell cancelled',
        'Dead Brutes',
        '35'
      ])
    })

    test('given Sacrifice is picked when the player presses Escape then the spell is cancelled', async () => {
      const { user } = await startBattle(aSacrificeFight(aSacrificer()))
      await fireballOwnStackAt(user, TOP)
      await pickSpell(user, 'Sacrifice')

      await user.keyboard('{Escape}')

      expect(getBattleStatusBarText()).toBe('Spell cancelled')
    })
  })

  describe('with no one to bring back', () => {
    test('given no own stack lost anyone when Sacrifice is picked then the book says it will affect no one', async () => {
      const { user } = await startBattle(aSacrificeFight(aSacrificer()))

      await pickSpell(user, 'Sacrifice')

      expect(readSpellBookMessage()).toEqual(['', 'That spell will affect no one!'])
    })

    test('given the hurt Brutes are the only stack left when Sacrifice is picked then it will affect no one', async () => {
      const { user } = await startBattle(
        aSacrificeFight(aSacrificer({ army: [stack('BRUTE', 5)] }))
      )
      await fireballOwnStackAt(user, MIDDLE)

      await pickSpell(user, 'Sacrifice')

      expect(readSpellBookMessage()).toEqual(['', 'That spell will affect no one!'])
    })

    test('given the dead Skeletons are the only stack lost when Sacrifice is picked then it will affect no one', async () => {
      const hero = aSacrificer({
        army: [stack('SKELETON', 3), stack('SWORDSMAN', 10), stack('SQUIRE', 2)]
      })
      const { user } = await startBattle(aSacrificeFight(hero))
      await fireballOwnStackAt(user, TOP)

      await pickSpell(user, 'Sacrifice')

      expect(readSpellBookMessage()).toEqual(['', 'That spell will affect no one!'])
    })

    // Teleport costs 15 more: Knowledge 6.
    test('given the Swordsmen were teleported onto the dead Brutes when Sacrifice is picked then it will affect no one', async () => {
      const hero = aSacrificer({ knowledge: 6, spells: ['TELEPORT'] })
      const { user } = await startBattle(aSacrificeFight(hero))
      await fireballOwnStackAt(user, TOP)
      await pickSpell(user, 'Teleport')
      await clickBattleHex(user, MIDDLE.row, MIDDLE.column)
      await clickBattleHex(user, TOP.row, TOP.column)
      await waitMs()
      await playOnToNextRound(user)

      await pickSpell(user, 'Sacrifice')

      expect(readSpellBookMessage()).toEqual(['', 'That spell will affect no one!'])
    })
  })

  // 2 Pikemen are no match for the 3 Brutes and 2 Squires.
  test('given the hero won after the Brutes rose then the casualties count only the sacrificed Swordsmen and the army keeps the Brutes', async () => {
    const { user } = await startBattle(aSacrificeFight(aSacrificer(), { count: 2 }))
    await fireballOwnStackAt(user, TOP)
    await sacrifice(user, TOP, MIDDLE)

    await clickBattleButton(user, 'Auto combat')
    await waitForBattleResults()
    const casualties = readBattleCasualties('Attacker')
    await closeBattleResults(user)

    expect([casualties, readArmySlots(getHeroInfoBox()).slice(0, 3)]).toEqual([
      ['Swordsmen 10'],
      ['Brutes 3', '', 'Squires 2']
    ])
  })

  test('given the Brutes rose when the page reloads then they still stand there, the Swordsmen are gone and the spell points stay spent', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aSacrificeFight(aSacrificer())
    const { user } = await startBattle(scenario, { eventLog })
    await fireballOwnStackAt(user, TOP)
    await sacrifice(user, TOP, MIDDLE)

    await reloadBattle(scenario, { eventLog })
    const shown = [stackOn(TOP), stackOn(MIDDLE)]
    await playOnToNextRound(user)

    expect([...shown, await readBattleSpellPoints(user)]).toEqual(['Brutes 3', undefined, '10'])
  })
})
