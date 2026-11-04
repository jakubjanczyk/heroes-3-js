// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, readGameData, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  pickSpell,
  playOnToNextRound,
  readBattleEffects,
  readBattleResultsSide,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  readSpellBolts,
  readStacksGlowingForSpell,
  reloadBattle,
  startBattle,
  startBattleWithStyles,
  waitForBattleResults
} from './battle.utils.js'
import { aHero, aMonster, aScenario, aSpellDefinition } from './builders.js'

const HIGHEST_ROLLS = () => 0.99

const spellDefinitions = {
  CHAIN_LIGHTNING: aSpellDefinition()
    .withName('Chain Lightning')
    .withLevel(4)
    .withSchools(['AIR'])
    .withCosts([24, 20, 20, 20])
    .withDamage({ base: [25, 25, 50, 100], perPower: 40 })
    .withChain({ strikes: [4, 4, 5, 5], factor: 0.5 })
    .describedAs('Chain Lightning description.')
    .build(),
  PROTECTION_FROM_AIR: aSpellDefinition()
    .withName('Protection from Air')
    .withLevel(2)
    .withSchools(['AIR'])
    .withCosts([7, 5, 5, 5])
    .withLasting({
      target: 'own',
      allAtExpert: true,
      effects: { airSpellDamageTakenPercent: [-30, -30, -50, -50] }
    })
    .describedAs('Protection from Air description.')
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

const hexAt = (row, column) => ({ row, column })

const AIR_ADVANCED = [{ skill: 'AIR_MAGIC', level: 'ADVANCED' }]

// Knowledge 4, so 40 spell points: enough for Protection from Air and Chain Lightning. At Power 2
// Chain Lightning does 25 + 2 × 40 = 105, then 52, 26 and 13.
const aCaster = ({
  army = [stack('SWORDSMAN', 10)],
  power = 2,
  knowledge = 4,
  secondarySkills = []
} = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills({ power, knowledge })
    .withSecondarySkills(secondarySkills)
    .withSpellBook(true)
    .withSpells(Object.keys(spellDefinitions))
    .withArmy(army)

const aFight = ({ hero = aCaster(), monster = 'PIKEMAN', count = 50, stacks = 1 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(hero, aMonster().withType(monster).withCount(count).withStacks(stacks).at(1, 0))
    .withDefinitions(gameDefinitions)

// The hero's two stacks stand on rows 3 and 9 of column 1, the enemy's three on rows 3, 6 and 9
// of column 15. From the enemy on row 3 the bolt goes down the enemy's column (3 hexes a jump),
// then across to the hero's stack on row 9 (14 hexes), which is nearer than the one on row 3
// (17 hexes).
const TWO_PIKEMEN_STACKS = [stack('PIKEMAN', 10), stack('PIKEMAN', 10)]
const aFiveStackFight = ({ hero, count = 60, monster } = {}) =>
  aFight({ hero: hero ?? aCaster({ army: TWO_PIKEMEN_STACKS }), count, stacks: 3, monster })

const readEnemyStacks = () => readBattleStacks().filter(({ column }) => column === 15)

const TOP_ENEMY = hexAt(3, 15)
const BOTTOM_ENEMY = hexAt(9, 15)
const MIDDLE_ENEMY = hexAt(6, 15)

// The bolt reaches the last of five stacks 1200 ms after the cast.
async function castChainLightningAt(user, hex) {
  await castSpellAt(user, 'Chain Lightning', hex)
  await waitMs(1200)
}

describe('battle Chain Lightning behavior', () => {
  describe('aiming', () => {
    test('given Chain Lightning is picked when the mouse is over an enemy stack then the status bar says "Cast Chain Lightning on Pikemen"', async () => {
      const { user } = await startBattle(aFight())
      await pickSpell(user, 'Chain Lightning')

      await hoverBattleHex(user, 6, 15)

      expect(getBattleStatusBarText()).toBe('Cast Chain Lightning on Pikemen')
    })

    test('given Chain Lightning is picked when the mouse is over an enemy stack then only that stack glows', async () => {
      const { user } = await startBattleWithStyles(aFiveStackFight())
      await pickSpell(user, 'Chain Lightning')

      await hoverBattleHex(user, TOP_ENEMY.row, TOP_ENEMY.column)

      expect(readStacksGlowingForSpell()).toEqual([stackAt('Pikemen 20', 3, 15)])
    })

    test("given Chain Lightning is picked when the player clicks one of the hero's own stacks then the spell is cancelled", async () => {
      const { user } = await startBattle(aFight())
      await pickSpell(user, 'Chain Lightning')

      await clickBattleHex(user, 6, 1)

      expect([getBattleStatusBarText(), await readBattleSpellPoints(user)]).toEqual([
        'Spell cancelled',
        '40'
      ])
    })
  })

  describe('the chain', () => {
    // 105 kills 10 Pikemen, 52 kills 5, 26 kills 2 and 13 kills 1 of the hero's.
    test("given five stacks on the battlefield when Chain Lightning is cast with Basic Air Magic then the target and the three nearest stacks in turn are hit, one of the hero's own among them", async () => {
      const { user } = await startBattle(aFiveStackFight())

      await castChainLightningAt(user, TOP_ENEMY)

      expect(readBattleStacks()).toEqual([
        stackAt('Pikemen 10', 3, 1),
        stackAt('Pikemen 10', 3, 15),
        stackAt('Pikemen 15', 6, 15),
        stackAt('Pikemen 9', 9, 1),
        stackAt('Pikemen 18', 9, 15)
      ])
    })

    // Advanced at Power 2: 50 + 2 × 40 = 130, then 65, 32, 16 and 8; the fifth, 8, wounds one of
    // the hero's Pikemen without killing it, so Power 3 makes it 170, 85, 42, 21 and 10: 17, 8 and 4
    // of the enemy's 20 each, then 2 and 1 of the hero's 10.
    test('given the hero has Advanced Air Magic when Chain Lightning is cast then five stacks are hit', async () => {
      const hero = aCaster({ army: TWO_PIKEMEN_STACKS, power: 3, secondarySkills: AIR_ADVANCED })
      const { user } = await startBattle(aFiveStackFight({ hero }))

      await castChainLightningAt(user, TOP_ENEMY)

      expect(readBattleStacks()).toEqual([
        stackAt('Pikemen 9', 3, 1),
        stackAt('Pikemen 3', 3, 15),
        stackAt('Pikemen 12', 6, 15),
        stackAt('Pikemen 8', 9, 1),
        stackAt('Pikemen 16', 9, 15)
      ])
    })

    // 105 kills 10 of the 50 Pikemen and 52 kills 1 of the Swordsmen and wounds another.
    test('given only two stacks are alive when Chain Lightning is cast then both are hit and it stops', async () => {
      const { user } = await startBattle(aFight({ count: 50 }))

      await castChainLightningAt(user, hexAt(6, 15))

      expect([readBattleStacks(), readCombatMessages().at(-1)]).toEqual([
        [stackAt('Swordsmen 9', 6, 1), stackAt('Pikemen 40', 6, 15)],
        'The Chain Lightning does 157 damage. 11 creatures perish.'
      ])
    })

    // Archers shoot from where they stand, so the stacks stay put for the second round. The first
    // cast kills the Archers on rows 3 and 6; the second, on the Archers left on row 9, jumps past
    // the corpse on row 6 to the hero's stacks: 105 + 52 + 26, and no fourth stack to hit.
    // Knowledge 5, so 50 spell points for two casts.
    test('given a stack lies dead next to the target when Chain Lightning is cast then the bolt jumps past the corpse to the nearest living stack', async () => {
      const army = [stack('SWORDSMAN', 10), stack('SWORDSMAN', 10)]
      const hero = aCaster({ army, knowledge: 5 })
      const { user } = await startBattle(aFiveStackFight({ hero, monster: 'ARCHER', count: 15 }))
      await castChainLightningAt(user, TOP_ENEMY)
      await playOnToNextRound(user)
      await playOnToNextRound(user)

      await castChainLightningAt(user, BOTTOM_ENEMY)

      expect(readCombatMessages().slice(-2)).toEqual([
        "Lord Haart casts 'Chain Lightning'.",
        expect.stringMatching(/^The Chain Lightning does 183 damage\./)
      ])
    })

    // Three stacks of 5 Pikemen: 105 and 52 kill the first two, 26 kills 2 of the third, and the
    // bolt goes on from the second's hex to the third.
    test('given the second stack is killed by its share when Chain Lightning is cast then the bolt still jumps on from it to the stack nearest to it', async () => {
      const { user } = await startBattle(aFiveStackFight({ count: 15 }))

      await castChainLightningAt(user, TOP_ENEMY)

      expect(readBattleStacks()).toEqual([
        stackAt('Pikemen 10', 3, 1),
        stackAt('Dead Pikemen', 3, 15),
        stackAt('Dead Pikemen', 6, 15),
        stackAt('Pikemen 9', 9, 1),
        stackAt('Pikemen 3', 9, 15)
      ])
    })

    // From the middle enemy the stacks on rows 3 and 9 are both 3 hexes away: the roll picks one
    // for the 52 (5 of 20 killed) and the other gets 26 (2 killed).
    test('given two stacks are as near when Chain Lightning jumps then a roll picks which is hit next', async () => {
      const low = await startBattle(aFiveStackFight())
      await castChainLightningAt(low.user, MIDDLE_ENEMY)
      const withLowRoll = readBattleStacks().filter(({ column }) => column === 15)
      const high = await startBattle(aFiveStackFight(), { random: HIGHEST_ROLLS })
      await castChainLightningAt(high.user, MIDDLE_ENEMY)
      const withHighRoll = readBattleStacks().filter(({ column }) => column === 15)

      expect([withLowRoll, withHighRoll]).toEqual([
        [stackAt('Pikemen 15', 3, 15), stackAt('Pikemen 10', 6, 15), stackAt('Pikemen 18', 9, 15)],
        [stackAt('Pikemen 18', 3, 15), stackAt('Pikemen 10', 6, 15), stackAt('Pikemen 15', 9, 15)]
      ])
    })
  })

  describe('the bolt', () => {
    // The bolt takes 300 ms to jump from one stack to the next.
    test('given Chain Lightning is cast then the bolt jumps from stack to stack, a burst over each as it reaches it', async () => {
      const { user } = await startBattle(aFiveStackFight())

      await castSpellAt(user, 'Chain Lightning', TOP_ENEMY)
      const shown = [[readBattleEffects(), readSpellBolts()]]
      for (let jump = 0; jump < 3; jump += 1) {
        await waitMs(300)
        shown.push([readBattleEffects(), readSpellBolts()])
      }

      const burst = (row, column) => ({ effect: 'Chain Lightning', row, column })
      const bolt = 'Chain Lightning bolt'
      expect(shown).toEqual([
        [[burst(3, 15)], []],
        [[burst(3, 15), burst(6, 15)], [bolt]],
        [
          [burst(3, 15), burst(6, 15), burst(9, 15)],
          [bolt, bolt]
        ],
        [
          [burst(3, 15), burst(6, 15), burst(9, 1), burst(9, 15)],
          [bolt, bolt, bolt]
        ]
      ])
    })
  })

  describe('the stacks hit', () => {
    // Three stacks of 5 Pikemen: 105 and 52 kill the first two, 26 kills 2 of the third.
    test('given Chain Lightning kills a stack further down the chain then it falls only when the bolt reaches it', async () => {
      const { user } = await startBattle(aFiveStackFight({ count: 15 }))

      await castSpellAt(user, 'Chain Lightning', TOP_ENEMY)
      const shown = [readEnemyStacks()]
      for (let jump = 0; jump < 2; jump += 1) {
        await waitMs(300)
        shown.push(readEnemyStacks())
      }

      expect(shown).toEqual([
        [stackAt('Dead Pikemen', 3, 15), stackAt('Pikemen 5', 6, 15), stackAt('Pikemen 5', 9, 15)],
        [
          stackAt('Dead Pikemen', 3, 15),
          stackAt('Dead Pikemen', 6, 15),
          stackAt('Pikemen 5', 9, 15)
        ],
        [
          stackAt('Dead Pikemen', 3, 15),
          stackAt('Dead Pikemen', 6, 15),
          stackAt('Pikemen 3', 9, 15)
        ]
      ])
    })
  })

  describe('damage', () => {
    // Power 1: 25 + 40 = 65, then 32, 16 and 8.
    test('given Power 1 and no Air Magic when Chain Lightning hits four stacks then they take 65, 32, 16 and 8', async () => {
      const hero = aCaster({ army: TWO_PIKEMEN_STACKS, power: 1 })
      const { user } = await startBattle(aFiveStackFight({ hero }))

      await castChainLightningAt(user, TOP_ENEMY)

      expect(readCombatMessages().at(-1)).toMatch(/^The Chain Lightning does 121 damage\./)
    })

    // From the bottom enemy the bolt goes up the column, then to the hero's stack on row 3, which
    // has Protection from Air: 105 × 70% = 73, an eighth of it 9 rather than 13.
    test('given Protection from Air is on the fourth stack then it takes 30% less before its share is halved', async () => {
      const hero = aCaster({ army: [stack('SWORDSMAN', 10), stack('SWORDSMAN', 10)] })
      const { user } = await startBattle(aFiveStackFight({ hero, monster: 'ARCHER' }))
      await castSpellAt(user, 'Protection from Air', hexAt(3, 1))
      await playOnToNextRound(user)
      await playOnToNextRound(user)

      await castChainLightningAt(user, BOTTOM_ENEMY)

      expect(readCombatMessages().at(-1)).toMatch(/^The Chain Lightning does 192 damage\./)
    })
  })

  describe('combat log', () => {
    test('given Chain Lightning hits several stacks then the combat log reads the cast, the total damage and how many creatures perish', async () => {
      const { user } = await startBattle(aFiveStackFight())

      await castChainLightningAt(user, TOP_ENEMY)

      expect(readCombatMessages().slice(-2)).toEqual([
        "Lord Haart casts 'Chain Lightning'.",
        'The Chain Lightning does 196 damage. 18 creatures perish.'
      ])
    })
  })

  describe('the end of the battle', () => {
    test('given Chain Lightning kills the last enemy stack then the hero wins', async () => {
      const { user } = await startBattle(aFight({ count: 5 }))

      await castChainLightningAt(user, hexAt(6, 15))
      await waitForBattleResults()

      expect(readBattleResultsSide('Attacker')).toEqual(['Lord Haart', 'Victorious'])
    })

    test("given Chain Lightning kills the hero's last stack along with enemies then the hero loses", async () => {
      const hero = aCaster({ army: [stack('PIKEMAN', 5)] })
      const { user } = await startBattle(aFight({ hero, count: 50 }))

      await castChainLightningAt(user, hexAt(6, 15))
      await waitForBattleResults()

      expect(readBattleResultsSide('Attacker')).toEqual(['Lord Haart', 'Defeated'])
    })
  })

  describe('reload', () => {
    test('given the hero cast Chain Lightning when the page reloads then every stack hit keeps its losses', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFiveStackFight()
      const { user } = await startBattle(scenario, { eventLog })
      await castChainLightningAt(user, TOP_ENEMY)

      await reloadBattle(scenario, { eventLog })

      expect(readBattleStacks()).toEqual([
        stackAt('Pikemen 10', 3, 1),
        stackAt('Pikemen 10', 3, 15),
        stackAt('Pikemen 15', 6, 15),
        stackAt('Pikemen 9', 9, 1),
        stackAt('Pikemen 18', 9, 15)
      ])
    })
  })
})
