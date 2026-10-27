export function dwellingCreature(dwellingType, definitions) {
  const creature = definitions?.dwellings?.[dwellingType]?.creature
  const monster = definitions?.monsters?.[creature]
  return monster ? { creature, ...monster } : null
}

export function weeklyGrowthOfDwelling(dwellingType, definitions) {
  return dwellingCreature(dwellingType, definitions)?.growth ?? 0
}

// Level 1 creatures cost nothing at a dwelling on the map.
export function isFreeDwelling(dwellingType, definitions) {
  return dwellingCreature(dwellingType, definitions)?.tier === 1
}
