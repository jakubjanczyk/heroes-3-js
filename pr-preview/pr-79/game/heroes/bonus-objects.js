import { selectedHeroIdOf, viewingPlayer } from '../state/queries.js'
import { PRIMARY_SKILLS } from './primary-skills.js'

// The tiles each object blocks besides its entrance; the rest of its picture can be walked on.
const FOOTPRINT_BY_TYPE = Object.freeze({
  MARLETTO_TOWER: Object.freeze([{ x: -1, y: 0 }]),
  MERCENARY_CAMP: Object.freeze([
    { x: -1, y: 0 },
    { x: 1, y: 0 }
  ])
})

export function bonusObjectFootprint(type) {
  return FOOTPRINT_BY_TYPE[type] ?? []
}

export function bonusObjectGives(definitions, type) {
  return definitions?.bonusObjects?.[type]?.gives ?? {}
}

// What an object gives, as the player reads it: ['+1 Attack'] or ['+1000 Experience'].
export function describeBonus({ experience, primarySkills = {} }) {
  const skills = PRIMARY_SKILLS.filter(({ key }) => primarySkills[key]).map(({ key, name }) => ({
    key,
    amount: primarySkills[key],
    label: `+${primarySkills[key]} ${name}`
  }))
  return experience
    ? [{ key: 'experience', amount: experience, label: `+${experience} Experience` }, ...skills]
    : skills
}

export function hasVisitedBonusObject(state, heroId, entityId) {
  return state.heroDetails[heroId]?.visitedBonusObjects.includes(entityId) ?? false
}

// Whether the player's selected hero has used the object, as the status bar and popup say it.
export function bonusObjectVisitedText(state, entity) {
  if (entity?.kind !== 'BONUS_OBJECT') {
    return null
  }

  const heroId = selectedHeroIdOf(state, viewingPlayer(state))
  if (!heroId) {
    return null
  }
  return hasVisitedBonusObject(state, heroId, entity.id) ? '(Visited)' : '(Not visited)'
}
