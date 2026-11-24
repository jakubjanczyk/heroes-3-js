import { resourcesWorth, townDevelopmentWorth } from './computer-worth.js'
import {
  BUILDING_STATUS,
  buildingStatus,
  FORT_CHAIN,
  fortLevelOf,
  missingRequirements
} from './town-buildings.js'
import { canAfford } from './treasury.js'

// The longest a computer player saves for a building, in days of its income.
const SAVING_DAYS = 7

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

function addCosts(costs) {
  const total = {}
  for (const cost of costs) {
    for (const [resourceType, amount] of Object.entries(cost ?? {})) {
      total[resourceType] = (total[resourceType] ?? 0) + amount
    }
  }
  return total
}

// A building with the steps to it, requirements first; what the town gains from them all, in
// gold, and what they all cost, in gold and in resources.
export function buildingGoal({ buildingId, catalogue, built, definitions }) {
  const { buildings } = catalogue
  const steps = stepsTowards(buildingId, buildings, built)
  const worthWith = (standing) => townDevelopmentWorth({ buildings, built: standing, definitions })
  const resources = addCosts(steps.map((step) => buildings[step].cost))
  return {
    steps,
    worth: worthWith(new Set([...built, ...steps])) - worthWith(built),
    cost: resourcesWorth(resources, definitions),
    resources
  }
}

// Every step could be built once the ones before it stand and it is paid for: no water missing,
// no building one player may have only once standing in another town.
function isWithinReach({ steps }, { buildings }, { town, builtElsewhere }) {
  const built = new Set(town.built)
  return steps.every((step) => {
    const building = buildings[step]
    const status = buildingStatus({
      buildingId: step,
      building,
      town: { ...town, built, hasBuiltToday: false },
      builtElsewhere,
      treasury: building.cost ?? {}
    })
    built.add(step)
    return status === BUILDING_STATUS.BUILDABLE
  })
}

function daysToSave(cost, treasury, income) {
  return Math.max(
    0,
    ...Object.entries(cost).map(([resourceType, amount]) => {
      const missing = amount - (treasury[resourceType] ?? 0)
      if (missing <= 0) {
        return 0
      }
      const daily = income[resourceType] ?? 0
      return daily > 0 ? Math.ceil(missing / daily) : Number.POSITIVE_INFINITY
    })
  )
}

const scoreOf = ({ worth, cost }) => (cost > 0 ? worth / cost : Number.POSITIVE_INFINITY)

const byScore = (first, second) => scoreOf(second) - scoreOf(first) || 0

function goalsOf({ catalogue, context, definitions }) {
  const { buildings, hall } = catalogue
  return hall
    .flat(2)
    .filter((buildingId) => buildings[buildingId] && !context.town.built.has(buildingId))
    .map((buildingId) =>
      buildingGoal({ buildingId, catalogue, built: context.town.built, definitions })
    )
    .filter((goal) => isWithinReach(goal, catalogue, context))
}

// A threatened town with a Fort or a Citadel builds the next of them before anything else, when
// it can today.
function nextWalls({ buildings }, { town, builtElsewhere, treasury }) {
  const fortLevel = fortLevelOf(town.built)
  const buildingId = FORT_CHAIN[fortLevel]
  if (fortLevel === 0 || !buildings[buildingId]) {
    return null
  }
  const status = buildingStatus({
    buildingId,
    building: buildings[buildingId],
    town,
    builtElsewhere,
    treasury
  })
  return status === BUILDING_STATUS.BUILDABLE ? { build: buildingId } : null
}

// What a computer player's town does today: `build` a step towards the building worth the most
// for its cost, or `save` that step's cost when `treasury` can't pay it yet, `maySave` allowing.
// A building is aimed for only when `income` makes up what it and its steps are short of within a
// week. With nothing worth anything to build or save for, the
// first building of the Hall it can pay for; null for nothing.
export function decideTownBuilding({
  catalogue,
  context,
  definitions,
  income,
  maySave,
  isThreatened = false
}) {
  if (context.town.hasBuiltToday) {
    return null
  }
  const walls = isThreatened ? nextWalls(catalogue, context) : null
  if (walls) {
    return walls
  }

  const { buildings } = catalogue
  const { treasury } = context
  const costOf = (goal) => buildings[goal.steps[0]].cost ?? {}
  const isPayable = (goal) => canAfford(treasury, costOf(goal))
  const goals = goalsOf({ catalogue, context, definitions })
  const worthy = goals
    .filter((goal) => goal.worth > 0)
    .sort(byScore)
    .filter((goal) => daysToSave(goal.resources, treasury, income) <= SAVING_DAYS)

  if (worthy.length === 0) {
    const rest = goals.find((goal) => goal.worth <= 0 && isPayable(goal))
    return rest ? { build: rest.steps[0] } : null
  }

  const [best] = worthy
  if (maySave && !isPayable(best)) {
    return { save: costOf(best) }
  }
  const payable = worthy.find(isPayable)
  return payable ? { build: payable.steps[0] } : null
}
