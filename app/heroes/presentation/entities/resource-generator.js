import { typeToClass } from './shared.js'

// No pictures yet: the object shows its name across its two tiles, the entrance on the right.
export function getEntityLayerStyle({ entity, map, definitions = {} }) {
  const width = map.tileWidth * 2
  const height = map.tileHeight
  return {
    className: `entity entity--resource-generator entity--resource-generator-type-${typeToClass(entity.type)}`,
    width,
    height,
    offsetX: -Math.round(width - map.tileWidth / 2),
    offsetY: -Math.round(height / 2),
    label: definitions.resourceGenerators?.[entity.type]?.name ?? null,
    dataset: { resourceGeneratorType: entity.type }
  }
}
