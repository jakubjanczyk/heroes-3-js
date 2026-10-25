import { isTown } from '../domain/entity-queries.js'

// The only player so far. A scenario gives a town to the player with `"owner": "red"`.
export const PLAYER_COLOR = 'red'

// The towns the player owns, in the order the town list shows them: the scenario's own first,
// then each captured town after the last.
export function createOwnedTowns() {
  let ownedTownIds = []

  return {
    onWorldReady(entities) {
      ownedTownIds = entities
        .filter((entity) => isTown(entity) && entity.owner === PLAYER_COLOR)
        .map((town) => town.id)
    },
    onTownCaptured(townId) {
      if (!ownedTownIds.includes(townId)) {
        ownedTownIds = [...ownedTownIds, townId]
      }
    },
    has(townId) {
      return ownedTownIds.includes(townId)
    },
    ids() {
      return ownedTownIds
    }
  }
}
