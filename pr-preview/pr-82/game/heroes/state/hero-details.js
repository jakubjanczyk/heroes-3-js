import { isHero } from '../../domain/entity-queries.js'
import { updateHero } from '../../state/core-slices.js'
import { levelForExperience } from '../hero-experience.js'
import { learnSecondarySkill, startingSecondarySkills } from '../secondary-skills.js'

const DEFAULT_HERO_NAME = 'Hero'

function detailsOf(hero, definitions) {
  const name = hero.name ?? definitions?.hero?.name ?? DEFAULT_HERO_NAME
  return {
    name,
    heroClass: hero.heroClass ?? definitions?.hero?.heroClass ?? null,
    primarySkills: hero.primarySkills ?? null,
    secondarySkills: startingSecondarySkills(
      { name, secondarySkills: hero.secondarySkills },
      definitions
    ),
    army: hero.army ?? [],
    experience: hero.experience ?? 0,
    level: levelForExperience(hero.experience ?? 0),
    levelUpSkills: [],
    pendingLevelUp: null,
    bonusPrimarySkills: {},
    visitedBonusObjects: []
  }
}

function addSkills(skills, added) {
  return Object.fromEntries(
    [...new Set([...Object.keys(skills), ...Object.keys(added)])].map((key) => [
      key,
      (skills[key] ?? 0) + (added[key] ?? 0)
    ])
  )
}

export const heroDetailsSlice = {
  key: 'heroDetails',
  initial: ({ scenario, definitions }) =>
    Object.fromEntries(
      (scenario?.entities ?? [])
        .filter(isHero)
        .map((hero) => [hero.id, detailsOf(hero, definitions)])
    ),
  on: {
    'fact.hero.experience.gained': updateHero((hero, { amount }) => ({
      experience: hero.experience + amount
    })),
    'fact.hero.leveledUp': updateHero((hero, { level, primarySkill, skillOffers = [] }) => ({
      level,
      levelUpSkills: [...hero.levelUpSkills, primarySkill],
      pendingLevelUp: skillOffers.length > 0 ? { level, primarySkill, skillOffers } : null
    })),
    'fact.hero.secondarySkill.learned': updateHero((hero, { skill, level }) => ({
      secondarySkills: learnSecondarySkill(hero.secondarySkills, { skill, level }),
      pendingLevelUp: null
    })),
    'fact.hero.bonusObject.visited': updateHero((hero, { entityId, primarySkills = {} }) => ({
      bonusPrimarySkills: addSkills(hero.bonusPrimarySkills, primarySkills),
      visitedBonusObjects: [...hero.visitedBonusObjects, entityId]
    })),
    'fact.hero.army.changed': updateHero((_hero, { army }) => ({ army })),
    'fact.hero.hired': (heroes, { heroId, name, heroClass, army }, { definitions }) => ({
      ...heroes,
      [heroId]: detailsOf({ name, heroClass, army }, definitions)
    })
  }
}

export function heroById(state, heroId) {
  const details = state.heroDetails[heroId]
  return details ? { id: heroId, ...state.heroes[heroId], ...details } : null
}
