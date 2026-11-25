// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  playOnToNextRound,
  readBattleSpellPoints,
  readBattleStacks,
  reloadBattle,
  startBattle,
  winBattle
} from './battle.utils.js'
import {
  aCaster,
  aFight,
  aFightWithAHero,
  ENEMY_HEX,
  stack
} from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition, aHero } from './builders.js'
import {
  clickSpell,
  clickSpellBookControl,
  openSpellBookFromMap,
  readSpellBookMessage,
  readSpellBookSpells
} from './spell-book.utils.js'

const MAGIC_ARROW_COST = 5
const SPELLS = ['MAGIC_ARROW', 'HYPNOTIZE']

const aDamper = ({ damper = 2, health = 100, name = 'Damper' } = {}) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withHealth(health)
    .withMagicDamper(damper)
    .build()

const CREATURES = {
  DAMPER: aDamper(),
  STRONG_DAMPER: aDamper({ damper: 3, name: 'Strong Damper' }),
  FRAIL_DAMPER: aDamper({ health: 10, name: 'Frail Damper' }),
  WEAK_DAMPER: aDamper({ health: 10, name: 'Weak Damper' }),
  HEAVY_DAMPER: aDamper({ damper: 6, name: 'Heavy Damper' })
}

const aDampedCaster = ({ knowledge = 2, army } = {}) =>
  aCaster({ knowledge, spells: SPELLS, ...(army ? { army } : {}) })

const aDampedFight = ({ hero = aDampedCaster(), monster = 'DAMPER', count = 10 } = {}) =>
  aFight({ hero, monster, count, creatures: CREATURES })

const aFightAgainst = (army) =>
  aFightWithAHero({
    hero: aDampedCaster(),
    enemy: aHero().withId('hero-2').withName('Valeska').ownedBy('blue').withArmy(army),
    creatures: CREATURES
  })

const TOP_OF_TWO = { row: 3, column: 15 }

async function readMagicArrowInBattleBook(user) {
  await clickBattleButton(user, 'Cast spell')
  return magicArrowInBook()
}

const magicArrowInBook = () =>
  readSpellBookSpells().find((spell) => spell.startsWith('Magic Arrow'))

const costing = (cost) => `Magic Arrow 1st lev Spell Points: ${cost}`

describe('battle magic damper behavior', () => {
  test('given a battle against monsters with a magic damper of 2 then the spell book shows Magic Arrow costing 2 more', async () => {
    const { user } = await startBattle(aDampedFight())

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST + 2))
  })

  test('given a hero with 20 spell points against a magic damper of 2 when the player casts Magic Arrow then 13 spell points are left', async () => {
    const { user } = await startBattle(aDampedFight())
    await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)
    await playOnToNextRound(user)

    expect(await readBattleSpellPoints(user)).toBe('13')
  })

  test('given a hero with 10 spell points against a magic damper of 6 when the player clicks Magic Arrow then the book says it costs 11', async () => {
    const hero = aDampedCaster({ knowledge: 1 })
    const { user } = await startBattle(aDampedFight({ hero, monster: 'HEAVY_DAMPER' }))
    await clickBattleButton(user, 'Cast spell')

    await clickSpell(user, 'Magic Arrow')

    expect(readSpellBookMessage()).toEqual([
      '',
      "That spell costs 11 spell points.  Your hero only has 10 spell points, and therefore can't cast the spell."
    ])
  })

  test('given an army with magic dampers of 2 and 3 then Magic Arrow costs 3 more, not 5', async () => {
    const { user } = await startBattle(
      aFightAgainst([stack('DAMPER', 10), stack('STRONG_DAMPER', 10)])
    )

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST + 3))
  })

  test('given the stack with the magic damper was killed when the player opens the book next round then Magic Arrow still costs 2 more', async () => {
    const { user } = await startBattle(
      aFightAgainst([stack('FRAIL_DAMPER', 1), stack('PIKEMAN', 10)])
    )
    await castSpellAt(user, 'Magic Arrow', TOP_OF_TWO)
    const stacks = readBattleStacks()
    await playOnToNextRound(user)

    expect(stacks.map(({ stack: name }) => name)).not.toContain('Frail Damper 1')
    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST + 2))
  })

  test("given the magic damper is in the player's own army then Magic Arrow costs as usual", async () => {
    const hero = aDampedCaster({ army: [stack('DAMPER', 10)] })
    const { user } = await startBattle(aDampedFight({ hero, monster: 'PIKEMAN' }))

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST))
  })

  test('given the player hypnotized the stack with the magic damper then Magic Arrow still costs 2 more', async () => {
    const hero = aDampedCaster({ knowledge: 3 })
    const { user } = await startBattle(aDampedFight({ hero, monster: 'WEAK_DAMPER', count: 5 }))
    await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
    await playOnToNextRound(user)
    await playOnToNextRound(user)

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST + 2))
  })

  test('given the player cast Magic Arrow against a magic damper when the page reloads then 13 spell points are still left', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aDampedFight()
    const { user } = await startBattle(scenario, { eventLog })
    await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

    await reloadBattle(scenario, { eventLog })
    await playOnToNextRound(user)

    expect(await readBattleSpellPoints(user)).toBe('13')
  })

  test('given the battle against a magic damper is over when the player opens the spell book on the map then Magic Arrow costs as usual', async () => {
    const { user } = await startBattle(aDampedFight({ monster: 'WEAK_DAMPER', count: 1 }))
    await winBattle(user)

    await openSpellBookFromMap(user)
    await clickSpellBookControl(user, 'Combat spells')

    expect(magicArrowInBook()).toBe(costing(MAGIC_ARROW_COST))
  })
})
