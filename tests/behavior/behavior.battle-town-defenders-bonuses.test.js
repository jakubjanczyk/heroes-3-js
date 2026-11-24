// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { clickEndTurn } from './adventure-panels.utils.js'
import { readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { castSpellAt, LOWEST_ROLLS, readCombatMessages, shootAt } from './battle.utils.js'
import { aCreatureDefinition, aHero, aScenario, aTown, aTownDefinition } from './builders.js'

// Neither shooter has Attack or Defense, so a shot across the battlefield does half its 20 damage.
// Blue's Marksman is fast and strong enough for blue's hero to attack the player's town and shoot
// first.
const aShooter = (name) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withAttack(0)
    .withDefense(0)
    .withDamage({ min: 20, max: 20 })
    .withHealth(1000)
    .withShots(10)
    .withAbilities(['ranged'])
const MARKSMAN = aShooter('Marksman').withSpeed(5).withAiValue(1000).build()
const LONGBOW = aShooter('Longbow').withSpeed(2).withAiValue(1).build()

const BULWARK = 'BULWARK'

const aDefendersBuilding = (name, defenderBonuses) => ({
  name,
  cost: { GOLD_PILE: 1000 },
  defenderBonuses
})

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), MARKSMAN, LONGBOW },
  spells: readGameData('spells.json'),
  heroes: readGameData('heroes.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  towns: {
    [BULWARK]: aTownDefinition()
      .withName('Bulwark')
      .withBuildings({
        FOUNTAIN: aDefendersBuilding('Fountain', { luck: 2 }),
        BLOOD_STONE: aDefendersBuilding('Blood Stone', { attack: 2 }),
        GLYPHS: aDefendersBuilding('Glyphs', { defense: 2 }),
        STORMCLOUDS: aDefendersBuilding('Stormclouds', { power: 2 })
      })
      .build()
  }
}

const stack = (creature, count = 1) => ({ creature, count })

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const just = (chanceIn24) => () => chanceIn24 / 24 - 0.001
const exactly = (chanceIn24) => () => chanceIn24 / 24

const GOOD_LUCK = (name) => `Good luck shines on the ${name}.`

// Two points of Attack add 10% to a shot of 20, two points of Defense take 5% off it, then the
// shot is halved and rounded down.
const SHOT = (name) => `The ${name} does 10 damage.`
const SHOT_WITH_2_MORE_ATTACK = 'The Longbow does 11 damage.'
const SHOT_AT_2_MORE_DEFENSE = 'The Marksman does 9 damage.'

// Magic Arrow at no skill: 10, and 10 more for each point of Power.
const MAGIC_ARROW_OF_POWER_3 = 'The Magic Arrow does 40 damage.'

const COMPUTER_TURN_MS = 2000

// The player's town has its gate at (20, 2); blue's hero starts three tiles below it. A lone
// stack starts on row 6: the attacker's in column 1, the defender's in column 15.
const GATE = { x: 20, y: 2 }
const BLUES_STACK = { row: 6, column: 1 }

const aDefendingHero = ({ secondarySkills = [] } = {}) =>
  aHero()
    .withName('Lord Haart')
    .withPrimarySkills(NO_SKILLS)
    .withSecondarySkills(secondarySkills)
    .withSpellBook(true)
    .withSpells(['MAGIC_ARROW'])
    .withArmy([stack('LONGBOW')])
    .at(GATE.x, GATE.y)

const aDefenceScenario = ({ buildings, hero = null } = {}) =>
  aScenario()
    .withSize(30, 6)
    .withRockAround(2, 5)
    .withEntities(
      ...(hero ? [hero] : []),
      aTown()
        .withId('town-1')
        .withType(BULWARK)
        .named('Whitemoon')
        .ownedByPlayer()
        .withBuildings(buildings)
        .withGarrison(hero ? [] : [stack('LONGBOW')])
        .at(GATE.x, GATE.y),
      aHero()
        .withId('hero-2')
        .withName('Valeska')
        .ownedBy('blue')
        .withPrimarySkills(NO_SKILLS)
        .withArmy([stack('MARKSMAN')])
        .at(20, 5)
    )
    .withDefinitions(definitions)

async function defendAgainstBlue(scenario, { luckRandom = () => 0.99 } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: LOWEST_ROLLS, luckRandom, interactionModalTransitionMs: 0 }
  })
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

async function shootAtBlue(user) {
  await shootAt(user, BLUES_STACK.row, BLUES_STACK.column)
  await waitMs(1000)
}

describe('the luck of a town’s defenders', () => {
  test('given a town with a +2 luck building when the garrison’s stack shoots with the roll just under 2 in 24 then it strikes lucky', async () => {
    const { user } = await defendAgainstBlue(aDefenceScenario({ buildings: ['FOUNTAIN'] }), {
      luckRandom: just(2)
    })

    await shootAtBlue(user)

    expect(readCombatMessages()).toContain(GOOD_LUCK('Longbow'))
  })

  test('given a town with a +2 luck building when the garrison’s stack shoots with the roll at 2 in 24 then it does not strike lucky', async () => {
    const { user } = await defendAgainstBlue(aDefenceScenario({ buildings: ['FOUNTAIN'] }), {
      luckRandom: exactly(2)
    })

    await shootAtBlue(user)

    expect(readCombatMessages()).not.toContain(GOOD_LUCK('Longbow'))
  })

  test('the attacker’s stacks get no luck from the town’s building', async () => {
    await defendAgainstBlue(aDefenceScenario({ buildings: ['FOUNTAIN'] }), {
      luckRandom: LOWEST_ROLLS
    })

    expect(readCombatMessages()).not.toContain(GOOD_LUCK('Marksman'))
  })

  test('the defenders’ luck stays at +3 at most', async () => {
    const hero = aDefendingHero({ secondarySkills: [{ skill: 'LUCK', level: 'EXPERT' }] })
    const { user } = await defendAgainstBlue(aDefenceScenario({ buildings: ['FOUNTAIN'], hero }), {
      luckRandom: exactly(3)
    })

    await shootAtBlue(user)

    expect(readCombatMessages()).not.toContain(GOOD_LUCK('Longbow'))
  })
})

describe('the primary skills of a town’s defenders', () => {
  test('a hero defending a town with a +2 Attack building shoots with 2 more Attack', async () => {
    const scenario = aDefenceScenario({ buildings: ['BLOOD_STONE'], hero: aDefendingHero() })
    const { user } = await defendAgainstBlue(scenario)

    await shootAtBlue(user)

    expect(readCombatMessages()).toContain(SHOT_WITH_2_MORE_ATTACK)
  })

  test('a garrison without a hero in a town with a +2 Attack building shoots with 2 more Attack', async () => {
    const { user } = await defendAgainstBlue(aDefenceScenario({ buildings: ['BLOOD_STONE'] }))

    await shootAtBlue(user)

    expect(readCombatMessages()).toContain(SHOT_WITH_2_MORE_ATTACK)
  })

  test('a hero defending a town with a +2 Defense building is shot at with 2 more Defense', async () => {
    await defendAgainstBlue(aDefenceScenario({ buildings: ['GLYPHS'], hero: aDefendingHero() }))

    expect(readCombatMessages()).toContain(SHOT_AT_2_MORE_DEFENSE)
  })

  test('the attacker’s stacks get no Attack from the town’s building', async () => {
    const scenario = aDefenceScenario({ buildings: ['BLOOD_STONE'], hero: aDefendingHero() })

    await defendAgainstBlue(scenario)

    expect(readCombatMessages()).toContain(SHOT('Marksman'))
  })

  test('a hero defending a town with a +2 Power building casts Magic Arrow with 2 more Power', async () => {
    const scenario = aDefenceScenario({ buildings: ['STORMCLOUDS'], hero: aDefendingHero() })
    const { user } = await defendAgainstBlue(scenario)

    await castSpellAt(user, 'Magic Arrow', BLUES_STACK)

    expect(readCombatMessages().at(-1)).toMatch(MAGIC_ARROW_OF_POWER_3)
  })
})
