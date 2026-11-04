import { isHero, isTown } from '../../domain/entity-queries.js'
import { DEFAULT_PLAYER } from '../../state/core-slices.js'
import { createFogSlice } from '../../state/fog.js'
import { heroOwner } from '../../state/queries.js'

const HERO_SIGHT_RADIUS = 5
const TOWN_SIGHT_RADIUS = 5
// Any other object a player owns, such as a mine.
const OBJECT_SIGHT_RADIUS = 3

function sightRadiusOf(entity) {
  if (isHero(entity)) {
    return HERO_SIGHT_RADIUS
  }
  return isTown(entity) ? TOWN_SIGHT_RADIUS : OBJECT_SIGHT_RADIUS
}

// Capturing a mine reveals nothing more: the hero who captured it stands there already.
export const fogSlice = createFogSlice({
  sightRadiusOf,
  revealsOn: {
    'fact.hero.moved': ({ heroId, to }, { previousState }) => [
      {
        player: heroOwner(previousState, heroId) ?? DEFAULT_PLAYER,
        center: to,
        radius: HERO_SIGHT_RADIUS
      }
    ],
    'fact.town.captured': ({ entityId, owner = DEFAULT_PLAYER }, { scenario }) => {
      const town = scenario.entities.find((entity) => entity.id === entityId)
      return town ? [{ player: owner, center: town.tile, radius: TOWN_SIGHT_RADIUS }] : []
    }
  }
})
