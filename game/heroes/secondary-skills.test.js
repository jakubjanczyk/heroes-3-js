import { describe, expect, test } from 'vitest'

import { offerSecondarySkills } from './secondary-skills.js'

const basic = (skill) => ({ skill, level: 'BASIC' })
const advanced = (skill) => ({ skill, level: 'ADVANCED' })
const expert = (skill) => ({ skill, level: 'EXPERT' })

const always = (roll) => () => roll

const EIGHT_SKILLS = [
  'LEADERSHIP',
  'ARCHERY',
  'LOGISTICS',
  'SCOUTING',
  'DIPLOMACY',
  'NAVIGATION',
  'WISDOM',
  'ESTATES'
]

describe('offerSecondarySkills', () => {
  test.each([
    { roll: 0, skill: 'PATHFINDING' },
    { roll: 0.24, skill: 'PATHFINDING' },
    { roll: 0.25, skill: 'ARCHERY' },
    { roll: 0.99, skill: 'ARCHERY' }
  ])('given weights of 1 and 3 when the roll is $roll then the new skill is $skill', ({
    roll,
    skill
  }) => {
    const offers = offerSecondarySkills({
      secondarySkills: [expert('LEADERSHIP')],
      weights: { PATHFINDING: 1, ARCHERY: 3 },
      random: always(roll)
    })

    expect(offers[0]).toEqual(basic(skill))
  })

  test('given the hero has a skill when a new skill is offered then it is neither that skill nor one weighted 0', () => {
    const offers = offerSecondarySkills({
      secondarySkills: [expert('PATHFINDING')],
      weights: { PATHFINDING: 5, NECROMANCY: 0, ARCHERY: 1, LOGISTICS: 1 },
      random: always(0)
    })

    expect(offers).toEqual([basic('ARCHERY'), basic('LOGISTICS')])
  })

  test.each([
    { roll: 0, upgrade: advanced('ARCHERY') },
    { roll: 0.5, upgrade: expert('LOGISTICS') }
  ])('given a hero with Expert, Basic and Advanced skills when the roll is $roll then the upgrade is $upgrade.skill', ({
    roll,
    upgrade
  }) => {
    const offers = offerSecondarySkills({
      secondarySkills: [expert('LEADERSHIP'), basic('ARCHERY'), advanced('LOGISTICS')],
      weights: { PATHFINDING: 1 },
      random: always(roll)
    })

    expect(offers).toEqual([upgrade, basic('PATHFINDING')])
  })

  test('given a hero with 8 skills then the two offers are two different upgrades', () => {
    const offers = offerSecondarySkills({
      secondarySkills: EIGHT_SKILLS.map(basic),
      weights: { PATHFINDING: 1 },
      random: always(0)
    })

    expect(offers).toEqual([advanced('LEADERSHIP'), advanced('ARCHERY')])
  })

  test('given a hero with no skill to upgrade then the two offers are two different new skills', () => {
    const offers = offerSecondarySkills({
      secondarySkills: [expert('LEADERSHIP')],
      weights: { PATHFINDING: 1, ARCHERY: 1 },
      random: always(0)
    })

    expect(offers).toEqual([basic('PATHFINDING'), basic('ARCHERY')])
  })
})
