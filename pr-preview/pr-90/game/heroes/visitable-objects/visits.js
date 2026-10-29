import { heroOwner, selectedHeroIdOf, viewingPlayer } from '../../state/queries.js'
import { MAX_SECONDARY_SKILLS } from '../secondary-skills.js'
import { heroById } from '../state/hero-details.js'
import { resourcesOf } from '../state/kingdoms.js'
import { hasBeenInside, visitableValues, wasVisitedThisWeek } from '../state/map-objects.js'
import { canAfford } from '../treasury.js'
import {
  describePrice,
  fillText,
  fillValues,
  isVisitableObject,
  rollMissingValues,
  visitableDefinition
} from './definitions.js'
import { describeRewards, gainsOf } from './rewards.js'

function hasLastingBonusFrom(state, heroId, entityType) {
  const hero = state.heroDetails[heroId]
  return (
    (hero?.battleBonuses ?? []).some((bonus) => bonus.entityType === entityType) ||
    hero?.weekBonus?.entityType === entityType
  )
}

// Whether the hero may not take the object's rewards again yet.
const VISIT_LIMITS = Object.freeze({
  always: () => false,
  oncePerHero: ({ state, heroId, entity }) =>
    state.heroDetails[heroId]?.visitedBonusObjects.includes(entity.id) ?? false,
  // A hero can't take a bonus while one from an object of the same kind lasts.
  whileBonusLasts: ({ state, heroId, entity }) => hasLastingBonusFrom(state, heroId, entity.type),
  oncePerWeek: ({ state, entity }) => wasVisitedThisWeek(state, entity.id)
})

export const VISIT_LIMIT_NAMES = Object.freeze(Object.keys(VISIT_LIMITS))

const LIMITS_OF_EACH_HERO = Object.freeze(['oncePerHero', 'whileBonusLasts'])

function hasUsed(definition, context) {
  return (VISIT_LIMITS[definition.visits] ?? VISIT_LIMITS.always)(context)
}

function diplomacyLevel(hero) {
  return hero.secondarySkills.find(({ skill }) => skill === 'DIPLOMACY')?.level
}

const REQUIREMENTS = Object.freeze({
  minimumHeroLevel: ({ level, withDiplomacy = {} }, { hero }) =>
    hero.level >= (withDiplomacy[diplomacyLevel(hero)] ?? level),
  lacksSecondarySkill: ({ skill }, { hero }) =>
    !hero.secondarySkills.some((known) => known.skill === skill),
  hasRoomForSecondarySkill: (_requirement, { hero }) =>
    hero.secondarySkills.length < MAX_SECONDARY_SKILLS
})

export const REQUIREMENT_TYPE_NAMES = Object.freeze(Object.keys(REQUIREMENTS))

function unmetRequirement(definition, context) {
  return (definition.requires ?? [])
    .map((requirement) => fillValues(requirement, context.values))
    .find((requirement) => !REQUIREMENTS[requirement.type]?.(requirement, context))
}

function costOf(definition, values) {
  return fillValues(definition.cost, values) ?? {}
}

const hasCost = (cost) => Object.keys(cost).length > 0

function canPay({ state, heroId }, cost) {
  return canAfford(resourcesOf(state, heroOwner(state, heroId)), cost)
}

function contextOf({ state, definitions, entity, heroId, random }) {
  const hero = heroById(state, heroId)
  if (!hero) {
    return null
  }
  const values = visitableValues(state, entity.id)
  return { state, definitions, entity, heroId, hero, values, random }
}

function everyVisitGains(definition, context) {
  return gainsOf(
    (definition.rewards ?? []).filter((reward) => reward.everyVisit),
    context
  )
}

function refusal(messageKey, gains = []) {
  return { outcome: 'refused', messageKey, gains, cost: {} }
}

// The values rolled for the week on its first visit that gives the object's rewards.
function withWeekValues(context) {
  const rolledValues = rollMissingValues({ ...context, per: 'week' })
  return { ...context, values: { ...context.values, ...rolledValues }, rolledValues }
}

function decide(definition, visitContext) {
  if (hasUsed(definition, visitContext)) {
    return refusal('visited', everyVisitGains(definition, visitContext))
  }
  const unmet = unmetRequirement(definition, visitContext)
  if (unmet) {
    return refusal(unmet.message)
  }
  const cost = costOf(definition, visitContext.values)
  if (hasCost(cost) && !canPay(visitContext, cost)) {
    return refusal('tooPoor')
  }

  const context = withWeekValues(visitContext)
  const offer = { cost, rolledValues: context.rolledValues }
  if (definition.choices) {
    const choices = definition.choices.map((rewards) => gainsOf(rewards, context))
    return { ...offer, outcome: 'choice', messageKey: 'offer', choices, gains: [] }
  }
  const gains = gainsOf(definition.rewards, context)
  if (definition.asksFirst && hasCost(cost)) {
    return { ...offer, outcome: 'question', messageKey: 'offer', gains }
  }
  return { ...offer, outcome: 'given', messageKey: 'gives', gains }
}

// A message can have its own wording when one of the gains is given, as 'gives.upgradeCreatures'.
function messageKeyFor(definition, messageKey, gains) {
  const specific = gains
    .map((gain) => `${messageKey}.${gain.type}`)
    .find((key) => definition.messages?.[key])
  return specific ?? messageKey
}

// What the hero's visit does: `refused` with only a message (and any rewards given on every
// visit), a `choice` of rewards or a yes/no `question` for the player, or the rewards `given`.
export function resolveVisit({ state, definitions, entity, heroId, random }) {
  const context = contextOf({ state, definitions, entity, heroId, random })
  if (!context) {
    return null
  }

  const definition = visitableDefinition(definitions, entity)
  const decision = decide(definition, context)
  const values = { ...context.values, ...decision.rolledValues }
  const key = messageKeyFor(definition, decision.messageKey, decision.gains)
  return {
    rolledValues: {},
    ...decision,
    message: fillText(definition.messages?.[key], definition, values, definitions),
    visits: definition.visits
  }
}

// The rewards for the choice the player picked, or for saying yes; null when the hero can't
// take them any more.
export function resolveAcceptedOffer({ state, definitions, entity, heroId, choice, random }) {
  const context = contextOf({ state, definitions, entity, heroId, random })
  const definition = visitableDefinition(definitions, entity)
  if (!context || hasUsed(definition, context)) {
    return null
  }
  const cost = costOf(definition, context.values)
  const rewards = choice === null ? definition.rewards : definition.choices?.[Number(choice)]
  if (!rewards || !canPay(context, cost)) {
    return null
  }
  return { cost, gains: gainsOf(rewards, context), visits: definition.visits }
}

// The popup's lines on what the object gives: its own description, or each reward's with its
// price ('+1 level for 2000 gold'). An object that offers a choice has its own line, or none.
export function describeVisitableObject(definitions, entity, values = {}) {
  const definition = visitableDefinition(definitions, entity)
  if (definition.description || definition.choices) {
    return definition.description ? [definition.description] : []
  }

  const lines = describeRewards(definition.rewards)
  const priceText = describePrice(definitions, costOf(definition, values))
  if (!priceText || lines.length === 0) {
    return lines
  }
  return [...lines.slice(0, -1), `${lines.at(-1)} for ${priceText}`]
}

function statusTextOf(state, entity, definition, definitions) {
  if (!hasBeenInside(state, entity.id, viewingPlayer(state))) {
    return null
  }
  return fillText(definition.statusText, definition, visitableValues(state, entity.id), definitions)
}

// What the status bar and popup add to the object's name: whether the player's selected hero
// has used it, or the object's own text once a hero of the player has been inside.
export function visitedText(state, entity, definitions) {
  if (!isVisitableObject(entity)) {
    return null
  }

  const definition = visitableDefinition(definitions, entity)
  if (definition.statusText) {
    return statusTextOf(state, entity, definition, definitions)
  }
  const heroId = selectedHeroIdOf(state, viewingPlayer(state))
  if (!heroId || !LIMITS_OF_EACH_HERO.includes(definition.visits)) {
    return null
  }
  return hasUsed(definition, { state, heroId, entity }) ? '(Visited)' : '(Not visited)'
}
