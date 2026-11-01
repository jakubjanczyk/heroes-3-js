import {
  ADVENTURE_ATLAS_HEIGHT,
  ADVENTURE_ATLAS_RGBA,
  ADVENTURE_ATLAS_SPRITES,
  ADVENTURE_ATLAS_WIDTH
} from './adventure-sprite-atlas.js'
import { createAtlasSprites } from './atlas-sprites.js'

// Sprites we draw ourselves (scripts/build-adventure-sprite-atlas.mjs), at the resource sprites'
// scale so the map chest sits among the resources at their size.
const getAtlasSpriteStyle = createAtlasSprites({
  width: ADVENTURE_ATLAS_WIDTH,
  height: ADVENTURE_ATLAS_HEIGHT,
  sprites: ADVENTURE_ATLAS_SPRITES,
  rgba: ADVENTURE_ATLAS_RGBA,
  scale: 1.25
})

export function getTreasureChestSpriteStyle() {
  return getAtlasSpriteStyle('treasureChest')
}

// The chest dialog's pictures; the dialog sizes them itself.
export function getChestGoldPicture() {
  return getAtlasSpriteStyle('chestGold').backgroundImage
}

export function getChestExperiencePicture() {
  return getAtlasSpriteStyle('chestExperience').backgroundImage
}
