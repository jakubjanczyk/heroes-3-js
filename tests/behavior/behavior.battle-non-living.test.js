// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { readGameData, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  moveActiveStackTo,
  pickSpell,
  readActiveStack,
  readBattleStacks,
  readCombatMessages,
  startBattle
} from './battle.utils.js'
import { aCreatureDefinition, aHero, aMonster, aScenario, aSpellDefinition } from './builders.js'

const HALF_SPELL_DAMAGE = 50
const QUARTER_SPELL_DAMAGE = 75

const aGolem = ({ name, reduction }) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withFaction('CASTLE')
    .withHealth(10)
    .withAbilities(['nonLiving', 'neutralMorale', 'immuneToMindSpells'])
    .withSpellDamageReduction(reduction)
    .build()

const CREATURES = {
  GOLEM: aGolem({ name: 'Golem', reduction: HALF_SPELL_DAMAGE }),
  HEAVY_GOLEM: aGolem({ name: 'Heavy Golem', reduction: QUARTER_SPELL_DAMAGE })
}

const aDamageSpell = ({ name, schools, damage }) =>
  aSpellDefinition()
    .withName(name)
    .withSchools(schools)
    .withCosts([5, 4, 4, 4])
    .withDamage(damage)
    .describedAs(`${name} description.`)

const SPELLS = {
  MAGIC_ARROW: aDamageSpell({
    name: 'Magic Arrow',
    schools: ['AIR', 'EARTH', 'FIRE', 'WATER'],
    damage: { base: [10, 10, 20, 30], perPower: 10 }
  }).build(),
  FIREBALL: aDamageSpell({
    name: 'Fireball',
    schools: ['FIRE'],
    damage: { base: [15, 15, 30, 60], perPower: 10 }
  })
    .withArea({ from: 0, to: 1 })
    .build(),
  DEATH_RIPPLE: aDamageSpell({
    name: 'Death Ripple',
    schools: ['EARTH'],
    damage: { base: [10, 10, 20, 30], perPower: 5 }
  })
    .withTargets('all')
    .withNotOnUndead(true)
    .build(),
  CHAIN_LIGHTNING: aDamageSpell({
    name: 'Chain Lightning',
    schools: ['AIR'],
    damage: { base: [25, 25, 50, 100], perPower: 40 }
  })
    .withChain({ strikes: [4, 4, 5, 5], factor: 0.5 })
    .build(),
  PROTECTION_FROM_FIRE: aSpellDefinition()
    .withName('Protection from Fire')
    .withSchools(['FIRE'])
    .withCosts([5, 4, 4, 4])
    .withLasting({
      target: 'own',
      allAtExpert: true,
      effects: { fireSpellDamageTakenPercent: [-30, -30, -50, -50] }
    })
    .describedAs('Protection from Fire description.')
    .build()
}

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: { ...readGameData('monsters.json'), ...CREATURES },
  spells: SPELLS
}

const stack = (creature, count = 10) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

const hexAt = (row, column) => ({ row, column })

// Power 2 and Knowledge 5, so 50 spell points: Magic Arrow does 10 + 2 × 10 = 30, Fireball 35,
// Death Ripple 20 and Chain Lightning 105, then 52, 26 and 13.
const aCaster = ({ army = [stack('SWORDSMAN')], secondarySkills = [] } = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills({ power: 2, knowledge: 5 })
    .withSecondarySkills(secondarySkills)
    .withSpellBook(true)
    .withSpells(Object.keys(SPELLS))
    .withArmy(army)

const aFight = ({ hero = aCaster(), monster = 'PIKEMAN', count = 50, stacks = 1 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(hero, aMonster().withType(monster).withCount(count).withStacks(stacks).at(1, 0))
    .withDefinitions(definitions)

const OWN_HEX = hexAt(6, 1)
const ENEMY_HEX = hexAt(6, 15)

// Four stacks stand on rows 1, 5, 7 and 11: the empty hex between rows 5 and 7 touches both.
const BETWEEN_ROWS_5_AND_7 = hexAt(6, 1)

const readOwnStacks = () => readBattleStacks().filter(({ column }) => column === 1)

const ALWAYS = () => 0

describe('battle non-living creatures behavior', () => {
  describe('spell damage reduction', () => {
    test.each([
      {
        creature: 'GOLEM',
        reduction: '50%',
        line: 'The Magic Arrow does 15 damage. One Golem perishes.'
      },
      {
        creature: 'HEAVY_GOLEM',
        reduction: '75%',
        line: 'The Magic Arrow does 7 damage.'
      }
    ])('given the enemy creature takes $reduction less spell damage when Magic Arrow hits it for 30 then the combat log says it took less', async ({
      creature,
      line
    }) => {
      const { user } = await startBattle(aFight({ monster: creature, count: 10 }))

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readCombatMessages().at(-1)).toBe(line)
    })

    // Half of 35 on the Golems is 17: one perishes. The Pikemen take all 35: three perish.
    test('given Fireball hits Golems and Pikemen standing side by side then the Golems take half and the Pikemen all of it', async () => {
      const army = [stack('PIKEMAN'), stack('GOLEM'), stack('PIKEMAN'), stack('PIKEMAN')]
      const { user } = await startBattle(aFight({ hero: aCaster({ army }) }))

      await castSpellAt(user, 'Fireball', BETWEEN_ROWS_5_AND_7)

      expect(readOwnStacks().slice(1, 3)).toEqual([
        stackAt('Golems 9', 5, 1),
        stackAt('Pikemen 7', 7, 1)
      ])
    })

    // Death Ripple's 20 is halved to 10 on the Golems: one of 10 health perishes.
    test("given Death Ripple is cast then it hits the hero's Golems for half", async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ army: [stack('GOLEM')] }) }))

      await pickSpell(user, 'Death Ripple')

      expect(readOwnStacks()).toEqual([stackAt('Golems 9', 6, 1)])
    })

    // The enemy's three stacks of 100 Golems on rows 3, 6 and 9 take half of 105, 52 and 26: 52,
    // 26 and 13, and 5, 2 and 1 of them perish. The last jump, to the hero's Pikemen on row 9, is
    // half of 26, not of what the Golems took: 13, and one Pikeman perishes.
    test('given Chain Lightning jumps from Golems to Pikemen then the Golems take half and the Pikemen half of what the Golems were struck with', async () => {
      const hero = aCaster({ army: [stack('PIKEMAN'), stack('PIKEMAN')] })
      const { user } = await startBattle(aFight({ hero, monster: 'GOLEM', count: 300, stacks: 3 }))

      await castSpellAt(user, 'Chain Lightning', hexAt(3, 15))
      await waitMs(1200)

      expect(readCombatMessages().at(-1)).toBe(
        'The Chain Lightning does 104 damage. 9 creatures perish.'
      )
    })

    // Fireball's 35 on the protected Golems is 24 (30% less, rounded down), then half: 12.
    test('given Protection from Fire is on Golems when Fireball hits them then both lessen the damage', async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ army: [stack('GOLEM')] }) }))
      await castSpellAt(user, 'Protection from Fire', OWN_HEX)
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)

      await castSpellAt(user, 'Fireball', OWN_HEX)

      expect(readCombatMessages().at(-1)).toBe('The Fireball does 12 damage. One Golem perishes.')
    })
  })

  describe('neutral morale', () => {
    // Expert Leadership +3 and one alignment +1: the Pikemen have morale +4, the Golems none.
    test('given Golems in an army with good morale when they act then the next stack acts', async () => {
      const army = [stack('GOLEM'), stack('PIKEMAN')]
      const hero = aCaster({ army, secondarySkills: [{ skill: 'LEADERSHIP', level: 'EXPERT' }] })
      const { user } = await startBattle(aFight({ hero }), { appConfig: { moraleRandom: ALWAYS } })

      await moveActiveStackTo(user, 3, 2)

      expect(readActiveStack()).toEqual(stackAt('Pikemen 10', 9, 1))
    })

    // Golems, Centaurs and Imps are of three towns: morale -1. The Centaurs and the Imps freeze;
    // the Golems, as slow as the monster's Pikemen, act next.
    test('given Golems in an army with bad morale when their turn comes then they act', async () => {
      const hero = aCaster({ army: [stack('GOLEM'), stack('CENTAUR'), stack('IMP')] })

      await startBattle(aFight({ hero }), { appConfig: { moraleRandom: ALWAYS } })

      expect(readActiveStack().stack).toBe('Golems 10')
    })
  })
})
