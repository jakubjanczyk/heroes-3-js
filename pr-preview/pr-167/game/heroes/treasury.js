export function isShortOf(totals, cost, resourceType) {
  return (cost?.[resourceType] ?? 0) > (totals?.[resourceType] ?? 0)
}

export function canAfford(totals, cost = {}) {
  return Object.keys(cost).every((resourceType) => !isShortOf(totals, cost, resourceType))
}
