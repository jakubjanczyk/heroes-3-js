// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  castSpellAt,
  moveActiveStackTo,
  playOnToNextRound,
  readActiveStack,
  readCombatMessages,
  startBattle
} from './battle.utils.js'
import {
  aCaster,
  aFight,
  attackPikemenAfter,
  ENEMY_HEX,
  MORALE_AND_LUCK_SPELLS,
  SWORDSMEN_CLOSE_BY,
  stack
} from './battle-lasting-spells.fixtures.js'

const ALWAYS = () => 0
const just = (chanceIn24) => () => chanceIn24 / 24 - 0.001
const exactly = (chanceIn24) => () => chanceIn24 / 24

const advanced = (skill) => ({ skill, level: 'ADVANCED' })
const expert = (skill) => ({ skill, level: 'EXPERT' })
const basic = (skill) => ({ skill, level: 'BASIC' })

const HIGH_MORALE = (name) => `High morale enables the ${name} to attack again.`
const LOW_MORALE = (name) => `Low morale causes the ${name} to freeze in panic.`
const GOOD_LUCK = (name) => `Good luck shines on the ${name}.`

const aMoraleAndLuckCaster = (options) => aCaster({ spells: MORALE_AND_LUCK_SPELLS, ...options })

// Two stacks of one alignment: morale +1. The first starts on row 3 and the second on row 9, both
// in column 1, and the first acts first.
const FIRST_STACK = { row: 3, column: 1 }
const twoStacks = (creature) => [stack(creature, 10), stack(creature, 10)]

describe('battle morale and luck spells behavior', () => {
  describe('morale', () => {
    // Advanced Mirth: +1 for the army and +2 for the spell.
    test('given a stack with morale +1 under a spell that raises morale by 2 when it moves with the roll just under 3 in 24 then it acts again', async () => {
      const hero = aMoraleAndLuckCaster({
        army: twoStacks('SWORDSMAN'),
        secondarySkills: [advanced('WATER_MAGIC')]
      })
      const { user } = await startBattle(aFight({ hero }), {
        appConfig: { moraleRandom: just(3) }
      })
      await castSpellAt(user, 'Mirth', FIRST_STACK)

      await moveActiveStackTo(user, FIRST_STACK.row, 2)

      expect(readActiveStack()).toEqual({ stack: 'Swordsmen 10', row: FIRST_STACK.row, column: 2 })
    })

    // Advanced Leadership: +1 for the army and +2 for the skill; Mirth adds nothing past +3.
    test('given a stack with morale +3 under a spell that raises morale when it moves with the roll at 3 in 24 then the next stack acts', async () => {
      const hero = aMoraleAndLuckCaster({
        army: twoStacks('SWORDSMAN'),
        secondarySkills: [advanced('LEADERSHIP')]
      })
      const { user } = await startBattle(aFight({ hero }), {
        appConfig: { moraleRandom: exactly(3) }
      })
      await castSpellAt(user, 'Mirth', FIRST_STACK)

      await moveActiveStackTo(user, FIRST_STACK.row, 2)

      expect(readActiveStack()).toEqual({ stack: 'Swordsmen 10', row: 9, column: 1 })
    })

    // The monster's Pikemen, all of one alignment, have morale +1; Advanced Sorrow makes it -1.
    test('given a monster stack with morale +1 under a spell that lowers morale by 2 when its turn comes with the roll just under 2 in 24 then it freezes', async () => {
      const hero = aMoraleAndLuckCaster({ secondarySkills: [advanced('EARTH_MAGIC')] })
      const { user } = await startBattle(aFight({ hero }), {
        appConfig: { moraleRandom: just(2) }
      })
      await castSpellAt(user, 'Sorrow', ENEMY_HEX)

      await playOnToNextRound(user)

      expect(readCombatMessages()).toContain(LOW_MORALE('Pikemen'))
    })

    // +1 and -6 would be -5, but morale stops at -3: the Pikemen freeze 6 times in 24.
    test('given a monster stack under a spell that lowers morale by 6 when its turn comes with the roll at 6 in 24 then it acts', async () => {
      const { user } = await startBattle(aFight({ hero: aMoraleAndLuckCaster() }), {
        appConfig: { moraleRandom: exactly(6) }
      })
      await castSpellAt(user, 'Despair', ENEMY_HEX)

      await playOnToNextRound(user)

      expect(readCombatMessages()).not.toContain(LOW_MORALE('Pikemen'))
    })

    test('given an undead stack under a spell that raises morale when it acts with the roll always succeeding then the next stack acts', async () => {
      const hero = aMoraleAndLuckCaster({ army: twoStacks('SKELETON') })
      const { user } = await startBattle(aFight({ hero }), {
        appConfig: { moraleRandom: ALWAYS }
      })
      await castSpellAt(user, 'Mirth', FIRST_STACK)

      await moveActiveStackTo(user, FIRST_STACK.row, 2)

      expect(readActiveStack()).toEqual({ stack: 'Skeletons 10', row: 9, column: 1 })
    })

    test('given a hero wearing an artifact that cancels morale when their stack under a spell that raises morale moves with the roll always succeeding then it never acts again', async () => {
      const hero = aMoraleAndLuckCaster({ army: twoStacks('SWORDSMAN'), artifacts: ['SPIRIT'] })
      const { user } = await startBattle(aFight({ hero }), {
        appConfig: { moraleRandom: ALWAYS }
      })
      await castSpellAt(user, 'Mirth', FIRST_STACK)

      await moveActiveStackTo(user, FIRST_STACK.row, 2)

      expect(readActiveStack()).toEqual({ stack: 'Swordsmen 10', row: 9, column: 1 })
      expect(readCombatMessages()).not.toContain(HIGH_MORALE('Swordsmen'))
    })

    // The artifact cancels the Pikemen's +1 and Sorrow's -2 too, so their morale is 0.
    test('given a hero wearing an artifact that cancels morale when the monster stack under a spell that lowers morale starts its turn with the roll just under 2 in 24 then it acts', async () => {
      const hero = aMoraleAndLuckCaster({
        secondarySkills: [advanced('EARTH_MAGIC')],
        artifacts: ['SPIRIT']
      })
      const { user } = await startBattle(aFight({ hero }), {
        appConfig: { moraleRandom: just(2) }
      })
      await castSpellAt(user, 'Sorrow', ENEMY_HEX)

      await playOnToNextRound(user)

      expect(readCombatMessages()).not.toContain(LOW_MORALE('Pikemen'))
    })
  })

  describe('luck', () => {
    // Basic Luck +1 and Advanced Fortune +2.
    test('given a stack with luck +1 under a spell that raises luck by 2 when it strikes with the roll just under 3 in 24 then the strike is lucky', async () => {
      const hero = aMoraleAndLuckCaster({
        secondarySkills: [basic('LUCK'), advanced('AIR_MAGIC')]
      })
      const { user } = await startBattle(aFight({ hero }), { appConfig: { luckRandom: just(3) } })

      await attackPikemenAfter(user, 'Fortune', SWORDSMEN_CLOSE_BY)

      expect(readCombatMessages()).toContain(GOOD_LUCK('Swordsmen'))
    })

    test('given a stack with luck +3 under a spell that raises luck when it strikes with the roll at 3 in 24 then the strike is not lucky', async () => {
      const hero = aMoraleAndLuckCaster({ secondarySkills: [expert('LUCK')] })
      const { user } = await startBattle(aFight({ hero }), {
        appConfig: { luckRandom: exactly(3) }
      })

      await attackPikemenAfter(user, 'Fortune', SWORDSMEN_CLOSE_BY)

      expect(readCombatMessages()).not.toContain(GOOD_LUCK('Swordsmen'))
    })

    test('given a hero wearing an artifact that cancels luck when their stack under a spell that raises luck strikes with the roll always succeeding then the strike is never lucky', async () => {
      const hero = aMoraleAndLuckCaster({ artifacts: ['HOURGLASS'] })
      const { user } = await startBattle(aFight({ hero }), { appConfig: { luckRandom: ALWAYS } })

      await attackPikemenAfter(user, 'Fortune', SWORDSMEN_CLOSE_BY)

      expect(readCombatMessages()).not.toContain(GOOD_LUCK('Swordsmen'))
    })
  })
})
