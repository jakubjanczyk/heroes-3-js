export function dwellingCreature(dwellingType, definitions) {
  const creature = definitions?.dwellings?.[dwellingType]?.creature
  const monster = definitions?.monsters?.[creature]
  return monster ? { creature, ...monster } : null
}

export function weeklyGrowthOfDwelling(dwellingType, definitions) {
  return dwellingCreature(dwellingType, definitions)?.growth ?? 0
}

export function isFreeDwelling(dwellingType, definitions) {
  return dwellingCreature(dwellingType, definitions)?.tier === 1
}
