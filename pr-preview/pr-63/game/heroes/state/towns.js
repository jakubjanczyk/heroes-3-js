import { isTown } from '../../domain/entity-queries.js'
import { DEFAULT_PLAYER } from '../../state/core-slices.js'
import { viewingPlayer } from '../../state/queries.js'
import { calendarDateOfTurn } from '../calendar.js'
import { weeklyGrowthByTier } from '../creature-recruitment.js'
import { startingBuildingsOf, townBuildingsCatalogue } from '../town-buildings.js'
import { dailyIncomeOfTown } from '../town-income.js'

function withoutTown(townIds, townId) {
  return townIds?.includes(townId) ? townIds.filter((id) => id !== townId) : townIds
}

function updateTown(towns, townId, update) {
  const town = towns.byId[townId]
  return town
    ? { ...towns, byId: { ...towns.byId, [townId]: { ...town, ...update(town) } } }
    : towns
}

function catalogueOf(town, definitions) {
  return townBuildingsCatalogue(definitions, town.type)
}

function weeklyGrowthOf(town, definitions) {
  return weeklyGrowthByTier({
    buildings: catalogueOf(town, definitions).buildings,
    built: new Set(town.built),
    monsters: definitions?.monsters
  })
}

// As in Heroes 3, every town's dwellings, neutral towns' too, add a week of creatures at the start
// of each week, on top of those left unbought.
function growCreatures(town, definitions) {
  const growth = weeklyGrowthOf(town, definitions)
  return { available: growth.map((amount, index) => (town.available[index] ?? 0) + amount) }
}

function captureTown(towns, { entityId, owner = DEFAULT_PLAYER }) {
  const town = towns.byId[entityId]
  if (!town || town.owner === owner) {
    return towns
  }

  const idsByOwner = Object.fromEntries(
    Object.entries(towns.idsByOwner).map(([player, townIds]) => [
      player,
      withoutTown(townIds, entityId)
    ])
  )

  return {
    byId: { ...towns.byId, [entityId]: { ...town, owner } },
    idsByOwner: { ...idsByOwner, [owner]: [...(idsByOwner[owner] ?? []), entityId] }
  }
}

// A dwelling just built has a week of its creature's own growth (no Citadel or Castle bonus until
// the next week); its upgrade keeps the creatures already there.
function stockNewDwelling(town, buildingId, definitions) {
  const building = catalogueOf(town, definitions).buildings[buildingId]
  const creature = definitions?.monsters?.[building?.creature]
  if (!creature || building.upgrades) {
    return town.available
  }

  const available = [...town.available]
  available[creature.tier - 1] = creature.growth
  return available
}

function buildBuilding(towns, { entityId, buildingId }, { definitions }) {
  return updateTown(towns, entityId, (town) => ({
    built: town.built.includes(buildingId) ? town.built : [...town.built, buildingId],
    builtToday: true,
    available: stockNewDwelling(town, buildingId, definitions)
  }))
}

function recruitCreatures(towns, { entityId, tier, count }) {
  return updateTown(towns, entityId, (town) => {
    const available = [...town.available]
    available[tier - 1] = Math.max(0, (available[tier - 1] ?? 0) - count)
    return { available }
  })
}

function endTurn(towns, { turnNumber }, { definitions }) {
  const isNewWeek = calendarDateOfTurn(turnNumber).day === 1
  const byId = Object.fromEntries(
    Object.entries(towns.byId).map(([townId, town]) => [
      townId,
      {
        ...town,
        builtToday: false,
        ...(isNewWeek ? growCreatures(town, definitions) : {})
      }
    ])
  )
  return { ...towns, byId }
}

function initialTown(town, definitions) {
  const initial = {
    type: town.type,
    owner: town.owner ?? null,
    built: startingBuildingsOf(town),
    builtToday: false,
    garrison: town.garrison ?? [],
    available: []
  }
  // The dwellings standing at the start of the game have a week of creatures.
  return { ...initial, ...growCreatures(initial, definitions) }
}

// A player's towns are in the order the town list shows them: the scenario's own first, then each
// captured town after the last.
export const townsSlice = {
  key: 'towns',
  initial: ({ scenario, definitions }) => {
    const towns = (scenario?.entities ?? []).filter(isTown)
    const idsByOwner = {}
    for (const town of towns.filter((town) => town.owner)) {
      idsByOwner[town.owner] = [...(idsByOwner[town.owner] ?? []), town.id]
    }

    return {
      byId: Object.fromEntries(towns.map((town) => [town.id, initialTown(town, definitions)])),
      idsByOwner
    }
  },
  on: {
    'fact.town.captured': captureTown,
    'fact.town.building.built': buildBuilding,
    'fact.town.creatures.recruited': recruitCreatures,
    'fact.town.garrison.changed': (towns, { entityId, garrison }) =>
      updateTown(towns, entityId, () => ({ garrison })),
    'fact.turn.ended': endTurn
  }
}

export function townOwner(state, townId) {
  return state.towns.byId[townId]?.owner ?? null
}

export function townIdsOf(state, player) {
  return state.towns.idsByOwner[player] ?? []
}

export function viewingPlayersTownIds(state) {
  return townIdsOf(state, viewingPlayer(state))
}

export function isViewingPlayersTown(state, townId) {
  return townOwner(state, townId) === viewingPlayer(state)
}

export function builtIn(state, townId) {
  return new Set(state.towns.byId[townId]?.built ?? [])
}

export function hasBuiltToday(state, townId) {
  return Boolean(state.towns.byId[townId]?.builtToday)
}

export function townGarrison(state, townId) {
  return state.towns.byId[townId]?.garrison ?? []
}

export function availableCreatures(state, townId) {
  return state.towns.byId[townId]?.available ?? []
}

export function dailyIncomeOf(townState, definitions) {
  return dailyIncomeOfTown({
    buildings: catalogueOf(townState, definitions).buildings,
    built: new Set(townState.built)
  })
}

export function townType(state, townId) {
  return state.towns.byId[townId]?.type ?? null
}
