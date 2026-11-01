// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { readHeroListSpellPoints } from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, waitMs } from './app.utils.js'
import {
  clickBattleButton,
  clickBattleHex,
  closeBattleResults,
  getBattleButton,
  readActiveStack,
  readBattleEffects,
  readBattleResultsSide,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  startBattle,
  waitForBattleResults
} from './battle.utils.js'
import { aHero, aMonster, aScenario, aSpellDefinition } from './builders.js'
import { clickSpell, readSpellBookSpellPoints } from './spell-book.utils.js'

const HERO = 'Lord Haart'

const spellDefinitions = {
  MAGIC_ARROW: aSpellDefinition()
    .withName('Magic Arrow')
    .withSchools(['AIR', 'EARTH', 'FIRE', 'WATER'])
    .withCosts([5, 4, 4, 4])
    .withDamage({ base: [10, 10, 20, 30], perPower: 10 })
    .describedAs('Causes a bolt of magical energy to strike the selected unit.')
    .build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  spells: spellDefinitions
}

const stack = (creature, count) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// Knowledge 1, so 10 spell points. The 10 Swordsmen (speed 5) act before the Pikemen (speed 4).
const aCaster = ({ secondarySkills = [] } = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills({ power: 2, knowledge: 1 })
    .withSecondarySkills(secondarySkills)
    .withSpellBook(true)
    .withSpells(['MAGIC_ARROW'])
    .withArmy([stack('SWORDSMAN', 10)])

const aFight = ({ hero = aCaster(), pikemen = 10 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(hero, aMonster().withType('PIKEMAN').withCount(pikemen).withStacks(1).at(1, 0))
    .withDefinitions(gameDefinitions)

const SWORDSMEN_HEX = { row: 6, column: 1 }
const PIKEMEN_HEX = { row: 6, column: 15 }

async function pickSpell(user, name) {
  await clickBattleButton(user, 'Cast spell')
  await clickSpell(user, name)
  await waitMs()
}

async function castSpellAt(user, name, { row, column }) {
  await pickSpell(user, name)
  await clickBattleHex(user, row, column)
}

// The book is shut for the rest of the round the hero cast in.
async function playOnToNextRound(user) {
  await clickBattleButton(user, 'Defend')
  await waitMs(1000)
}

async function readBattleSpellPoints(user) {
  await clickBattleButton(user, 'Cast spell')
  return readSpellBookSpellPoints()
}

describe('battle spells behavior', () => {
  // Damage = the base for the school's skill level + 10 × Power 2; a Pikeman has 10 health.
  test.each([
    { level: 'no skill', secondarySkills: [], left: 'Pikemen 7' },
    {
      level: 'Basic',
      secondarySkills: [{ skill: 'FIRE_MAGIC', level: 'BASIC' }],
      left: 'Pikemen 7'
    },
    {
      level: 'Advanced',
      secondarySkills: [{ skill: 'WATER_MAGIC', level: 'ADVANCED' }],
      left: 'Pikemen 6'
    },
    {
      level: 'Expert',
      secondarySkills: [{ skill: 'EARTH_MAGIC', level: 'EXPERT' }],
      left: 'Pikemen 5'
    }
  ])('given a hero with Power 2 and $level in the spell school when the hero casts Magic Arrow on 10 Pikemen then $left are left', async ({
    secondarySkills,
    left
  }) => {
    const { user } = await startBattle(aFight({ hero: aCaster({ secondarySkills }) }))

    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    expect(readBattleStacks()).toContainEqual(stackAt(left, PIKEMEN_HEX.row, PIKEMEN_HEX.column))
  })

  test('given a hero with 10 spell points when the hero casts Magic Arrow then 5 are left', async () => {
    const { user } = await startBattle(aFight())

    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)
    await playOnToNextRound(user)

    expect(await readBattleSpellPoints(user)).toBe('5')
  })

  test('given the hero casts Magic Arrow then the combat log names the spell, its target and the damage', async () => {
    const { user } = await startBattle(aFight())

    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    expect(readCombatMessages().slice(-2)).toEqual([
      "Lord Haart casts 'Magic Arrow' on the Pikemen.",
      'The Magic Arrow does 30 damage. 3 Pikemen perish.'
    ])
  })

  test('given the hero casts Magic Arrow then a flash of the spell shows over the Pikemen', async () => {
    const { user } = await startBattle(aFight())

    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    expect(readBattleEffects()).toEqual([
      { effect: 'Magic Arrow', row: PIKEMEN_HEX.row, column: PIKEMEN_HEX.column }
    ])
  })

  test('given the hero casts Magic Arrow then the same stack is still to act', async () => {
    const { user } = await startBattle(aFight())

    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    expect(readActiveStack()).toEqual(
      stackAt('Swordsmen 10', SWORDSMEN_HEX.row, SWORDSMEN_HEX.column)
    )
  })

  test("given Magic Arrow is picked when the player clicks the hero's own stack then nothing is cast", async () => {
    const { user } = await startBattle(aFight())

    await castSpellAt(user, 'Magic Arrow', SWORDSMEN_HEX)

    expect([readBattleStacks(), await readBattleSpellPoints(user)]).toEqual([
      [
        stackAt('Swordsmen 10', SWORDSMEN_HEX.row, SWORDSMEN_HEX.column),
        stackAt('Pikemen 10', PIKEMEN_HEX.row, PIKEMEN_HEX.column)
      ],
      '10'
    ])
  })

  test('given Magic Arrow is picked when the player clicks an empty hex then the spell is cancelled and the stack stays', async () => {
    const { user } = await startBattle(aFight())

    await castSpellAt(user, 'Magic Arrow', { row: 6, column: 3 })

    expect(readActiveStack()).toEqual(
      stackAt('Swordsmen 10', SWORDSMEN_HEX.row, SWORDSMEN_HEX.column)
    )
  })

  test('given the player cancelled the spell when they click an empty hex then the stack walks there', async () => {
    const { user } = await startBattle(aFight())
    await castSpellAt(user, 'Magic Arrow', { row: 6, column: 3 })

    await clickBattleHex(user, 6, 3)
    await waitMs(1000)

    expect(readBattleStacks()).toContainEqual(stackAt('Swordsmen 10', 6, 3))
  })

  test('given Magic Arrow kills the last enemy stack then the hero wins the battle', async () => {
    const { user } = await startBattle(aFight({ pikemen: 2 }))

    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)
    await waitForBattleResults()

    expect(readBattleResultsSide('Attacker')).toEqual([HERO, 'Victorious'])
  })

  test('given the hero cast Magic Arrow when the page reloads then the Pikemen keep their losses', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aFight()
    const { user } = await startBattle(scenario, { eventLog })
    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    await reloadBattle(scenario, { eventLog })

    expect(readBattleStacks()).toContainEqual(
      stackAt('Pikemen 7', PIKEMEN_HEX.row, PIKEMEN_HEX.column)
    )
  })

  test('given the hero cast Magic Arrow when the page reloads then the spell points stay spent', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aFight()
    const { user } = await startBattle(scenario, { eventLog })
    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    const reloaded = await reloadBattle(scenario, { eventLog })
    await playOnToNextRound(reloaded.user)

    expect(await readBattleSpellPoints(reloaded.user)).toBe('5')
  })

  test('given the hero won the battle with Magic Arrow then the spell points stay spent on the map', async () => {
    const { user } = await startBattle(aFight({ pikemen: 2 }))
    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)
    await waitForBattleResults()

    await closeBattleResults(user)
    await waitMs()

    expect(readHeroListSpellPoints()).toEqual({ value: '5', max: '10' })
  })
  test('given the hero cast Magic Arrow this round then Cast spell is disabled', async () => {
    const { user } = await startBattle(aFight())

    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    expect(getBattleButton('Cast spell').disabled).toBe(true)
  })

  test("given the hero cast on one stack's turn when the hero's next stack acts in the same round then Cast spell is disabled", async () => {
    // The Griffins (speed 6) act first, then the Swordsmen (speed 5), then the Pikemen.
    const hero = aCaster().withArmy([stack('GRIFFIN', 2), stack('SWORDSMAN', 10)])
    const { user } = await startBattle(aFight({ hero }))
    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    await clickBattleButton(user, 'Defend')

    expect([readActiveStack().stack, getBattleButton('Cast spell').disabled]).toEqual([
      'Swordsmen 10',
      true
    ])
  })

  test('given the hero cast Magic Arrow last round when the next round starts then Cast spell is enabled again', async () => {
    const { user } = await startBattle(aFight())
    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    await playOnToNextRound(user)

    expect([readActiveStack().stack, getBattleButton('Cast spell').disabled]).toEqual([
      'Swordsmen 10',
      false
    ])
  })

  test('given the hero cast Magic Arrow this round when the page reloads then Cast spell is disabled', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aFight()
    const { user } = await startBattle(scenario, { eventLog })
    await castSpellAt(user, 'Magic Arrow', PIKEMEN_HEX)

    await reloadBattle(scenario, { eventLog })

    expect(getBattleButton('Cast spell').disabled).toBe(true)
  })
})
