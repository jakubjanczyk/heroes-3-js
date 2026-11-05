// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, getCursorOver, waitMs } from './app.utils.js'
import {
  castSpellAt,
  clickBattleHex,
  getBattleHex,
  getBattleStatusBarText,
  hoverBattleHex,
  moveActiveStackTo,
  pickSpell,
  playOnToNextRound,
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
  CONTROL_SPELLS,
  DAMAGE_SPELLS,
  ENEMY_HEX,
  OWN_HEX,
  stack
} from './battle-lasting-spells.fixtures.js'
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

  describe('an artifact giving immunity to mind spells', () => {
    const aMindGuardWearer = ({ artifacts = ['MIND_GUARD'], ...options } = {}) =>
      aCaster({
        knowledge: 4,
        spells: ['BLESS', 'MIRTH', ...CONTROL_SPELLS],
        artifacts,
        ...options
      })

    test("given a hero wearing an artifact that gives the troops immunity to mind spells picks Frenzy when the mouse is over the hero's Swordsmen then the status bar asks for a target and the cursor is blocked", async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aMindGuardWearer() }))
      await pickSpell(user, 'Frenzy')

      await hoverBattleHex(user, OWN_HEX.row, OWN_HEX.column)

      expect([
        getBattleStatusBarText(),
        getCursorOver(getBattleHex(OWN_HEX.row, OWN_HEX.column))
      ]).toEqual(['Select Spell Target', 'battle-blocked'])
    })

    test('given an Expert Water hero wearing that artifact when Mirth is picked then the book says the spell will affect no one and keeps the spell points', async () => {
      const hero = aMindGuardWearer({
        secondarySkills: [{ skill: 'WATER_MAGIC', level: 'EXPERT' }]
      })
      const { user } = await startBattle(aFight({ hero }))

      await pickSpell(user, 'Mirth')

      expect([readSpellBookMessage(), readSpellBookSpellPoints()]).toEqual([
        ['', 'That spell will affect no one!'],
        '40'
      ])
    })

    // Round one the Cavalier comes to column 8 and the Swordsmen go to column 6; round two the
    // Cavalier attacks them from column 7. Advanced Berserk on the Cavalier reaches the Swordsmen
    // next to it too; a berserk stack whose turn it is attacks at once.
    test("given a hero wearing that artifact casts Berserk on an area holding the hero's Swordsmen and an enemy stack then only the enemy stack goes berserk", async () => {
      const hero = aMindGuardWearer({
        secondarySkills: [{ skill: 'FIRE_MAGIC', level: 'ADVANCED' }]
      })
      const { user } = await startBattleWithStyles(aFight({ hero, monster: 'CAVALIER', count: 5 }))
      await waitMs(2000)
      await moveActiveStackTo(user, 6, 6)
      await waitMs(3000)

      await castSpellAt(user, 'Berserk', { row: 6, column: 7 })
      await waitMs(2000)

      expect([readCombatMessages().slice(-1), readStackCountColour(6, 7)]).toEqual([
        ["Lord Haart casts 'Berserk' on the Cavaliers."],
        'red'
      ])
    })

    test('given a hero wearing that artifact when Bless is cast on the Swordsmen then their count box turns green', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aMindGuardWearer() }))

      await castSpellAt(user, 'Bless', OWN_HEX)

      expect(readStackCountColour(OWN_HEX.row, OWN_HEX.column)).toBe('green')
    })

    // The Mind Guard finds the shield slot taken by the Plain Shield and goes to the backpack.
    test('given the artifact is in the backpack when Frenzy is cast on the Swordsmen then the combat log says so', async () => {
      const hero = aMindGuardWearer({ artifacts: ['PLAIN_SHIELD', 'MIND_GUARD'] })
      const { user } = await startBattle(aFight({ hero }))

      await castSpellAt(user, 'Frenzy', OWN_HEX)

      expect(readCombatMessages().slice(-1)).toEqual([
        "Lord Haart casts 'Frenzy' on the Swordsmen."
      ])
    })

    test('given a hero wearing that artifact hypnotized an enemy stack when Frenzy is cast on it then the combat log says so', async () => {
      const { user } = await startBattle(aFight({ hero: aMindGuardWearer(), count: 5 }))
      await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
      await playOnToNextRound(user)
      await playOnToNextRound(user)

      await castSpellAt(user, 'Frenzy', ENEMY_HEX)

      expect(readCombatMessages().slice(-1)).toEqual(["Lord Haart casts 'Frenzy' on the Pikemen."])
    })

    test("given a hero wearing that artifact when the page reloads then Frenzy still can't be cast on the Swordsmen", async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: aMindGuardWearer() })
      const { user } = await startBattle(scenario, { eventLog })
      await playOnToNextRound(user)

      await reloadBattle(scenario, { eventLog })
      await castSpellAt(user, 'Frenzy', OWN_HEX)

      expect(getBattleStatusBarText()).toBe('Spell cancelled')
    })
  })

  describe('an artifact giving immunity to spells of level 1-4', () => {
    const aSpellGuardWearer = (options = {}) =>
      aCaster({
        knowledge: 4,
        spells: ['HASTE', ...DAMAGE_SPELLS],
        artifacts: ['SPELL_GUARD'],
        ...options
      })

    const stackNamed = (name) => readBattleStacks().find(({ stack }) => stack.startsWith(name))

    // The monster in two stacks stands on rows 3 and 9 of column 15, 25 Pikemen each.
    const ENEMY_TOP = { row: 3, column: 15 }

    test('given a hero wearing an artifact that gives the troops immunity to spells of level 1-4 picks Haste when the Swordsmen are clicked then the spell is cancelled and no spell points are spent', async () => {
      const { user } = await startBattle(aFight({ hero: aSpellGuardWearer() }))
      await pickSpell(user, 'Haste')

      await clickBattleHex(user, OWN_HEX.row, OWN_HEX.column)
      const statusBar = getBattleStatusBarText()

      expect([statusBar, await readBattleSpellPoints(user)]).toEqual(['Spell cancelled', '40'])
    })

    // Armageddon does 30 + 2 × 50 = 130 to the Pikemen: 13 of the 10-health Pikemen perish.
    test("given a hero wearing that artifact casts Armageddon then the enemy stack takes damage and the hero's stacks take none", async () => {
      const { user } = await startBattle(aFight({ hero: aSpellGuardWearer() }))

      await pickSpell(user, 'Armageddon')

      expect([stackNamed('Swordsmen').stack, stackNamed('Pikemen').stack]).toEqual([
        'Swordsmen 10',
        'Pikemen 37'
      ])
    })

    // With no skill the bolt strikes four times: 105 to the top Pikemen (10 perish), half that,
    // 52, to the bottom ones (5 perish), then it would jump to the Archers, the only stack left,
    // with 26: two of the 10-health Archers.
    test("given a hero wearing that artifact casts Chain Lightning then the bolt jumps to the monster's other stack and not to the hero's Archers", async () => {
      const hero = aSpellGuardWearer({ army: [stack('ARCHER', 10)] })
      const { user } = await startBattle(aFight({ hero, stacks: 2 }))

      await castSpellAt(user, 'Chain Lightning', ENEMY_TOP)
      await waitMs(1200)

      expect(readBattleStacks().map(({ stack }) => stack)).toEqual([
        'Pikemen 15',
        'Archers 10',
        'Pikemen 20'
      ])
    })
  })
})
