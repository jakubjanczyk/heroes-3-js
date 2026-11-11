// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  castSpellAt,
  getBattleButton,
  pickSpell,
  playOnToNextRound,
  readBattleEffects,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  readStackCountColour,
  readStackCountColours,
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
import { aHero } from './builders.js'

const SPELLS = ['MAGIC_ARROW', 'FIREBALL', 'CHAIN_LIGHTNING', 'SLOW', 'BLESS']

// Power 2 and Knowledge 3, so 30 spell points: Magic Arrow does 10 + 2 × 10 = 30 and Fireball
// 15 + 2 × 10 = 35.
const aResistedCaster = ({ secondarySkills = [], army } = {}) =>
  aCaster({ knowledge: 3, spells: SPELLS, secondarySkills, ...(army ? { army } : {}) })

const resistance = (level) => [{ skill: 'RESISTANCE', level }]

const aBlueHero = ({ level = 'EXPERT', army = [stack('PIKEMAN', 10)] } = {}) =>
  aHero()
    .withId('hero-2')
    .withName('Valeska')
    .ownedBy('blue')
    .withSecondarySkills(resistance(level))
    .withArmy(army)

const aFightAgainst = (enemy, hero = aResistedCaster()) => aFightWithAHero({ hero, enemy })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// A roll under a stack's chance resists; each stack that can resist rolls in turn.
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

describe('battle spell resistance behavior', () => {
  describe('a single target', () => {
    test('given a blue hero with Resistance when its stack resists Magic Arrow then it loses no creatures', async () => {
      const { user } = await startResisting(aFightAgainst(aBlueHero()), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 10', 6, 15))
    })

    test('given a blue hero with Resistance when its stack resists Magic Arrow then the combat log says it resisted', async () => {
      const { user } = await startResisting(aFightAgainst(aBlueHero()), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readCombatMessages().slice(-2)).toEqual([
        "Lord Haart casts 'Magic Arrow' on the Pikemen.",
        'The Pikemen resist the Magic Arrow.'
      ])
    })

    // 30 spell points less Magic Arrow's 5.
    test('given a blue hero with Resistance when its stack resists Magic Arrow then the spell points are spent', async () => {
      const { user } = await startResisting(aFightAgainst(aBlueHero()), ALWAYS)
      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      await playOnToNextRound(user)

      expect(await readBattleSpellPoints(user)).toBe('25')
    })

    test("given a blue hero with Resistance when its stack resists Magic Arrow then the hero can't cast again this round", async () => {
      const { user } = await startResisting(aFightAgainst(aBlueHero()), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(getBattleButton('Cast spell').disabled).toBe(true)
    })

    test('given a blue hero with Resistance when its single creature resists Magic Arrow then the log names it in the singular', async () => {
      const { user } = await startResisting(
        aFightAgainst(aBlueHero({ army: [stack('PIKEMAN', 1)] })),
        ALWAYS
      )

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readCombatMessages().at(-1)).toBe('The Pikeman resists the Magic Arrow.')
    })

    test('given a blue hero with Resistance when its stack resists Magic Arrow then the stack shows that it resisted', async () => {
      const { user } = await startResisting(aFightAgainst(aBlueHero()), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleEffects()).toEqual([{ effect: 'Resisted', ...ENEMY_HEX }])
    })

    test('given a blue hero with Resistance when the roll fails then Magic Arrow hits its stack', async () => {
      const { user } = await startResisting(aFightAgainst(aBlueHero()), () => 0.99)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 7', 6, 15))
    })

    test.each([
      ['BASIC', 0.049, 'Pikemen 10'],
      ['BASIC', 0.05, 'Pikemen 7'],
      ['ADVANCED', 0.099, 'Pikemen 10'],
      ['ADVANCED', 0.1, 'Pikemen 7'],
      ['EXPERT', 0.199, 'Pikemen 10'],
      ['EXPERT', 0.2, 'Pikemen 7']
    ])('given a blue hero with %s Resistance when the roll is %s then Magic Arrow leaves %s', async (level, roll, left) => {
      const { user } = await startResisting(aFightAgainst(aBlueHero({ level })), () => roll)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt(left, 6, 15))
    })

    test('given a blue hero with Resistance when its stack resists Slow then its count box keeps its colour', async () => {
      const { user } = await startResisting(aFightAgainst(aBlueHero()), ALWAYS, {
        withStyles: true
      })

      await castSpellAt(user, 'Slow', ENEMY_HEX)

      expect(readStackCountColour(ENEMY_HEX.row, ENEMY_HEX.column)).toBe('purple')
    })

    test('given the monster stands against a hero when Magic Arrow is cast then its stack never resists', async () => {
      const { user } = await startResisting(aFight({ hero: aResistedCaster() }), ALWAYS)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 47', 6, 15))
    })
  })

  describe('several stacks', () => {
    // Seven stacks stand on rows 1, 3, 5, 6, 7, 9 and 11; Fireball on row 6 reaches rows 5, 6 and
    // 7, and the stack on row 5 rolls first. Its 35 damage kills 3 of each 10 Pikemen it hits.
    const startFireballOnThreeStacks = () =>
      startResisting(
        aFightAgainst(aBlueHero({ army: Array.from({ length: 7 }, () => stack('PIKEMAN', 10)) })),
        rolls(0, 0.99, 0.99)
      )

    test('given a blue hero with Resistance when Fireball reaches three of its stacks then each rolls on its own and only the one that resisted keeps its creatures', async () => {
      const { user } = await startFireballOnThreeStacks()

      await castSpellAt(user, 'Fireball', ENEMY_HEX)

      expect(
        readBattleStacks().filter(({ row, column }) => column === 15 && row >= 5 && row <= 7)
      ).toEqual([
        stackAt('Pikemen 10', 5, 15),
        stackAt('Pikemen 7', 6, 15),
        stackAt('Pikemen 7', 7, 15)
      ])
    })

    test('given a blue hero with Resistance when one of three stacks resists Fireball then the log says so before the damage the others take', async () => {
      const { user } = await startFireballOnThreeStacks()

      await castSpellAt(user, 'Fireball', ENEMY_HEX)

      expect(readCombatMessages().slice(-3)).toEqual([
        "Lord Haart casts 'Fireball'.",
        'The Pikemen resist the Fireball.',
        'The Fireball does 70 damage. 6 creatures perish.'
      ])
    })

    // The blue hero's two stacks stand on rows 3 and 9.
    test('given an Expert Earth hero when Slow is cast on every stack of a blue hero with Resistance then the stack that resisted is not slowed', async () => {
      const hero = aResistedCaster({ secondarySkills: [{ skill: 'EARTH_MAGIC', level: 'EXPERT' }] })
      const enemy = aBlueHero({ army: [stack('PIKEMAN', 10), stack('PIKEMAN', 10)] })
      const { user } = await startResisting(aFightAgainst(enemy, hero), rolls(0, 0.99), {
        withStyles: true
      })

      await pickSpell(user, 'Slow')

      expect(readStackCountColours()).toEqual(
        expect.arrayContaining([
          { stack: 'Pikemen 10', colour: 'purple' },
          { stack: 'Pikemen 10', colour: 'red' }
        ])
      )
    })

    // The hero's stacks stand on rows 3 and 9 of column 1, the blue hero's on rows 3, 6 and 9 of
    // column 15. Chain Lightning does 25 + 2 × 40 = 105, then 52, 26 and 13: the top blue stack
    // resists the 105, then 52 kills 5 of the middle one, 26 kills 2 of the bottom one and 13
    // kills 1 of the hero's own on row 9.
    test('given a blue hero with Resistance when its stack resists Chain Lightning then the bolt jumps on and the next stack takes half the damage', async () => {
      const hero = aResistedCaster({ army: [stack('PIKEMAN', 10), stack('PIKEMAN', 10)] })
      const enemy = aBlueHero({ army: Array.from({ length: 3 }, () => stack('PIKEMAN', 20)) })
      const { user } = await startResisting(aFightAgainst(enemy, hero), rolls(0, 0.99, 0.99))

      await castSpellAt(user, 'Chain Lightning', { row: 3, column: 15 })
      await waitMs(1200)

      expect(readBattleStacks()).toEqual([
        stackAt('Pikemen 10', 3, 1),
        stackAt('Pikemen 20', 3, 15),
        stackAt('Pikemen 15', 6, 15),
        stackAt('Pikemen 9', 9, 1),
        stackAt('Pikemen 18', 9, 15)
      ])
    })
  })

  describe("the hero's own Resistance", () => {
    test("given the hero has Resistance when Bless is cast on the hero's own stack then it is never resisted", async () => {
      const hero = aResistedCaster({ secondarySkills: resistance('EXPERT') })
      const { user } = await startResisting(aFight({ hero }), ALWAYS, { withStyles: true })

      await castSpellAt(user, 'Bless', OWN_HEX)

      expect(readStackCountColour(OWN_HEX.row, OWN_HEX.column)).toBe('green')
    })

    test("given the hero has Resistance when the hero's own Fireball reaches the hero's stack then the stack can resist it", async () => {
      const hero = aResistedCaster({ secondarySkills: resistance('EXPERT') })
      const { user } = await startResisting(aFight({ hero }), ALWAYS)

      await castSpellAt(user, 'Fireball', OWN_HEX)

      expect(readBattleStacks()).toContainEqual(stackAt('Swordsmen 10', 6, 1))
    })
  })

  describe('reload', () => {
    test("given a blue hero's stack resisted Magic Arrow when the page reloads then it still has all its creatures", async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightAgainst(aBlueHero())
      const { user } = await startResisting(scenario, ALWAYS, { eventLog })
      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

      await reloadBattle(scenario, { eventLog })

      expect(readBattleStacks()).toContainEqual(stackAt('Pikemen 10', 6, 15))
    })
  })
})
