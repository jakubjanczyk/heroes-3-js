import { heroOwner } from '../state/queries.js'
import { addToArmy, affordableCount, recruitableCreaturesByTier } from './creature-recruitment.js'
import { ARMY_SLOT_COUNT } from './hero-army.js'
import { dwellingCreature, isFreeDwelling } from './map-dwellings.js'
import { heroById } from './state/hero-details.js'
import { resourcesOf } from './state/kingdoms.js'
import { dwellingAvailable } from './state/map-objects.js'
import { availableCreatures, builtIn, townGarrison, townOwner } from './state/towns.js'

const strengthOf = (monsters, creature) => monsters?.[creature]?.aiValue ?? 0

function spend(treasury, cost, count) {
  const left = { ...treasury }
  for (const [resourceType, amount] of Object.entries(cost)) {
    left[resourceType] = (left[resourceType] ?? 0) - amount * count
  }
  return left
}

function fillSlots(army) {
  return Array.from({ length: ARMY_SLOT_COUNT }, (_, index) => army?.[index] ?? null)
}

// The creatures a town's dwellings offer, strongest first, each as many as are available, its
// owner can pay for and fit in the garrison.
export function decideTownRecruits({ state, townId, buildings, monsters }) {
  const options = recruitableCreaturesByTier({ buildings, built: builtIn(state, townId), monsters })
    .flatMap((creatures, index) => creatures.map((creature) => ({ tier: index + 1, creature })))
    .sort(
      (first, second) =>
        strengthOf(monsters, second.creature) - strengthOf(monsters, first.creature)
    )

  const available = [...availableCreatures(state, townId)]
  let treasury = resourcesOf(state, townOwner(state, townId))
  let garrison = townGarrison(state, townId)
  const recruits = []
  for (const { tier, creature } of options) {
    const cost = monsters[creature].cost ?? {}
    const count = Math.min(available[tier - 1] ?? 0, affordableCount(treasury, cost))
    const recruited = count > 0 ? addToArmy(garrison, creature, count) : null
    if (recruited) {
      garrison = recruited
      available[tier - 1] -= count
      treasury = spend(treasury, cost, count)
      recruits.push({ tier, creature, count })
    }
  }
  return recruits
}

// The garrison's stacks the visiting hero takes, strongest first, each onto a stack of the same
// creature or an empty slot.
export function decideGarrisonTaken({ garrison, army, monsters }) {
  const stacks = fillSlots(garrison)
    .map((stack, slot) => stack && { ...stack, slot })
    .filter(Boolean)
    .sort(
      (first, second) =>
        strengthOf(monsters, second.creature) * second.count -
          strengthOf(monsters, first.creature) * first.count || first.slot - second.slot
    )

  let heroArmy = fillSlots(army)
  const moves = []
  for (const { creature, count, slot } of stacks) {
    const sameCreature = heroArmy.findIndex((stack) => stack?.creature === creature)
    const to = sameCreature >= 0 ? sameCreature : heroArmy.indexOf(null)
    if (to >= 0) {
      heroArmy = addToArmy(heroArmy, creature, count)
      moves.push({ from: { army: 'garrison', slot }, to: { army: 'hero', slot: to } })
    }
  }
  return moves
}

// How many of a dwelling's creatures the hero recruits: as many as are available and its owner can
// pay for, 0 without room for them.
export function dwellingRecruitCount({ state, dwellingId, heroId, definitions }) {
  const dwelling = state.dwellings[dwellingId]
  const creature = dwelling && dwellingCreature(dwelling.type, definitions)
  const hero = heroById(state, heroId)
  if (!creature || !hero) {
    return 0
  }

  const available = dwellingAvailable(state, dwellingId)
  const count = isFreeDwelling(dwelling.type, definitions)
    ? available
    : Math.min(
        available,
        affordableCount(resourcesOf(state, heroOwner(state, heroId)), creature.cost ?? {})
      )
  return count > 0 && addToArmy(hero.army, creature.creature, count) ? count : 0
}
