// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  getBattleStatusBarText,
  hoverBattleHex,
  pickSpell,
  playOnToNextRound,
  readActiveStack,
  readBattleSpellPoints,
  readBattleStacks,
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
  CONTROL_SPELLS,
  ENEMY_HEX,
  PIKEMEN_CLOSE_BY,
  REMOVING_AND_HEALING_SPELLS,
  stack
} from './battle-lasting-spells.fixtures.js'

const aBlinder = ({ level, ...options } = {}) =>
  aCaster({
    spells: [...CONTROL_SPELLS, ...REMOVING_AND_HEALING_SPELLS],
    secondarySkills: level ? [{ skill: 'FIRE_MAGIC', level }] : [],
    ...options
  })

// The Pikemen would walk from column 15 to column 11 on their turn.
const PIKEMEN_AFTER_A_WALK = { stack: 'Pikemen 50', row: 6, column: 11 }
const PIKEMEN_WHERE_THEY_STARTED = { stack: 'Pikemen 50', ...ENEMY_HEX }

describe('battle control spells behavior', () => {
  describe('Blind', () => {
    test('given the hero casts Blind on the Pikemen then the combat log says they cannot see, 10 spell points are spent and their count box turns red', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aBlinder() }))

      await castSpellAt(user, 'Blind', ENEMY_HEX)
      const colour = readStackCountColour(ENEMY_HEX.row, ENEMY_HEX.column)
      const messages = readCombatMessages().slice(-2)
      await playOnToNextRound(user)

      expect([messages, colour, await readBattleSpellPoints(user)]).toEqual([
        ["Lord Haart casts 'Blind' on the Pikemen.", 'The Pikemen cannot see!'],
        'red',
        '10'
      ])
    })

    test('given the Pikemen are blind when the Swordsmen defend then the Pikemen lose their turn and the Swordsmen act again', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder() }))
      await castSpellAt(user, 'Blind', ENEMY_HEX)

      await playOnToNextRound(user)

      expect([readActiveStack().stack, readBattleStacks()]).toEqual([
        'Swordsmen 10',
        expect.arrayContaining([PIKEMEN_WHERE_THEY_STARTED])
      ])
    })

    test('given a hero with Power 1 blinds the Pikemen when the next round starts then the Pikemen take their turn again', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder({ power: 1 }) }))
      await castSpellAt(user, 'Blind', ENEMY_HEX)

      await playOnToNextRound(user)
      await playOnToNextRound(user)

      expect(readBattleStacks()).toContainEqual(PIKEMEN_AFTER_A_WALK)
    })

    test('given a hero with Power 2 blinds the Pikemen then they stay blind in the next round too', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder() }))
      await castSpellAt(user, 'Blind', ENEMY_HEX)

      await playOnToNextRound(user)
      await playOnToNextRound(user)

      expect(readBattleStacks()).toContainEqual(PIKEMEN_WHERE_THEY_STARTED)
    })

    // Without Blind the 42 Pikemen left strike back for 31 (31.5): half of that is 15.75, a
    // quarter 7.875.
    test.each([
      { level: undefined, skill: 'no skill', damage: 15 },
      { level: 'ADVANCED', skill: 'Advanced Fire Magic', damage: 7 }
    ])('given a hero with $skill blinds the Pikemen when the Swordsmen attack them then the Pikemen strike back for $damage', async ({
      level,
      damage
    }) => {
      const { user } = await startBattle(aFight({ hero: aBlinder({ level }) }))

      await attackPikemenAfter(user, 'Blind', PIKEMEN_CLOSE_BY)

      expect(readCombatMessages()).toContain(`The Pikemen do ${damage} damage.`)
    })

    test('given an Expert Fire hero blinds the Pikemen when the Swordsmen attack them then the Pikemen do not strike back', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder({ level: 'EXPERT' }) }))

      await attackPikemenAfter(user, 'Blind', PIKEMEN_CLOSE_BY)

      // Their only hit is on their own turn after the attack, at full strength.
      expect(
        readCombatMessages().filter((message) => message.startsWith('The Pikemen do'))
      ).toEqual(['The Pikemen do 31 damage.'])
    })

    test('given the hero blinds the Pikemen when the Swordsmen attack them then the Pikemen take their turn after the attack', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aBlinder() }))

      await attackPikemenAfter(user, 'Blind', PIKEMEN_CLOSE_BY)

      expect([
        readStackCountColour(PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column),
        readCombatMessages().filter((message) => message.startsWith('The Pikemen do')).length
      ]).toEqual(['purple', 2])
    })

    // Round one: the Cavaliers (speed 7) are blind; the Archers shoot them before the Pikemen
    // (both speed 4) act, and the Cavaliers, faster than the Pikemen, act next and walk 7 hexes,
    // from column 15 to 8.
    test('given the Cavaliers are blind when the Archers shoot them then the Cavaliers act this round, before the slower Pikemen', async () => {
      const hero = aBlinder({ army: [stack('ARCHER', 10), stack('PIKEMAN', 10)] })
      const { user } = await startBattle(aFight({ hero, monster: 'CAVALIER', count: 2 }))
      const cavaliers = readBattleStacks().find(({ stack }) => stack === 'Cavaliers 2')
      await castSpellAt(user, 'Blind', cavaliers)

      await shootAt(user, cavaliers.row, cavaliers.column)
      await waitMs(1000)

      expect([readActiveStack().stack, readBattleStacks()]).toEqual([
        'Pikemen 10',
        expect.arrayContaining([{ stack: 'Cavaliers 2', row: cavaliers.row, column: 8 }])
      ])
    })

    test('given the Pikemen are blind when Magic Arrow hits them then they take their turn again', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder() }))
      await castSpellAt(user, 'Blind', ENEMY_HEX)
      await playOnToNextRound(user)

      await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)
      await playOnToNextRound(user)

      expect(readBattleStacks()).toContainEqual({ ...PIKEMEN_AFTER_A_WALK, stack: 'Pikemen 47' })
    })

    test('given an Advanced Water hero blinded the Pikemen when the hero casts Dispel on them then they take their turn again', async () => {
      const hero = aBlinder({ secondarySkills: [{ skill: 'WATER_MAGIC', level: 'ADVANCED' }] })
      const { user } = await startBattle(aFight({ hero }))
      await castSpellAt(user, 'Blind', ENEMY_HEX)
      await playOnToNextRound(user)

      await castSpellAt(user, 'Dispel', ENEMY_HEX)
      await playOnToNextRound(user)

      expect(readBattleStacks()).toContainEqual(PIKEMEN_AFTER_A_WALK)
    })

    test('given Blind is picked when the mouse is over enemy Skeletons then the status bar asks for a target', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder(), monster: 'SKELETON' }))
      await pickSpell(user, 'Blind')

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe('Select Spell Target')
    })

    test('given the hero blinded the Pikemen when the page reloads then the Pikemen still lose their turn', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: aBlinder() })
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Blind', ENEMY_HEX)

      await reloadBattle(scenario, { eventLog })
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)

      expect(readBattleStacks()).toContainEqual(PIKEMEN_WHERE_THEY_STARTED)
    })
  })
})
