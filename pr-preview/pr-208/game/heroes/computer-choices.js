import { getHeroPrimarySkills } from './primary-skills.js'

const FIGHTING_SKILLS = Object.freeze(['attack', 'defense'])

// Computer heroes don't cast spells, so of a choice of rewards only Attack or Defense is worth
// taking: the lower of the two, Attack on a tie. The choice's id, or null when none is worth it.
export function computerChoiceAt({ hero, choices, definitions }) {
  const skills = Object.fromEntries(
    getHeroPrimarySkills({ entity: hero, definitions }).map(({ key, value }) => [key, value])
  )
  const options = choices.flatMap((gains, index) =>
    gains
      .filter((gain) => gain.type === 'primarySkills')
      .flatMap((gain) => FIGHTING_SKILLS.filter((key) => gain.primarySkills[key]))
      .map((key) => ({ index, value: skills[key] }))
  )
  const [lowest] = options.sort((a, b) => a.value - b.value || a.index - b.index)
  return lowest ? String(lowest.index) : null
}

// Of a level-up's skill offers, the one worth most to a computer hero, the first on a tie.
export function computerSkillOffer(skillOffers, definitions) {
  const worthOf = ({ skill }) => definitions?.secondarySkills?.[skill]?.worth ?? 0
  return skillOffers.reduce(
    (best, offer) => (worthOf(offer) > worthOf(best) ? offer : best),
    skillOffers[0]
  )
}
