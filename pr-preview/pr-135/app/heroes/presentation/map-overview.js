import { isDwelling, isMine } from '../../../game/domain/entity-queries.js'
import { FOOTPRINT_BLOCKER_KIND } from '../../../game/footprint-utils.js'
import { flaggedObjectOwner } from '../../../game/heroes/state/map-objects.js'
import { viewingPlayer } from '../../../game/state/queries.js'

export function createMapOverview({ map, staticOccupancy, entities }) {
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]))

  function objectCovering(tile) {
    const occupant = staticOccupancy?.getAt(tile)
    return occupant?.kind === FOOTPRINT_BLOCKER_KIND ? entitiesById.get(occupant.ownerId) : occupant
  }

  function flaggedObjectCovering(tile) {
    const entity = objectCovering(tile)
    return isMine(entity) || isDwelling(entity) ? entity : null
  }

  // A tile covered by a mine or dwelling takes its owner's colour instead of the terrain's.
  // `showsTerrain` draws an unexplored tile's terrain and obstacles, without the objects on it.
  function tileClassNames(state, tile, { explored, showsTerrain = false }) {
    if (!explored && !showsTerrain) {
      return ['overview-tile--unexplored']
    }

    const classNames = []
    const terrainName = map.getTerrainType(tile)?.name
    if (terrainName) {
      classNames.push(`terrain-tile--${terrainName}`)
    }
    if (objectCovering(tile)?.kind === 'OBSTACLE') {
      classNames.push('overview-tile--blocked')
    }
    const flaggedObject = explored && flaggedObjectCovering(tile)
    if (flaggedObject) {
      classNames.push(
        flaggedObjectOwner(state, flaggedObject.id) === viewingPlayer(state)
          ? 'overview-tile--player'
          : 'overview-tile--neutral'
      )
    }
    return classNames
  }

  return { flaggedObjectCovering, tileClassNames }
}
