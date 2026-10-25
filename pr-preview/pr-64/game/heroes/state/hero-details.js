import { isHero } from '../../domain/entity-queries.js'
import { updateHero } from '../../state/core-slices.js'

const DEFAULT_HERO_NAME = 'Hero'

function detailsOf(hero, definitions) {
  return {
    name: hero.name ?? definitions?.hero?.name ?? DEFAULT_HERO_NAME,
    heroClass: hero.heroClass ?? definitions?.hero?.heroClass ?? null,
    primarySkills: hero.primarySkills ?? null,
    army: hero.army ?? [],
    experience: hero.experience ?? 0,
    levelUpSkills: []
  }
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
    'fact.hero.leveledUp': updateHero((hero, { primarySkill }) => ({
      levelUpSkills: [...hero.levelUpSkills, primarySkill]
    })),
    'fact.hero.army.changed': updateHero((_hero, { army }) => ({ army }))
  }
}

export function heroById(state, heroId) {
  const details = state.heroDetails[heroId]
  return details ? { id: heroId, ...state.heroes[heroId], ...details } : null
}
