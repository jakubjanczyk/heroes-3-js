export const BATTLE_DEFENDER_DWELLING_GUARDS = 'DWELLING_GUARDS'

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

export function guardsOfDwelling(dwellingType, definitions) {
  return definitions?.dwellings?.[dwellingType]?.guards ?? 0
}
