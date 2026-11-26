import { townBuildingsCatalogue } from './town-buildings.js'

export const TOWN_BUILDING_KIND = 'TOWN_BUILDING'

export const townBuildingVisitId = (townId, buildingId) => `${townId}/${buildingId}`

export function townBuildingVisit(definitions, townType, buildingId) {
  return townBuildingsCatalogue(definitions, townType).buildings?.[buildingId]?.visit ?? null
}

// A building the hero visits as a map object: each town's building is visited on its own, and
// one that shares its bonus with a map object (`sharesBonusWith`, the Stables) is of that kind, so
// a hero holding a bonus from either gets nothing from the other.
export function townBuildingVisitEntity(definitions, { townId, townType, buildingId }) {
  const visit = townBuildingVisit(definitions, townType, buildingId)
  if (!visit) {
    return null
  }
  return {
    id: townBuildingVisitId(townId, buildingId),
    kind: TOWN_BUILDING_KIND,
    type: visit.sharesBonusWith ?? buildingId,
    townType,
    buildingId
  }
}

export function visitedBuildingsOf(definitions, townType, built) {
  return [...built].filter((buildingId) => townBuildingVisit(definitions, townType, buildingId))
}

export const NO_DEFENDER_BONUSES = Object.freeze({ morale: [], luck: [], skills: {} })

const DEFENDER_SKILLS = ['attack', 'defense', 'power']

// What the town's buildings give its defenders in a battle for it (`defenderBonuses`): morale and
// luck, each building a line of its own, and primary skills added up.
export function townDefenderBonuses({ built, buildings }) {
  const giving = [...built]
    .map((buildingId) => buildings?.[buildingId])
    .filter((building) => building?.defenderBonuses)
  const linesOf = (kind) =>
    giving
      .filter(({ defenderBonuses }) => defenderBonuses[kind])
      .map(({ name, defenderBonuses }) => ({ text: name, value: defenderBonuses[kind] }))
  const skills = Object.fromEntries(
    DEFENDER_SKILLS.map((key) => [
      key,
      giving.reduce((total, { defenderBonuses }) => total + (defenderBonuses[key] ?? 0), 0)
    ]).filter(([, value]) => value)
  )
  return { morale: linesOf('morale'), luck: linesOf('luck'), skills }
}

export function addedSkills(skills = {}, added = {}) {
  const total = { ...skills }
  for (const [key, value] of Object.entries(added)) {
    total[key] = (total[key] ?? 0) + value
  }
  return total
}

export function withDefenderSkills(hero, { skills }) {
  return hero && { ...hero, bonusPrimarySkills: addedSkills(hero.bonusPrimarySkills, skills) }
}
