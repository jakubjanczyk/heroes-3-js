import { describe, expect, test } from 'vitest'

import { getDamageRange, rollDamage, strikeSequence } from './battle-damage.js'

const aStack = (overrides = {}) => ({
  id: 'stack',
  count: 1,
  attack: 0,
  defense: 0,
  damage: { min: 10, max: 10 },
  health: 10,
  topHealth: 10,
  retaliationsLeft: 1,
  strikes: 1,
  ...overrides
})

const LOWEST_ROLLS = () => 0

describe('battle damage', () => {
  test.each([
    { attack: 60, expected: 40 },
    { attack: 80, expected: 40 }
  ])('attack bonus stops at +300% (attack $attack against 0 defense)', ({ attack, expected }) => {
    const damage = rollDamage({
      attacker: aStack({ attack }),
      defender: aStack(),
      random: LOWEST_ROLLS
    })

    expect(damage).toBe(expected)
  })

  // 10 damage, +300% for 60 Attack against 0 Defense and +100% for luck.
  test('a lucky strike adds +100% on top of the attack bonus and outside its cap', () => {
    const damage = rollDamage({
      attacker: aStack({ attack: 60 }),
      defender: aStack(),
      random: LOWEST_ROLLS,
      lucky: true
    })

    expect(damage).toBe(50)
  })

  test.each([
    { defense: 28, expected: 30 },
    { defense: 40, expected: 30 }
  ])('defense reduction stops at -70% (defense $defense against 0 attack)', ({
    defense,
    expected
  }) => {
    const damage = rollDamage({
      attacker: aStack({ damage: { min: 100, max: 100 } }),
      defender: aStack({ defense }),
      random: LOWEST_ROLLS
    })

    expect(damage).toBe(expected)
  })

  test.each([
    { name: 'rounded down', damage: 3, defense: 4, expected: 2 },
    { name: 'at least 1', damage: 1, defense: 28, expected: 1 }
  ])('damage is $name', ({ damage, defense, expected }) => {
    // 3 x 0.9 = 2.7; 1 x 0.3 = 0.3.
    const dealt = rollDamage({
      attacker: aStack({ damage: { min: damage, max: damage } }),
      defender: aStack({ defense }),
      random: LOWEST_ROLLS
    })

    expect(dealt).toBe(expected)
  })

  test.each([
    { name: 'rounded down', damage: 3, expected: 1 },
    { name: 'at least 1', damage: 1, expected: 1 }
  ])('halved damage is $name', ({ damage, expected }) => {
    const dealt = rollDamage({
      attacker: aStack({ damage: { min: damage, max: damage } }),
      defender: aStack(),
      random: LOWEST_ROLLS,
      halved: true
    })

    expect(dealt).toBe(expected)
  })

  // Halved after the attack bonus, not before: 21 x 0.5 = 10.5, where 10 x 0.5 x 1.05 = 5.25.
  test('the halving applies to the damage after attack and defense', () => {
    const dealt = rollDamage({
      attacker: aStack({ count: 10, attack: 1, damage: { min: 2, max: 2 } }),
      defender: aStack(),
      random: LOWEST_ROLLS,
      halved: true
    })

    expect(dealt).toBe(10)
  })

  // The attack kills one of the 5 defenders; the 4 left strike back for 40.
  test.each([
    { name: 'a shooter strikes back at half damage', meleePenalty: true, expected: 20 },
    {
      name: 'a shooter with no melee penalty strikes back at full damage',
      meleePenalty: false,
      expected: 40
    }
  ])('$name', ({ meleePenalty, expected }) => {
    const strikes = strikeSequence({
      attacker: aStack({ id: 'attacker' }),
      defender: aStack({ id: 'defender', count: 5, meleePenalty }),
      random: LOWEST_ROLLS
    })

    expect(strikes[1]).toEqual({ attackerId: 'defender', defenderId: 'attacker', damage: expected })
  })

  test('the damage range for the status bar applies the same modifiers', () => {
    // 5 creatures deal 5-15, -10% for 4 more defense than attack: 4.5-13.5, rounded down.
    const range = getDamageRange({
      attacker: aStack({ count: 5, damage: { min: 1, max: 3 } }),
      defender: aStack({ defense: 4 })
    })

    expect(range).toEqual({ min: 4, max: 13 })
  })

  test('given the attack kills the defender then it does not strike back', () => {
    const strikes = strikeSequence({
      attacker: aStack({ id: 'attacker', damage: { min: 50, max: 50 } }),
      defender: aStack({ id: 'defender', count: 2 }),
      random: LOWEST_ROLLS
    })

    expect(strikes).toEqual([{ attackerId: 'attacker', defenderId: 'defender', damage: 50 }])
  })
})
