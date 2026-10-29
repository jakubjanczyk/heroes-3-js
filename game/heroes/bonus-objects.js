import { selectedHeroIdOf, turnNumber, viewingPlayer } from '../state/queries.js'
import { calendarDateOfTurn } from './calendar.js'
import { PRIMARY_SKILLS } from './primary-skills.js'
import { describeSecondarySkill } from './secondary-skills.js'

const RIGHT_OF_ENTRANCE = Object.freeze([{ x: 1, y: 0 }])

// The tiles each object blocks besides its entrance; the rest of its picture can be walked on.
const FOOTPRINT_BY_TYPE = Object.freeze({
  FAERIE_RING: RIGHT_OF_ENTRANCE,
  SWAN_POND: RIGHT_OF_ENTRANCE,
  TEMPLE: RIGHT_OF_ENTRANCE,
  RALLY_FLAG: Object.freeze([{ x: -1, y: 0 }]),
  FOUNTAIN_OF_YOUTH: Object.freeze([
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 }
  ]),
  MARLETTO_TOWER: Object.freeze([{ x: -1, y: 0 }]),
  MERCENARY_CAMP: Object.freeze([
    { x: -1, y: 0 },
    { x: 1, y: 0 }
  ]),
  ARENA: Object.freeze([
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 }
  ]),
  LIBRARY_OF_ENLIGHTENMENT: Object.freeze([
    { x: -2, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: -1 }
  ]),
  SCHOOL_OF_WAR: Object.freeze([
    { x: -1, y: 0 },
    { x: -2, y: -1 },
    { x: -1, y: -1 },
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: -2 },
    { x: 0, y: -2 }
  ])
})

export function bonusObjectFootprint(type) {
  return FOOTPRINT_BY_TYPE[type] ?? []
}

export function bonusObjectDefinition(definitions, type) {
  return definitions?.bonusObjects?.[type] ?? {}
}

export function bonusObjectGives(definitions, type) {
  return bonusObjectDefinition(definitions, type).gives ?? {}
}

// A Tree of Knowledge's price in the words of its messages: '2000 gold', or null when free.
export function describePrice(definitions, cost = {}) {
  const [resourceType, amount] = Object.entries(cost)[0] ?? []
  if (!resourceType) {
    return null
  }

  const name = definitions?.resources?.[resourceType]?.name ?? resourceType
  return `${amount} ${name.toLowerCase()}`
}

// One of the object's prices, picked by their chances in percent with `roll` in [0, 1).
export function rollBonusObjectPrice(definitions, type, roll) {
  const { prices = [] } = bonusObjectDefinition(definitions, type)
  let threshold = 0
  for (const { chance, cost } of prices) {
    threshold += chance
    if (roll * 100 < threshold) {
      return cost
    }
  }

  return prices.at(-1)?.cost ?? {}
}

export function bonusObjectTaughtSkill(definitions, type) {
  return bonusObjectDefinition(definitions, type).teachesSkill ?? null
}

// One of the skills a Witch Hut may teach, drawn evenly with `roll` in [0, 1).
export function rollTaughtSkill(definitions, type, roll) {
  const { neverRolled = [] } = bonusObjectTaughtSkill(definitions, type) ?? {}
  const skills = Object.keys(definitions?.secondarySkills ?? {}).filter(
    (skill) => !neverRolled.includes(skill)
  )
  return skills[Math.floor(roll * skills.length)] ?? null
}

// The popup's line on what the object gives. An object that offers a choice has its own line,
// or none, as the Arena.
export function describeBonusObject(definitions, type, price = null) {
  const { description, choices, prices } = bonusObjectDefinition(definitions, type)
  if (prices) {
    const priceText = describePrice(definitions, price ?? {})
    return [priceText ? `+1 level for ${priceText}` : '+1 level']
  }
  if (description || choices) {
    return description ? [description] : []
  }
  return describeBonus(bonusObjectGives(definitions, type)).map(({ label }) => label)
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

export function meetsMinimumHeroLevel(definitions, type, { level, secondarySkills = [] }) {
  const { minimumHeroLevel } = bonusObjectDefinition(definitions, type)
  if (!minimumHeroLevel) {
    return true
  }

  const diplomacy = secondarySkills.find(({ skill }) => skill === 'DIPLOMACY')
  const needed = minimumHeroLevel.withDiplomacy?.[diplomacy?.level] ?? minimumHeroLevel.level
  return level >= needed
}

export function hasVisitedBonusObject(state, heroId, entityId) {
  return state.heroDetails[heroId]?.visitedBonusObjects.includes(entityId) ?? false
}

export function givesBonusUntilNextBattle(definitions, type) {
  return Boolean(bonusObjectDefinition(definitions, type).untilNextBattle)
}

// The morale and luck the object gives on the day of the week the hero enters it.
export function bonusUntilNextBattle(definitions, type, state) {
  const { day } = calendarDateOfTurn(turnNumber(state))
  const bonuses = bonusObjectDefinition(definitions, type).untilNextBattle ?? []
  const { morale = 0, luck = 0 } = bonuses.find(({ days }) => !days || days.includes(day)) ?? {}
  return { morale, luck }
}

// A hero can't take a bonus while one from an object of the same kind lasts.
export function hasBonusFromObjectType(state, heroId, type) {
  return (state.heroDetails[heroId]?.battleBonuses ?? []).some(
    ({ entityType }) => entityType === type
  )
}

function hasUsedBonusObject(state, heroId, entity) {
  return (
    hasVisitedBonusObject(state, heroId, entity.id) ||
    hasBonusFromObjectType(state, heroId, entity.type)
  )
}

// A Witch Hut's skill stays unknown until a hero of the player has been inside.
function witchHutSkillText(state, { skill, visitedBy }, definitions) {
  if (!skill || !visitedBy.includes(viewingPlayer(state))) {
    return null
  }
  return `(${describeSecondarySkill({ skill }, definitions).name})`
}

// Whether the player's selected hero has used the object, as the status bar and popup say it,
// or for a Witch Hut the skill it teaches.
export function bonusObjectVisitedText(state, entity, definitions) {
  if (entity?.kind !== 'BONUS_OBJECT') {
    return null
  }

  const witchHut = state.witchHuts?.[entity.id]
  if (witchHut) {
    return witchHutSkillText(state, witchHut, definitions)
  }

  const heroId = selectedHeroIdOf(state, viewingPlayer(state))
  if (!heroId) {
    return null
  }
  return hasUsedBonusObject(state, heroId, entity) ? '(Visited)' : '(Not visited)'
}
