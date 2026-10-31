import { describe, expect, test } from 'vitest'

import { rollMageGuildSpells } from './mage-guild.js'

const spell = (level, castleChance) => ({ level, mageGuildChances: { CASTLE: castleChance } })

const rollsOf = (...rolls) => {
  let next = 0
  return () => rolls[next++]
}

describe('rollMageGuildSpells', () => {
  // Weights 10, 30 and 60 make 100: a roll under 0.1 picks the first, under 0.4 the second.
  test.each([
    { roll: 0, first: 'BLESS' },
    { roll: 0.09, first: 'BLESS' },
    { roll: 0.1, first: 'CURE' },
    { roll: 0.39, first: 'CURE' },
    { roll: 0.4, first: 'DISPEL' },
    { roll: 0.99, first: 'DISPEL' }
  ])('with weights 10, 30 and 60, a first roll of $roll picks $first', ({ roll, first }) => {
    const spells = { BLESS: spell(1, 10), CURE: spell(1, 30), DISPEL: spell(1, 60) }

    const rolled = rollMageGuildSpells({
      spells,
      townType: 'CASTLE',
      level: 1,
      random: rollsOf(roll, 0, 0)
    })

    expect(rolled[0]).toBe(first)
  })

  test('draws the next place among the spells not picked yet', () => {
    // Cure picked first leaves Bless (10) and Dispel (60): a roll of 0.2 is 14 of 70, Dispel.
    const spells = { BLESS: spell(1, 10), CURE: spell(1, 30), DISPEL: spell(1, 60) }

    const rolled = rollMageGuildSpells({
      spells,
      townType: 'CASTLE',
      level: 1,
      random: rollsOf(0.2, 0.2, 0)
    })

    expect(rolled).toEqual(['CURE', 'DISPEL', 'BLESS'])
  })

  test('leaves the places empty once no spell of the level is left', () => {
    const spells = { BLIND: spell(2, 50), ICE_BOLT: spell(2, 50), BLESS: spell(1, 10) }

    const rolled = rollMageGuildSpells({ spells, townType: 'CASTLE', level: 2, random: () => 0 })

    expect(rolled).toEqual(['BLIND', 'ICE_BOLT'])
  })
})
