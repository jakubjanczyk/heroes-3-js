import { getHeroPrimarySkills } from './primary-skills.js'
import { secondarySkillLevel } from './secondary-skills.js'

const SPELL_POINTS_PER_KNOWLEDGE = 10
const INTELLIGENCE_BONUS_PERCENT = Object.freeze({ BASIC: 25, ADVANCED: 50, EXPERT: 100 })
const SPELL_POINTS_BACK_A_DAY = 1
// In place of the 1 a day, not on top of it.
const MYSTICISM_SPELL_POINTS_BACK_A_DAY = Object.freeze({ BASIC: 2, ADVANCED: 3, EXPERT: 4 })

export function maxSpellPoints({ entity, definitions }) {
  const knowledge = getHeroPrimarySkills({ entity, definitions }).find(
    ({ key }) => key === 'knowledge'
  ).value
  const bonusPercent = INTELLIGENCE_BONUS_PERCENT[secondarySkillLevel(entity, 'INTELLIGENCE')] ?? 0
  return Math.floor((knowledge * SPELL_POINTS_PER_KNOWLEDGE * (100 + bonusPercent)) / 100)
}

export function getHeroSpellPoints({ entity, definitions }) {
  const max = maxSpellPoints({ entity, definitions })
  return { value: entity?.spellPoints ?? max, max }
}

// A hero over the maximum keeps what they have and gets nothing back.
export function spellPointsOnNewDay({ entity, definitions, isInTownWithMageGuild }) {
  const { value, max } = getHeroSpellPoints({ entity, definitions })
  if (value >= max) {
    return value
  }
  if (isInTownWithMageGuild) {
    return max
  }

  const back =
    MYSTICISM_SPELL_POINTS_BACK_A_DAY[secondarySkillLevel(entity, 'MYSTICISM')] ??
    SPELL_POINTS_BACK_A_DAY
  return Math.min(max, value + back)
}

export function describeSpellPoints({ name, value, max }) {
  return {
    title: 'Spell Points',
    description: `${name} currently has ${value} spell points out of a maximum of ${max}.  The maximum number of spell points is 10 times your Knowledge.  It is occasionally possible to have more than your maximum spell points from special events or locations.`
  }
}
