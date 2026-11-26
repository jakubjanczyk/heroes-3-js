export function isShortOf(totals, cost, resourceType) {
  return (cost?.[resourceType] ?? 0) > (totals?.[resourceType] ?? 0)
}

export function canAfford(totals, cost = {}) {
  return Object.keys(cost).every((resourceType) => !isShortOf(totals, cost, resourceType))
}

export function leftOver(totals, kept = {}) {
  return Object.fromEntries(
    Object.entries(totals ?? {}).map(([resourceType, amount]) => [
      resourceType,
      Math.max(0, amount - (kept[resourceType] ?? 0))
    ])
  )
}
