// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog } from './app.utils.js'
import {
  castSpellAt,
  getBattleStatusBarText,
  hoverBattleHex,
  isBattleHexReachable,
  pickSpell,
  playOnToNextRound,
  pointAtBattleHexSide,
  readBattleStacks,
  readStackCountColours,
  reloadBattle,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import {
  aCaster,
  aFight,
  bringPikemenCloser,
  ENEMY_HEX,
  OWN_HEX,
  PIKEMEN_CLOSE_BY
} from './battle-lasting-spells.fixtures.js'
import { readSpellBookMessage } from './spell-book.utils.js'

const SPELLS = ['HASTE', 'SLOW', 'DISRUPTING_RAY', 'DISPEL']
const water = (level) => [{ skill: 'WATER_MAGIC', level }]

const SKILL_LEVELS = { no: [], Advanced: water('ADVANCED'), Expert: water('EXPERT') }

const aDispeller = ({ level = 'no', ...caster } = {}) =>
  aCaster({ spells: SPELLS, secondarySkills: SKILL_LEVELS[level], ...caster })

const findPikemen = () => readBattleStacks().find(({ stack }) => stack.startsWith('Pikemen'))

// The Swordsmen (speed 5) on column 1 reach column 6 on their own, 9 with Haste.
const reachesOnlyTheirOwnSpeed = () => [
  isBattleHexReachable(OWN_HEX.row, 6),
  isBattleHexReachable(OWN_HEX.row, 7)
]

describe('battle Dispel behavior', () => {
  describe('aiming', () => {
    // The Archers shoot from where they stand, so the Slowed stack stays on its hex.
    test.each([
      {
        target: 'an own stack with Haste',
        level: 'no',
        castFirst: { spell: 'Haste', at: OWN_HEX },
        at: OWN_HEX,
        text: 'Cast Dispel on Swordsmen'
      },
      {
        target: 'an own stack with no spell',
        level: 'no',
        castFirst: null,
        at: OWN_HEX,
        text: 'Select Spell Target'
      },
      {
        target: 'an enemy stack with Slow',
        level: 'no',
        castFirst: { spell: 'Slow', at: ENEMY_HEX },
        at: ENEMY_HEX,
        text: 'Select Spell Target'
      },
      {
        target: 'an enemy stack with Slow',
        level: 'Advanced',
        castFirst: { spell: 'Slow', at: ENEMY_HEX },
        at: ENEMY_HEX,
        text: 'Cast Dispel on Archers'
      }
    ])('given $level Water Magic and Dispel is picked when the mouse is over $target then the status bar says "$text"', async ({
      level,
      castFirst,
      at,
      text
    }) => {
      const { user } = await startBattle(
        aFight({ hero: aDispeller({ level }), monster: 'ARCHER', count: 10 })
      )
      if (castFirst) {
        await castSpellAt(user, castFirst.spell, castFirst.at)
        await playOnToNextRound(user)
      }
      await pickSpell(user, 'Dispel')

      await hoverBattleHex(user, at.row, at.column)

      expect(getBattleStatusBarText()).toBe(text)
    })
  })

  describe('casting', () => {
    test('given Haste on the Swordsmen when the hero casts Dispel on them then they reach only as far as their own Speed', async () => {
      const { user } = await startBattle(aFight({ hero: aDispeller() }))
      await castSpellAt(user, 'Haste', OWN_HEX)
      await playOnToNextRound(user)

      await castSpellAt(user, 'Dispel', OWN_HEX)

      expect(reachesOnlyTheirOwnSpeed()).toEqual([true, false])
    })

    // The Swordsmen's 60-90 with Attack 12 against the Pikemen's Defense 2 (5 − 3) is +50%: 90-135;
    // without Disrupting Ray it would be +35%, 81-121.
    test('given Disrupting Ray and Slow on the Pikemen when the hero casts Advanced Dispel on them then their Defense stays lowered', async () => {
      const { user } = await startBattle(aFight({ hero: aDispeller({ level: 'Advanced' }) }))
      await castSpellAt(user, 'Disrupting Ray', ENEMY_HEX)
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Slow', PIKEMEN_CLOSE_BY)
      await playOnToNextRound(user)
      const pikemen = findPikemen()

      await castSpellAt(user, 'Dispel', pikemen)
      await pointAtBattleHexSide(user, pikemen.row, pikemen.column, 'left')

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 90-135)')
    })
  })

  describe('Expert', () => {
    // Power 3: Haste from round 1 still lasts in round 3.
    test("given Haste on the hero's stack and Slow on the enemy's when an Expert Water hero picks Dispel then no stack has a spell left", async () => {
      const { user } = await startBattleWithStyles(
        aFight({ hero: aDispeller({ level: 'Expert', power: 3 }), monster: 'ARCHER', count: 10 })
      )
      await castSpellAt(user, 'Haste', OWN_HEX)
      await playOnToNextRound(user)
      await castSpellAt(user, 'Slow', ENEMY_HEX)
      await playOnToNextRound(user)

      await pickSpell(user, 'Dispel')

      expect(readStackCountColours().map(({ colour }) => colour)).toEqual(['purple', 'purple'])
    })

    test('given no stack has a spell when an Expert Water hero picks Dispel then the book says it will affect no one', async () => {
      const { user } = await startBattle(aFight({ hero: aDispeller({ level: 'Expert' }) }))

      await pickSpell(user, 'Dispel')

      expect(readSpellBookMessage()).toEqual(['', 'That spell will affect no one!'])
    })
  })

  describe('reload', () => {
    test('given Dispel removed Haste from the Swordsmen when the page reloads then they still reach only as far as their own Speed', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: aDispeller() })
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Haste', OWN_HEX)
      await playOnToNextRound(user)
      await castSpellAt(user, 'Dispel', OWN_HEX)

      await reloadBattle(scenario, { eventLog })

      expect(reachesOnlyTheirOwnSpeed()).toEqual([true, false])
    })
  })
})
