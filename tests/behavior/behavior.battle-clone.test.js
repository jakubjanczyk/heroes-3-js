// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { getHeroInfoBox, readArmySlots } from './adventure-panels.utils.js'
import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  castSpellAt,
  clickBattleButton,
  closeBattleResults,
  getBattleStatusBarText,
  hoverBattleHex,
  moveActiveStackTo,
  pickSpell,
  playOnToNextRound,
  readActiveStack,
  readBattleCasualties,
  readBattleResultsSide,
  readBattleSpellPoints,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import {
  aCaster,
  aFight,
  bringPikemenCloser,
  ENEMY_HEX,
  HERO,
  OWN_HEX,
  PIKEMEN_CLOSE_BY,
  SWORDSMEN_CLOSE_BY,
  stack
} from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition } from './builders.js'

// Knowledge 4: 40 spell points, enough for Clone at no skill (24).
const aCloner = ({ water, earth, army, power, knowledge = 4 } = {}) =>
  aCaster({
    spells: ['CLONE', 'ANTI_MAGIC', 'HYPNOTIZE'],
    knowledge,
    secondarySkills: [
      ...(water ? [{ skill: 'WATER_MAGIC', level: water }] : []),
      ...(earth ? [{ skill: 'EARTH_MAGIC', level: earth }] : [])
    ],
    ...(power ? { power } : {}),
    ...(army ? { army } : {})
  })

// The clone stands on the free hex nearest its original, the one toward the enemy first.
const NEXT_TO_OWN_HEX = { row: OWN_HEX.row, column: OWN_HEX.column + 1 }

const creaturesOfTier = (tier) => ({
  [`TIER_${tier}`]: aCreatureDefinition()
    .withName(`Tier ${tier}`)
    .withNamePlural(`Tier ${tier} Creatures`)
    .withTier(tier)
    .withSpeed(5)
    .build()
})

const clones = () => readBattleStacks().filter(({ stack }) => stack.includes('(clone)'))

async function cloneAt(user, at) {
  await castSpellAt(user, 'Clone', at)
  await waitMs()
}

// The original and its clone both defend, then the enemy plays its turn.
async function playOnWithClone(user) {
  await clickBattleButton(user, 'Defend')
  await playOnToNextRound(user)
}

describe('battle clone behavior', () => {
  test('given the hero casts Clone on the Swordsmen then a clone of them stands next to them, 24 spell points are spent and the combat log says so', async () => {
    const { user } = await startBattle(aFight({ hero: aCloner() }))

    await cloneAt(user, OWN_HEX)
    const stacks = clones()
    const messages = readCombatMessages().slice(-1)
    await playOnWithClone(user)

    expect([stacks, messages, await readBattleSpellPoints(user)]).toEqual([
      [{ stack: 'Swordsmen (clone) 10', ...NEXT_TO_OWN_HEX }],
      ["Lord Haart casts 'Clone' on the Swordsmen."],
      '16'
    ])
  })

  test('given a hero with Basic Water Magic casts Clone then 20 spell points are spent', async () => {
    const { user } = await startBattle(aFight({ hero: aCloner({ water: 'BASIC' }) }))

    await cloneAt(user, OWN_HEX)
    await playOnWithClone(user)

    expect(await readBattleSpellPoints(user)).toBe('20')
  })

  // The clone (speed 5) acts before the Pikemen (speed 4).
  test('given the Swordsmen were cloned on their turn then the clone takes its turn after them, this round', async () => {
    const { user } = await startBattle(aFight({ hero: aCloner() }))

    await cloneAt(user, OWN_HEX)
    await clickBattleButton(user, 'Defend')
    await waitMs()

    expect(readActiveStack()).toEqual({ stack: 'Swordsmen (clone) 10', ...NEXT_TO_OWN_HEX })
  })

  describe('vanishing', () => {
    // Round 1 brings the Swordsmen to column 5 and the Pikemen to column 11; the clone stands on
    // column 6.
    async function cloneNearPikemen(user) {
      await bringPikemenCloser(user)
      await cloneAt(user, SWORDSMEN_CLOSE_BY)
    }

    test('given the clone attacks the Pikemen when they strike back then it vanishes and the combat log says so', async () => {
      const { user } = await startBattle(aFight({ hero: aCloner() }))
      await cloneNearPikemen(user)
      await clickBattleButton(user, 'Defend')
      await waitMs()

      await attackBattleHexFrom(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')
      await waitMs(1000)

      expect([clones(), readCombatMessages().slice(-2)]).toEqual([
        [],
        ['The Pikemen do 31 damage.', 'The Swordsmen perish.']
      ])
    })

    test('given the Pikemen attack the clone then it vanishes without striking back', async () => {
      const { user } = await startBattle(aFight({ hero: aCloner() }))
      await cloneNearPikemen(user)

      await playOnWithClone(user)

      expect([clones(), readCombatMessages().slice(-2)]).toEqual([
        [],
        ['The Pikemen do 35 damage.', 'The Swordsmen perish.']
      ])
    })

    // The Swordsman walks round its clone to column 5 and the Pikemen come to column 11. 100
    // Pikemen striking back do far more than the one Swordsman's 35 health.
    test('given the original Swordsmen die then their clone vanishes too', async () => {
      const { user } = await startBattle(
        aFight({ hero: aCloner({ army: [stack('SWORDSMAN', 1)] }), count: 100 })
      )
      await cloneAt(user, OWN_HEX)
      await moveActiveStackTo(user, SWORDSMEN_CLOSE_BY.row, SWORDSMEN_CLOSE_BY.column)
      await waitMs(1000)
      await playOnToNextRound(user)

      await attackBattleHexFrom(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')
      await waitMs(1000)

      expect([readBattleStacks().map(({ stack }) => stack)]).toEqual([
        ['Dead Swordsman', 'Pikemen 100']
      ])
    })

    // Power 2: the clone is there in rounds 1 and 2, and gone as round 3 starts. The Pikemen
    // (speed 4) don't reach it before then.
    test('given a hero with Power 2 cloned the Swordsmen then the clone is gone as the third round starts', async () => {
      const { user } = await startBattle(aFight({ hero: aCloner() }))
      await cloneAt(user, OWN_HEX)
      await playOnWithClone(user)
      const inRoundTwo = clones()

      await playOnWithClone(user)

      expect([inRoundTwo, clones()]).toEqual([
        [{ stack: 'Swordsmen (clone) 10', ...NEXT_TO_OWN_HEX }],
        []
      ])
    })

    // With Basic Water Magic each Clone costs 20 of the 40 spell points.
    test('given the clone vanished then the Swordsmen can be cloned again', async () => {
      const { user } = await startBattle(aFight({ hero: aCloner({ water: 'BASIC' }) }))
      await cloneNearPikemen(user)
      await playOnWithClone(user)

      await cloneAt(user, SWORDSMEN_CLOSE_BY)

      expect(clones()).toEqual([
        { stack: 'Swordsmen (clone) 10', row: SWORDSMEN_CLOSE_BY.row, column: 6 }
      ])
    })
  })

  describe('aiming', () => {
    test('given the Swordsmen have a clone when the player points Clone at either then it needs a target', async () => {
      const { user } = await startBattle(aFight({ hero: aCloner({ water: 'BASIC' }) }))
      await cloneAt(user, OWN_HEX)
      await playOnWithClone(user)

      await pickSpell(user, 'Clone')
      await hoverBattleHex(user, OWN_HEX.row, OWN_HEX.column)
      const atOriginal = getBattleStatusBarText()
      await hoverBattleHex(user, NEXT_TO_OWN_HEX.row, NEXT_TO_OWN_HEX.column)

      expect([atOriginal, getBattleStatusBarText()]).toEqual([
        'Select Spell Target',
        'Select Spell Target'
      ])
    })

    test.each([
      [undefined, 5, 'Cast Clone on Tier 5 Creatures'],
      [undefined, 6, 'Select Spell Target'],
      ['BASIC', 6, 'Select Spell Target'],
      ['ADVANCED', 6, 'Cast Clone on Tier 6 Creatures'],
      ['ADVANCED', 7, 'Select Spell Target'],
      ['EXPERT', 7, 'Cast Clone on Tier 7 Creatures']
    ])('given a hero with %s Water Magic when the player points Clone at a level %i stack then it says %s', async (water, tier, text) => {
      const { user } = await startBattle(
        aFight({
          hero: aCloner({ water, army: [stack(`TIER_${tier}`, 10)] }),
          creatures: creaturesOfTier(tier)
        })
      )

      await pickSpell(user, 'Clone')
      await hoverBattleHex(user, OWN_HEX.row, OWN_HEX.column)

      expect(getBattleStatusBarText()).toBe(text)
    })
  })

  // Anti-Magic cast with Advanced Earth Magic turns away spells up to level 4.
  test('given Advanced Anti-Magic is on the Swordsmen when Clone is cast on them then the spell is cancelled', async () => {
    const { user } = await startBattle(aFight({ hero: aCloner({ earth: 'ADVANCED' }) }))
    await castSpellAt(user, 'Anti-Magic', OWN_HEX)
    await playOnToNextRound(user)

    await castSpellAt(user, 'Clone', OWN_HEX)

    expect([getBattleStatusBarText(), clones()]).toEqual(['Spell cancelled', []])
  })

  // 5 Pikemen have 50 health, below Hypnotize's 10 + 2 × 25 = 60. Knowledge 4 is not enough for
  // both spells, so the hero has Knowledge 6.
  test('given the hero hypnotized the Pikemen when Clone is cast on them then the clone fights for the hero', async () => {
    const { user } = await startBattle(aFight({ hero: aCloner({ knowledge: 6 }), count: 5 }))
    await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
    await playOnToNextRound(user)
    await playOnToNextRound(user)

    await cloneAt(user, ENEMY_HEX)
    await clickBattleButton(user, 'Defend')
    await waitMs()
    await clickBattleButton(user, 'Defend')
    await waitMs()
    const active = readActiveStack()
    await moveActiveStackTo(user, active.row, active.column - 2)

    expect(clones()).toEqual([
      { stack: 'Pikemen (clone) 5', row: active.row, column: active.column - 2 }
    ])
  })

  // The hex in front of the Cavaliers is no use: the clone's back half would stand on them. A
  // hex in the row above is as near, with room behind it.
  test('given the Cavaliers are cloned then the clone stands where both its hexes fit', async () => {
    const { user } = await startBattle(
      aFight({ hero: aCloner({ water: 'ADVANCED', army: [stack('CAVALIER', 2)] }) })
    )

    await cloneAt(user, OWN_HEX)

    expect(readBattleStacks().filter(({ stack }) => stack.startsWith('Cavaliers (clone)'))).toEqual(
      [
        {
          stack: 'Cavaliers (clone) (back half)',
          row: OWN_HEX.row - 1,
          column: OWN_HEX.column - 1
        },
        { stack: 'Cavaliers (clone) 2', row: OWN_HEX.row - 1, column: OWN_HEX.column }
      ]
    )
  })

  describe('battle end', () => {
    // The Scouts (speed 20, 1 health) reach the free Pikemen at once and die as they strike back;
    // 5 Pikemen have 50 health, below Hypnotize's 10 + 2 × 25 = 60.
    test("given only the clone of the hypnotized Pikemen is left on the hero's side then the battle is lost", async () => {
      const { user } = await startBattle(
        aFight({
          hero: aCloner({ knowledge: 6, army: [stack('SCOUT', 1)] }),
          count: 10,
          stacks: 2,
          creatures: {
            SCOUT: aCreatureDefinition()
              .withName('Scout')
              .withNamePlural('Scouts')
              .withHealth(1)
              .withSpeed(20)
              .build()
          }
        })
      )
      const hypnotized = { row: 3, column: 15 }
      await castSpellAt(user, 'Hypnotize', hypnotized)
      await playOnToNextRound(user)
      await playOnToNextRound(user)
      await cloneAt(user, hypnotized)
      const free = readBattleStacks().find(
        ({ stack, row }) => stack === 'Pikemen 5' && row !== hypnotized.row
      )

      await attackBattleHexFrom(user, free.row, free.column, 'left')
      await waitForBattleResults()

      expect(readBattleResultsSide('Attacker')).toEqual([HERO, 'Defeated'])
    })

    test('given the hero won with a clone on the field then neither the casualties nor the army count it', async () => {
      const { user } = await startBattle(aFight({ hero: aCloner(), count: 2 }))
      await cloneAt(user, OWN_HEX)

      await clickBattleButton(user, 'Auto combat')
      await waitForBattleResults()
      const casualties = readBattleCasualties('Attacker')
      await closeBattleResults(user)

      expect([casualties, readArmySlots(getHeroInfoBox())[0]]).toEqual([['None'], 'Swordsmen 10'])
    })
  })

  test('given the Swordsmen were cloned when the page reloads then the clone still stands there and the spell points stay spent', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aFight({ hero: aCloner() })
    const { user } = await startBattle(scenario, { eventLog })
    await cloneAt(user, OWN_HEX)

    await reloadBattle(scenario, { eventLog })
    const stacks = clones()
    await playOnWithClone(user)

    expect([stacks, await readBattleSpellPoints(user)]).toEqual([
      [{ stack: 'Swordsmen (clone) 10', ...NEXT_TO_OWN_HEX }],
      '16'
    ])
  })
})
