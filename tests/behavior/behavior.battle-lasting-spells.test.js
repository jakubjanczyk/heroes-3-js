// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, readGameData, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  castSpellAt,
  clickBattleButton,
  getBattleStatusBarText,
  hoverBattleHex,
  isBattleHexReachable,
  moveActiveStackTo,
  pickSpell,
  playOnToNextRound,
  pointAtBattleHexSide,
  readActiveStack,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  readHighlightedBattleHexes,
  readStackCountColour,
  reloadBattle,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import { aHero, aMonster, aScenario, aSpellDefinition } from './builders.js'

const HERO = 'Lord Haart'

const aLastingSpell = ({ name, schools, costs, target, effects }) =>
  aSpellDefinition()
    .withName(name)
    .withSchools(schools)
    .withCosts(costs)
    .withLasting({ target, effects })
    .describedAs(`${name} description.`)
    .build()

const spellDefinitions = {
  HASTE: aLastingSpell({
    name: 'Haste',
    schools: ['AIR'],
    costs: [6, 5, 5, 5],
    target: 'own',
    effects: { speed: [3, 3, 5, 5] }
  }),
  SLOW: aLastingSpell({
    name: 'Slow',
    schools: ['EARTH'],
    costs: [6, 5, 5, 5],
    target: 'enemy',
    effects: { speedPercent: [-25, -25, -50, -50] }
  }),
  SHIELD: aLastingSpell({
    name: 'Shield',
    schools: ['EARTH'],
    costs: [5, 4, 4, 4],
    target: 'own',
    effects: { meleeDamageTakenPercent: [-15, -15, -30, -30] }
  }),
  STONE_SKIN: aLastingSpell({
    name: 'Stone Skin',
    schools: ['EARTH'],
    costs: [5, 4, 4, 4],
    target: 'own',
    effects: { defense: [3, 3, 6, 6] }
  }),
  BLOODLUST: aLastingSpell({
    name: 'Bloodlust',
    schools: ['FIRE'],
    costs: [5, 4, 4, 4],
    target: 'own',
    effects: { meleeAttack: [3, 3, 6, 6] }
  }),
  WEAKNESS: aLastingSpell({
    name: 'Weakness',
    schools: ['WATER'],
    costs: [8, 6, 6, 6],
    target: 'enemy',
    effects: { attack: [-3, -3, -6, -6] }
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

// Knowledge 2, so 20 spell points, and Power 2: a spell lasts two rounds. The hero's class gives
// its stacks +2 Attack and +2 Defense.
const aCaster = ({ power = 2, secondarySkills = [], army = [stack('SWORDSMAN', 10)] } = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills({ power, knowledge: 2 })
    .withSecondarySkills(secondarySkills)
    .withSpellBook(true)
    .withSpells(Object.keys(spellDefinitions))
    .withArmy(army)

const aFight = ({ hero = aCaster(), monster = 'PIKEMAN', count = 50 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(hero, aMonster().withType(monster).withCount(count).withStacks(1).at(1, 0))
    .withDefinitions(gameDefinitions)

// With one stack each, the hero's stack starts on row 6, column 1 and the monster's on column 15.
const OWN_HEX = { row: 6, column: 1 }
const ENEMY_HEX = { row: 6, column: 15 }

// The Swordsmen walk to column 5 and the Pikemen (speed 4) come to column 11, so next round the
// Swordsmen can attack them from column 10.
const PIKEMEN_CLOSE_BY = { row: 6, column: 11 }

async function bringPikemenCloser(user) {
  await moveActiveStackTo(user, 6, 5)
  await waitMs(1000)
}

const SWORDSMEN_CLOSE_BY = { row: 6, column: 5 }

async function attackPikemenAfter(user, spell, at) {
  await bringPikemenCloser(user)
  await castSpellAt(user, spell, at)
  await attackBattleHexFrom(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')
  await waitMs(1000)
}

describe('battle lasting spells behavior', () => {
  describe('aiming', () => {
    test("given Haste is picked when the mouse is over the hero's own stack then the status bar names the spell and the stack and its hex is lit", async () => {
      const { user } = await startBattleWithStyles(aFight())
      await pickSpell(user, 'Haste')

      await hoverBattleHex(user, OWN_HEX.row, OWN_HEX.column)

      expect([getBattleStatusBarText(), readHighlightedBattleHexes()]).toEqual([
        'Cast Haste on Swordsmen',
        [OWN_HEX]
      ])
    })

    test('given Haste is picked when the mouse is over an enemy stack then the status bar asks for a target', async () => {
      const { user } = await startBattle(aFight())
      await pickSpell(user, 'Haste')

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe('Select Spell Target')
    })

    test.each([
      'Slow',
      'Weakness'
    ])("given %s is picked when the mouse is over the hero's own stack then the status bar asks for a target, and over the enemy it names the enemy", async (spell) => {
      const { user } = await startBattle(aFight())
      await pickSpell(user, spell)

      await hoverBattleHex(user, OWN_HEX.row, OWN_HEX.column)
      const overOwn = getBattleStatusBarText()
      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect([overOwn, getBattleStatusBarText()]).toEqual([
        'Select Spell Target',
        `Cast ${spell} on Pikemen`
      ])
    })
  })

  describe('casting', () => {
    test('given the hero casts Haste on the Swordsmen then the combat log names the spell and the stack', async () => {
      const { user } = await startBattle(aFight())

      await castSpellAt(user, 'Haste', OWN_HEX)

      expect(readCombatMessages().at(-1)).toBe("Lord Haart casts 'Haste' on the Swordsmen.")
    })

    test('given a hero with 20 spell points when the hero casts Haste then 14 are left', async () => {
      const { user } = await startBattle(aFight())

      await castSpellAt(user, 'Haste', OWN_HEX)
      await playOnToNextRound(user)

      expect(await readBattleSpellPoints(user)).toBe('14')
    })
  })

  describe('Speed', () => {
    // The Swordsmen (speed 5) on column 1 reach column 6 without Haste.
    test.each([
      { level: 'no skill', secondarySkills: [], farthest: 9 },
      {
        level: 'Expert Air Magic',
        secondarySkills: [{ skill: 'AIR_MAGIC', level: 'EXPERT' }],
        farthest: 11
      }
    ])('given the hero has $level when the hero casts Haste on the Swordsmen then they reach column $farthest and no farther', async ({
      secondarySkills,
      farthest
    }) => {
      const { user } = await startBattle(aFight({ hero: aCaster({ secondarySkills }) }))

      await castSpellAt(user, 'Haste', OWN_HEX)

      expect([
        isBattleHexReachable(OWN_HEX.row, farthest),
        isBattleHexReachable(OWN_HEX.row, farthest + 1)
      ]).toEqual([true, false])
    })

    // The Griffins (speed 6) act first; then the monster's Swordsmen (5) before the Pikemen (4),
    // unless Haste makes the Pikemen 7.
    test("given the Griffins act first when the hero casts Haste on the hero's Pikemen then the Pikemen act before the enemy Swordsmen", async () => {
      const hero = aCaster({ army: [stack('GRIFFIN', 2), stack('PIKEMAN', 10)] })
      const { user } = await startBattle(aFight({ hero, monster: 'SWORDSMAN', count: 10 }))
      const pikemenHex = readBattleStacks().find(({ stack }) => stack === 'Pikemen 10')

      await castSpellAt(user, 'Haste', pikemenHex)
      await clickBattleButton(user, 'Defend')

      expect([readActiveStack().stack, readBattleStacks()]).toEqual([
        'Pikemen 10',
        expect.arrayContaining([{ stack: 'Swordsmen 10', ...ENEMY_HEX }])
      ])
    })

    // The Royal Griffins (speed 9) act first. Slow makes the Cavaliers' speed 7 into 5 (5.25
    // rounded down) at no skill, 3 at Advanced; on a tie the hero's stack goes first. Without
    // Slow the Cavaliers would walk before the hero's second stack acts.
    test.each([
      { level: 'no skill', secondarySkills: [], second: 'SWORDSMAN', next: 'Swordsmen 10' },
      {
        level: 'Advanced Earth Magic',
        secondarySkills: [{ skill: 'EARTH_MAGIC', level: 'ADVANCED' }],
        second: 'PIKEMAN',
        next: 'Pikemen 10'
      }
    ])('given the hero has $level and a second stack of $second when the hero slows the Cavaliers then $next act before them', async ({
      secondarySkills,
      second,
      next
    }) => {
      const hero = aCaster({
        secondarySkills,
        army: [stack('ROYAL_GRIFFIN', 2), stack(second, 10)]
      })
      const { user } = await startBattle(aFight({ hero, monster: 'CAVALIER', count: 2 }))
      const cavaliers = readBattleStacks().find(({ stack }) => stack === 'Cavaliers 2')

      await castSpellAt(user, 'Slow', cavaliers)
      await clickBattleButton(user, 'Defend')

      expect([readActiveStack().stack, readBattleStacks()]).toEqual([
        next,
        expect.arrayContaining([cavaliers])
      ])
    })

    test('given the hero slows the Cavaliers at no skill when the Royal Griffins defend then the Cavaliers, at speed 5, still act before Pikemen', async () => {
      const hero = aCaster({ army: [stack('ROYAL_GRIFFIN', 2), stack('PIKEMAN', 10)] })
      const { user } = await startBattle(aFight({ hero, monster: 'CAVALIER', count: 2 }))
      const cavaliers = readBattleStacks().find(({ stack }) => stack === 'Cavaliers 2')

      await castSpellAt(user, 'Slow', cavaliers)
      await clickBattleButton(user, 'Defend')

      expect(readBattleStacks()).not.toContainEqual(cavaliers)
    })
  })

  describe('Attack and Defense', () => {
    // The Swordsmen's 81 damage leaves 42 Pikemen to strike back: their 42 lowest rolls, with
    // Attack 4 against the Swordsmen's Defense 14, do 42 × (1 − 10 × 2.5%) = 31.5, so 31 damage
    // without a spell. Stone Skin and Weakness make the gap 13 (28.35) or 16 (25.2).
    test.each([
      { spell: 'Stone Skin', level: 'no skill', secondarySkills: [], at: 'own', damage: 28 },
      {
        spell: 'Stone Skin',
        level: 'Advanced Earth Magic',
        secondarySkills: [{ skill: 'EARTH_MAGIC', level: 'ADVANCED' }],
        at: 'own',
        damage: 25
      },
      { spell: 'Weakness', level: 'no skill', secondarySkills: [], at: 'enemy', damage: 28 },
      {
        spell: 'Weakness',
        level: 'Advanced Water Magic',
        secondarySkills: [{ skill: 'WATER_MAGIC', level: 'ADVANCED' }],
        at: 'enemy',
        damage: 25
      },
      // Shield takes 15% off at no skill, 30% at Advanced: 42 × 0.75 × 0.85 and 42 × 0.75 × 0.7.
      { spell: 'Shield', level: 'no skill', secondarySkills: [], at: 'own', damage: 26 },
      {
        spell: 'Shield',
        level: 'Advanced Earth Magic',
        secondarySkills: [{ skill: 'EARTH_MAGIC', level: 'ADVANCED' }],
        at: 'own',
        damage: 22
      }
    ])('given the hero has $level and casts $spell when the Swordsmen attack 50 Pikemen then the Pikemen strike back for $damage', async ({
      spell,
      secondarySkills,
      at,
      damage
    }) => {
      const { user } = await startBattle(aFight({ hero: aCaster({ secondarySkills }) }))

      await attackPikemenAfter(user, spell, at === 'own' ? SWORDSMEN_CLOSE_BY : PIKEMEN_CLOSE_BY)

      expect(readCombatMessages()).toContain(`The Pikemen do ${damage} damage.`)
    })

    // The Archers' 10 lowest rolls do 20; with Attack 6 against the defending Swordsmen's Defense
    // 16 (14 + 2), 20 × 0.75 = 15, halved from across the battlefield: 7.5, so 7. Shield would
    // make it 6.
    test('given the hero cast Shield on the Swordsmen when enemy Archers shoot them then the shot does its full damage', async () => {
      const { user } = await startBattle(aFight({ monster: 'ARCHER', count: 10 }))

      await castSpellAt(user, 'Shield', OWN_HEX)
      await playOnToNextRound(user)

      expect(readCombatMessages()).toContain('The Archers do 7 damage.')
    })

    // The Swordsmen's 60-90 with Attack 12 against the Pikemen's Defense 5: +35%, 81-121.
    // Bloodlust's +3 makes it +50%, 90-135; Advanced's +6 makes it +65%, 99-148.
    test.each([
      { level: 'no skill', secondarySkills: [], damage: '90-135' },
      {
        level: 'Advanced Fire Magic',
        secondarySkills: [{ skill: 'FIRE_MAGIC', level: 'ADVANCED' }],
        damage: '99-148'
      }
    ])('given the hero has $level and cast Bloodlust on the Swordsmen when the player points at the Pikemen then the attack does $damage', async ({
      secondarySkills,
      damage
    }) => {
      const { user } = await startBattle(aFight({ hero: aCaster({ secondarySkills }) }))
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Bloodlust', SWORDSMEN_CLOSE_BY)

      await pointAtBattleHexSide(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

      expect(getBattleStatusBarText()).toBe(`Attack Pikemen (damage ${damage})`)
    })

    // 10 Archers' 20-30 with Attack 8 against Defense 5: +15%, halved from across the
    // battlefield: 11-17. Bloodlust's +3 would make it 13-19.
    test('given the hero cast Bloodlust on Archers when the player points at the Pikemen then the shot does its usual damage', async () => {
      const hero = aCaster({ army: [stack('ARCHER', 10)] })
      const { user } = await startBattle(aFight({ hero }))
      await castSpellAt(user, 'Bloodlust', OWN_HEX)

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe('Shoot Pikemen (12 shots left, damage 11-17)')
    })
  })

  describe('shown on the stack', () => {
    test('given the hero cast Haste on the Swordsmen then their count box turns green', async () => {
      const { user } = await startBattleWithStyles(aFight())

      await castSpellAt(user, 'Haste', OWN_HEX)

      expect(readStackCountColour(OWN_HEX.row, OWN_HEX.column)).toBe('green')
    })

    test('given the hero cast Slow on the Pikemen then their count box turns red', async () => {
      const { user } = await startBattleWithStyles(aFight())

      await castSpellAt(user, 'Slow', ENEMY_HEX)

      expect(readStackCountColour(ENEMY_HEX.row, ENEMY_HEX.column)).toBe('red')
    })
  })

  describe('how long it lasts', () => {
    test('given a hero with Power 2 cast Haste then it lasts this round and the next, and the count box turns back after', async () => {
      const { user } = await startBattleWithStyles(aFight())
      await castSpellAt(user, 'Haste', OWN_HEX)

      await playOnToNextRound(user)
      const inRoundTwo = readStackCountColour(OWN_HEX.row, OWN_HEX.column)
      await playOnToNextRound(user)

      expect([inRoundTwo, readStackCountColour(OWN_HEX.row, OWN_HEX.column)]).toEqual([
        'green',
        'purple'
      ])
    })

    // The Pikemen walk to column 11, out of the way of column 9.
    test('given a hero with Power 1 cast Haste when the next round starts then the Swordsmen reach only as far as without it', async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ power: 1 }) }))
      await castSpellAt(user, 'Haste', OWN_HEX)

      await playOnToNextRound(user)

      expect([isBattleHexReachable(6, 6), isBattleHexReachable(6, 7)]).toEqual([true, false])
    })

    test('given Haste was cast last round when the hero casts it again then it lasts two more rounds', async () => {
      const { user } = await startBattleWithStyles(aFight())
      await castSpellAt(user, 'Haste', OWN_HEX)
      await playOnToNextRound(user)

      await castSpellAt(user, 'Haste', OWN_HEX)
      await playOnToNextRound(user)

      expect(readStackCountColour(OWN_HEX.row, OWN_HEX.column)).toBe('green')
    })
  })

  describe('reload', () => {
    test('given the hero cast Haste when the page reloads then the Swordsmen still reach column 9 and their count box is green', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight()
      const { user } = await startBattle(scenario, { eventLog, withStyles: true })
      await castSpellAt(user, 'Haste', OWN_HEX)

      await reloadBattle(scenario, { eventLog })

      expect([
        isBattleHexReachable(OWN_HEX.row, 9),
        readStackCountColour(OWN_HEX.row, OWN_HEX.column)
      ]).toEqual([true, 'green'])
    })

    test('given Haste was cast last round when the page reloads then it runs out when the next round starts', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight()
      const { user } = await startBattle(scenario, { eventLog, withStyles: true })
      await castSpellAt(user, 'Haste', OWN_HEX)
      await playOnToNextRound(user)

      const reloaded = await reloadBattle(scenario, { eventLog })
      await playOnToNextRound(reloaded.user)

      expect(readStackCountColour(OWN_HEX.row, OWN_HEX.column)).toBe('purple')
    })
  })
})
