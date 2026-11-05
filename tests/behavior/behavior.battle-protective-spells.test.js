// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  castSpellAt,
  getBattleStatusBarText,
  hoverBattleHex,
  moveActiveStackTo,
  pickSpell,
  playOnToNextRound,
  pointAtBattleHexSide,
  readBattleEffects,
  readBattleResultsSide,
  readBattleSpellPoints,
  readCombatMessages,
  readStackCountColour,
  readStackCountColours,
  reloadBattle,
  startBattle,
  startBattleWithStyles,
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
  PROTECTIVE_SPELLS,
  REMOVING_AND_HEALING_SPELLS,
  SWORDSMEN_CLOSE_BY,
  stack
} from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition } from './builders.js'

const aSlayerCaster = ({ level, army } = {}) =>
  aCaster({
    spells: PROTECTIVE_SPELLS,
    secondarySkills: level ? [{ skill: 'FIRE_MAGIC', level }] : [],
    ...(army ? { army } : {})
  })

const aKing = (group, name) =>
  aCreatureDefinition().withName(name).withNamePlural(`${name}s`).withKing(group).build()

// With a Pikeman's stats, so they come as close as the Pikemen do.
const KINGS = {
  DRAGON: aKing(1, 'Dragon'),
  DEVIL: aKing(2, 'Devil'),
  GIANT: aKing(3, 'Giant')
}

const aFightWithKings = ({ hero, monster = 'DEVIL', count = 50 }) =>
  aFight({ hero, monster, count, creatures: KINGS })

describe('battle protective spells behavior', () => {
  describe('Slayer', () => {
    test('given the hero casts Slayer on the Swordsmen then the combat log says so, 16 spell points are spent and their count box turns green', async () => {
      const { user } = await startBattleWithStyles(aFightWithKings({ hero: aSlayerCaster() }))

      await castSpellAt(user, 'Slayer', OWN_HEX)
      const colour = readStackCountColour(OWN_HEX.row, OWN_HEX.column)
      const messages = readCombatMessages().slice(-1)
      await playOnToNextRound(user)

      expect([messages, colour, await readBattleSpellPoints(user)]).toEqual([
        ["Lord Haart casts 'Slayer' on the Swordsmen."],
        'green',
        '4'
      ])
    })

    // The Swordsmen's 60-90 with Attack 12 (the hero's class gives +2) against Defense 5: +35%,
    // 81-121. With Slayer's +8, Attack 20: +75%, 105-157.
    test.each([
      { skill: 'no skill', level: undefined, king: 'DRAGON', name: 'Dragons', damage: '105-157' },
      { skill: 'Basic', level: 'BASIC', king: 'DEVIL', name: 'Devils', damage: '81-121' },
      { skill: 'Advanced', level: 'ADVANCED', king: 'DEVIL', name: 'Devils', damage: '105-157' },
      { skill: 'Advanced', level: 'ADVANCED', king: 'GIANT', name: 'Giants', damage: '81-121' },
      { skill: 'Expert', level: 'EXPERT', king: 'GIANT', name: 'Giants', damage: '105-157' }
    ])('given a hero with $skill Fire Magic cast Slayer on the Swordsmen when the player points at the $name then the attack does $damage', async ({
      level,
      king,
      name,
      damage
    }) => {
      const { user } = await startBattle(
        aFightWithKings({ hero: aSlayerCaster({ level }), monster: king })
      )
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Slayer', SWORDSMEN_CLOSE_BY)

      await pointAtBattleHexSide(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

      expect(getBattleStatusBarText()).toBe(`Attack ${name} (damage ${damage})`)
    })

    test('given an Expert Fire hero cast Slayer on the Swordsmen when the player points at the Pikemen then the attack does its usual damage', async () => {
      const { user } = await startBattle(
        aFightWithKings({ hero: aSlayerCaster({ level: 'EXPERT' }), monster: 'PIKEMAN' })
      )
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Slayer', SWORDSMEN_CLOSE_BY)

      await pointAtBattleHexSide(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 81-121)')
    })

    // The Archers' 20-30 with Attack 8 against Defense 5: +15%, halved from across the
    // battlefield: 11-17. With Attack 16: +55%, 15-23.
    test('given an Advanced Fire hero cast Slayer on the Archers when the player points at the Devils then the shot does 15-23', async () => {
      const hero = aSlayerCaster({ level: 'ADVANCED', army: [stack('ARCHER', 10)] })
      const { user } = await startBattle(aFightWithKings({ hero }))
      await castSpellAt(user, 'Slayer', OWN_HEX)

      await hoverBattleHex(user, ENEMY_HEX.row, ENEMY_HEX.column)

      expect(getBattleStatusBarText()).toBe('Shoot Devils (12 shots left, damage 15-23)')
    })

    // The Swordsmen walk to column 6 and the Devils to column 11; next round the Swordsmen defend
    // and the Devils attack them. The 10 Swordsmen strike back for 60 with Attack 20 against
    // Defense 5: +75%, 105, and 10 of the 20 Devils perish.
    test('given an Advanced Fire hero cast Slayer on the Swordsmen when the Devils attack them then the strike back does 105 damage', async () => {
      const { user } = await startBattle(
        aFightWithKings({ hero: aSlayerCaster({ level: 'ADVANCED' }), count: 20 })
      )
      await castSpellAt(user, 'Slayer', OWN_HEX)
      await moveActiveStackTo(user, 6, 6)
      await waitMs(1000)

      await playOnToNextRound(user)

      expect(readCombatMessages()).toContain('The Swordsmen do 105 damage. 10 Devils perish.')
    })

    test('given an Advanced Fire hero cast Slayer on the Swordsmen when the page reloads and the player points at the Devils then the attack still does 105-157', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithKings({ hero: aSlayerCaster({ level: 'ADVANCED' }) })
      const { user } = await startBattle(scenario, { eventLog })
      await bringPikemenCloser(user)
      await castSpellAt(user, 'Slayer', SWORDSMEN_CLOSE_BY)

      await reloadBattle(scenario, { eventLog })
      await pointAtBattleHexSide(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

      expect(getBattleStatusBarText()).toBe('Attack Devils (damage 105-157)')
    })
  })

  describe('Counterstrike', () => {
    const aCounterstrikeCaster = ({ level, army } = {}) =>
      aCaster({
        knowledge: 3,
        spells: ['SLOW', ...PROTECTIVE_SPELLS, ...REMOVING_AND_HEALING_SPELLS],
        secondarySkills: level ? [{ skill: 'AIR_MAGIC', level }] : [],
        ...(army ? { army } : {})
      })

    // Tough enough to live through every strike back, so each one shows in the log.
    const aRaider = (speed) =>
      aCreatureDefinition()
        .withName('Raider')
        .withNamePlural('Raiders')
        .withSpeed(speed)
        .withHealth(100)
        .build()

    // Two Raiders in each stack.
    const aFightWithRaiders = ({ hero, stacks = 3, speed = 5 }) =>
      aFight({
        hero,
        monster: 'RAIDER',
        count: 2 * stacks,
        stacks,
        creatures: { RAIDER: aRaider(speed) }
      })

    const strikesBackAfter = (messages, castLine) =>
      messages
        .slice(messages.indexOf(castLine) + 1)
        .filter((message) => /^The (Swordsmen|Griffins) do/.test(message)).length

    const CAST_ON_SWORDSMEN = "Lord Haart casts 'Counterstrike' on the Swordsmen."

    // The Swordsmen cast and walk to column 6 and the Raiders (as fast) come to column 10; next
    // round every Raider stack attacks the Swordsmen.
    async function castThenTakeEveryRaidersAttack(user) {
      await castSpellAt(user, 'Counterstrike', OWN_HEX)
      await moveActiveStackTo(user, 6, 6)
      await waitMs(1000)
      await playOnToNextRound(user)
    }

    test('given the hero casts Counterstrike on the Swordsmen then the combat log says so, 24 spell points are spent and their count box turns green', async () => {
      const { user } = await startBattleWithStyles(
        aFightWithRaiders({ hero: aCounterstrikeCaster() })
      )

      await castSpellAt(user, 'Counterstrike', OWN_HEX)
      const colour = readStackCountColour(OWN_HEX.row, OWN_HEX.column)
      const messages = readCombatMessages().slice(-1)
      await playOnToNextRound(user)

      expect([messages, colour, await readBattleSpellPoints(user)]).toEqual([
        [CAST_ON_SWORDSMEN],
        'green',
        '6'
      ])
    })

    test('given a hero with no Air skill cast Counterstrike on the Swordsmen when two enemy stacks attack them in one round then the Swordsmen strike back at both', async () => {
      const { user } = await startBattle(
        aFightWithRaiders({ hero: aCounterstrikeCaster(), stacks: 2 })
      )

      await castThenTakeEveryRaidersAttack(user)

      expect(strikesBackAfter(readCombatMessages(), CAST_ON_SWORDSMEN)).toBe(2)
    })

    test('given a hero with no Air skill cast Counterstrike on the Swordsmen when a third enemy stack attacks them in that round then it gets no strike back', async () => {
      const { user } = await startBattle(aFightWithRaiders({ hero: aCounterstrikeCaster() }))

      await castThenTakeEveryRaidersAttack(user)

      expect(strikesBackAfter(readCombatMessages(), CAST_ON_SWORDSMEN)).toBe(2)
    })

    test('given an Advanced Air hero cast Counterstrike on the Swordsmen when three enemy stacks attack them in one round then they strike back at all three', async () => {
      const { user } = await startBattle(
        aFightWithRaiders({ hero: aCounterstrikeCaster({ level: 'ADVANCED' }) })
      )

      await castThenTakeEveryRaidersAttack(user)

      expect(strikesBackAfter(readCombatMessages(), CAST_ON_SWORDSMEN)).toBe(3)
    })

    test("given an Expert Air hero when Counterstrike is picked then it is cast straight from the book, every one of the hero's stacks has the helpful count box and 20 spell points are spent", async () => {
      const hero = aCounterstrikeCaster({
        level: 'EXPERT',
        army: [stack('SWORDSMAN', 10), stack('ARCHER', 10)]
      })
      const { user } = await startBattleWithStyles(aFightWithRaiders({ hero, stacks: 1 }))

      await pickSpell(user, 'Counterstrike')
      const message = readCombatMessages().at(-1)
      const colours = readStackCountColours()
        .filter(({ stack }) => !stack.startsWith('Raiders'))
        .map(({ colour }) => colour)
      await playOnToNextRound(user)
      await playOnToNextRound(user)

      expect([message, colours, await readBattleSpellPoints(user)]).toEqual([
        "Lord Haart casts 'Counterstrike'.",
        ['green', 'green'],
        '10'
      ])
    })

    test('given the hero cast Counterstrike on Griffins when three enemy stacks attack them in one round then they strike back at all three', async () => {
      const hero = aCounterstrikeCaster({ army: [stack('GRIFFIN', 10)] })
      const { user } = await startBattle(aFightWithRaiders({ hero }))

      await castThenTakeEveryRaidersAttack(user)

      expect(
        strikesBackAfter(readCombatMessages(), "Lord Haart casts 'Counterstrike' on the Griffins.")
      ).toBe(3)
    })

    // The Raiders are faster than the Swordsmen but the third stack is slowed: the first two
    // attack before the Swordsmen's turn and the third after it.
    async function strikeBackThenCastBeforeTheSlowedRaiders(user) {
      await castSpellAt(user, 'Slow', { row: 9, column: 9 })
      await moveActiveStackTo(user, 7, 5)
      await waitMs(1000)
      await castSpellAt(user, 'Counterstrike', { row: 7, column: 5 })
    }

    const theSlowedRaidersAttack = async (user) => {
      await playOnToNextRound(user)
      const messages = readCombatMessages()
      return messages.slice(messages.indexOf(CAST_ON_SWORDSMEN) + 1).slice(0, 2)
    }

    test('given the Swordsmen already struck back this round when the hero casts Counterstrike on them and another enemy stack attacks then they strike back again', async () => {
      const { user } = await startBattle(
        aFightWithRaiders({ hero: aCounterstrikeCaster(), speed: 6 })
      )
      await strikeBackThenCastBeforeTheSlowedRaiders(user)

      expect(await theSlowedRaidersAttack(user)).toEqual([
        'The Raiders do 1 damage.',
        'The Swordsmen do 81 damage.'
      ])
    })

    test('given Counterstrike is on the Swordsmen and they struck back once when the page reloads and another enemy stack attacks then they still strike back', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithRaiders({ hero: aCounterstrikeCaster(), speed: 6 })
      const { user } = await startBattle(scenario, { eventLog })
      await strikeBackThenCastBeforeTheSlowedRaiders(user)

      await reloadBattle(scenario, { eventLog })

      expect(await theSlowedRaidersAttack(user)).toEqual([
        'The Raiders do 1 damage.',
        'The Swordsmen do 81 damage.'
      ])
    })

    test('given Counterstrike was cast on the Swordsmen last round when the hero dispels it and two enemy stacks attack them then only the first gets a strike back', async () => {
      const { user } = await startBattle(
        aFightWithRaiders({ hero: aCounterstrikeCaster(), stacks: 2 })
      )
      await castSpellAt(user, 'Counterstrike', OWN_HEX)
      await moveActiveStackTo(user, 6, 6)
      await waitMs(1000)

      await castSpellAt(user, 'Dispel', { row: 6, column: 6 })
      await playOnToNextRound(user)

      expect(
        strikesBackAfter(readCombatMessages(), "Lord Haart casts 'Dispel' on the Swordsmen.")
      ).toBe(1)
    })
  })

  describe('Fire Shield', () => {
    const aFireShieldCaster = ({ level, sorcery, army } = {}) =>
      aCaster({
        knowledge: 3,
        spells: ['SHIELD', ...PROTECTIVE_SPELLS],
        secondarySkills: [
          ...(level ? [{ skill: 'FIRE_MAGIC', level }] : []),
          ...(sorcery ? [{ skill: 'SORCERY', level: sorcery }] : [])
        ],
        ...(army ? { army } : {})
      })

    // As fast as the Swordsmen, each Brute does 10 and has 100 health.
    const aBrute = ({ attack = 20, health = 100, abilities = [] } = {}) =>
      aCreatureDefinition()
        .withName('Brute')
        .withNamePlural('Brutes')
        .withAttack(attack)
        .withDamage({ min: 10, max: 10 })
        .withHealth(health)
        .withSpeed(5)
        .withAbilities(abilities)
        .build()

    const aFightWithBrutes = ({ hero = aFireShieldCaster(), count = 10, ...brute } = {}) =>
      aFight({ hero, monster: 'BRUTE', count, creatures: { BRUTE: aBrute(brute) } })

    const CAST_ON_SWORDSMEN = "Lord Haart casts 'Fire Shield' on the Swordsmen."

    const messagesAfter = (castLine) => {
      const messages = readCombatMessages()
      return messages.slice(messages.lastIndexOf(castLine) + 1)
    }

    const fireShieldLines = () =>
      readCombatMessages().filter((message) => message.startsWith('The Fire Shield'))

    // The Swordsmen cast and walk to column 6 and the Brutes come to column 10; next round the
    // Swordsmen defend and the Brutes attack them.
    async function castThenTakeTheBrutesAttack(user) {
      await castSpellAt(user, 'Fire Shield', OWN_HEX)
      await moveActiveStackTo(user, 6, 6)
      await waitMs(1000)
      await playOnToNextRound(user)
    }

    test('given the hero casts Fire Shield on the Swordsmen then the combat log says so, 16 spell points are spent and their count box turns green', async () => {
      const { user } = await startBattleWithStyles(aFightWithBrutes())

      await castSpellAt(user, 'Fire Shield', OWN_HEX)
      const colour = readStackCountColour(OWN_HEX.row, OWN_HEX.column)
      const messages = readCombatMessages().slice(-1)
      await playOnToNextRound(user)

      expect([messages, colour, await readBattleSpellPoints(user)]).toEqual([
        [CAST_ON_SWORDSMEN],
        'green',
        '14'
      ])
    })

    // The 10 Brutes do 100 with Attack 20 against the defending Swordsmen's Defense 16 (14 and
    // 2 for defending): +20%, 120, and 3 of the 35-health Swordsmen perish. 20% of 120 is 24.
    // The 7 Swordsmen left strike back for 42 with Attack 12 against Defense 5: +35%, 56.
    test('given a hero with no Fire skill cast Fire Shield on the Swordsmen when an enemy stack attacks them then the Fire Shield does 20% of the damage back, after the attack and before the strike back', async () => {
      const { user } = await startBattle(aFightWithBrutes())

      await castThenTakeTheBrutesAttack(user)

      expect(messagesAfter(CAST_ON_SWORDSMEN).slice(0, 3)).toEqual([
        'The Brutes do 120 damage. 3 Swordsmen perish.',
        'The Fire Shield does 24 damage.',
        'The Swordsmen do 56 damage.'
      ])
    })

    // 25% of 120 is 30, 30% is 36; the hero has 30 spell points.
    test.each([
      { skill: 'Advanced', level: 'ADVANCED', share: '25%', damage: 30, spellPoints: '18' },
      { skill: 'Expert', level: 'EXPERT', share: '30%', damage: 36, spellPoints: '18' }
    ])('given a hero with $skill Fire Magic cast Fire Shield on the Swordsmen when an enemy stack attacks them then it does $share of the damage back', async ({
      level,
      damage,
      spellPoints
    }) => {
      const { user } = await startBattle(aFightWithBrutes({ hero: aFireShieldCaster({ level }) }))

      await castThenTakeTheBrutesAttack(user)

      expect([fireShieldLines(), await readBattleSpellPoints(user)]).toEqual([
        [`The Fire Shield does ${damage} damage.`],
        spellPoints
      ])
    })

    // Attack 4 against Defense 16: -30%, so the Brutes do 70. Without that Defense they would
    // do 100: 20% is 20.
    test("given the Swordsmen's Defense is above the attacker's Attack when it attacks them then the Fire Shield works from the damage without that Defense", async () => {
      const { user } = await startBattle(aFightWithBrutes({ attack: 4 }))

      await castThenTakeTheBrutesAttack(user)

      expect(messagesAfter(CAST_ON_SWORDSMEN).slice(0, 2)).toEqual([
        'The Brutes do 70 damage. 2 Swordsmen perish.',
        'The Fire Shield does 20 damage.'
      ])
    })

    // Shield takes 15% off the 120: 102. The Fire Shield works from the 120: 24.
    test('given the Swordsmen have Shield when an enemy stack attacks them then the Fire Shield works from the damage without Shield', async () => {
      const { user } = await startBattle(aFightWithBrutes())
      await castSpellAt(user, 'Shield', OWN_HEX)
      await moveActiveStackTo(user, 6, 6)
      await waitMs(1000)

      await castSpellAt(user, 'Fire Shield', { row: 6, column: 6 })
      await playOnToNextRound(user)

      expect(messagesAfter(CAST_ON_SWORDSMEN).slice(0, 2)).toEqual([
        'The Brutes do 102 damage. 2 Swordsmen perish.',
        'The Fire Shield does 24 damage.'
      ])
    })

    // The 2 Swordsmen have 70 health: the Fire Shield works from 70 of the 120, 14.
    test('given the attack kills the shielded Swordsmen then the Fire Shield still burns the attacker, worked from the health the Swordsmen had', async () => {
      const hero = aFireShieldCaster({ army: [stack('SWORDSMAN', 2)] })
      const { user } = await startBattle(aFightWithBrutes({ hero }))

      await castThenTakeTheBrutesAttack(user)

      expect(messagesAfter(CAST_ON_SWORDSMEN)).toEqual([
        'The Brutes do 120 damage. 2 Swordsmen perish.',
        'The Fire Shield does 14 damage.'
      ])
    })

    // One Brute doing 3 with +20%: 3. 20% of 3 is 0.6, rounded down to 0.
    test('given the Fire Shield share rounds down to 0 then the combat log has no Fire Shield line', async () => {
      const brute = aCreatureDefinition()
        .withName('Brute')
        .withNamePlural('Brutes')
        .withAttack(20)
        .withDamage({ min: 3, max: 3 })
        .withHealth(100)
        .withSpeed(5)
        .build()
      const { user } = await startBattle(
        aFight({
          hero: aFireShieldCaster(),
          monster: 'BRUTE',
          count: 1,
          creatures: { BRUTE: brute }
        })
      )

      await castThenTakeTheBrutesAttack(user)

      expect([messagesAfter(CAST_ON_SWORDSMEN)[0], fireShieldLines()]).toEqual([
        'The Brute does 3 damage.',
        []
      ])
    })

    // Advanced Sorcery adds 10% to the 24: 26.
    test('given a hero with Sorcery cast Fire Shield when an enemy stack attacks the shielded stack then Sorcery raises the damage back', async () => {
      const { user } = await startBattle(
        aFightWithBrutes({ hero: aFireShieldCaster({ sorcery: 'ADVANCED' }) })
      )

      await castThenTakeTheBrutesAttack(user)

      expect(fireShieldLines()).toEqual(['The Fire Shield does 26 damage.'])
    })

    // 10 Brutes of 2 health have 20: the 24 burns them all up.
    test('given the Fire Shield burns up the last enemy stack then the shielded stack does not strike back and the battle is won', async () => {
      const { user } = await startBattle(aFightWithBrutes({ health: 2 }))

      await castThenTakeTheBrutesAttack(user)
      await waitForBattleResults()

      expect([messagesAfter(CAST_ON_SWORDSMEN), readBattleResultsSide('Attacker')]).toEqual([
        [
          'The Brutes do 120 damage. 3 Swordsmen perish.',
          'The Fire Shield does 24 damage. 10 Brutes perish.'
        ],
        [HERO, 'Victorious']
      ])
    })

    // The second strike meets 6 Swordsmen with 20 health on the top one: 230, more than 120. The
    // Brutes have lost 24 + 56 + 24 = 104 of their 1000 health: one perishes.
    test('given an attacker that strikes twice attacks the shielded stack then the Fire Shield burns it after each strike', async () => {
      const { user } = await startBattle(aFightWithBrutes({ abilities: ['strikesTwice'] }))

      await castThenTakeTheBrutesAttack(user)

      expect(messagesAfter(CAST_ON_SWORDSMEN).slice(0, 5)).toEqual([
        'The Brutes do 120 damage. 3 Swordsmen perish.',
        'The Fire Shield does 24 damage.',
        'The Swordsmen do 56 damage.',
        'The Brutes do 120 damage. 3 Swordsmen perish.',
        'The Fire Shield does 24 damage. One Brute perishes.'
      ])
    })

    test('given an enemy shooter shoots the shielded stack then the combat log has no Fire Shield line', async () => {
      const { user } = await startBattle(
        aFight({ hero: aFireShieldCaster(), monster: 'ARCHER', count: 20 })
      )

      await castSpellAt(user, 'Fire Shield', OWN_HEX)
      await playOnToNextRound(user)

      expect([messagesAfter(CAST_ON_SWORDSMEN)[0], fireShieldLines()]).toEqual([
        expect.stringMatching(/^The Archers do/),
        []
      ])
    })

    // The Swordsmen attack for 81 (60 with +35%). The Brutes strike back with Attack 20 against
    // Defense 14: +30%, 130; 20% of it is 26. The Brutes have lost 81 + 26 = 107: one perishes.
    test('given the shielded Swordsmen attack an enemy stack when it strikes back then the Fire Shield burns it', async () => {
      const { user } = await startBattle(aFightWithBrutes())
      await moveActiveStackTo(user, 6, 6)
      await waitMs(1000)

      await castSpellAt(user, 'Fire Shield', { row: 6, column: 6 })
      await attackBattleHexFrom(user, 6, 10, 'left')
      await waitMs(1000)

      expect(messagesAfter(CAST_ON_SWORDSMEN).slice(0, 3)).toEqual([
        'The Swordsmen do 81 damage.',
        'The Brutes do 130 damage. 3 Swordsmen perish.',
        'The Fire Shield does 26 damage. One Brute perishes.'
      ])
    })

    test('given the shielded Swordsmen attack an enemy stack when the Fire Shield burns it then a burst of light shows over the Swordsmen', async () => {
      const { user } = await startBattle(aFightWithBrutes())
      await moveActiveStackTo(user, 6, 6)
      await waitMs(1000)
      await castSpellAt(user, 'Fire Shield', { row: 6, column: 6 })
      // The cast's own burst fades first.
      await waitMs(1000)

      await attackBattleHexFrom(user, 6, 10, 'left')

      expect(readBattleEffects()).toContainEqual({ effect: 'Fire Shield', row: 6, column: 9 })
    })

    test('given Fire Shield is on the Swordsmen when the page reloads and an enemy stack attacks them then the Fire Shield still burns it', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aFightWithBrutes()
      const { user } = await startBattle(scenario, { eventLog })
      await castSpellAt(user, 'Fire Shield', OWN_HEX)
      await moveActiveStackTo(user, 6, 6)
      await waitMs(1000)

      await reloadBattle(scenario, { eventLog })
      await playOnToNextRound(user)

      expect(fireShieldLines()).toEqual(['The Fire Shield does 24 damage.'])
    })
  })
})
