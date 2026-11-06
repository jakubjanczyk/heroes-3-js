import { heroIdAt, heroMovementPoints, heroTile } from '../state/queries.js'
import { spellSkillLevel } from './spell-book.js'

export const TOO_TIRED_TEXT =
  'Your hero is too tired to cast this spell today.  Try again tomorrow.'
export const NEAREST_TOWN_OCCUPIED_TEXT = 'Nearest town occupied.  Spell Failed!'
export const NO_AVAILABLE_TOWN_TEXT = 'No available town.  Spell Failed!'
// Our own wording: no source shows the game's window for picking the town.
export const TOWN_PORTAL_PROMPT = 'Select the town to teleport to.'

export const DIMENSION_DOOR_FAILED_TEXT = 'Dimension Door failed!'

export const notSkilledEnoughText = (heroName) =>
  `${heroName} is not skilled enough to cast this spell again today.`

export function canCastOnMap(spell) {
  return Boolean(spell?.townPortal || spell?.dimensionDoor)
}

export const aimsAtTile = (spell) => Boolean(spell?.dimensionDoor)

function townPortalAt(hero, spell) {
  const level = spellSkillLevel(hero, spell)
  return {
    choosesTown: spell.townPortal.choosesTown[level],
    movementPoints: spell.townPortal.movementPoints[level]
  }
}

const squaredDistance = (from, to) => (from.x - to.x) ** 2 + (from.y - to.y) ** 2

function nearestTown(towns, tile) {
  return towns.reduce(
    (nearest, town) =>
      !nearest || squaredDistance(town.tile, tile) < squaredDistance(nearest.tile, tile)
        ? town
        : nearest,
    null
  )
}

const hasNoHeroIn = (state) => (town) => !heroIdAt(state, town.tile)

// `towns` are the caster's player's, each with its id and entrance tile. The outcome is a failure
// message, the towns to choose from, or the town the hero goes to.
export function decideTownPortal({ state, hero, spell, towns }) {
  const { choosesTown, movementPoints } = townPortalAt(hero, spell)
  if ((heroMovementPoints(state, hero.id)?.value ?? 0) < movementPoints) {
    return { failure: TOO_TIRED_TEXT }
  }

  if (choosesTown) {
    const choices = towns.filter(hasNoHeroIn(state))
    return choices.length > 0 ? { choices } : { failure: NO_AVAILABLE_TOWN_TEXT }
  }

  const destination = nearestTown(towns, heroTile(state, hero.id))
  if (!destination) {
    return { failure: NO_AVAILABLE_TOWN_TEXT }
  }
  return hasNoHeroIn(state)(destination)
    ? { destination, movementPoints }
    : { failure: NEAREST_TOWN_OCCUPIED_TEXT }
}

// The town the player picked in the window, if it can still be gone to.
export function decideTownPortalTo({ state, hero, spell, towns, townId }) {
  const outcome = decideTownPortal({ state, hero, spell, towns })
  const destination = outcome.choices?.find((town) => town.id === townId)
  return destination
    ? { destination, movementPoints: townPortalAt(hero, spell).movementPoints }
    : { failure: outcome.failure }
}

function dimensionDoorAt(hero, spell) {
  const level = spellSkillLevel(hero, spell)
  return {
    castsPerDay: spell.dimensionDoor.castsPerDay[level],
    movementPoints: spell.dimensionDoor.movementPoints[level],
    range: spell.dimensionDoor.range
  }
}

// Whether the hero can start aiming: a failure message, or nothing.
export function decideDimensionDoor({ state, hero, spell, spellId }) {
  if ((heroMovementPoints(state, hero.id)?.value ?? 0) <= 0) {
    return { failure: TOO_TIRED_TEXT }
  }
  const castsToday = hero.adventureCastsToday?.[spellId] ?? 0
  if (castsToday >= dimensionDoorAt(hero, spell).castsPerDay) {
    return { failure: notSkilledEnoughText(hero.name) }
  }
  return {}
}

const isInRange = (from, to, range) =>
  Math.abs(to.x - from.x) <= range.x && Math.abs(to.y - from.y) <= range.y

// What a Dimension Door aimed at `tile` does: nothing (the tile can't be picked), fails on water,
// or lands there. `isTaken(tile)` says whether a hero or an object stands on or blocks it.
export function dimensionDoorTargetAt({ state, hero, spell, map, isTaken, tile }) {
  const { range, movementPoints } = dimensionDoorAt(hero, spell)
  if (!map.inBounds(tile) || !isInRange(heroTile(state, hero.id), tile, range) || isTaken(tile)) {
    return null
  }
  if (map.getTerrainType(tile)?.isWater) {
    return { failure: DIMENSION_DOOR_FAILED_TEXT, movementPoints }
  }
  return map.isPassable(tile) ? { destination: tile, movementPoints } : null
}
