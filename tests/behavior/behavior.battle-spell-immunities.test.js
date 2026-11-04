// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getCursorOver } from './app.utils.js'
import {
  clickBattleHex,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  pickSpell,
  readBattleSpellPoints,
  readStackCountColours,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import { aCaster, aFight, ENEMY_HEX, OWN_HEX, stack } from './battle-lasting-spells.fixtures.js'
import { readSpellBookMessage, readSpellBookSpellPoints } from './spell-book.utils.js'

const anAdvanced = (skill, army) =>
  aCaster({ secondarySkills: [{ skill, level: 'ADVANCED' }], army })

const anExpert = (skill, army) => aCaster({ secondarySkills: [{ skill, level: 'EXPERT' }], army })

describe('battle spell immunities behavior', () => {
  describe('undead are not a target', () => {
    test("given an Advanced Water hero picks Bless when the mouse is over the hero's Skeletons then the status bar asks for a target and the cursor is blocked", async () => {
      const hero = anAdvanced('WATER_MAGIC', [stack('SKELETON', 10)])
      const { user } = await startBattleWithStyles(aFight({ hero }))
      await pickSpell(user, 'Bless')

      await hoverBattleHex(user, OWN_HEX.row, OWN_HEX.column)

      expect([
        getBattleStatusBarText(),
        getCursorOver(getBattleHex(OWN_HEX.row, OWN_HEX.column))
      ]).toEqual(['Select Spell Target', 'battle-blocked'])
    })

    test('given an Advanced Fire hero picks Curse when the enemy Skeletons are clicked then the spell is cancelled and no spell points are spent', async () => {
      const hero = anAdvanced('FIRE_MAGIC')
      const { user } = await startBattle(aFight({ hero, monster: 'SKELETON' }))
      await pickSpell(user, 'Curse')

      await clickBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)
      const statusBar = getBattleStatusBarText()

      expect([statusBar, await readBattleSpellPoints(user)]).toEqual(['Spell cancelled', '20'])
    })
  })

  describe('at Expert', () => {
    test('given an Expert Water hero with Pikemen and Skeletons when Bless is picked then only the Pikemen have the helpful count box', async () => {
      const hero = anExpert('WATER_MAGIC', [stack('PIKEMAN', 10), stack('SKELETON', 10)])
      const { user } = await startBattleWithStyles(aFight({ hero }))

      await pickSpell(user, 'Bless')

      expect(readStackCountColours()).toEqual(
        expect.arrayContaining([
          { stack: 'Pikemen 10', colour: 'green' },
          { stack: 'Skeletons 10', colour: 'purple' }
        ])
      )
    })

    test('given an Expert Water hero whose only stack is Skeletons when Bless is picked then the book says the spell will affect no one and keeps all 20 spell points', async () => {
      const hero = anExpert('WATER_MAGIC', [stack('SKELETON', 10)])
      const { user } = await startBattle(aFight({ hero }))

      await pickSpell(user, 'Bless')

      expect([readSpellBookMessage(), readSpellBookSpellPoints()]).toEqual([
        ['', 'That spell will affect no one!'],
        '20'
      ])
    })

    test('given an Expert Earth hero against Skeletons when Sorrow is picked then the book says the spell will affect no one', async () => {
      const hero = anExpert('EARTH_MAGIC').withSpells(['SORROW'])
      const { user } = await startBattle(aFight({ hero, monster: 'SKELETON' }))

      await pickSpell(user, 'Sorrow')

      expect(readSpellBookMessage()).toEqual(['', 'That spell will affect no one!'])
    })
  })
})
