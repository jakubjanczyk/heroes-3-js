import { describe, expect, test } from 'vitest'

import { slotForReturningHero } from './tavern.js'

const offered = (role) => ({ name: role, role })

describe('slotForReturningHero', () => {
  test('takes the slot of a retreated hero before a surrendered one', () => {
    expect(slotForReturningHero([offered('surrendered'), offered('retreated')], 0)).toBe(1)
  })

  test('treats a hero offered before heroes had roles as offered at the week start', () => {
    expect(slotForReturningHero([{ name: 'Orrin' }, offered('replacement')], 0)).toBe(1)
  })

  test.each([
    [0, 0],
    [0.49, 0],
    [0.5, 1],
    [0.99, 1]
  ])('between two heroes worth the same, a roll of %s takes slot %s', (roll, slot) => {
    expect(slotForReturningHero([offered('weekStart'), offered('weekStart')], roll)).toBe(slot)
  })
})
