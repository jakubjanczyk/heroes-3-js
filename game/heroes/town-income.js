import { rolledResources } from './visitable-objects/rewards.js'

// The buildings standing, except one that a building standing upgrades: a
// Town Hall pays its 1000 gold in place of the Village Hall's 500, not on top of it.
export function buildingsInEffect({ buildings, built }) {
  const upgraded = new Set([...built].map((buildingId) => buildings[buildingId]?.upgrades))
  return [...built].filter((buildingId) => !upgraded.has(buildingId))
}

// What a town earns a day per resource type, e.g. { GOLD_PILE: 1000 }.
export function dailyIncomeOfTown({ buildings, built }) {
  const income = {}

  for (const buildingId of buildingsInEffect({ buildings, built })) {
    for (const [resourceType, amount] of Object.entries(buildings[buildingId]?.income ?? {})) {
      income[resourceType] = (income[resourceType] ?? 0) + amount
    }
  }

  return income
}

export function sumIncomes(incomes) {
  const total = {}

  for (const income of incomes) {
    for (const [resourceType, amount] of Object.entries(income)) {
      total[resourceType] = (total[resourceType] ?? 0) + amount
    }
  }

  return total
}

// Each building with a weekly interest (the Treasury's 10% of gold) pays it on what the player
// holds as the week ends, rounded down for each building: two Treasuries pay twice.
export function weeklyInterestOfTown({ buildings, built, resources }) {
  const interest = {}

  for (const buildingId of built) {
    for (const [resourceType, percent] of Object.entries(
      buildings[buildingId]?.weeklyInterest ?? {}
    )) {
      const amount = Math.floor(((resources?.[resourceType] ?? 0) * percent) / 100)
      interest[resourceType] = (interest[resourceType] ?? 0) + amount
    }
  }

  return interest
}

// What a town's buildings with weekly resources (the Mystic Pond's 1–4 of a rare resource) make
// as a week starts, each rolled on its own; null when none stands. A building upgraded over still
// makes them: the Fountain of Fortune keeps the pond's.
export function rollWeeklyResourcesOfTown({ buildings, built, random }) {
  const rolled = built
    .filter((buildingId) => buildings[buildingId]?.weeklyResources)
    .map((buildingId) => rolledResources(buildings[buildingId].weeklyResources, { random }))
  return rolled.length > 0 ? sumIncomes(rolled) : null
}
