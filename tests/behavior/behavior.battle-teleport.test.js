// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, getCursorOver, waitMs } from './app.utils.js'
import {
  clickBattleHex,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  moveActiveStackTo,
  pickSpell,
  playOnToNextRound,
  readActiveStack,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  rightClickBattleHex,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import { aCaster, aFight, ENEMY_HEX, OWN_HEX, stack } from './battle-lasting-spells.fixtures.js'

const aTeleporter = ({ level, knowledge, army } = {}) =>
  aCaster({
    spells: ['TELEPORT', 'ANTI_MAGIC', 'HYPNOTIZE'],
    secondarySkills: level ? [{ skill: 'WATER_MAGIC', level }] : [],
    ...(knowledge ? { knowledge } : {}),
    ...(army ? { army } : {})
  })

const FAR_HEX = { row: 2, column: 8 }

const stackNamed = (name) => readBattleStacks().find(({ stack }) => stack.startsWith(name))

async function teleport(user, from, to) {
  await pickSpell(user, 'Teleport')
  await clickBattleHex(user, from.row, from.column)
  await clickBattleHex(user, to.row, to.column)
  await waitMs()
}

describe('battle teleport behavior', () => {
  test('given the hero casts Teleport on the Swordsmen and clicks a free hex then they stand there, 15 spell points are spent and the combat log says so', async () => {
    const { user } = await startBattle(aFight({ hero: aTeleporter() }))

    await teleport(user, OWN_HEX, FAR_HEX)
    const swordsmen = stackNamed('Swordsmen')
    const messages = readCombatMessages().slice(-1)
    await playOnToNextRound(user)

    expect([swordsmen, messages, await readBattleSpellPoints(user)]).toEqual([
      { stack: 'Swordsmen 10', ...FAR_HEX },
      ["Lord Haart casts 'Teleport' on the Swordsmen."],
      '5'
    ])
  })

  test('given the active Swordsmen were teleported then they still take their turn from the new hex', async () => {
    const { user } = await startBattle(aFight({ hero: aTeleporter() }))

    await teleport(user, OWN_HEX, FAR_HEX)
    const active = readActiveStack()
    await moveActiveStackTo(user, FAR_HEX.row, FAR_HEX.column + 2)

    expect([active, stackNamed('Swordsmen')]).toEqual([
      { stack: 'Swordsmen 10', ...FAR_HEX },
      { stack: 'Swordsmen 10', row: FAR_HEX.row, column: FAR_HEX.column + 2 }
    ])
  })

  describe('aiming', () => {
    const cursorOver = ({ row, column }) => getCursorOver(getBattleHex(row, column))

    async function hoverTo(user, { row, column }) {
      await hoverBattleHex(user, row, column)
      return [getBattleStatusBarText(), cursorOver({ row, column })]
    }

    test('given Teleport is picked when the player points at an own stack then it says it casts on them, and at an enemy stack that it needs a target', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aTeleporter() }))
      await pickSpell(user, 'Teleport')

      expect([await hoverTo(user, OWN_HEX), await hoverTo(user, ENEMY_HEX)]).toEqual([
        ['Cast Teleport on Swordsmen', 'battle-spell'],
        ['Select Spell Target', 'battle-blocked']
      ])
    })

    test('given the Swordsmen were picked to teleport when the player points at a free hex and at a taken one then it says Teleport Here and Invalid Teleport Destination', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aTeleporter() }))
      await pickSpell(user, 'Teleport')
      await clickBattleHex(user, OWN_HEX.row, OWN_HEX.column)

      expect([await hoverTo(user, FAR_HEX), await hoverTo(user, ENEMY_HEX)]).toEqual([
        ['Teleport Here', 'battle-teleport'],
        ['Invalid Teleport Destination', 'battle-blocked']
      ])
    })

    test('given the Swordsmen were picked to teleport when the player clicks a taken hex then nothing happens and a free hex still takes them there', async () => {
      const { user } = await startBattle(aFight({ hero: aTeleporter() }))
      await pickSpell(user, 'Teleport')
      await clickBattleHex(user, OWN_HEX.row, OWN_HEX.column)

      await clickBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)
      await waitMs()
      const before = stackNamed('Swordsmen')
      await clickBattleHex(user, FAR_HEX.row, FAR_HEX.column)
      await waitMs()

      expect([before, stackNamed('Swordsmen')]).toEqual([
        { stack: 'Swordsmen 10', ...OWN_HEX },
        { stack: 'Swordsmen 10', ...FAR_HEX }
      ])
    })

    test('given the Swordsmen were picked to teleport when the player right-clicks then the spell is cancelled and no spell points are spent', async () => {
      const { user } = await startBattle(aFight({ hero: aTeleporter() }))
      await pickSpell(user, 'Teleport')
      await clickBattleHex(user, OWN_HEX.row, OWN_HEX.column)

      await rightClickBattleHex(user, FAR_HEX.row, FAR_HEX.column)
      const status = getBattleStatusBarText()
      await clickBattleHex(user, FAR_HEX.row, FAR_HEX.column)
      await waitMs()

      expect([status, stackNamed('Swordsmen'), await readBattleSpellPoints(user)]).toEqual([
        'Spell cancelled',
        { stack: 'Swordsmen 10', ...OWN_HEX },
        '20'
      ])
    })

    test('given Teleport is picked when the player presses Escape then the spell is cancelled', async () => {
      const { user } = await startBattle(aFight({ hero: aTeleporter() }))
      await pickSpell(user, 'Teleport')

      await user.keyboard('{Escape}')

      expect(getBattleStatusBarText()).toBe('Spell cancelled')
    })
  })

  describe('double-wide stacks', () => {
    // An attacker's back half stands on the hex to the left of its front.
    test('given the Cavaliers are picked to teleport when the player points next to the right of the Pikemen then it is invalid, and a hex further on is not', async () => {
      const { user } = await startBattle(
        aFight({ hero: aTeleporter({ army: [stack('CAVALIER', 5)] }) })
      )
      const cavaliers = stackNamed('Cavaliers 5')
      await pickSpell(user, 'Teleport')
      await clickBattleHex(user, cavaliers.row, cavaliers.column)

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column + 1)
      const nextToPikemen = getBattleStatusBarText()
      await hoverBattleHex(user, FAR_HEX.row, FAR_HEX.column)

      expect([nextToPikemen, getBattleStatusBarText()]).toEqual([
        'Invalid Teleport Destination',
        'Teleport Here'
      ])
    })
  })

  test('given a hero with Expert Water Magic casts Teleport then 3 spell points are spent', async () => {
    const { user } = await startBattle(aFight({ hero: aTeleporter({ level: 'EXPERT' }) }))

    await teleport(user, OWN_HEX, FAR_HEX)
    await playOnToNextRound(user)

    expect(await readBattleSpellPoints(user)).toBe('17')
  })

  test('given Anti-Magic is on the Swordsmen when Teleport is cast on them then the spell is cancelled', async () => {
    const { user } = await startBattle(aFight({ hero: aTeleporter({ knowledge: 4 }) }))
    await pickSpell(user, 'Anti-Magic')
    await clickBattleHex(user, OWN_HEX.row, OWN_HEX.column)
    await playOnToNextRound(user)

    await pickSpell(user, 'Teleport')
    await clickBattleHex(user, OWN_HEX.row, OWN_HEX.column)

    expect(getBattleStatusBarText()).toBe('Spell cancelled')
  })

  // 5 Pikemen have 50 health, below Hypnotize's 10 + 2 × 25 = 60. The player plays the
  // hypnotized Pikemen's turn too.
  test('given the hero hypnotized the Pikemen when Teleport is cast on them then they are taken to the hex', async () => {
    const { user } = await startBattle(aFight({ hero: aTeleporter({ knowledge: 4 }), count: 5 }))
    await pickSpell(user, 'Hypnotize')
    await clickBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)
    await playOnToNextRound(user)
    await playOnToNextRound(user)
    const pikemen = stackNamed('Pikemen')

    await teleport(user, pikemen, FAR_HEX)

    expect(stackNamed('Pikemen')).toEqual({ stack: 'Pikemen 5', ...FAR_HEX })
  })

  test('given the Swordsmen were teleported when the page reloads then they still stand there and the spell points stay spent', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aFight({ hero: aTeleporter() })
    const { user } = await startBattle(scenario, { eventLog })
    await teleport(user, OWN_HEX, FAR_HEX)

    await reloadBattle(scenario, { eventLog })
    const swordsmen = stackNamed('Swordsmen')
    await playOnToNextRound(user)

    expect([swordsmen, await readBattleSpellPoints(user)]).toEqual([
      { stack: 'Swordsmen 10', ...FAR_HEX },
      '5'
    ])
  })
})
