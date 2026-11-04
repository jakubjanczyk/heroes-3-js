// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, readGameData } from './app.utils.js'
import {
  pickSpell,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  startBattle
} from './battle.utils.js'
import { aHero, aMonster, aScenario, aSpellDefinition } from './builders.js'
import { querySpellBook } from './spell-book.utils.js'

const spellDefinitions = {
  ARMAGEDDON: aSpellDefinition()
    .withName('Armageddon')
    .withLevel(4)
    .withSchools(['FIRE'])
    .withCosts([24, 20, 20, 20])
    .withDamage({ base: [30, 30, 60, 120], perPower: 50 })
    .withTargets('all')
    .describedAs('Armageddon description.')
    .build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  spells: spellDefinitions
}

const stack = (creature, count) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// Power 2 and Knowledge 3, so 30 spell points: Armageddon does 30 + 2 × 50 = 130, which kills 3
// Swordsmen of 35 health and wounds a fourth, or 13 Pikemen of 10.
const aCaster = ({ army = [stack('SWORDSMAN', 10)], secondarySkills = [] } = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills({ power: 2, knowledge: 3 })
    .withSecondarySkills(secondarySkills)
    .withSpellBook(true)
    .withSpells(Object.keys(spellDefinitions))
    .withArmy(army)

const aFight = ({ hero = aCaster(), pikemen = 50, stacks = 1 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(
      hero,
      aMonster().withType('PIKEMAN').withCount(pikemen).withStacks(stacks).at(1, 0)
    )
    .withDefinitions(gameDefinitions)

const SWORDSMEN_AND_PIKEMEN = [stack('SWORDSMAN', 10), stack('PIKEMAN', 30)]

describe('battle battlefield spells behavior', () => {
  describe('Armageddon', () => {
    test('given the hero knows Armageddon when it is clicked in the battle book then the book closes and every stack of both sides is hit', async () => {
      const hero = aCaster({ army: SWORDSMEN_AND_PIKEMEN })
      const { user } = await startBattle(aFight({ hero, stacks: 2 }))

      await pickSpell(user, 'Armageddon')

      expect([querySpellBook(), readBattleStacks()]).toEqual([
        null,
        [
          stackAt('Swordsmen 7', 3, 1),
          stackAt('Pikemen 12', 3, 15),
          stackAt('Pikemen 17', 9, 1),
          stackAt('Pikemen 12', 9, 15)
        ]
      ])
    })

    // Expert: 120 + 2 × 50 = 220, 6 Swordsmen (210) and 10 of the seventh's health.
    test('given the hero has Expert Fire Magic and Power 2 when Armageddon is cast then each stack takes 220 damage', async () => {
      const hero = aCaster({ secondarySkills: [{ skill: 'FIRE_MAGIC', level: 'EXPERT' }] })
      const { user } = await startBattle(aFight({ hero }))

      await pickSpell(user, 'Armageddon')

      expect(readBattleStacks()).toEqual([
        stackAt('Swordsmen 4', 6, 1),
        stackAt('Pikemen 28', 6, 15)
      ])
    })

    test('given Armageddon hits several stacks then the combat log reads the cast, the total damage and how many creatures perish', async () => {
      const { user } = await startBattle(aFight())

      await pickSpell(user, 'Armageddon')

      expect(readCombatMessages().slice(-2)).toEqual([
        "Lord Haart casts 'Armageddon'.",
        'The Armageddon does 260 damage. 16 creatures perish.'
      ])
    })

    test('given the hero cast Armageddon when the page reloads then every stack keeps its losses', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight()
      const { user } = await startBattle(scenario, { eventLog })
      await pickSpell(user, 'Armageddon')

      await reloadBattle(scenario, { eventLog })

      expect(readBattleStacks()).toEqual([
        stackAt('Swordsmen 7', 6, 1),
        stackAt('Pikemen 37', 6, 15)
      ])
    })
  })
})
