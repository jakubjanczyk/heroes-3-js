// A week bonus shared with a map object (`sharedWith`, the Stables) is taken from whichever the
// hero visits first that week.
export function townWeekBonusesFor({ built, buildings, hero }) {
  return [...built]
    .map((buildingId) => ({ buildingId, weekBonus: buildings?.[buildingId]?.weekBonus }))
    .filter(({ weekBonus }) => weekBonus && hero?.weekBonus?.entityType !== weekBonus.sharedWith)
    .map(({ buildingId, weekBonus }) => ({
      buildingId,
      entityType: weekBonus.sharedWith,
      movementPoints: weekBonus.movementPoints,
      message: weekBonus.message
    }))
}

export function townDefenderMorale({ built, buildings }) {
  return [...built]
    .map((buildingId) => buildings?.[buildingId])
    .filter((building) => building?.defenderMorale)
    .map(({ name, defenderMorale }) => ({ text: name, value: defenderMorale }))
}
