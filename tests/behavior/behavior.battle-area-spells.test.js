// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { expectMonsterNotPresent } from './adventure-map.utils.js'
import { createMemoryEventLog, readGameData, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  clickBattleHex,
  closeBattleResults,
  getBattleStatusBarText,
  hoverBattleHex,
  moveActiveStackTo,
  pickSpell,
  playOnToNextRound,
  readActiveStack,
  readBattleResultsSide,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  readHighlightedBattleHexes,
  readStackCountColours,
  reloadBattle,
  startBattle,
  startBattleWithStyles,
  waitForBattleResults
} from './battle.utils.js'
import { aHero, aMonster, aScenario, aSpellDefinition } from './builders.js'

const HERO = 'Lord Haart'

const anAreaSpell = ({ name, schools, costs, damage, area }) =>
  aSpellDefinition()
    .withName(name)
    .withSchools(schools)
    .withCosts(costs)
    .withDamage(damage)
    .withArea(area)
    .describedAs(`${name} description.`)
    .build()

const aProtection = ({ name, school, effect }) =>
  aSpellDefinition()
    .withName(name)
    .withSchools([school])
    .withCosts([5, 4, 4, 4])
    .withLasting({
      target: 'own',
      allAtExpert: true,
      effects: { [effect]: [-30, -30, -50, -50] }
    })
    .describedAs(`${name} description.`)
    .build()

const spellDefinitions = {
  FIREBALL: anAreaSpell({
    name: 'Fireball',
    schools: ['FIRE'],
    costs: [15, 12, 12, 12],
    damage: { base: [15, 15, 30, 60], perPower: 10 },
    area: { from: 0, to: 1 }
  }),
  INFERNO: anAreaSpell({
    name: 'Inferno',
    schools: ['FIRE'],
    costs: [16, 12, 12, 12],
    damage: { base: [20, 20, 40, 80], perPower: 10 },
    area: { from: 0, to: 2 }
  }),
  METEOR_SHOWER: anAreaSpell({
    name: 'Meteor Shower',
    schools: ['EARTH'],
    costs: [16, 12, 12, 12],
    damage: { base: [25, 25, 50, 100], perPower: 25 },
    area: { from: 0, to: 1 }
  }),
  FROST_RING: anAreaSpell({
    name: 'Frost Ring',
    schools: ['WATER'],
    costs: [12, 9, 9, 9],
    damage: { base: [15, 15, 30, 60], perPower: 10 },
    area: { from: 1, to: 1 }
  }),
  PROTECTION_FROM_FIRE: aProtection({
    name: 'Protection from Fire',
    school: 'FIRE',
    effect: 'fireSpellDamageTakenPercent'
  })
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

const hexAt = (row, column) => ({ row, column })

const readOwnStacks = () => readBattleStacks().filter(({ column }) => column === 1)

const FIRE_ADVANCED = [{ skill: 'FIRE_MAGIC', level: 'ADVANCED' }]
const FIRE_EXPERT = [{ skill: 'FIRE_MAGIC', level: 'EXPERT' }]

// Power 2 and Knowledge 3, so 30 spell points: Fireball does 15 + 2 × 10 = 35, Inferno 40,
// Frost Ring 35 and Meteor Shower 75.
const aCaster = ({ army = [stack('SWORDSMAN', 10)], secondarySkills = [] } = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills({ power: 2, knowledge: 3 })
    .withSecondarySkills(secondarySkills)
    .withSpellBook(true)
    .withSpells(Object.keys(spellDefinitions))
    .withArmy(army)

const aFight = ({ hero = aCaster(), pikemen = 50 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(hero, aMonster().withType('PIKEMAN').withCount(pikemen).withStacks(1).at(1, 0))
    .withDefinitions(gameDefinitions)

const OWN_HEX = hexAt(6, 1)
const ENEMY_HEX = hexAt(6, 15)

// Seven stacks stand on rows 1, 3, 5, 6, 7, 9 and 11: rows 5, 6 and 7 are next to each other.
const SEVEN_PIKEMEN = Array.from({ length: 7 }, () => stack('PIKEMAN', 10))

// Four stacks stand on rows 1, 5, 7 and 11: the empty hex between rows 5 and 7 touches both.
const FOUR_PIKEMEN = Array.from({ length: 4 }, () => stack('PIKEMAN', 10))
const BETWEEN_ROWS_5_AND_7 = hexAt(6, 1)

// Every stack of the hero's defends, and the enemy plays its turn.
async function defendWithEveryStack(user, stackCount) {
  for (let index = 0; index < stackCount; index += 1) {
    await clickBattleButton(user, 'Defend')
    await waitMs(1000)
  }
}

// The Swordsmen walk to column 5 and the Pikemen come to column 11; next round the Swordsmen walk
// to column 10, and the Pikemen attack them there.
async function bringSwordsmenNextToPikemen(user) {
  await moveActiveStackTo(user, 6, 5)
  await waitMs(1000)
  await moveActiveStackTo(user, 6, 10)
  await waitMs(1000)
}

describe('battle area spells behavior', () => {
  describe('aiming', () => {
    test('given Fireball is picked when the mouse is over an empty hex then the status bar names the spell', async () => {
      const { user } = await startBattle(aFight())
      await pickSpell(user, 'Fireball')

      await hoverBattleHex(user, 6, 8)

      expect(getBattleStatusBarText()).toBe('Cast Fireball')
    })

    test('given Fireball is picked when the mouse is over a hex then that hex and the six around it are lit', async () => {
      const { user } = await startBattleWithStyles(aFight())
      await pickSpell(user, 'Fireball')

      await hoverBattleHex(user, 6, 8)

      expect(readHighlightedBattleHexes()).toEqual([
        hexAt(5, 7),
        hexAt(5, 8),
        hexAt(6, 7),
        hexAt(6, 8),
        hexAt(6, 9),
        hexAt(7, 7),
        hexAt(7, 8)
      ])
    })

    test('given Inferno is picked when the mouse is over a hex then every hex within two of it is lit', async () => {
      const { user } = await startBattleWithStyles(aFight())
      await pickSpell(user, 'Inferno')

      await hoverBattleHex(user, 6, 8)

      const lit = readHighlightedBattleHexes()
      expect([lit.length, lit]).toEqual([
        19,
        expect.arrayContaining([hexAt(4, 7), hexAt(4, 9), hexAt(6, 6), hexAt(6, 10), hexAt(8, 8)])
      ])
    })

    test('given Frost Ring is picked when the mouse is over a hex then the six hexes around it are lit but not the hex itself', async () => {
      const { user } = await startBattleWithStyles(aFight())
      await pickSpell(user, 'Frost Ring')

      await hoverBattleHex(user, 6, 8)

      expect(readHighlightedBattleHexes()).toEqual([
        hexAt(5, 7),
        hexAt(5, 8),
        hexAt(6, 7),
        hexAt(6, 9),
        hexAt(7, 7),
        hexAt(7, 8)
      ])
    })

    test('given Fireball is picked when the player clicks the edge column then the spell is cancelled', async () => {
      const { user } = await startBattle(aFight())
      await pickSpell(user, 'Fireball')

      await hoverBattleHex(user, 6, 0)
      const statusBarText = getBattleStatusBarText()
      await clickBattleHex(user, 6, 0)

      expect([statusBarText, getBattleStatusBarText(), await readBattleSpellPoints(user)]).toEqual([
        'Select Spell Target',
        'Spell cancelled',
        '30'
      ])
    })
  })

  describe('damage', () => {
    // 35 damage kills 3 Pikemen of 10 health each and wounds a fourth.
    test("given the hero's stacks stand side by side when Fireball is cast on the middle one then it and the two next to it are hit", async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ army: SEVEN_PIKEMEN }) }))

      await castSpellAt(user, 'Fireball', OWN_HEX)

      expect([readOwnStacks(), readBattleStacks()]).toEqual([
        [
          stackAt('Pikemen 10', 1, 1),
          stackAt('Pikemen 10', 3, 1),
          stackAt('Pikemen 7', 5, 1),
          stackAt('Pikemen 7', 6, 1),
          stackAt('Pikemen 7', 7, 1),
          stackAt('Pikemen 10', 9, 1),
          stackAt('Pikemen 10', 11, 1)
        ],
        expect.arrayContaining([stackAt('Pikemen 50', 6, 15)])
      ])
    })

    // The Pikemen's strike leaves the top Swordsman 33 of 35 health, the Swordsmen's
    // retaliation leaves 43 Pikemen with 8 on the top one. 35 more kills the top Swordsman and
    // takes 2 from the next, and kills 3 Pikemen.
    test('given the Swordsmen stand next to the Pikemen when Fireball is cast on the Pikemen then both stacks are hit', async () => {
      const { user } = await startBattle(aFight())
      await bringSwordsmenNextToPikemen(user)

      await castSpellAt(user, 'Fireball', hexAt(6, 11))

      expect(readBattleStacks()).toEqual([
        stackAt('Swordsmen 8', 6, 10),
        stackAt('Pikemen 40', 6, 11)
      ])
    })

    // Inferno's 40 kills one Swordsman of 35 health.
    test('given the Swordsmen stand two hexes from the aimed hex when Inferno is cast then they are hit', async () => {
      const { user } = await startBattle(aFight())

      await castSpellAt(user, 'Inferno', hexAt(6, 3))

      expect(readBattleStacks()).toEqual([
        stackAt('Swordsmen 9', 6, 1),
        stackAt('Pikemen 50', 6, 15)
      ])
    })

    test("given the hero's stacks stand side by side when Frost Ring is cast on the middle one then the two next to it are hit but not the middle one", async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ army: SEVEN_PIKEMEN }) }))

      await castSpellAt(user, 'Frost Ring', OWN_HEX)

      expect(readOwnStacks().slice(2, 5)).toEqual([
        stackAt('Pikemen 7', 5, 1),
        stackAt('Pikemen 10', 6, 1),
        stackAt('Pikemen 7', 7, 1)
      ])
    })

    // The Cavaliers walk to column 7, their back half on column 6; Fireball on column 5 reaches
    // the back half only.
    test('given only the back half of the Cavaliers is next to the aimed hex when Fireball is cast then they are hit once', async () => {
      const hero = aCaster({ army: [stack('CAVALIER', 10)] })
      const { user } = await startBattle(aFight({ hero }))
      await moveActiveStackTo(user, 6, 7)
      await waitMs(1000)

      await castSpellAt(user, 'Fireball', hexAt(6, 5))

      expect(readCombatMessages().slice(-2)).toEqual([
        "Lord Haart casts 'Fireball' on the Cavaliers.",
        'The Fireball does 35 damage.'
      ])
    })

    // Expert: 60 + 2 × 10 = 80, 8 Pikemen.
    test('given the hero has Expert Fire Magic when Fireball is cast on the Pikemen then it does 80 damage', async () => {
      const hero = aCaster({ secondarySkills: FIRE_EXPERT })
      const { user } = await startBattle(aFight({ hero }))

      await castSpellAt(user, 'Fireball', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 42', 6, 15))
    })

    test('given the Swordsmen stand two hexes from the aimed hex when Fireball is cast then no one is hit, the spell points are spent and only the cast is written to the combat log', async () => {
      const { user } = await startBattle(aFight())

      await castSpellAt(user, 'Fireball', hexAt(6, 3))
      const stacks = readBattleStacks()
      const lastMessage = readCombatMessages().at(-1)
      await playOnToNextRound(user)

      expect([stacks, lastMessage, await readBattleSpellPoints(user)]).toEqual([
        [stackAt('Swordsmen 10', 6, 1), stackAt('Pikemen 50', 6, 15)],
        "Lord Haart casts 'Fireball'.",
        '15'
      ])
    })

    test('given Fireball hits one stack then the combat log names it', async () => {
      const { user } = await startBattle(aFight())

      await castSpellAt(user, 'Fireball', ENEMY_HEX)

      expect(readCombatMessages().slice(-2)).toEqual([
        "Lord Haart casts 'Fireball' on the Pikemen.",
        'The Fireball does 35 damage. 3 Pikemen perish.'
      ])
    })

    test('given Fireball hits several stacks then the combat log adds up the damage and counts the creatures', async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ army: SEVEN_PIKEMEN }) }))

      await castSpellAt(user, 'Fireball', OWN_HEX)

      expect(readCombatMessages().slice(-2)).toEqual([
        "Lord Haart casts 'Fireball'.",
        'The Fireball does 105 damage. 9 creatures perish.'
      ])
    })
  })

  describe('the end of the battle', () => {
    test('given Fireball kills the last enemy stack then the hero wins the battle', async () => {
      const { user } = await startBattle(aFight({ pikemen: 3 }))

      await castSpellAt(user, 'Fireball', ENEMY_HEX)
      await waitForBattleResults()

      expect(readBattleResultsSide('Attacker')).toEqual([HERO, 'Victorious'])
    })

    test("given Fireball kills the hero's last stack then the hero loses the battle", async () => {
      const hero = aCaster({ army: [stack('SWORDSMAN', 1)] })
      const { user } = await startBattle(aFight({ hero }))

      await castSpellAt(user, 'Fireball', hexAt(6, 2))
      await waitForBattleResults()

      expect(readBattleResultsSide('Attacker')).toEqual([HERO, 'Defeated'])
    })

    // Two stacks stand on rows 3 and 9; the Swordsmen are faster and act first.
    test('given Fireball kills the stack whose turn it is then the next stack acts', async () => {
      const hero = aCaster({ army: [stack('SWORDSMAN', 1), stack('PIKEMAN', 10)] })
      const { user } = await startBattle(aFight({ hero }))

      await castSpellAt(user, 'Fireball', hexAt(3, 2))
      await waitMs(1000)

      expect(readActiveStack()).toEqual(stackAt('Pikemen 10', 9, 1))
    })

    // The Pikemen's strike leaves the Swordsman 33 health, its retaliation leaves the Pikemen 22.
    test('given Fireball kills the last stacks of both sides then the hero loses and the monster is gone from the map', async () => {
      const hero = aCaster({ army: [stack('SWORDSMAN', 1)] })
      const { user } = await startBattle(aFight({ hero, pikemen: 3 }))
      await bringSwordsmenNextToPikemen(user)

      await castSpellAt(user, 'Fireball', hexAt(6, 11))
      await waitForBattleResults()
      const attacker = readBattleResultsSide('Attacker')
      await closeBattleResults(user)

      expect(attacker).toEqual([HERO, 'Defeated'])
      expectMonsterNotPresent()
    })
  })

  describe('reload', () => {
    test('given the hero cast Fireball when the page reloads then the stacks hit keep their losses', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: aCaster({ army: SEVEN_PIKEMEN }) })
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Fireball', OWN_HEX)

      await reloadBattle(scenario, { eventLog })

      expect(readOwnStacks().slice(2, 5)).toEqual([
        stackAt('Pikemen 7', 5, 1),
        stackAt('Pikemen 7', 6, 1),
        stackAt('Pikemen 7', 7, 1)
      ])
    })
  })

  describe('protections', () => {
    // Fireball's 35 on the stack on row 5, 30% less: 24.5, so 24, 2 Pikemen. The stack on
    // row 7 takes all 35, 3 Pikemen.
    test('given Protection from Fire is on a stack when Fireball hits it and the stack next to it then it takes 30% less', async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ army: FOUR_PIKEMEN }) }))
      await castSpellAt(user, 'Protection from Fire', hexAt(5, 1))
      await defendWithEveryStack(user, 4)

      await castSpellAt(user, 'Fireball', BETWEEN_ROWS_5_AND_7)

      expect(readOwnStacks().slice(1, 3)).toEqual([
        stackAt('Pikemen 8', 5, 1),
        stackAt('Pikemen 7', 7, 1)
      ])
    })

    // Advanced: Fireball's 30 + 2 × 10 = 50 on the stack on row 5, half of it: 25, 2 Pikemen,
    // the stack on row 7 takes 50: 5 Pikemen.
    test('given Advanced Protection from Fire is on a stack when Fireball hits it then it takes half the damage', async () => {
      const hero = aCaster({ army: FOUR_PIKEMEN, secondarySkills: FIRE_ADVANCED })
      const { user } = await startBattle(aFight({ hero }))
      await castSpellAt(user, 'Protection from Fire', hexAt(5, 1))
      await defendWithEveryStack(user, 4)

      await castSpellAt(user, 'Fireball', BETWEEN_ROWS_5_AND_7)

      expect(readCombatMessages().at(-1)).toBe('The Fireball does 75 damage. 7 creatures perish.')
    })

    test("given the hero has Expert Fire Magic when Protection from Fire is picked then it goes on every one of the hero's stacks", async () => {
      const hero = aCaster({ army: FOUR_PIKEMEN, secondarySkills: FIRE_EXPERT })
      const { user } = await startBattleWithStyles(aFight({ hero }))

      await pickSpell(user, 'Protection from Fire')

      expect(readStackCountColours().map(({ colour }) => colour)).toEqual([
        'green',
        'green',
        'purple',
        'green',
        'green'
      ])
    })

    // Meteor Shower's 75 on the stack on row 5 alone: 7 Pikemen.
    test('given Protection from Fire is on a stack when Meteor Shower hits it then it takes all the damage', async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ army: FOUR_PIKEMEN }) }))
      await castSpellAt(user, 'Protection from Fire', hexAt(5, 1))
      await defendWithEveryStack(user, 4)

      await castSpellAt(user, 'Meteor Shower', hexAt(4, 1))

      expect(readCombatMessages().at(-1)).toBe(
        'The Meteor Shower does 75 damage. 7 Pikemen perish.'
      )
    })
  })
})
