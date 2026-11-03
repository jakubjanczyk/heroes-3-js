import { typeToClass } from './shared.js'

export function getEntityLayerStyle({ entity, map }) {
  const mineTypeClass = typeToClass(entity.type)
  const dataset = {}
  if (typeof entity.type === 'string') {
    dataset.mineType = entity.type
  }

  const tilesLeftOfEntrance = entity.type === 'SAWMILL' ? 2 : 1
  const width = map.tileWidth * (tilesLeftOfEntrance + 2)
  const height = map.tileHeight * 2
  return {
    className:
      mineTypeClass === null
        ? 'entity entity--mine'
        : `entity entity--mine entity--mine-type-${mineTypeClass}`,
    width,
    height,
    offsetX: -Math.round(map.tileWidth * (tilesLeftOfEntrance + 0.5)),
    offsetY: -Math.round(height - map.tileHeight / 2),
    dataset
  }
}
