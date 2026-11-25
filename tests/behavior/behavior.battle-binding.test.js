// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  castSpellAt,
  clickBattleHex,
  isBattleHexReachable,
  moveActiveStackTo,
  playOnToNextRound,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  startBattle
} from './battle.utils.js'
import {
  aCaster,
  aFight,
  aFightWithAHero,
  ENEMY_HEX,
  OWN_HEX,
  PIKEMEN_CLOSE_BY,
  stack
} from './battle-lasting-spells.fixtures.js'
import { aCreatureDefinition, aHero } from './builders.js'

const aBinder = ({ name = 'Binder', speed = 20, health = 100, defense = 5 } = {}) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withSpeed(speed)
    .withHealth(health)
    .withDefense(defense)
    .withBinds(true)
    .build()

const CREATURES = {
  BINDER: aBinder(),
  SLOW_BINDER: aBinder({ name: 'Slow Binder', speed: 4 }),
  FRAIL_BINDER: aBinder({ name: 'Frail Binder', speed: 19, health: 25, defense: 50 }),
  WEAK_BINDER: aBinder({ name: 'Weak Binder', health: 10 }),
  SITTER: aCreatureDefinition().withName('Sitter').withNamePlural('Sitters').withSpeed(1).build(),
  GOLEM: aCreatureDefinition()
    .withName('Golem')
    .withNamePlural('Golems')
    .withSpeed(5)
    .withHealth(35)
    .withSpellLevelImmunity(5)
    .build()
}

const SPELLS = ['DISPEL', 'TELEPORT', 'CURE', 'ANTI_MAGIC', 'MAGIC_ARROW', 'HYPNOTIZE']

const aBindingCaster = ({ army, power, knowledge } = {}) =>
  aCaster({
    spells: SPELLS,
    ...(army ? { army } : {}),
    ...(power ? { power } : {}),
    ...(knowledge ? { knowledge } : {})
  })

const aBindingFight = ({ hero = aBindingCaster(), monster = 'BINDER', count = 5, stacks } = {}) =>
  aFight({ hero, monster, count, creatures: CREATURES, ...(stacks ? { stacks } : {}) })

const aFightAgainst = (army, hero = aBindingCaster()) =>
  aFightWithAHero({
    hero,
    enemy: aHero().withId('hero-2').withName('Valeska').ownedBy('blue').withArmy(army),
    creatures: CREATURES
  })

const BINDING_SWORDSMEN = 'Roots and vines bind the Swordsmen to the ground!'
const BINDING_PIKEMEN = 'Roots and vines bind the Pikemen to the ground!'

const FAR_HEX = { row: 2, column: 8 }
const AWAY_FROM_THE_START = { row: 6, column: 5 }
const BINDER_NEXT_TO_THE_PIKEMEN = { row: 6, column: 14 }
const BINDER_AWAY_FROM_THE_PIKEMEN = { row: 6, column: 3 }
const TOP_OF_TWO = { row: 3, column: 15 }

const stackNamed = (name) => readBattleStacks().find(({ stack }) => stack.startsWith(`${name} `))

const canWalkAwayFromTheStart = () =>
  isBattleHexReachable(AWAY_FROM_THE_START.row, AWAY_FROM_THE_START.column)

async function startBoundSwordsmen(scenario = aBindingFight(), options = {}) {
  const app = await startBattle(scenario, options)
  await waitMs(1000)
  return app
}

async function bindThePikemen(user) {
  await attackBattleHexFrom(user, ENEMY_HEX.row, ENEMY_HEX.column, 'left')
  await waitMs(1000)
}

describe('battle binding behavior', () => {
  test("given the player's Binders attack the Pikemen then the combat log says roots and vines bind them to the ground", async () => {
    const hero = aBindingCaster({ army: [stack('BINDER', 5)] })
    const { user } = await startBattle(aBindingFight({ hero, monster: 'PIKEMAN', count: 50 }))

    await bindThePikemen(user)

    expect(readCombatMessages()).toContain(BINDING_PIKEMEN)
  })

  test('given the Swordsmen were bound when their turn comes then no hex is shaded for them to move to and clicking a free hex leaves them where they are', async () => {
    const { user } = await startBoundSwordsmen()
    const reachable = canWalkAwayFromTheStart()

    await moveActiveStackTo(user, AWAY_FROM_THE_START.row, AWAY_FROM_THE_START.column)

    expect(reachable).toBe(false)
    expect(stackNamed('Swordsmen')).toEqual({ stack: 'Swordsmen 10', ...OWN_HEX })
  })

  test('given the Swordsmen attack the Binders and are struck back then the combat log says roots and vines bind the Swordsmen to the ground', async () => {
    const { user } = await startBattle(aBindingFight({ monster: 'SLOW_BINDER' }))
    await moveActiveStackTo(user, 6, 5)
    await waitMs(1000)

    await attackBattleHexFrom(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

    expect(readCombatMessages()).toContain(BINDING_SWORDSMEN)
  })

  test('given the bound Swordsmen have the Binders next to them then they can still attack them', async () => {
    const { user } = await startBoundSwordsmen(aBindingFight({ monster: 'WEAK_BINDER', count: 20 }))
    const binders = stackNamed('Weak Binders')

    await clickBattleHex(user, binders.row, binders.column)
    await waitMs(1000)

    expect(readCombatMessages()).toContain('The Swordsmen do 81 damage. 8 Weak Binders perish.')
  })

  test("given the Binders' hit kills the whole stack then the log has no binding line", async () => {
    const hero = aBindingCaster({ army: [stack('BINDER', 20)] })
    const { user } = await startBattle(
      aBindingFight({ hero, monster: 'PIKEMAN', count: 2, stacks: 2 })
    )

    await attackBattleHexFrom(user, TOP_OF_TWO.row, TOP_OF_TWO.column, 'left')
    await waitMs(1000)

    expect(readCombatMessages()).not.toContain(BINDING_PIKEMEN)
  })

  test('given the Swordsmen were bound then their turn still comes before slower stacks', async () => {
    await startBoundSwordsmen(aFightAgainst([stack('BINDER', 5), stack('SITTER', 1)]))

    expect(stackNamed('Sitter')).toEqual({ stack: 'Sitter 1', row: 9, column: 15 })
  })

  test('given the binding Binders walk away then the Pikemen they bound can move again', async () => {
    const hero = aBindingCaster({ army: [stack('BINDER', 5)] })
    const { user } = await startBattle(aBindingFight({ hero, monster: 'PIKEMAN', count: 50 }))
    await bindThePikemen(user)

    await moveActiveStackTo(
      user,
      BINDER_AWAY_FROM_THE_PIKEMEN.row,
      BINDER_AWAY_FROM_THE_PIKEMEN.column
    )
    await waitMs(1000)

    expect(stackNamed('Pikemen')).toEqual({ stack: 'Pikemen 49', row: 6, column: 11 })
  })

  test('given the binding Binders are killed then the Swordsmen can move again', async () => {
    const { user } = await startBoundSwordsmen(
      aFightAgainst([stack('FRAIL_BINDER', 1), stack('SITTER', 1)])
    )

    await castSpellAt(user, 'Magic Arrow', stackNamed('Frail Binder'))
    await waitMs()

    expect(canWalkAwayFromTheStart()).toBe(true)
  })

  test('given the binding Binders moved away and came back next to the Swordsmen without hitting them then the Swordsmen can still move', async () => {
    const hero = aBindingCaster({ power: 5, knowledge: 3 })
    const { user } = await startBoundSwordsmen(
      aFightAgainst([stack('FRAIL_BINDER', 1), stack('SITTER', 1)], hero)
    )
    const binders = stackNamed('Frail Binder')
    await castSpellAt(user, 'Hypnotize', binders)
    await playOnToNextRound(user)
    await moveActiveStackTo(user, FAR_HEX.row, FAR_HEX.column)
    await playOnToNextRound(user)

    await moveActiveStackTo(user, binders.row, binders.column)

    expect(canWalkAwayFromTheStart()).toBe(true)
  })

  test('given the Swordsmen are bound by two stacks of Binders when one of them is killed then they still cannot move', async () => {
    const { user } = await startBoundSwordsmen(
      aFightAgainst([stack('BINDER', 5), stack('FRAIL_BINDER', 1)])
    )
    const frail = stackNamed('Frail Binder')

    await castSpellAt(user, 'Magic Arrow', frail)
    await waitMs()

    expect(stackNamed('Frail Binder')).toBeUndefined()
    expect(canWalkAwayFromTheStart()).toBe(false)
  })

  test('given the hero casts Dispel on the bound Swordsmen then they can move', async () => {
    const { user } = await startBoundSwordsmen()

    await castSpellAt(user, 'Dispel', OWN_HEX)
    await waitMs()

    expect(canWalkAwayFromTheStart()).toBe(true)
  })

  test('given the hero casts Teleport on the bound Swordsmen then they stand on the new hex and can move from there', async () => {
    const { user } = await startBoundSwordsmen()

    await castSpellAt(user, 'Teleport', OWN_HEX)
    await clickBattleHex(user, FAR_HEX.row, FAR_HEX.column)
    await waitMs()

    expect(stackNamed('Swordsmen')).toEqual({ stack: 'Swordsmen 10', ...FAR_HEX })
    expect(isBattleHexReachable(FAR_HEX.row, FAR_HEX.column + 2)).toBe(true)
  })

  test('given the hero casts Cure on the bound Swordsmen then they still cannot move', async () => {
    const { user } = await startBoundSwordsmen()

    await castSpellAt(user, 'Cure', OWN_HEX)
    await waitMs()

    expect(canWalkAwayFromTheStart()).toBe(false)
  })

  test('given the hero casts Anti-Magic on the bound Swordsmen then they can move', async () => {
    const { user } = await startBoundSwordsmen()

    await castSpellAt(user, 'Anti-Magic', OWN_HEX)
    await waitMs()

    expect(canWalkAwayFromTheStart()).toBe(true)
  })

  test('given Anti-Magic is on the Swordsmen when the Binders strike them back then they are bound', async () => {
    const { user } = await startBattle(aBindingFight({ monster: 'SLOW_BINDER' }))
    await castSpellAt(user, 'Anti-Magic', OWN_HEX)
    await moveActiveStackTo(user, 6, 5)
    await waitMs(1000)

    await attackBattleHexFrom(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')

    expect(readCombatMessages()).toContain(BINDING_SWORDSMEN)
  })

  test('given a stack immune to all spells when the Binders hit it then it cannot move', async () => {
    const hero = aBindingCaster({ army: [stack('GOLEM', 10)] })
    await startBoundSwordsmen(aBindingFight({ hero }))

    expect(canWalkAwayFromTheStart()).toBe(false)
  })

  test('given the Swordsmen were bound when the page reloads then they still cannot move', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aBindingFight()
    await startBoundSwordsmen(scenario, { eventLog })

    await reloadBattle(scenario, { eventLog })

    expect(canWalkAwayFromTheStart()).toBe(false)
  })

  test('given the computer Pikemen were bound with the Binders next to them then they attack the Binders where they stand', async () => {
    const hero = aBindingCaster({ army: [stack('WEAK_BINDER', 20)] })
    const { user } = await startBattle(aBindingFight({ hero, monster: 'PIKEMAN', count: 50 }))

    await bindThePikemen(user)

    expect(stackNamed('Pikemen')).toEqual({ stack: 'Pikemen 47', ...ENEMY_HEX })
    expect(stackNamed('Weak Binders')).toEqual({
      stack: 'Weak Binders 12',
      ...BINDER_NEXT_TO_THE_PIKEMEN
    })
  })
})
