// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, getCursorOver, readGameData, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  clickBattleHex,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  isBattleHexReachable,
  readActiveStack,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  readStackCountColour,
  reloadBattle,
  startBattle
} from './battle.utils.js'
import { aCreatureDefinition, aHero, aMonster, aScenario, aSpellDefinition } from './builders.js'

const aHelpfulSpell = ({ name, level = 1, schools = ['AIR'], effects, ...rule }) =>
  aSpellDefinition()
    .withName(name)
    .withLevel(level)
    .withSchools(schools)
    .withCosts([6, 5, 5, 5])
    .withLasting({ target: 'own', allAtExpert: true, effects, ...rule })
    .describedAs(`${name} description.`)

const SPELLS = {
  HASTE: aHelpfulSpell({ name: 'Haste', effects: { speed: [3, 3, 5, 5] } }).build(),
  STONE_SKIN: aHelpfulSpell({ name: 'Stone Skin', effects: { defense: [3, 3, 6, 6] } }).build(),
  FORTUNE: aHelpfulSpell({ name: 'Fortune', effects: { luck: [1, 1, 2, 2] } }).build(),
  COUNTERSTRIKE: aHelpfulSpell({
    name: 'Counterstrike',
    level: 4,
    effects: { extraRetaliations: [1, 1, 2, 2] }
  }).build(),
  BLOODLUST: aHelpfulSpell({ name: 'Bloodlust', effects: { meleeAttack: [3, 3, 6, 6] } })
    .withUsefulWhen('targetWalks')
    .build(),
  PRECISION: aHelpfulSpell({
    name: 'Precision',
    shootersOnly: true,
    effects: { rangedAttack: [3, 3, 6, 6] }
  }).build(),
  SHIELD: aHelpfulSpell({
    name: 'Shield',
    effects: { meleeDamageTakenPercent: [-15, -15, -30, -30] }
  })
    .withUsefulWhen('enemyWalks')
    .build(),
  AIR_SHIELD: aHelpfulSpell({
    name: 'Air Shield',
    effects: { rangedDamageTakenPercent: [-25, -25, -50, -50] }
  })
    .withUsefulWhen('enemyShoots')
    .build(),
  ANTI_MAGIC: aHelpfulSpell({ name: 'Anti-Magic', effects: { spellLevelImmunity: [0, 0, 0, 0] } })
    .withUsefulWhen('enemyHasHero')
    .build(),
  SLAYER: aHelpfulSpell({
    name: 'Slayer',
    effects: { attackAgainstKings: [8, 8, 8, 8], kingsReached: [1, 1, 2, 3] }
  })
    .withUsefulWhen('enemyKingReached')
    .build(),
  PROTECTION_FROM_FIRE: aHelpfulSpell({
    name: 'Protection from Fire',
    schools: ['FIRE'],
    effects: { fireSpellDamageTakenPercent: [-30, -30, -50, -50] }
  }).build(),
  CURE: aSpellDefinition()
    .withName('Cure')
    .withSchools(['WATER'])
    .withCosts([6, 5, 5, 5])
    .withHeals({ target: 'own', allAtExpert: true, base: [10, 10, 20, 30], perPower: 5 })
    .describedAs('Cure description.')
    .build()
}

const ADVANCED = 2
const GENIE_POWER = 6

const aGenie = ({ spells = ['HASTE'], times = 3, name = 'Genie' } = {}) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withHealth(40)
    .withSpeed(11)
    .withAbilities(['flying'])
    .withAiValue(0)
    .withCasts({ times, skillLevel: ADVANCED, power: GENIE_POWER, spells })
    .build()

const aFighter = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withHealth(100)
    .withDamage({ min: 1, max: 1 })

const CREATURES = {
  SWORDSMAN: aFighter('Swordsman').withNamePlural('Swordsmen').withSpeed(5).build(),
  STATUE: aFighter('Statue').withSpeed(1).withHealth(10000).build(),
  ARCHER: aFighter('Archer')
    .withSpeed(4)
    .withShots(99)
    .withAbilities(['ranged'])
    .withHealth(10000)
    .build(),
  WARDEN: aFighter('Warden').withSpeed(5).withSpellLevelImmunity(3).build(),
  SALAMANDER: aFighter('Salamander').withSpeed(5).withSpellSchoolImmunity(['FIRE']).build(),
  QUEEN: aFighter('Queen').withSpeed(1).withHealth(10000).withKing(2).build(),
  GIANT: aFighter('Giant').withSpeed(1).withHealth(10000).withKing(3).build(),
  PAWN: aFighter('Pawn').withSpeed(5).withAiValue(10).build(),
  KNIGHT: aFighter('Knight').withSpeed(5).withAiValue(1000).build(),
  SQUIRE: aFighter('Squire').withSpeed(5).withHealth(79).withAiValue(1000).build(),
  MARKSMAN: aFighter('Marksman')
    .withSpeed(1)
    .withDamage({ min: 132, max: 132 })
    .withShots(99)
    .withAbilities(['ranged'])
    .withHealth(10000)
    .build()
}

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: CREATURES,
  spells: SPELLS,
  artifacts: {}
}

const stack = (creature, count) => ({ creature, count })

const HERO = 'Lord Haart'

const aGenieMaster = ({ army = [stack('GENIE', 1), stack('SWORDSMAN', 10)] } = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills({ attack: 0, defense: 0, power: 1, knowledge: 2 })
    .withSpellBook(true)
    .withSpells(['HASTE'])
    .withArmy(army)

const aGenieFight = ({
  genie = aGenie(),
  hero = aGenieMaster({ army: [stack('GENIE', 2), stack('SWORDSMAN', 10)] }),
  monster = 'STATUE',
  count = 1,
  creatures = {}
} = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(hero, aMonster().withType(monster).withCount(count).withStacks(1).at(1, 0))
    .withDefinitions({ ...definitions, monsters: { ...CREATURES, GENIE: genie, ...creatures } })

const aGenieFightWithAHero = ({ genie = aGenie(), enemyArmy, heroArmy }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aGenieMaster({ army: heroArmy }),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills({ attack: 0, defense: 0, power: 1, knowledge: 1 })
        .withArmy(enemyArmy)
        .at(1, 0)
    )
    .withDefinitions({ ...definitions, monsters: { ...CREATURES, GENIE: genie } })

const fight = (scenario, options) => startBattle(scenario, { battleStepDelayMs: 0, ...options })

const fightWithStyles = (scenario, options) => fight(scenario, { withStyles: true, ...options })

const hexOf = (name) => {
  const { row, column } = readBattleStacks().find(({ stack }) => stack.startsWith(name))
  return { row, column }
}

const genieLines = () => readCombatMessages().filter((line) => line.startsWith('The Genie'))

async function hover(user, { row, column }) {
  await hoverBattleHex(user, row, column)
}

const cursorOver = ({ row, column }) => getCursorOver(getBattleHex(row, column))

async function castOn(user, name) {
  const { row, column } = hexOf(name)
  await clickBattleHex(user, row, column)
  await waitMs(1000)
}

async function defend(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

async function defendRound(user) {
  await defend(user)
  await defend(user)
}

describe('battle Master Genies behavior', () => {
  describe('aiming', () => {
    test("given it is the Genies' turn when the mouse is over the Swordsmen then the cursor is the spell cursor", async () => {
      const { user } = await fightWithStyles(aGenieFight())

      await hover(user, hexOf('Swordsmen'))

      expect(cursorOver(hexOf('Swordsmen'))).toBe('battle-spell')
    })

    test('given it is the Genies\' turn when the mouse is over the Swordsmen then the status bar says "Cast a spell on Swordsmen"', async () => {
      const { user } = await fight(aGenieFight())

      await hover(user, hexOf('Swordsmen'))

      expect(getBattleStatusBarText()).toBe('Cast a spell on Swordsmen')
    })

    test("given it is the Genies' turn when the mouse is over the Genies themselves then there is no spell cursor", async () => {
      const { user } = await fightWithStyles(aGenieFight())

      await hover(user, hexOf('Genies'))

      expect(cursorOver(hexOf('Genies'))).toBe('battle-query')
    })

    test("given the Swordsmen already have the Genies' only spell when the mouse is over them then there is no spell cursor", async () => {
      const { user } = await fightWithStyles(aGenieFight())
      await castSpellAt(user, 'Haste', hexOf('Swordsmen'))

      await hover(user, hexOf('Swordsmen'))

      expect(cursorOver(hexOf('Swordsmen'))).toBe('battle-query')
    })

    test("given it is the Genies' turn when the player clicks an empty hex then the Genies fly there", async () => {
      const { user } = await fight(aGenieFight())

      await clickBattleHex(user, 2, 5)
      await waitMs(1000)

      expect(hexOf('Genies')).toEqual({ row: 2, column: 5 })
    })
  })

  describe('casting', () => {
    test('given it is the Genies\' turn when the player clicks the Swordsmen then the log says "The Genies cast Haste"', async () => {
      const { user } = await fight(aGenieFight())

      await castOn(user, 'Swordsmen')

      expect(genieLines()).toEqual(['The Genies cast Haste'])
    })

    test('given a single Genie when it casts then the log says "The Genie casts Haste"', async () => {
      const hero = aGenieMaster({ army: [stack('GENIE', 1), stack('SWORDSMAN', 10)] })
      const { user } = await fight(aGenieFight({ hero }))

      await castOn(user, 'Swordsmen')

      expect(genieLines()).toEqual(['The Genie casts Haste'])
    })

    test("given the Genies cast when the cast is done then it is the Swordsmen's turn", async () => {
      const { user } = await fight(aGenieFight())

      await castOn(user, 'Swordsmen')

      expect(readActiveStack().stack).toBe('Swordsmen 10')
    })

    test("given the Genies cast Haste on the Swordsmen then it is Advanced Haste: the Swordsmen's speed 5 becomes 10", async () => {
      const { user } = await fight(aGenieFight())
      const { row, column } = hexOf('Swordsmen')

      await castOn(user, 'Swordsmen')

      expect(isBattleHexReachable(row, column + 10)).toBe(true)
      expect(isBattleHexReachable(row, column + 11)).toBe(false)
    })

    test('given the Genies cast Haste in the first round then it is still on the Swordsmen in the sixth round', async () => {
      const { user } = await fightWithStyles(aGenieFight())
      await castOn(user, 'Swordsmen')
      await defend(user)

      for (const _round of [2, 3, 4, 5]) {
        await defendRound(user)
      }

      expect(readStackCountColour(hexOf('Swordsmen').row, hexOf('Swordsmen').column)).toBe('green')
    })

    test('given the Genies cast Haste in the first round then it is gone in the seventh round', async () => {
      const { user } = await fightWithStyles(aGenieFight())
      await castOn(user, 'Swordsmen')
      await defend(user)

      for (const _round of [2, 3, 4, 5, 6]) {
        await defendRound(user)
      }

      expect(readStackCountColour(hexOf('Swordsmen').row, hexOf('Swordsmen').column)).toBe('purple')
    })

    // Each of the Marksman's shots does 64 to the Squires, leaving the top one 15 of 79. Advanced
    // Cure with Power 6 heals 20 + 6 × 5 = 50, so the next 64 leave it 1, where 49 would kill it.
    test('given the top Squire has lost 64 health when the Genies cast Cure on them then the next shot kills none', async () => {
      const genie = aGenie({ spells: ['CURE'] })
      const hero = aGenieMaster({ army: [stack('GENIE', 2), stack('SQUIRE', 10)] })
      const { user } = await fight(aGenieFight({ genie, hero, monster: 'MARKSMAN' }))
      await defendRound(user)

      await castOn(user, 'Squires')
      await defendRound(user)

      expect(readBattleStacks().map(({ stack }) => stack)).toContain('Squires 10')
    })

    test('given the Genies cast when the hero casts a spell the same round then the hero casts it', async () => {
      const { user } = await fight(aGenieFight({ genie: aGenie({ spells: ['STONE_SKIN'] }) }))
      await castOn(user, 'Swordsmen')

      await castSpellAt(user, 'Haste', hexOf('Swordsmen'))

      expect(readCombatMessages().at(-1)).toBe("Lord Haart casts 'Haste' on the Swordsmen.")
    })

    test('given the Genies cast then the hero has all 20 spell points', async () => {
      const { user } = await fight(aGenieFight())
      await castOn(user, 'Swordsmen')

      expect(await readBattleSpellPoints(user)).toBe('20')
    })

    test('given the Genies cast three times then on their fourth turn there is no spell cursor over the Swordsmen', async () => {
      const genie = aGenie({ spells: ['HASTE', 'STONE_SKIN', 'FORTUNE', 'COUNTERSTRIKE'] })
      const { user } = await fightWithStyles(aGenieFight({ genie }))
      for (const _round of [1, 2, 3]) {
        await castOn(user, 'Swordsmen')
        await defend(user)
      }

      await hover(user, hexOf('Swordsmen'))

      expect(cursorOver(hexOf('Swordsmen'))).toBe('battle-query')
    })
  })

  describe('the spells rolled', () => {
    test('given a stack immune to spells of level 1-3 then the Genies cast their level 4 spell on it', async () => {
      const genie = aGenie({ spells: ['HASTE', 'COUNTERSTRIKE'] })
      const hero = aGenieMaster({ army: [stack('GENIE', 2), stack('WARDEN', 10)] })
      const { user } = await fight(aGenieFight({ genie, hero }))

      await castOn(user, 'Wardens')

      expect(genieLines()).toEqual(['The Genies cast Counterstrike'])
    })

    test('given a stack immune to Fire spells then the Genies cast a spell of another school on it', async () => {
      const genie = aGenie({ spells: ['PROTECTION_FROM_FIRE', 'HASTE'] })
      const hero = aGenieMaster({ army: [stack('GENIE', 2), stack('SALAMANDER', 10)] })
      const { user } = await fight(aGenieFight({ genie, hero }))

      await castOn(user, 'Salamanders')

      expect(genieLines()).toEqual(['The Genies cast Haste'])
    })

    test.each([
      { spell: 'CURE', name: 'Cure', target: 'an unhurt stack', own: 'SWORDSMAN' },
      { spell: 'BLOODLUST', name: 'Bloodlust', target: 'a shooter', own: 'ARCHER' },
      {
        spell: 'PRECISION',
        name: 'Precision',
        target: "a stack that doesn't shoot",
        own: 'SWORDSMAN'
      }
    ])('$name is never rolled on $target', async ({ spell, own }) => {
      const genie = aGenie({ spells: [spell, 'HASTE'] })
      const hero = aGenieMaster({ army: [stack('GENIE', 2), stack(own, 10)] })
      const { user } = await fight(aGenieFight({ genie, hero }))

      await castOn(user, CREATURES[own].namePlural)

      expect(genieLines()).toEqual(['The Genies cast Haste'])
    })

    test.each([
      { spell: 'SHIELD', name: 'Shield', against: 'only shooters', monster: 'ARCHER' },
      { spell: 'AIR_SHIELD', name: 'Air Shield', against: 'no shooters', monster: 'STATUE' },
      {
        spell: 'ANTI_MAGIC',
        name: 'Anti-Magic',
        against: 'a monster with no hero',
        monster: 'STATUE'
      },
      {
        spell: 'SLAYER',
        name: 'Slayer',
        against: "a king Advanced Slayer doesn't reach",
        monster: 'GIANT'
      }
    ])('$name is never rolled against $against', async ({ spell, monster }) => {
      const genie = aGenie({ spells: [spell, 'HASTE'] })
      const { user } = await fight(aGenieFight({ genie, monster }))

      await castOn(user, 'Swordsmen')

      expect(genieLines()).toEqual(['The Genies cast Haste'])
    })

    test.each([
      { spell: 'SHIELD', name: 'Shield', against: 'a stack that walks', monster: 'STATUE' },
      { spell: 'AIR_SHIELD', name: 'Air Shield', against: 'a shooter', monster: 'ARCHER' },
      {
        spell: 'SLAYER',
        name: 'Slayer',
        against: 'a king Advanced Slayer reaches',
        monster: 'QUEEN'
      }
    ])('$name can be rolled against $against', async ({ spell, name, monster }) => {
      const genie = aGenie({ spells: [spell, 'HASTE'] })
      const { user } = await fight(aGenieFight({ genie, monster }))

      await castOn(user, 'Swordsmen')

      expect(genieLines()).toEqual([`The Genies cast ${name}`])
    })

    test('Anti-Magic can be rolled against a hero', async () => {
      const genie = aGenie({ spells: ['ANTI_MAGIC', 'HASTE'] })
      const { user } = await fight(
        aGenieFightWithAHero({
          genie,
          heroArmy: [stack('GENIE', 2), stack('SWORDSMAN', 10)],
          enemyArmy: [stack('STATUE', 1)]
        })
      )

      await castOn(user, 'Swordsmen')

      expect(genieLines()).toEqual(['The Genies cast Anti-Magic'])
    })
  })

  describe('reload', () => {
    test('given the Genies cast Haste when the page reloads then the Swordsmen still have it', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aGenieFight()
      const { user } = await fightWithStyles(scenario, { eventLog })
      await castOn(user, 'Swordsmen')

      await reloadBattle(scenario, { eventLog })

      expect(readStackCountColour(hexOf('Swordsmen').row, hexOf('Swordsmen').column)).toBe('green')
    })

    test('given the Genies used their only cast when the page reloads then on their next turn there is no spell cursor', async () => {
      const eventLog = createMemoryEventLog()
      const genie = aGenie({ spells: ['HASTE', 'STONE_SKIN'], times: 1 })
      const scenario = aGenieFight({ genie })
      const { user } = await fightWithStyles(scenario, { eventLog })
      await castOn(user, 'Swordsmen')
      await defend(user)

      const reloaded = await reloadBattle(scenario, { eventLog })
      await reloaded.user.hover(getBattleHex(hexOf('Swordsmen').row, hexOf('Swordsmen').column))

      expect(cursorOver(hexOf('Swordsmen'))).toBe('battle-query')
    })
  })

  describe("the computer's Genies", () => {
    test('given the enemy hero has Genies then they cast on the stack worth the most', async () => {
      await fightWithStyles(
        aGenieFightWithAHero({
          heroArmy: [stack('STATUE', 1)],
          enemyArmy: [stack('GENIE', 2), stack('PAWN', 10), stack('KNIGHT', 10)]
        })
      )
      await waitMs(1000)

      expect(readStackCountColour(hexOf('Knights').row, hexOf('Knights').column)).toBe('green')
    })

    test('given the enemy Genies have used their casts then they fight', async () => {
      const genie = aGenie({ times: 1, spells: ['HASTE', 'STONE_SKIN'] })
      const { user } = await fight(
        aGenieFightWithAHero({
          genie,
          heroArmy: [stack('STATUE', 1)],
          enemyArmy: [stack('GENIE', 2), stack('KNIGHT', 10)]
        })
      )
      await waitMs(1000)

      await defend(user)

      expect(genieLines()).toEqual(['The Genies cast Haste'])
    })
  })
})
