import { bonusObjectFootprint } from '../../../../game/heroes/bonus-objects.js'
import { typeToClass } from './shared.js'

// No pictures yet: the object shows its name across its entrance and the tiles it blocks.
export function getEntityLayerStyle({ entity, map, definitions = {} }) {
  const columns = [0, ...bonusObjectFootprint(entity.type).map((offset) => offset.x)]
  const leftColumn = Math.min(...columns)
  const width = map.tileWidth * (Math.max(...columns) - leftColumn + 1)
  const height = map.tileHeight
  return {
    className: `entity entity--bonus-object entity--bonus-object-type-${typeToClass(entity.type)}`,
    width,
    height,
    offsetX: Math.round(leftColumn * map.tileWidth - map.tileWidth / 2),
    offsetY: -Math.round(height / 2),
    label: definitions.bonusObjects?.[entity.type]?.name ?? null,
    dataset: { bonusObjectType: entity.type }
  }
}
