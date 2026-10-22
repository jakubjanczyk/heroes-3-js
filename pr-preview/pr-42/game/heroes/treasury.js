// The player's resources, by resource type: what they start with, gain and spend.
export function createTreasury() {
  let totals = {}

  return {
    onWorldReady(startingResources) {
      totals = { ...startingResources }
    },
    add(resources = {}) {
      for (const [resourceType, amount] of Object.entries(resources)) {
        const parsedAmount = Number(amount)
        totals[resourceType] =
          (totals[resourceType] ?? 0) + (Number.isFinite(parsedAmount) ? parsedAmount : 0)
      }
    },
    spend(cost = {}) {
      for (const [resourceType, amount] of Object.entries(cost)) {
        totals[resourceType] = (totals[resourceType] ?? 0) - amount
      }
    },
    totals() {
      return totals
    }
  }
}

export function isShortOf(totals, cost, resourceType) {
  return (cost?.[resourceType] ?? 0) > (totals?.[resourceType] ?? 0)
}

export function canAfford(totals, cost = {}) {
  return Object.keys(cost).every((resourceType) => !isShortOf(totals, cost, resourceType))
}
