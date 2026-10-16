// What stands on a tile: whatever the static map holds there, unless it was removed.
export function getOccupantAt({ tile, staticOccupancy, removedIds = new Set() }) {
  const occupant = staticOccupancy?.getAt?.(tile) ?? null
  if (!occupant || removedIds.has(occupant.id)) {
    return null
  }

  return occupant
}
