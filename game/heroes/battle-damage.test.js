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
