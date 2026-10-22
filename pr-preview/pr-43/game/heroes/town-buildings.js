import { townBehavior } from './entity-behaviors/town.js'
import { dailyIncomeOfTown } from './town-income.js'
import { canAfford, isShortOf } from './treasury.js'

// Every town starts with its Village Hall, as in Heroes 3.
const STARTING_BUILDINGS = ['VILLAGE_HALL']
// Every faction has the same halls and forts.
const HALL_CHAIN = ['VILLAGE_HALL', 'TOWN_HALL', 'CITY_HALL', 'CAPITOL']
const FORT_CHAIN = ['FORT', 'CITADEL', 'CASTLE']

export const BUILDING_STATUS = Object.freeze({
  BUILT: 'built',
  BUILDABLE: 'buildable',
  MISSING_REQUIREMENTS: 'missingRequirements',
  BUILT_TODAY: 'builtToday',
  NEEDS_WATER: 'needsWater',
  ONE_PER_PLAYER: 'onePerPlayer',
  NOT_ENOUGH_RESOURCES: 'notEnoughResources'
})

// What a town type can build: the buildings every town has (buildings.json) with the town type's
// own (its `buildings` in towns.json, which may also change a shared one), and the Hall's layout:
// rows of chains, each chain the buildings one slot shows in turn (Fort, Citadel, Castle).
export function townBuildingsCatalogue(definitions, townType) {
  const townDefinition = definitions?.towns?.[townType] ?? {}
  return {
    buildings: { ...definitions?.buildings, ...townDefinition.buildings },
    hall: townDefinition.hall ?? []
  }
}

// The buildings standing in each town, and the towns that have built today: one building a day.
export function createTownBuildings() {
  let builtByTownId = new Map()
  let townIdsBuiltToday = new Set()

  return {
    onWorldReady(towns) {
      builtByTownId = new Map(
        towns.map((town) => [town.id, new Set([...STARTING_BUILDINGS, ...(town.buildings ?? [])])])
      )
      townIdsBuiltToday = new Set()
    },
    onBuildingBuilt(townId, buildingId) {
      builtByTownId.get(townId)?.add(buildingId)
      townIdsBuiltToday.add(townId)
    },
    onTurnEnded() {
      townIdsBuiltToday = new Set()
    },
    builtIn(townId) {
      return builtByTownId.get(townId) ?? new Set()
    },
    hasBuiltToday(townId) {
      return townIdsBuiltToday.has(townId)
    }
  }
}

const NEIGHBOUR_OFFSETS = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ x: dx, y: dy })))

// Heroes 3 lets a town build a Shipyard only by the water; here any water tile touching the town.
export function isTownNextToWater(town, map) {
  const townTiles = [{ x: 0, y: 0 }, ...townBehavior.footprintOffsets].map((offset) => ({
    x: town.tile.x + offset.x,
    y: town.tile.y + offset.y
  }))

  return townTiles.some((tile) =>
    NEIGHBOUR_OFFSETS.some(
      (offset) =>
        map?.getTerrainType({ x: tile.x + offset.x, y: tile.y + offset.y })?.name === 'water'
    )
  )
}

export function missingRequirements(building, built) {
  return (building.requires ?? []).filter((requiredId) => !built.has(requiredId))
}

// town: { built, hasBuiltToday, isNextToWater }; builtElsewhere(buildingId) says whether another
// town of the player has it; treasury is the player's resources by type. As in Heroes 3, a
// building shows as short of resources only once nothing else stops it.
export function buildingStatus({ buildingId, building, town, builtElsewhere, treasury }) {
  if (town.built.has(buildingId)) {
    return BUILDING_STATUS.BUILT
  }
  if (building.requiresWater && !town.isNextToWater) {
    return BUILDING_STATUS.NEEDS_WATER
  }
  if (building.onePerPlayer && builtElsewhere(buildingId)) {
    return BUILDING_STATUS.ONE_PER_PLAYER
  }
  if (town.hasBuiltToday) {
    return BUILDING_STATUS.BUILT_TODAY
  }
  if (missingRequirements(building, town.built).length > 0) {
    return BUILDING_STATUS.MISSING_REQUIREMENTS
  }
  if (!canAfford(treasury, building.cost)) {
    return BUILDING_STATUS.NOT_ENOUGH_RESOURCES
  }
  return BUILDING_STATUS.BUILDABLE
}

// A Hall slot shows the first building of its chain not built yet, or the last once all are.
function slotBuildingId(chain, built) {
  return chain.find((buildingId) => !built.has(buildingId)) ?? chain.at(-1)
}

function describeCost(cost = {}, resources = {}, treasury = {}) {
  return Object.keys(resources)
    .filter((resourceType) => cost[resourceType] > 0)
    .map((resourceType) => ({
      resource: resources[resourceType].name ?? resourceType,
      amount: cost[resourceType],
      isShort: isShortOf(treasury, cost, resourceType)
    }))
}

// The Hall as the player sees it: its title (the town's hall building) and its rows of slots.
export function describeHall({ catalogue, town, builtElsewhere, resources, treasury }) {
  const { buildings, hall } = catalogue
  const nameOf = (buildingId) => buildings[buildingId]?.name ?? buildingId
  const hallChain = hall[0]?.[0] ?? []

  return {
    title: nameOf(hallChain.findLast((buildingId) => town.built.has(buildingId)) ?? 'Hall'),
    rows: hall.map((row) =>
      row.map((chain) => {
        const buildingId = slotBuildingId(chain, town.built)
        const building = buildings[buildingId] ?? {}
        return {
          buildingId,
          name: nameOf(buildingId),
          status: buildingStatus({ buildingId, building, town, builtElsewhere, treasury }),
          cost: describeCost(building.cost, resources, treasury),
          missingRequirements: missingRequirements(building, town.built).map(nameOf)
        }
      })
    )
  }
}

// The town box, as in Heroes 3: the town's highest hall and fort, each with its level in the
// chain (a fort of level 0, with no name, when the town has none), and the gold it earns a day.
export function describeTownBox({ catalogue, built }) {
  const { buildings } = catalogue
  const nameOf = (buildingId) => buildings[buildingId]?.name ?? buildingId
  const hallLevel = Math.max(1, HALL_CHAIN.findLastIndex((buildingId) => built.has(buildingId)) + 1)
  const fortLevel = FORT_CHAIN.findLastIndex((buildingId) => built.has(buildingId)) + 1

  return {
    hall: { name: nameOf(HALL_CHAIN[hallLevel - 1]), level: hallLevel },
    fort: { name: fortLevel > 0 ? nameOf(FORT_CHAIN[fortLevel - 1]) : null, level: fortLevel },
    goldIncome: dailyIncomeOfTown({ buildings, built }).GOLD_PILE ?? 0
  }
}
