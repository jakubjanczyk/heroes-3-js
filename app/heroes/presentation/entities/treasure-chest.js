import { getTreasureChestSpriteStyle } from '../adventure-sprites.js'

export function getEntityLayerStyle() {
  const { width, height, backgroundImage } = getTreasureChestSpriteStyle()
  return {
    className: 'entity entity--treasure-chest',
    width,
    height,
    offsetX: -Math.round(width / 2),
    offsetY: -Math.round(height / 2),
    backgroundImage
  }
}
