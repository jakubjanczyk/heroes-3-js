// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, getCursorOver, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  getBattleButton,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
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
import {
  aCaster,
  aFight,
  bringPikemenCloser,
  CONTROL_SPELLS,
  ENEMY_HEX,
  OWN_HEX,
  PIKEMEN_CLOSE_BY,
  REMOVING_AND_HEALING_SPELLS,
  stack
} from './battle-lasting-spells.fixtures.js'

const aMindCaster = ({ fire, air, water, ...options } = {}) =>
  aCaster({
    spells: [...CONTROL_SPELLS, ...REMOVING_AND_HEALING_SPELLS],
    secondarySkills: [
      ...(fire ? [{ skill: 'FIRE_MAGIC', level: fire }] : []),
      ...(air ? [{ skill: 'AIR_MAGIC', level: air }] : []),
      ...(water ? [{ skill: 'WATER_MAGIC', level: water }] : [])
    ],
    ...options
  })

const damageBy = (name) =>
  readCombatMessages().filter((message) => message.startsWith(`The ${name} do`))

// A monster split in three stands on rows 3, 6 and 9 of column 15: the top stack is three hexes
// from the middle one and six from the bottom one.
const TOP = { row: 3, column: 15 }
const MIDDLE = { row: 6, column: 15 }

describe('battle Berserk and Hypnotize behavior', () => {
  describe('Berserk', () => {
    test('given the hero casts Berserk on the Pikemen then the combat log says so, 20 spell points are spent and their count box turns red', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aMindCaster() }))

      await castSpellAt(user, 'Berserk', ENEMY_HEX)
      const colour = readStackCountColour(ENEMY_HEX.row, ENEMY_HEX.column)
      const messages = readCombatMessages().slice(-1)
      await playOnToNextRound(user)

      expect([messages, colour, await readBattleSpellPoints(user)]).toEqual([
        ["Lord Haart casts 'Berserk' on the Pikemen."],
        'red',
        '0'
      ])
    })

    // The top Pikemen act first of the monster's stacks; the middle ones are two steps away from
    // a hex next to them and the Swordsmen fourteen. 25 Pikemen at 1 each with Attack 4 against
    // Defense 5, -2.5%: 24, two Pikemen. The middle ones then walk on towards the Swordsmen.
    test('given the berserk Pikemen are nearer to the monster’s other Pikemen than to the Swordsmen when their turn comes then they attack the other Pikemen', async () => {
      const { user } = await startBattle(aFight({ hero: aMindCaster(), count: 75, stacks: 3 }))
      await castSpellAt(user, 'Berserk', TOP)

      await playOnToNextRound(user)

      expect(readBattleStacks()).toContainEqual({ stack: 'Pikemen 23', row: 6, column: 11 })
    })

    // Unberserked, they would walk four hexes left, to column 11, towards the Swordsmen.
    test('given the berserk Pikemen cannot reach anyone this turn when their turn comes then they walk as far towards the nearest stack as they can', async () => {
      const { user } = await startBattle(aFight({ hero: aMindCaster(), count: 50, stacks: 2 }))
      await castSpellAt(user, 'Berserk', { row: 3, column: 15 })

      await playOnToNextRound(user)

      expect(readBattleStacks()).toContainEqual({ stack: 'Pikemen 25', row: 7, column: 15 })
    })

    // Round one the berserk top Pikemen walk down to row 7 and the bottom ones walk left; round two
    // the berserk ones reach them.
    test('given a hero with Power 1 berserked Pikemen who could not reach anyone when the next round comes then they are still berserk', async () => {
      const { user } = await startBattle(
        aFight({ hero: aMindCaster({ power: 1 }), count: 50, stacks: 2 })
      )
      await castSpellAt(user, 'Berserk', TOP)
      await playOnToNextRound(user)

      await playOnToNextRound(user)

      expect(damageBy('Pikemen')).toHaveLength(2)
    })

    // The hero's two stacks stand on rows 3 and 9 of column 1; the Pikemen are across the
    // battlefield.
    describe('on the hero’s own Archers', () => {
      const hero = () => aMindCaster({ army: [stack('SWORDSMAN', 10), stack('ARCHER', 10)] })
      const ARCHERS = { row: 9, column: 1 }

      test('given the hero’s Archers are berserk with no stack next to them when their turn comes then they shoot the nearer Swordsmen and the player plays no turn of theirs', async () => {
        const { user } = await startBattle(aFight({ hero: hero() }))
        await castSpellAt(user, 'Berserk', ARCHERS)

        await playOnToNextRound(user)

        // 10 Archers at 2 each with Attack 8 against the defending Swordsmen's 16: -20%.
        expect([damageBy('Archers'), readActiveStack().stack]).toEqual([
          ['The Archers do 16 damage.'],
          'Swordsmen 10'
        ])
      })

      test('given the berserk Archers have shot when their next turn comes then the player plays it', async () => {
        const { user } = await startBattle(aFight({ hero: hero() }))
        await castSpellAt(user, 'Berserk', ARCHERS)
        await playOnToNextRound(user)

        await clickBattleButton(user, 'Defend')
        await waitMs(1000)

        expect(readActiveStack()).toEqual({ stack: 'Archers 10', ...ARCHERS })
      })
    })

    // Round one: the Cavalier (speed 7) walks up first; the berserk Swordsmen walk five hexes
    // towards it and can't reach it. Round two: the Cavalier attacks them, they strike back and,
    // still berserk, attack it on their own turn.
    test('given the berserk Swordsmen strike back at the Cavalier when their turn comes then they attack it on their own', async () => {
      const { user } = await startBattle(
        aFight({ hero: aMindCaster(), monster: 'CAVALIER', count: 1 })
      )
      await castSpellAt(user, 'Berserk', OWN_HEX)

      await waitMs(3000)

      expect(damageBy('Swordsmen')).toHaveLength(2)
    })

    test('the Pikemen a berserk stack of their own side attacks strike back', async () => {
      const { user } = await startBattle(aFight({ hero: aMindCaster(), count: 75, stacks: 3 }))
      await castSpellAt(user, 'Berserk', TOP)

      await playOnToNextRound(user)

      // The 23 left strike back for 22, two of the 25 berserk Pikemen, who attacked from row 5.
      expect(readBattleStacks()).toContainEqual({ stack: 'Pikemen 23', row: 5, column: 15 })
    })

    test('given Advanced Fire Magic when Berserk is aimed at the Pikemen then their hex and the six around it light up', async () => {
      const { user } = await startBattleWithStyles(
        aFight({ hero: aMindCaster({ fire: 'ADVANCED' }) })
      )
      await bringPikemenCloser(user)
      await pickSpell(user, 'Berserk')

      await hoverBattleHex(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column)

      expect(readHighlightedBattleHexes()).toHaveLength(7)
    })

    // Round one the Cavalier comes to column 8 and the Swordsmen go to column 6; round two the
    // Cavalier attacks them from column 7 and they strike back. The berserk Swordsmen's turn then
    // plays itself and their attack ends their Berserk; the Cavalier's lasts until its own.
    test('given Advanced Fire Magic when Berserk is cast on the Cavalier next to the Swordsmen then both are berserk', async () => {
      const { user } = await startBattleWithStyles(
        aFight({ hero: aMindCaster({ fire: 'ADVANCED' }), monster: 'CAVALIER', count: 1 })
      )
      await waitMs(2000)
      await moveActiveStackTo(user, 6, 6)
      await waitMs(3000)

      await castSpellAt(user, 'Berserk', { row: 6, column: 7 })
      await waitMs(2000)

      expect([
        readCombatMessages().filter((message) => message.startsWith('Lord Haart casts')),
        damageBy('Swordsmen').length,
        readStackCountColour(6, 6),
        readStackCountColour(6, 7)
      ]).toEqual([["Lord Haart casts 'Berserk'."], 2, 'purple', 'red'])
    })

    test.each([
      { place: 'the Skeletons', monster: 'SKELETON', hex: ENEMY_HEX },
      { place: 'an empty hex', monster: 'PIKEMAN', hex: { row: 6, column: 8 } }
    ])('given Berserk is picked when the mouse is over $place then the status bar asks for a target', async ({
      monster,
      hex
    }) => {
      const { user } = await startBattle(aFight({ hero: aMindCaster(), monster }))
      await pickSpell(user, 'Berserk')

      await hoverBattleHex(user, hex.row, hex.column)

      expect(getBattleStatusBarText()).toBe('Select Spell Target')
    })

    // The hero's Pikemen, berserk, walk from row 9 four hexes towards the Swordsmen on row 3.
    test('given the hero’s berserk Pikemen are dispelled when their turn comes then the player plays it', async () => {
      const hero = aMindCaster({
        knowledge: 3,
        army: [stack('SWORDSMAN', 10), stack('PIKEMAN', 10)]
      })
      const { user } = await startBattle(aFight({ hero }))
      await castSpellAt(user, 'Berserk', { row: 9, column: 1 })
      await playOnToNextRound(user)
      const berserk = readBattleStacks().find(({ stack }) => stack === 'Pikemen 10')

      await castSpellAt(user, 'Dispel', berserk)
      await playOnToNextRound(user)

      expect(readActiveStack().stack).toBe('Pikemen 10')
    })

    // Power 3: Hypnotize, cast in round one, would last until round four. Round two the berserk
    // Pikemen attack the middle ones; round three they are the monster's and walk.
    test('given the hero berserks the hypnotized Pikemen when they have attacked then they are the monster’s again', async () => {
      const { user } = await startBattle(
        aFight({ hero: aMindCaster({ power: 3, knowledge: 4 }), count: 15, stacks: 3 })
      )
      await castSpellAt(user, 'Hypnotize', TOP)
      await playOnToNextRound(user)
      await playOnToNextRound(user)
      await castSpellAt(user, 'Berserk', TOP)
      await playOnToNextRound(user)

      await playOnToNextRound(user)

      expect(readActiveStack().stack).toBe('Swordsmen 10')
    })

    // The berserk top Pikemen walk down to row 7 in round one, unable to reach anyone.
    test('given the hero hypnotizes the berserk Pikemen when their turn comes then the player plays it', async () => {
      const { user } = await startBattle(
        aFight({ hero: aMindCaster({ knowledge: 4 }), count: 10, stacks: 2 })
      )
      await castSpellAt(user, 'Berserk', TOP)
      await playOnToNextRound(user)

      await castSpellAt(user, 'Hypnotize', { row: 7, column: 15 })
      await playOnToNextRound(user)

      expect(readActiveStack()).toEqual({ stack: 'Pikemen 5', row: 7, column: 15 })
    })

    test('given the hero berserked the top Pikemen when the page reloads then they still attack the other Pikemen', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: aMindCaster(), count: 75, stacks: 3 })
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Berserk', TOP)

      await reloadBattle(scenario, { eventLog })
      await playOnToNextRound(user)

      expect(damageBy('Pikemen')).toHaveLength(2)
    })
  })

  describe('Hypnotize', () => {
    test('given the hero casts Hypnotize on the Pikemen then the combat log says so, 18 spell points are spent and their count box turns red', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aMindCaster(), count: 5 }))

      await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
      const colour = readStackCountColour(ENEMY_HEX.row, ENEMY_HEX.column)
      const messages = readCombatMessages().slice(-1)
      await playOnToNextRound(user)
      await playOnToNextRound(user)

      expect([messages, colour, await readBattleSpellPoints(user)]).toEqual([
        ["Lord Haart casts 'Hypnotize' on the Pikemen."],
        'red',
        '2'
      ])
    })

    // Five Pikemen at 1-3 each with Attack 4 against Defense 5, -2.5%: 4-14.
    test('given the hypnotized Pikemen’s turn comes then the player plays it and the status bar offers to attack the monster’s other Pikemen', async () => {
      const { user } = await startBattle(aFight({ hero: aMindCaster(), count: 15, stacks: 3 }))
      await castSpellAt(user, 'Hypnotize', TOP)
      await playOnToNextRound(user)

      await pointAtBattleHexSide(user, MIDDLE.row, MIDDLE.column, 'top-left')

      expect([readActiveStack(), getBattleStatusBarText()]).toEqual([
        { stack: 'Pikemen 5', ...TOP },
        'Attack Pikemen (damage 4-14)'
      ])
    })

    test('given the Pikemen are hypnotized when the mouse is over them on the Swordsmen’s turn then the cursor is the one over an own stack', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aMindCaster(), count: 5 }))
      await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
      await playOnToNextRound(user)
      await playOnToNextRound(user)

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getCursorOver(getBattleHex(ENEMY_HEX.row, ENEMY_HEX.column))).toBe('battle-query')
    })

    test('given the top Pikemen are hypnotized when the monster’s middle Pikemen take their turn then they attack the hypnotized ones, who strike back', async () => {
      const { user } = await startBattle(aFight({ hero: aMindCaster(), count: 15, stacks: 3 }))
      await castSpellAt(user, 'Hypnotize', TOP)
      await playOnToNextRound(user)

      await playOnToNextRound(user)

      expect(damageBy('Pikemen')).toHaveLength(2)
    })

    // Power 2: 10 + 50 = 60 hit points with no skill, 70 at Advanced, 100 at Expert; a Pikeman
    // has 10.
    test.each([
      { skill: 'no skill', air: undefined, count: 5, status: 'Cast Hypnotize on Pikemen' },
      { skill: 'no skill', air: undefined, count: 6, status: 'Select Spell Target' },
      {
        skill: 'Advanced Air Magic',
        air: 'ADVANCED',
        count: 6,
        status: 'Cast Hypnotize on Pikemen'
      },
      { skill: 'Advanced Air Magic', air: 'ADVANCED', count: 7, status: 'Select Spell Target' },
      { skill: 'Expert Air Magic', air: 'EXPERT', count: 9, status: 'Cast Hypnotize on Pikemen' },
      { skill: 'Expert Air Magic', air: 'EXPERT', count: 10, status: 'Select Spell Target' }
    ])('given a hero with $skill picks Hypnotize when the mouse is over $count Pikemen then the status bar says "$status"', async ({
      air,
      count,
      status
    }) => {
      const { user } = await startBattle(aFight({ hero: aMindCaster({ air }), count }))
      await pickSpell(user, 'Hypnotize')

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe(status)
    })

    test('given Hypnotize is picked when the mouse is over the Skeletons then the status bar asks for a target', async () => {
      const { user } = await startBattle(
        aFight({ hero: aMindCaster(), monster: 'SKELETON', count: 2 })
      )
      await pickSpell(user, 'Hypnotize')

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe('Select Spell Target')
    })

    describe('on Archers', () => {
      // The hypnotized top Archers walk down next to the middle ones.
      async function hypnotizeTopArchersAndWalkThemDown() {
        const started = await startBattle(
          aFight({ hero: aMindCaster(), monster: 'ARCHER', count: 15, stacks: 3 })
        )
        await castSpellAt(started.user, 'Hypnotize', TOP)
        await playOnToNextRound(started.user)
        await moveActiveStackTo(started.user, 5, 15)
        await waitMs(1000)
        return started
      }

      // The bottom Archers shoot them too. Had the middle ones been stopped, they would have
      // attacked hand to hand and the hypnotized Archers would have struck back.
      test('given the hypnotized Archers stand next to the monster’s Archers when those take their turn then they shoot them', async () => {
        await hypnotizeTopArchersAndWalkThemDown()

        expect(damageBy('Archers')).toEqual([
          'The Archers do 11 damage. One Archer perishes.',
          'The Archers do 11 damage. One Archer perishes.'
        ])
      })

      test('given the hypnotized Archers stand next to the monster’s Archers when the player points at them then the status bar offers a melee attack, not a shot', async () => {
        const { user } = await hypnotizeTopArchersAndWalkThemDown()
        await playOnToNextRound(user)

        await pointAtBattleHexSide(user, MIDDLE.row, MIDDLE.column, 'top-left')

        expect(getBattleStatusBarText()).toMatch(/^Attack Archers/)
      })
    })

    // Power 1: 10 + 25 = 35 hit points, three Pikemen. Unhypnotized, they walk four hexes left, to
    // column 11.
    test('given a hero with Power 1 hypnotized the Pikemen when the next round comes then they are the monster’s again', async () => {
      const { user } = await startBattle(aFight({ hero: aMindCaster({ power: 1 }), count: 3 }))
      await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
      await playOnToNextRound(user)
      await playOnToNextRound(user)

      await playOnToNextRound(user)

      expect(readBattleStacks()).toContainEqual({ stack: 'Pikemen 3', row: 6, column: 11 })
    })

    // Auto combat plays the hypnotized Pikemen's turn and the Swordsmen's, and neither has an enemy
    // to go for: the battle goes on, and once the turns have gone round the player takes over.
    test('given the monster’s only Pikemen are hypnotized when Auto combat is on then nobody fights and the player takes over', async () => {
      const { user } = await startBattle(aFight({ hero: aMindCaster(), count: 5 }))
      await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
      await playOnToNextRound(user)

      await clickBattleButton(user, 'Auto combat')
      await waitMs(1000)

      expect([readCombatMessages().length, getBattleButton('Defend').disabled]).toEqual([1, false])
    })

    test('given the hero hypnotized the Pikemen when the page reloads and the Swordsmen defend then the player plays the Pikemen’s turn', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: aMindCaster(), count: 5 })
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Hypnotize', ENEMY_HEX)

      await reloadBattle(scenario, { eventLog })
      await playOnToNextRound(user)

      expect(readActiveStack()).toEqual({ stack: 'Pikemen 5', ...ENEMY_HEX })
    })
  })
})
