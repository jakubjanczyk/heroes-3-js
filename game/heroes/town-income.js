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
