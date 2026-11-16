import { BUILDING_STATUS, buildingStatus, missingRequirements } from './town-buildings.js'

const INCOME = 0
const DWELLING = 1
const UPGRADED_DWELLING = 2
const REST = 3

function groupOf(building) {
  if (building.income) {
    return INCOME
  }
  if (building.creature) {
    return building.upgrades ? UPGRADED_DWELLING : DWELLING
  }
  return REST
}

function wishList(catalogue) {
  const { buildings, hall } = catalogue
  return hall
    .flat(2)
    .filter((buildingId) => buildings[buildingId])
    .map((buildingId, hallIndex) => {
      return { buildingId, hallIndex, group: groupOf(buildings[buildingId]) }
    })
    .sort((a, b) => a.group - b.group || a.hallIndex - b.hallIndex)
    .map(({ buildingId }) => buildingId)
}

function stepsTowards(buildingId, buildings, built, seen = new Set()) {
  if (seen.has(buildingId) || built.has(buildingId) || !buildings[buildingId]) {
    return []
  }
  seen.add(buildingId)
  const requirements = missingRequirements(buildings[buildingId], built).flatMap((requiredId) =>
    stepsTowards(requiredId, buildings, built, seen)
  )
  return [...requirements, buildingId]
}

export function decideTownBuilding({ catalogue, context }) {
  const { buildings } = catalogue
  const isBuildable = (buildingId) =>
    buildingStatus({ buildingId, building: buildings[buildingId], ...context }) ===
    BUILDING_STATUS.BUILDABLE

  return (
    wishList(catalogue)
      .flatMap((buildingId) => stepsTowards(buildingId, buildings, context.town.built))
      .find(isBuildable) ?? null
  )
}
