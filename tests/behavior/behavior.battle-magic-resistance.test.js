// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  moveActiveStackTo,
  readBattleStacks,
  readCombatMessages,
  readStackCountColour,
  reloadBattle,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import {
  aCaster,
  aFight,
  aFightWithAHero,
  ENEMY_HEX,
  OWN_HEX,
  stack
} from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition, aHero } from './builders.js'

const SPELLS = ['MAGIC_ARROW', 'FIREBALL', 'BLESS', 'HYPNOTIZE']

const aResister = (chance = 20) =>
  aCreatureDefinition()
    .withName('Resister')
    .withNamePlural('Resisters')
    .withMagicResistance(chance)
    .build()

const SLOW = 1
const FAST = 10

const aWarden = (speed = SLOW) =>
  aCreatureDefinition()
    .withName('Warden')
    .withNamePlural('Wardens')
    .withSpeed(speed)
    .withAbilities(['doubleWide'])
    .withMagicResistanceAura(20)
    .build()

const aHawk = () =>
  aCreatureDefinition()
    .withName('Hawk')
    .withNamePlural('Hawks')
    .withSpeed(20)
    .withHealth(35)
    .withAbilities(['flying'])
    .build()

const POWER_TO_HYPNOTIZE_THE_WARDENS = 4

const CREATURES = { RESISTER: aResister(), WARDEN: aWarden(), HAWK: aHawk() }

const aResistedCaster = ({ army, power = 2, secondarySkills = [] } = {}) =>
  aCaster({ power, knowledge: 4, spells: SPELLS, secondarySkills, ...(army ? { army } : {}) })

const aMonsterFight = ({ hero = aResistedCaster(), monster, count = 10, creatures = CREATURES }) =>
  aFight({ hero, monster, count, creatures })

const aBlueHero = (army) =>
  aHero().withId('hero-2').withName('Valeska').ownedBy('blue').withArmy(army)

const aFightAgainst = (army, enemy = aBlueHero(army)) =>
  aFightWithAHero({ hero: aResistedCaster(), enemy, creatures: CREATURES })

const ROWS_OF_SEVEN_STACKS = [1, 3, 5, 6, 7, 9, 11]
const sevenStacksWith = (byRow) =>
  ROWS_OF_SEVEN_STACKS.map((row) => byRow[row] ?? stack('PIKEMAN', 10))

const stackAt = (name, row, column) => ({ stack: name, row, column })

const ALWAYS = () => 0
const rolls = (...values) => {
  let next = 0
  return () => values[next++ % values.length]
}

const startResisting = (scenario, resistanceRandom, options = {}) =>
  (options.withStyles ? startBattleWithStyles : startBattle)(scenario, {
    ...options,
    appConfig: { resistanceRandom }
  })

describe('battle magic resistance behavior', () => {
  describe("a creature's own resistance", () => {
    test('given a monster stack of Resisters when it resists Magic Arrow then it loses no creatures', async () => {
      const { user } = await startResisting(aMonsterFight({ monster: 'RESISTER' }), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Resisters 10', 6, 15))
    })

    test('given a monster stack of Resisters when it resists Magic Arrow then the combat log says so', async () => {
      const { user } = await startResisting(aMonsterFight({ monster: 'RESISTER' }), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readCombatMessages().at(-1)).toBe('The Resisters resist the Magic Arrow.')
    })

    test.each([
      [20, 0.199, 'Resisters 10'],
      [20, 0.2, 'Resisters 7'],
      [40, 0.399, 'Resisters 10'],
      [40, 0.4, 'Resisters 7']
    ])('given monster Resisters with a resistance of %s when the roll is %s then Magic Arrow leaves %s', async (chance, roll, left) => {
      const scenario = aMonsterFight({
        monster: 'RESISTER',
        creatures: { RESISTER: aResister(chance) }
      })
      const { user } = await startResisting(scenario, () => roll)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt(left, 6, 15))
    })

    test("given Resisters led by a hero with Expert Resistance when the roll is under the two chances' sum then they resist Magic Arrow", async () => {
      const army = [stack('RESISTER', 10)]
      const enemy = aBlueHero(army).withSecondarySkills([{ skill: 'RESISTANCE', level: 'EXPERT' }])
      const { user } = await startResisting(aFightAgainst(army, enemy), () => 0.399)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Resisters 10', 6, 15))
    })

    test('given Fireball reaches Resisters between two Pikemen stacks when every roll resists then only the Resisters keep their creatures', async () => {
      const army = sevenStacksWith({ 6: stack('RESISTER', 10) })
      const { user } = await startResisting(aFightAgainst(army), ALWAYS)

      await castSpellAt(user, 'Fireball', ENEMY_HEX)

      expect(
        readBattleStacks().filter(({ row, column }) => column === 15 && row >= 5 && row <= 7)
      ).toEqual([
        stackAt('Pikemen 7', 5, 15),
        stackAt('Resisters 10', 6, 15),
        stackAt('Pikemen 7', 7, 15)
      ])
    })

    test("given the player's own Resisters when Bless is cast on them then it is never resisted", async () => {
      const hero = aResistedCaster({ army: [stack('RESISTER', 10)] })
      const { user } = await startResisting(aMonsterFight({ hero, monster: 'PIKEMAN' }), ALWAYS, {
        withStyles: true
      })

      await castSpellAt(user, 'Bless', OWN_HEX)

      expect(readStackCountColour(OWN_HEX.row, OWN_HEX.column)).toBe('green')
    })

    test("given the player's own Resisters when the player's Fireball reaches them then they can resist it", async () => {
      const hero = aResistedCaster({ army: [stack('RESISTER', 10)] })
      const { user } = await startResisting(aMonsterFight({ hero, monster: 'PIKEMAN' }), ALWAYS)

      await castSpellAt(user, 'Fireball', OWN_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Resisters 10', 6, 1))
    })
  })

  describe("the Wardens' aura", () => {
    test('given enemy Pikemen next to an enemy Warden when the roll is under 20% then they resist Magic Arrow', async () => {
      const army = sevenStacksWith({ 5: stack('WARDEN', 10) })
      const { user } = await startResisting(aFightAgainst(army), () => 0.199)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 10', 6, 15))
    })

    test('given enemy Pikemen next to an enemy Warden when the roll is 20% then Magic Arrow hits them', async () => {
      const army = sevenStacksWith({ 5: stack('WARDEN', 10) })
      const { user } = await startResisting(aFightAgainst(army), () => 0.2)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 7', 6, 15))
    })

    test('given enemy Pikemen two rows away from an enemy Warden when Magic Arrow is cast then they never resist', async () => {
      const army = sevenStacksWith({ 5: stack('WARDEN', 10) })
      const { user } = await startResisting(aFightAgainst(army), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', { row: 3, column: 15 })

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 7', 3, 15))
    })

    test('given a lone Warden when Magic Arrow is cast at it then it never resists', async () => {
      const { user } = await startResisting(aMonsterFight({ monster: 'WARDEN' }), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Wardens 7', 6, 15))
    })

    test("given two Wardens side by side when Magic Arrow is cast at one then it resists through the other's aura", async () => {
      const army = sevenStacksWith({ 5: stack('WARDEN', 10), 6: stack('WARDEN', 10) })
      const { user } = await startResisting(aFightAgainst(army), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Wardens 10', 6, 15))
    })

    test('given enemy Pikemen between two Wardens when the first roll fails then Magic Arrow hits them, as the auras give one roll', async () => {
      const army = sevenStacksWith({ 5: stack('WARDEN', 10), 7: stack('WARDEN', 10) })
      const { user } = await startResisting(aFightAgainst(army), rolls(0.99, 0))

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 7', 6, 15))
    })

    test('given Resisters next to a Warden when their own roll fails and the second roll is under 20% then they resist Magic Arrow', async () => {
      const army = sevenStacksWith({ 5: stack('WARDEN', 10), 6: stack('RESISTER', 10) })
      const { user } = await startResisting(aFightAgainst(army), rolls(0.3, 0.1))

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Resisters 10', 6, 15))
    })

    test('given Resisters next to a Warden when both rolls fail then Magic Arrow hits them', async () => {
      const army = sevenStacksWith({ 5: stack('WARDEN', 10), 6: stack('RESISTER', 10) })
      const { user } = await startResisting(aFightAgainst(army), rolls(0.3, 0.3))

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Resisters 7', 6, 15))
    })
  })

  describe("the aura where the player's stacks stand", () => {
    const OWN_ARMY = [stack('WARDEN', 10), stack('SWORDSMAN', 10)]
    const SWORDSMEN_HEX = { row: 9, column: 1 }
    const WARDENS_BACK_HALF_NEXT_TO_THE_SWORDSMEN = { row: 9, column: 3 }
    const WARDENS_AWAY_FROM_THE_SWORDSMEN = { row: 3, column: 3 }
    const aFightWithWardens = () =>
      aMonsterFight({
        hero: aResistedCaster({ army: OWN_ARMY }),
        monster: 'PIKEMAN',
        creatures: { ...CREATURES, WARDEN: aWarden(FAST) }
      })

    async function bringWardensBehindTheSwordsmen(user) {
      const { row, column } = WARDENS_BACK_HALF_NEXT_TO_THE_SWORDSMEN
      await moveActiveStackTo(user, row, column)
      await waitMs(1000)
    }

    test("given the player's Swordsmen touch only the back half of the player's Wardens when the player's Fireball reaches them then they can resist it", async () => {
      const { user } = await startResisting(aFightWithWardens(), ALWAYS)
      await bringWardensBehindTheSwordsmen(user)

      await castSpellAt(user, 'Fireball', SWORDSMEN_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Swordsmen 10', 9, 1))
    })

    test("given the player's Wardens walked away from the Swordsmen when the player's Fireball reaches the Swordsmen then they never resist", async () => {
      const { user } = await startResisting(aFightWithWardens(), ALWAYS)
      await bringWardensBehindTheSwordsmen(user)
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)
      await moveActiveStackTo(
        user,
        WARDENS_AWAY_FROM_THE_SWORDSMEN.row,
        WARDENS_AWAY_FROM_THE_SWORDSMEN.column
      )
      await waitMs(1000)

      await castSpellAt(user, 'Fireball', SWORDSMEN_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Swordsmen 9', 9, 1))
    })

    const NEXT_TO_THE_WARDENS = { row: 6, column: 14 }

    test("given the player's Hawks next to the enemy's Wardens when the player's Fireball reaches the Hawks then they never resist", async () => {
      const hero = aResistedCaster({ army: [stack('HAWK', 10)] })
      const { user } = await startResisting(aMonsterFight({ hero, monster: 'WARDEN' }), ALWAYS)
      await moveActiveStackTo(user, NEXT_TO_THE_WARDENS.row, NEXT_TO_THE_WARDENS.column)
      await waitMs(1000)

      await castSpellAt(user, 'Fireball', NEXT_TO_THE_WARDENS)

      expect(readCombatMessages()).not.toContain('The Hawks resist the Fireball.')
    })

    test("given the player hypnotized the enemy's Wardens when the player's Fireball reaches the Hawks next to them then the Hawks can resist it", async () => {
      const hero = aResistedCaster({
        army: [stack('HAWK', 10)],
        power: POWER_TO_HYPNOTIZE_THE_WARDENS
      })
      const { user } = await startResisting(aMonsterFight({ hero, monster: 'WARDEN' }), ALWAYS)
      await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
      await moveActiveStackTo(user, NEXT_TO_THE_WARDENS.row, NEXT_TO_THE_WARDENS.column)
      await waitMs(1000)
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)

      await castSpellAt(user, 'Fireball', NEXT_TO_THE_WARDENS)

      expect(readCombatMessages()).toContain('The Hawks resist the Fireball.')
    })
  })

  describe('reload', () => {
    test('given monster Resisters resisted Magic Arrow when the page reloads then they still have all their creatures', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aMonsterFight({ monster: 'RESISTER' })
      const { user } = await startResisting(scenario, ALWAYS, { eventLog })
      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      await reloadBattle(scenario, { eventLog })

      expect(readBattleStacks()).toContainEqual(stackAt('Resisters 10', 6, 15))
    })
  })
})
