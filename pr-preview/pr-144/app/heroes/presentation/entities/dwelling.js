import { typeToClass } from './shared.js'

// No pictures yet: the dwelling shows its name.
export function getEntityLayerStyle({ entity, map, definitions = {} }) {
  const width = map.tileWidth * 3
  const height = map.tileHeight * 2
  return {
    className: `entity entity--dwelling entity--dwelling-type-${typeToClass(entity.type)}`,
    width,
    height,
    offsetX: -Math.round(width / 2),
    offsetY: -Math.round(height - map.tileHeight / 2),
    label: definitions.dwellings?.[entity.type]?.name ?? null,
    dataset: { dwellingType: entity.type }
  }
}
