import { heroTile, selectedHeroIdOf, viewingPlayer } from '../state/queries.js'
import { getHeroPrimarySkills } from './primary-skills.js'
import { spellSkillLevel } from './spell-book.js'
import { heroById } from './state/hero-details.js'

export function visionsOf(hero, spell) {
  if (!spell?.visions) {
    return null
  }
  const rangePerPower = spell.visions.rangePerPower[spellSkillLevel(hero, spell)]
  const kept = hero.visions?.rangePerPower ?? 0
  return { rangePerPower: Math.max(rangePerPower, kept), minimumRange: spell.visions.minimumRange }
}

const powerOf = (hero, definitions) =>
  getHeroPrimarySkills({ entity: hero, definitions }).find(({ key }) => key === 'power').value

// The range is measured from where the selected hero stands now, with their Power now.
export function seesExactCount(state, entity, definitions) {
  if (entity?.kind !== 'MONSTER') {
    return false
  }
  const heroId = selectedHeroIdOf(state, viewingPlayer(state))
  const hero = heroId && heroById(state, heroId)
  if (!hero?.visions) {
    return false
  }
  const { rangePerPower, minimumRange } = hero.visions
  const range = Math.max(rangePerPower * powerOf(hero, definitions), minimumRange)
  const from = heroTile(state, heroId)
  return Math.hypot(entity.tile.x - from.x, entity.tile.y - from.y) < range
}
