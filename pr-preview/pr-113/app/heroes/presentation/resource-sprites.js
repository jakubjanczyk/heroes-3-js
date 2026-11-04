import { createAtlasSprites } from './atlas-sprites.js'
import {
  RESOURCE_ATLAS_HEIGHT,
  RESOURCE_ATLAS_RGBA,
  RESOURCE_ATLAS_SPRITES,
  RESOURCE_ATLAS_WIDTH
} from './homm3-resource-atlas.js'

const RESOURCE_TYPE_TO_SPRITE_KEY = {
  GOLD_PILE: 'gold',
  WOOD_PILE: 'wood',
  ORE_PILE: 'ore',
  MERCURY_PILE: 'mercury',
  SULFUR_PILE: 'sulfur',
  CRYSTAL_PILE: 'crystal',
  GEMS_PILE: 'gems'
}

const getAtlasSpriteStyle = createAtlasSprites({
  width: RESOURCE_ATLAS_WIDTH,
  height: RESOURCE_ATLAS_HEIGHT,
  sprites: RESOURCE_ATLAS_SPRITES,
  rgba: RESOURCE_ATLAS_RGBA,
  scale: 1.25
})

export function getResourceSpriteStyle(resourceType) {
  return (
    getAtlasSpriteStyle(RESOURCE_TYPE_TO_SPRITE_KEY[resourceType]) ?? {
      width: 30,
      height: 25,
      backgroundImage: null
    }
  )
}
