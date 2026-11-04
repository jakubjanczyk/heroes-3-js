// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog } from './app.utils.js'
import {
  castSpellAt,
  getBattleStatusBarText,
  hoverBattleHex,
  pickSpell,
  playOnToNextRound,
  readBattleStacks,
  reloadBattle,
  startBattle
} from './battle.utils.js'
import { aCaster, aFight, ENEMY_HEX, OWN_HEX, stack } from './battle-lasting-spells.fixtures.js'

const aHealer = ({ expert = false, ...caster } = {}) =>
  aCaster({
    spells: ['CURE'],
    secondarySkills: expert ? [{ skill: 'WATER_MAGIC', level: 'EXPERT' }] : [],
    ...caster
  })

// 74 Archers shooting from across the battlefield (halved) at the defending Swordsmen (Defense
// 14 + 2) do 148 × 75% × 50% = 55 damage: one of the 10 Swordsmen (35 health) dies and the top
// one has lost 20.
const archersShootingFromAfar = (hero) => aFight({ hero, monster: 'ARCHER', count: 74 })

const readSwordsmen = () =>
  readBattleStacks().find(({ stack }) => stack.startsWith('Swordsmen')).stack

async function hurtTheSwordsmen(user) {
  await playOnToNextRound(user)
}

async function playOnToNextRoundWithBothStacks(user) {
  await playOnToNextRound(user)
  await playOnToNextRound(user)
}

const readOwnStacks = () =>
  readBattleStacks()
    .filter(({ column }) => column === OWN_HEX.column)
    .map(({ stack }) => stack)

async function castCureAndTakeTheNextVolley(user) {
  await castSpellAt(user, 'Cure', OWN_HEX)
  await playOnToNextRound(user)
}

describe('battle Cure behavior', () => {
  describe('aiming', () => {
    test.each([
      {
        target: 'a hurt own stack',
        prepare: hurtTheSwordsmen,
        at: OWN_HEX,
        text: 'Cast Cure on Swordsmen'
      },
      {
        target: 'an unhurt own stack',
        prepare: async () => {},
        at: OWN_HEX,
        text: 'Select Spell Target'
      },
      {
        target: 'an enemy stack',
        prepare: hurtTheSwordsmen,
        at: ENEMY_HEX,
        text: 'Select Spell Target'
      }
    ])('given Cure is picked when the mouse is over $target then the status bar says "$text"', async ({
      prepare,
      at,
      text
    }) => {
      const { user } = await startBattle(archersShootingFromAfar(aHealer()))
      await prepare(user)
      await pickSpell(user, 'Cure')

      await hoverBattleHex(user, at.row, at.column)

      expect(getBattleStatusBarText()).toBe(text)
    })
  })

  describe('healing', () => {
    // Power 1 heals 10 + 5 = 15: the top Swordsman has 30 of 35. The next 55 damage kills it and
    // leaves 25 on the next one: 8 left, where the unhealed top one (15) would have left 7.
    test('given the top Swordsman has lost 20 health when a hero with Power 1 casts Cure then the next volley leaves 8 Swordsmen, not 7', async () => {
      const { user } = await startBattle(archersShootingFromAfar(aHealer({ power: 1 })))
      await hurtTheSwordsmen(user)

      await castCureAndTakeTheNextVolley(user)

      expect(readSwordsmen()).toBe('Swordsmen 8')
    })

    // Power 10 heals 60, but only the top Swordsman's 20: the dead one stays dead, and the next
    // 55 damage kills the full top one and leaves 15 on the next: 8 left.
    test('given a Swordsman was killed when a hero with Power 10 casts Cure then only the top Swordsman is healed', async () => {
      const { user } = await startBattle(archersShootingFromAfar(aHealer({ power: 10 })))
      await hurtTheSwordsmen(user)

      await castSpellAt(user, 'Cure', OWN_HEX)
      const afterCure = readSwordsmen()
      await playOnToNextRound(user)

      expect([afterCure, readSwordsmen()]).toEqual(['Swordsmen 9', 'Swordsmen 8'])
    })
  })

  describe('Expert', () => {
    // Each of two stacks of 30 Archers shoots one of the hero's stacks: 22 damage leaves the top
    // Swordsman 13 of 35, and 28 kill 2 Pikemen and leave the top one 2 of 10. Expert Cure with
    // Power 2 heals 40, so both top creatures are whole, and the same volley again leaves 10
    // Swordsmen and 26 Pikemen, where unhealed it would leave 9 and 25.
    test("given two of the hero's stacks are hurt when an Expert Water hero picks Cure then the next volley leaves more of both", async () => {
      const hero = aHealer({ expert: true, army: [stack('SWORDSMAN', 10), stack('PIKEMAN', 30)] })
      const { user } = await startBattle(aFight({ hero, monster: 'ARCHER', count: 60, stacks: 2 }))
      await playOnToNextRoundWithBothStacks(user)

      await pickSpell(user, 'Cure')
      await playOnToNextRoundWithBothStacks(user)

      expect(readOwnStacks()).toEqual(['Swordsmen 10', 'Pikemen 26'])
    })
  })

  describe('reload', () => {
    test('given Cure healed the Swordsmen when the page reloads then the next volley still leaves 8', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = archersShootingFromAfar(aHealer({ power: 1 }))
      const { user } = await startBattle(scenario, { eventLog })
      await hurtTheSwordsmen(user)
      await castSpellAt(user, 'Cure', OWN_HEX)

      const reloaded = await reloadBattle(scenario, { eventLog })
      await playOnToNextRound(reloaded.user)

      expect(readSwordsmen()).toBe('Swordsmen 8')
    })
  })
})
