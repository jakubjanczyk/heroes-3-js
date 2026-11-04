export const BATTLE_DEFENDER_DWELLING_GUARDS = 'DWELLING_GUARDS'

export function dwellingCreature(dwellingType, definitions) {
  const creature = definitions?.dwellings?.[dwellingType]?.creature
  const monster = definitions?.monsters?.[creature]
  return monster ? { creature, ...monster } : null
}

export function weeklyGrowthOfDwelling(dwellingType, definitions) {
  return dwellingCreature(dwellingType, definitions)?.growth ?? 0
}

// How many dwellings of each creature fly the player's flag; each adds one to that creature's
// weekly growth in the player's towns. A town nobody owns gets none.
export function flaggedDwellingCountsByCreature(dwellings, player, definitions) {
  const counts = {}
  if (!player) {
    return counts
  }

  for (const { type, owner } of dwellings) {
    const creature = owner === player ? dwellingCreature(type, definitions)?.creature : null
    if (creature) {
      counts[creature] = (counts[creature] ?? 0) + 1
    }
  }
  return counts
}

export function isFreeDwelling(dwellingType, definitions) {
  return dwellingCreature(dwellingType, definitions)?.tier === 1
}

export function guardsOfDwelling(dwellingType, definitions) {
  return definitions?.dwellings?.[dwellingType]?.guards ?? 0
}
