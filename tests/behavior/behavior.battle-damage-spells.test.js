// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog } from './app.utils.js'
import {
  castSpellAt,
  getBattleStatusBarText,
  hoverBattleHex,
  pickSpell,
  playOnToNextRound,
  pointAtBattleHexSide,
  readCombatMessages,
  readStackCountColour,
  reloadBattle,
  shootAt,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import {
  aCaster,
  aFight,
  attackPikemenAfter,
  bringPikemenCloser,
  ENEMY_HEX,
  OWN_HEX,
  PIKEMEN_CLOSE_BY,
  SWORDSMEN_CLOSE_BY,
  stack
} from './battle-lasting-spells.fixtures.js'

// Every damage roll comes out at the top of its range.
const HIGHEST_ROLLS = () => 0.99

const WATER_ADVANCED = [{ skill: 'WATER_MAGIC', level: 'ADVANCED' }]
const FIRE_ADVANCED = [{ skill: 'FIRE_MAGIC', level: 'ADVANCED' }]
const AIR_ADVANCED = [{ skill: 'AIR_MAGIC', level: 'ADVANCED' }]
const AIR_EXPERT = [{ skill: 'AIR_MAGIC', level: 'EXPERT' }]

async function pointAtPikemenCloseBy(user) {
  await pointAtBattleHexSide(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')
}

describe('battle damage spells behavior', () => {
  describe('Bless and Curse', () => {
    // Each of the 10 Swordsmen does its maximum, 9: 90, +35% for Attack 12 against Defense 5.
    test('given the hero cast Bless on the Swordsmen when the player points at the Pikemen then the attack shows one damage number', async () => {
      const { user } = await startBattle(aFight())
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Bless', SWORDSMEN_CLOSE_BY)

      await pointAtPikemenCloseBy(user)

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 121)')
    })

    // Advanced: 9 + 1 for each Swordsman, 100, +35%.
    test('given the hero has Advanced Water Magic and cast Bless on the Swordsmen when they attack then each does its maximum + 1', async () => {
      const { user } = await startBattle(
        aFight({ hero: aCaster({ secondarySkills: WATER_ADVANCED }) })
      )

      await attackPikemenAfter(user, 'Bless', SWORDSMEN_CLOSE_BY)

      expect(readCombatMessages()).toContain('The Swordsmen do 135 damage. 13 Pikemen perish.')
    })

    // 10 Archers at their maximum, 3: 30, +15% for Attack 8 against Defense 5, halved from
    // across the battlefield: 17.25.
    test('given the hero cast Bless on the Archers when they shoot then the shot does their maximum damage', async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ army: [stack('ARCHER', 10)] }) }))
      await castSpellAt(user, 'Bless', OWN_HEX)

      await shootAt(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(readCombatMessages()).toContain('The Archers do 17 damage. One Pikeman perishes.')
    })

    // The enemy Archers' highest rolls, 3 each, would do 30 × 0.75 for Attack 6 against the
    // defending Swordsmen's Defense 16, halved: 11. Cursed they do 2 each (7.5), or at Advanced
    // 2 − 1 (3.75).
    test.each([
      { level: 'no skill', secondarySkills: [], damage: 7 },
      { level: 'Advanced Fire Magic', secondarySkills: FIRE_ADVANCED, damage: 3 }
    ])('given the hero has $level and cursed the enemy Archers when they shoot then the shot does $damage', async ({
      secondarySkills,
      damage
    }) => {
      const hero = aCaster({ secondarySkills })
      const { user } = await startBattle(aFight({ hero, monster: 'ARCHER', count: 10 }), {
        random: HIGHEST_ROLLS
      })
      await castSpellAt(user, 'Curse', ENEMY_HEX)

      await playOnToNextRound(user)

      expect(readCombatMessages()).toContain(`The Archers do ${damage} damage.`)
    })

    // The Swordsmen's highest rolls, 121, leave 38 Pikemen. Their minimum, 1, less 1 at Advanced
    // is still 1: 38 × 0.75 for Attack 4 against Defense 14, 28.5.
    test('given the hero has Advanced Fire Magic and cursed the Pikemen when they strike back then each still does 1', async () => {
      const hero = aCaster({ secondarySkills: FIRE_ADVANCED })
      const { user } = await startBattle(aFight({ hero }), { random: HIGHEST_ROLLS })

      await attackPikemenAfter(user, 'Curse', PIKEMEN_CLOSE_BY)

      expect(readCombatMessages()).toContain('The Pikemen do 28 damage.')
    })
  })

  describe('Precision and Air Shield', () => {
    // 10 Archers' 20-30 with Attack 8 against Defense 5 is +15%, halved: 11-17. Precision's +3
    // makes it +30%, 13-19; Advanced's +6 makes it +45%, 14-21.
    test.each([
      { level: 'no skill', secondarySkills: [], damage: '13-19' },
      { level: 'Advanced Air Magic', secondarySkills: AIR_ADVANCED, damage: '14-21' }
    ])('given the hero has $level and cast Precision on the Archers when the player points at the Pikemen then the shot does $damage', async ({
      secondarySkills,
      damage
    }) => {
      const hero = aCaster({ secondarySkills, army: [stack('ARCHER', 10)] })
      const { user } = await startBattle(aFight({ hero }))
      await castSpellAt(user, 'Precision', OWN_HEX)

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe(`Shoot Pikemen (12 shots left, damage ${damage})`)
    })

    // Two stacks stand on rows 3 and 9; the Swordsmen are faster and act first.
    test('given Precision is picked when the mouse is over the Swordsmen then the status bar asks for a target', async () => {
      const hero = aCaster({ army: [stack('ARCHER', 10), stack('SWORDSMAN', 10)] })
      const { user } = await startBattle(aFight({ hero }))
      await pickSpell(user, 'Precision')

      await hoverBattleHex(user, 9, 1)

      expect(getBattleStatusBarText()).toBe('Select Spell Target')
    })

    test('given Precision is picked when the mouse is over the Archers then the status bar names the spell and the Archers', async () => {
      const hero = aCaster({ army: [stack('ARCHER', 10), stack('SWORDSMAN', 10)] })
      const { user } = await startBattle(aFight({ hero }))
      await pickSpell(user, 'Precision')

      await hoverBattleHex(user, 3, 1)

      expect(getBattleStatusBarText()).toBe('Cast Precision on Archers')
    })

    // The enemy Archers' 20 × 0.75, halved, is 7.5; Air Shield takes 25% more off (5.6), or 50%
    // at Advanced (3.75).
    test.each([
      { level: 'no skill', secondarySkills: [], damage: 5 },
      { level: 'Advanced Air Magic', secondarySkills: AIR_ADVANCED, damage: 3 }
    ])('given the hero has $level and cast Air Shield on the Swordsmen when enemy Archers shoot them then the shot does $damage', async ({
      secondarySkills,
      damage
    }) => {
      const hero = aCaster({ secondarySkills })
      const { user } = await startBattle(aFight({ hero, monster: 'ARCHER', count: 10 }))
      await castSpellAt(user, 'Air Shield', OWN_HEX)

      await playOnToNextRound(user)

      expect(readCombatMessages()).toContain(`The Archers do ${damage} damage.`)
    })

    test('given the hero cast Air Shield on the Swordsmen when the Pikemen strike back then they do their full damage', async () => {
      const { user } = await startBattle(aFight())

      await attackPikemenAfter(user, 'Air Shield', SWORDSMEN_CLOSE_BY)

      expect(readCombatMessages()).toContain('The Pikemen do 31 damage.')
    })
  })

  describe('Disrupting Ray', () => {
    // The Swordsmen's 60-90 with Attack 12 against the Pikemen's Defense 5 is +35%. Defense 2
    // makes it +50%, 90-135; 1 makes it +55%, 93-139; 0 makes it +60%, 96-144.
    test.each([
      { level: 'no skill', secondarySkills: [], damage: '90-135' },
      { level: 'Advanced Air Magic', secondarySkills: AIR_ADVANCED, damage: '93-139' },
      { level: 'Expert Air Magic', secondarySkills: AIR_EXPERT, damage: '96-144' }
    ])('given the hero has $level and cast Disrupting Ray on the Pikemen when the player points at them then the attack does $damage', async ({
      secondarySkills,
      damage
    }) => {
      const { user } = await startBattle(aFight({ hero: aCaster({ secondarySkills }) }))
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Disrupting Ray', PIKEMEN_CLOSE_BY)

      await pointAtPikemenCloseBy(user)

      expect(getBattleStatusBarText()).toBe(`Attack Pikemen (damage ${damage})`)
    })

    // The enemy Swordsmen walk to column 10. Their Defense 12 against the hero's Attack 12 would
    // leave 60-90; twice −3 makes it 6, +30%: 78-117.
    test('given the hero cast Disrupting Ray on the enemy Swordsmen in two rounds when the player points at them then both casts lower their Defense', async () => {
      const { user } = await startBattle(aFight({ monster: 'SWORDSMAN', count: 10 }))
      await castSpellAt(user, 'Disrupting Ray', ENEMY_HEX)
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Disrupting Ray', { row: 6, column: 10 })

      await pointAtBattleHexSide(user, 6, 10, 'left')

      expect(getBattleStatusBarText()).toBe('Attack Swordsmen (damage 78-117)')
    })

    // Twice −3 from the Pikemen's Defense 5 stops at 0: +60%, 96-144, not 99-148 for −1.
    test('given the hero cast Disrupting Ray on the Pikemen in two rounds when the player points at them then their Defense stops at 0', async () => {
      const { user } = await startBattle(aFight())
      await castSpellAt(user, 'Disrupting Ray', ENEMY_HEX)
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Disrupting Ray', PIKEMEN_CLOSE_BY)

      await pointAtPikemenCloseBy(user)

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 96-144)')
    })

    test('given a hero with Power 1 cast Disrupting Ray when the next round starts then the Pikemen still have less Defense', async () => {
      const { user } = await startBattle(aFight({ hero: aCaster({ power: 1 }) }))
      await castSpellAt(user, 'Disrupting Ray', ENEMY_HEX)

      await bringPikemenCloser(user)
      await pointAtPikemenCloseBy(user)

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 90-135)')
    })

    test('given a hero with Power 1 cast Disrupting Ray when the next round starts then the Pikemen count box stays red', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aCaster({ power: 1 }) }))
      await castSpellAt(user, 'Disrupting Ray', ENEMY_HEX)

      await bringPikemenCloser(user)

      expect(readStackCountColour(PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column)).toBe('red')
    })
  })

  describe('reload', () => {
    test('given the hero cast Disrupting Ray when the page reloads then the Pikemen still have less Defense', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: aCaster({ power: 1 }) })
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Disrupting Ray', ENEMY_HEX)
      await bringPikemenCloser(user)

      const reloaded = await reloadBattle(scenario, { eventLog })
      await pointAtPikemenCloseBy(reloaded.user)

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 90-135)')
    })
  })
})
