// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog } from './app.utils.js'
import {
  castSpellAt,
  clickBattleButton,
  pickSpell,
  playOnToNextRound,
  readBattleSpellPoints,
  readBattleStacks,
  reloadBattle,
  startBattle,
  winBattle
} from './battle.utils.js'
import { aCaster, aFight, ENEMY_HEX, stack } from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition } from './builders.js'
import {
  clickSpellBookControl,
  openSpellBookFromMap,
  readSpellBookSpells
} from './spell-book.utils.js'

const MAGIC_ARROW_COST = 5
const SPELLS = ['MAGIC_ARROW', 'HYPNOTIZE', 'ARMAGEDDON']

const aCreature = ({ name, health = 100, channeler, damper }) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withHealth(health)
    .withMagicChanneler(channeler)
    .withMagicDamper(damper)
    .build()

const CREATURES = {
  CHANNELER: aCreature({ name: 'Channeler', channeler: 2 }),
  STRONG_CHANNELER: aCreature({ name: 'Strong Channeler', channeler: 3 }),
  HEAVY_CHANNELER: aCreature({ name: 'Heavy Channeler', channeler: 6 }),
  FRAIL_CHANNELER: aCreature({ name: 'Frail Channeler', health: 10, channeler: 2 }),
  WEAK_CHANNELER: aCreature({ name: 'Weak Channeler', health: 10, channeler: 2 }),
  DAMPER: aCreature({ name: 'Damper', damper: 2 }),
  TOUGH: aCreature({ name: 'Tough' })
}

const aChannelingCaster = ({ knowledge = 2, army = [stack('CHANNELER', 10)] } = {}) =>
  aCaster({ knowledge, spells: SPELLS, army })

const aChannelingFight = ({ hero = aChannelingCaster(), monster = 'PIKEMAN', count = 10 } = {}) =>
  aFight({ hero, monster, count, creatures: CREATURES })

async function readMagicArrowInBattleBook(user) {
  await clickBattleButton(user, 'Cast spell')
  return magicArrowInBook()
}

const magicArrowInBook = () =>
  readSpellBookSpells().find((spell) => spell.startsWith('Magic Arrow'))

const costing = (cost) => `Magic Arrow 1st lev Spell Points: ${cost}`

describe('battle magic channeler behavior', () => {
  test("given a magic channeler of 2 in the hero's army then the spell book shows Magic Arrow costing 2 less", async () => {
    const { user } = await startBattle(aChannelingFight())

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST - 2))
  })

  test('given a hero with 20 spell points and a magic channeler of 2 when the player casts Magic Arrow then 17 spell points are left', async () => {
    const { user } = await startBattle(aChannelingFight())
    await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)
    await playOnToNextRound(user)

    expect(await readBattleSpellPoints(user)).toBe('17')
  })

  test('given a magic channeler of 6 then Magic Arrow costs 0, not less', async () => {
    const hero = aChannelingCaster({ army: [stack('HEAVY_CHANNELER', 10)] })
    const { user } = await startBattle(aChannelingFight({ hero }))

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(0))
  })

  test('given magic channelers of 2 and 3 in the army then Magic Arrow costs 3 less, not 5', async () => {
    const hero = aChannelingCaster({
      army: [stack('CHANNELER', 10), stack('STRONG_CHANNELER', 10)]
    })
    const { user } = await startBattle(aChannelingFight({ hero }))

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST - 3))
  })

  test("given the hero's stack with the magic channeler was killed when the player opens the book next round then Magic Arrow still costs 2 less", async () => {
    const hero = aChannelingCaster({
      knowledge: 5,
      army: [stack('FRAIL_CHANNELER', 1), stack('SWORDSMAN', 50)]
    })
    const { user } = await startBattle(aChannelingFight({ hero, monster: 'TOUGH' }))
    await pickSpell(user, 'Armageddon')
    const stacks = readBattleStacks()
    await playOnToNextRound(user)

    expect(stacks.map(({ stack: name }) => name)).not.toContain('Frail Channeler 1')
    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST - 2))
  })

  test("given the magic channeler is in the enemy's army then Magic Arrow costs as usual", async () => {
    const hero = aChannelingCaster({ army: [stack('SWORDSMAN', 10)] })
    const { user } = await startBattle(aChannelingFight({ hero, monster: 'CHANNELER' }))

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST))
  })

  test("given a magic channeler of 2 in the hero's army and a magic damper of 2 in the enemy's then Magic Arrow costs as usual", async () => {
    const { user } = await startBattle(aChannelingFight({ monster: 'DAMPER' }))

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST))
  })

  test("given the player hypnotized the enemy's stack with the magic channeler then Magic Arrow still costs as usual", async () => {
    const hero = aChannelingCaster({ knowledge: 3, army: [stack('SWORDSMAN', 10)] })
    const { user } = await startBattle(
      aChannelingFight({ hero, monster: 'WEAK_CHANNELER', count: 5 })
    )
    await castSpellAt(user, 'Hypnotize', ENEMY_HEX)
    await playOnToNextRound(user)
    await playOnToNextRound(user)

    expect(await readMagicArrowInBattleBook(user)).toBe(costing(MAGIC_ARROW_COST))
  })

  test('given the player cast Magic Arrow with a magic channeler when the page reloads then 17 spell points are still left', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aChannelingFight()
    const { user } = await startBattle(scenario, { eventLog })
    await castSpellAt(user, 'Magic Arrow', ENEMY_HEX)

    await reloadBattle(scenario, { eventLog })
    await playOnToNextRound(user)

    expect(await readBattleSpellPoints(user)).toBe('17')
  })

  test('given the battle with a magic channeler is over when the player opens the spell book on the map then Magic Arrow costs as usual', async () => {
    const { user } = await startBattle(aChannelingFight({ monster: 'WEAK_CHANNELER', count: 1 }))
    await winBattle(user)

    await openSpellBookFromMap(user)
    await clickSpellBookControl(user, 'Combat spells')

    expect(magicArrowInBook()).toBe(costing(MAGIC_ARROW_COST))
  })
})
