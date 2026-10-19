import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import { levelForExperience, rollPrimarySkill } from './hero-experience.js'

const heroClasses = JSON.parse(
  readFileSync(join(import.meta.dirname, '../data/hero-classes.json'), 'utf8')
)

describe('levelForExperience', () => {
  test.each([
    { experience: 0, level: 1 },
    { experience: 999, level: 1 },
    { experience: 1000, level: 2 },
    { experience: 2000, level: 3 },
    { experience: 3200, level: 4 },
    { experience: 4600, level: 5 },
    { experience: 6200, level: 6 },
    { experience: 8000, level: 7 },
    { experience: 10000, level: 8 },
    { experience: 12200, level: 9 },
    { experience: 14700, level: 10 },
    { experience: 17500, level: 11 },
    { experience: 20600, level: 12 },
    { experience: 24319, level: 12 },
    // From here on each level needs 20% more experience than the step before it, rounded down.
    { experience: 24320, level: 13 },
    { experience: 28784, level: 14 },
    { experience: 34140, level: 15 },
    { experience: 40567, level: 16 }
  ])('$experience experience is level $level', ({ experience, level }) => {
    expect(levelForExperience(experience)).toBe(level)
  })
})

describe('rollPrimarySkill for a Knight', () => {
  test.each([
    { level: 2, roll: 0, skill: 'attack' },
    { level: 2, roll: 0.3499, skill: 'attack' },
    { level: 2, roll: 0.35, skill: 'defense' },
    { level: 2, roll: 0.7999, skill: 'defense' },
    { level: 2, roll: 0.8, skill: 'power' },
    { level: 2, roll: 0.8999, skill: 'power' },
    { level: 2, roll: 0.9, skill: 'knowledge' },
    { level: 9, roll: 0.9999, skill: 'knowledge' },
    { level: 9, roll: 0.35, skill: 'defense' },
    { level: 10, roll: 0.2999, skill: 'attack' },
    { level: 10, roll: 0.3, skill: 'defense' },
    { level: 10, roll: 0.5999, skill: 'defense' },
    { level: 10, roll: 0.6, skill: 'power' },
    { level: 10, roll: 0.7999, skill: 'power' },
    { level: 10, roll: 0.8, skill: 'knowledge' },
    { level: 20, roll: 0.9999, skill: 'knowledge' }
  ])('reaching level $level with a roll of $roll gives $skill', ({ level, roll, skill }) => {
    expect(rollPrimarySkill({ heroClass: heroClasses.KNIGHT, level, roll })).toBe(skill)
  })
})
