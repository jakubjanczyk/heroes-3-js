// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog } from './app.utils.js'
import {
  clickBattleButton,
  getBattleStatusBarText,
  hoverBattleHex,
  pickSpell,
  readActiveStack,
  readBattleEffects,
  readBattleStacks,
  readCombatMessages,
  readStackCountColours,
  reloadBattle,
  startBattle,
  startBattleWithStyles
} from './battle.utils.js'
import { aCaster, aFight, ENEMY_HEX, OWN_HEX, stack } from './battle-lasting-spells.fixtures.js'
import {
  querySpellBook,
  readSpellBookMessage,
  readSpellBookSpellPoints
} from './spell-book.utils.js'

const expert = (skill) => [{ skill, level: 'EXPERT' }]

const anExpertCaster = ({ skill = 'AIR_MAGIC', ...caster } = {}) =>
  aCaster({ secondarySkills: expert(skill), ...caster })

const TWO_STACKS = [stack('SWORDSMAN', 10), stack('PIKEMAN', 10)]

describe('battle Expert spells behavior', () => {
  describe('casting', () => {
    test('given an Expert Air hero with two stacks when Haste is picked then the book closes and the combat log says the hero casts it, with no stack named', async () => {
      const { user } = await startBattle(aFight({ hero: anExpertCaster({ army: TWO_STACKS }) }))

      await pickSpell(user, 'Haste')

      expect([querySpellBook(), readCombatMessages().at(-1)]).toEqual([
        null,
        "Lord Haart casts 'Haste'."
      ])
    })

    test('given an Expert Earth hero against a single enemy stack when Slow is picked then the combat log names that stack', async () => {
      const { user } = await startBattle(aFight({ hero: anExpertCaster({ skill: 'EARTH_MAGIC' }) }))

      await pickSpell(user, 'Slow')

      expect(readCombatMessages().at(-1)).toBe("Lord Haart casts 'Slow' on the Pikemen.")
    })

    test("given an Expert Air hero when Haste is picked then every one of the hero's stacks has the helpful count box and the enemy's don't", async () => {
      const { user } = await startBattleWithStyles(
        aFight({ hero: anExpertCaster({ army: TWO_STACKS }), count: 20, stacks: 2 })
      )

      await pickSpell(user, 'Haste')

      expect(readStackCountColours()).toEqual(
        expect.arrayContaining([
          { stack: 'Swordsmen 10', colour: 'green' },
          { stack: 'Pikemen 10', colour: 'green' },
          { stack: 'Pikemen 10', colour: 'purple' },
          { stack: 'Pikemen 10', colour: 'purple' }
        ])
      )
    })

    test("given an Expert Earth hero when Slow is picked against a monster in two stacks then both enemy stacks have the harmful count box and the hero's don't", async () => {
      const hero = anExpertCaster({ skill: 'EARTH_MAGIC', army: TWO_STACKS })
      const { user } = await startBattleWithStyles(
        aFight({ hero, monster: 'ARCHER', count: 20, stacks: 2 })
      )

      await pickSpell(user, 'Slow')

      expect(readStackCountColours()).toEqual(
        expect.arrayContaining([
          { stack: 'Swordsmen 10', colour: 'purple' },
          { stack: 'Pikemen 10', colour: 'purple' },
          { stack: 'Archers 10', colour: 'red' },
          { stack: 'Archers 10', colour: 'red' }
        ])
      )
    })

    test("given an Expert Air hero when Haste is picked then a burst of light shows over each of the hero's stacks", async () => {
      const { user } = await startBattle(aFight({ hero: anExpertCaster({ army: TWO_STACKS }) }))
      const ownStacks = readBattleStacks().filter(({ column }) => column === OWN_HEX.column)

      await pickSpell(user, 'Haste')

      expect(readBattleEffects()).toEqual(
        ownStacks.map(({ row, column }) => ({ effect: 'Haste', row, column }))
      )
    })
  })

  describe('the value on every stack', () => {
    // The Griffins (speed 6) act first; then the monster's Swordsmen (5) before the Pikemen (4),
    // unless Expert Haste makes the Pikemen 9.
    test('given the Griffins act first when an Expert Air hero casts Haste then the Pikemen act before the enemy Swordsmen', async () => {
      const hero = anExpertCaster({ army: [stack('GRIFFIN', 2), stack('PIKEMAN', 10)] })
      const { user } = await startBattle(aFight({ hero, monster: 'SWORDSMAN', count: 10 }))

      await pickSpell(user, 'Haste')
      await clickBattleButton(user, 'Defend')

      expect([readActiveStack().stack, readBattleStacks()]).toEqual([
        'Pikemen 10',
        expect.arrayContaining([{ stack: 'Swordsmen 10', ...ENEMY_HEX }])
      ])
    })
  })

  describe('Precision', () => {
    test('given an Expert Air hero with Archers and Swordsmen when Precision is picked then only the Archers have the helpful count box', async () => {
      const hero = anExpertCaster({ army: [stack('ARCHER', 10), stack('SWORDSMAN', 10)] })
      const { user } = await startBattleWithStyles(aFight({ hero }))

      await pickSpell(user, 'Precision')

      expect(readStackCountColours()).toEqual(
        expect.arrayContaining([
          { stack: 'Archers 10', colour: 'green' },
          { stack: 'Swordsmen 10', colour: 'purple' }
        ])
      )
    })

    test('given an Expert Air hero with no shooters when Precision is picked then the book stays open, says the spell will affect no one and keeps all 20 spell points', async () => {
      const { user } = await startBattle(aFight({ hero: anExpertCaster() }))

      await pickSpell(user, 'Precision')

      expect([readSpellBookMessage(), readSpellBookSpellPoints()]).toEqual([
        ['', 'That spell will affect no one!'],
        '20'
      ])
    })
  })

  describe('still aimed', () => {
    test('given an Expert Air hero picks Disrupting Ray when the mouse is over the enemy stack then the status bar names the spell and the stack', async () => {
      const { user } = await startBattle(aFight({ hero: anExpertCaster() }))
      await pickSpell(user, 'Disrupting Ray')

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe('Cast Disrupting Ray on Pikemen')
    })

    test("given an Advanced Air hero picks Haste when the mouse is over the hero's stack then the status bar names the spell and the stack", async () => {
      const hero = aCaster({ secondarySkills: [{ skill: 'AIR_MAGIC', level: 'ADVANCED' }] })
      const { user } = await startBattle(aFight({ hero }))
      await pickSpell(user, 'Haste')

      await hoverBattleHex(user, OWN_HEX.row, OWN_HEX.column)

      expect(getBattleStatusBarText()).toBe('Cast Haste on Swordsmen')
    })
  })

  describe('reload', () => {
    test("given an Expert Air hero cast Haste when the page reloads then every one of the hero's stacks still has the helpful count box", async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: anExpertCaster({ army: TWO_STACKS }) })
      const { user } = await startBattle(scenario, { eventLog, withStyles: true })
      await pickSpell(user, 'Haste')

      await reloadBattle(scenario, { eventLog })

      expect(readStackCountColours()).toEqual(
        expect.arrayContaining([
          { stack: 'Swordsmen 10', colour: 'green' },
          { stack: 'Pikemen 10', colour: 'green' }
        ])
      )
    })
  })
})
