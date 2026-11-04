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
  pointAtBattleHexSide,
  readActiveStack,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  readStackCountColour,
  readStackCountColours,
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
  CONTROL_SPELLS,
  ENEMY_HEX,
  OWN_HEX,
  PIKEMEN_CLOSE_BY,
  REMOVING_AND_HEALING_SPELLS,
  SWORDSMEN_CLOSE_BY,
  stack
} from './battle-lasting-spells.fixtures.js'

const WATER = (level) => [{ skill: 'WATER_MAGIC', level }]

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

  describe('Forgetfulness', () => {
    const anArcherFight = (options) =>
      aFight({ hero: aBlinder(options), monster: 'ARCHER', count: 10 })
    const archersDamage = () =>
      readCombatMessages().filter((message) => message.startsWith('The Archers do'))
    // Archers have speed 4, like the Pikemen.
    const ARCHERS_AFTER_A_WALK = { stack: 'Archers 10', row: 6, column: 11 }

    test('given the hero casts Forgetfulness on the Archers then the combat log says so, 12 spell points are spent and their count box turns red', async () => {
      const { user } = await startBattleWithStyles(anArcherFight())

      await castSpellAt(user, 'Forgetfulness', ENEMY_HEX)
      const colour = readStackCountColour(ENEMY_HEX.row, ENEMY_HEX.column)
      const messages = readCombatMessages().slice(-1)
      await playOnToNextRound(user)

      expect([messages, colour, await readBattleSpellPoints(user)]).toEqual([
        ["Lord Haart casts 'Forgetfulness' on the Archers."],
        'red',
        '8'
      ])
    })

    // Unforgetful, the shot does 7 (see the Shield test in the lasting spells tests); half of
    // 7.5 is 3.75.
    test('given the hero cast Forgetfulness on the Archers when they shoot the defending Swordsmen then the shot does half damage', async () => {
      const { user } = await startBattle(anArcherFight())

      await castSpellAt(user, 'Forgetfulness', ENEMY_HEX)
      await playOnToNextRound(user)

      expect(archersDamage()).toEqual(['The Archers do 3 damage.'])
    })

    test('given an Advanced Water hero cast Forgetfulness on the Archers when their turn comes then they walk instead of shooting', async () => {
      const { user } = await startBattle(anArcherFight({ secondarySkills: WATER('ADVANCED') }))

      await castSpellAt(user, 'Forgetfulness', ENEMY_HEX)
      await playOnToNextRound(user)

      expect([archersDamage(), readBattleStacks()]).toEqual([
        [],
        expect.arrayContaining([ARCHERS_AFTER_A_WALK])
      ])
    })

    test('given an Expert Water hero casts Forgetfulness then both Archer stacks turn red, the Swordsmen do not, and neither Archer stack shoots', async () => {
      const hero = aBlinder({ secondarySkills: WATER('EXPERT') })
      const { user } = await startBattleWithStyles(
        aFight({ hero, monster: 'ARCHER', count: 20, stacks: 2 })
      )

      await castSpellAt(user, 'Forgetfulness', ENEMY_HEX)
      const message = readCombatMessages().at(-1)
      const colours = readStackCountColours()
      const archerColours = colours.filter(({ stack }) => stack === 'Archers 10')
      await playOnToNextRound(user)

      expect([
        message,
        colours,
        archerColours.map(({ colour }) => colour),
        archersDamage()
      ]).toEqual([
        "Lord Haart casts 'Forgetfulness'.",
        expect.arrayContaining([
          { stack: 'Swordsmen 10', colour: 'purple' },
          { stack: 'Archers 10', colour: 'red' }
        ]),
        ['red', 'red'],
        []
      ])
    })

    test('given a hero with Power 1 and Advanced Water cast Forgetfulness on the Archers when the next round starts then they shoot again', async () => {
      const hero = { power: 1, secondarySkills: WATER('ADVANCED') }
      const { user } = await startBattle(anArcherFight(hero))
      await castSpellAt(user, 'Forgetfulness', ENEMY_HEX)

      await playOnToNextRound(user)
      await playOnToNextRound(user)

      expect(archersDamage()).toHaveLength(1)
    })

    test('given Forgetfulness is picked when the mouse is over the Pikemen, who do not shoot, then the status bar asks for a target', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder() }))
      await pickSpell(user, 'Forgetfulness')

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe('Select Spell Target')
    })

    test('given an Advanced Water hero cast Forgetfulness on the Archers when the page reloads then they still walk instead of shooting', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = anArcherFight({ secondarySkills: WATER('ADVANCED') })
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Forgetfulness', ENEMY_HEX)

      await reloadBattle(scenario, { eventLog })
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)

      expect(readBattleStacks()).toContainEqual(ARCHERS_AFTER_A_WALK)
    })
  })

  describe('Frenzy', () => {
    test('given the hero casts Frenzy on the Swordsmen then the combat log says so, 16 spell points are spent and their count box turns green', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aBlinder() }))

      await castSpellAt(user, 'Frenzy', OWN_HEX)
      const colour = readStackCountColour(OWN_HEX.row, OWN_HEX.column)
      const messages = readCombatMessages().slice(-1)
      await playOnToNextRound(user)

      expect([messages, colour, await readBattleSpellPoints(user)]).toEqual([
        ["Lord Haart casts 'Frenzy' on the Swordsmen."],
        'green',
        '4'
      ])
    })

    // The Swordsmen's 60-90 with Attack 12 and Defense 14 (the hero's class gives +2 each).
    // Basic: Attack 12 + 14 = 26 against the Pikemen's 5, +105%: 123-184. Expert: 12 + 28 = 40,
    // +175%: 165-247.
    test.each([
      { skill: 'no skill', level: undefined, damage: '123-184' },
      { skill: 'Expert Fire Magic', level: 'EXPERT', damage: '165-247' }
    ])('given a hero with $skill cast Frenzy on the Swordsmen when the player points at the Pikemen then the attack does $damage', async ({
      level,
      damage
    }) => {
      const { user } = await startBattle(aFight({ hero: aBlinder({ level }) }))
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Frenzy', SWORDSMEN_CLOSE_BY)

      await pointAtBattleHexSide(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

      expect(getBattleStatusBarText()).toBe(`Attack Pikemen (damage ${damage})`)
    })

    // Unfrenzied, the defending Swordsmen take 7. Defense 0 against the Archers' Attack 6: 20
    // × 1.3 = 26, halved from across the battlefield: 13.
    test('given the hero cast Frenzy on the Swordsmen when they defend and the Archers shoot them then they still have no Defense', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder(), monster: 'ARCHER', count: 10 }))

      await castSpellAt(user, 'Frenzy', OWN_HEX)
      await playOnToNextRound(user)

      expect(readCombatMessages()).toContain('The Archers do 13 damage.')
    })

    // The Swordsmen's 60-90 with Attack 12 against Defense 5: +35%, 81-121.
    test('given the hero cast Frenzy on the Swordsmen when their turn comes in the next round then the attack does its usual damage', async () => {
      const { user } = await startBattleWithStyles(aFight({ hero: aBlinder() }))
      await castSpellAt(user, 'Frenzy', OWN_HEX)

      await bringPikemenCloser(user)
      await pointAtBattleHexSide(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

      expect([
        getBattleStatusBarText(),
        readStackCountColour(SWORDSMEN_CLOSE_BY.row, SWORDSMEN_CLOSE_BY.column)
      ]).toEqual(['Attack Pikemen (damage 81-121)', 'purple'])
    })

    test('given Frenzy is picked when the mouse is over the Pikemen then the status bar asks for a target', async () => {
      const { user } = await startBattle(aFight({ hero: aBlinder() }))
      await pickSpell(user, 'Frenzy')

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe('Select Spell Target')
    })

    test('given the hero cast Frenzy on the Swordsmen when the page reloads and the Archers shoot them then they still have no Defense', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFight({ hero: aBlinder(), monster: 'ARCHER', count: 10 })
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Frenzy', OWN_HEX)

      await reloadBattle(scenario, { eventLog })
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)

      expect(readCombatMessages()).toContain('The Archers do 13 damage.')
    })
  })
})
