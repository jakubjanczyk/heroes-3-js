import { typeToClass } from './shared.js'

const BOXES = Object.freeze({
  WINDMILL: { left: 0, right: 1, rows: 1 },
  WATER_WHEEL: { left: 2, right: 0, rows: 2 },
  MYSTICAL_GARDEN: { left: 1, right: 1, rows: 1 }
})
const DEFAULT_BOX = BOXES.WINDMILL

// No pictures yet: the object shows its name across its tiles.
export function getEntityLayerStyle({ entity, map, definitions = {} }) {
  const box = BOXES[entity.type] ?? DEFAULT_BOX
  const width = map.tileWidth * (box.left + 1 + box.right)
  const height = map.tileHeight * box.rows
  return {
    className: `entity entity--resource-generator entity--resource-generator-type-${typeToClass(entity.type)}`,
    width,
    height,
    offsetX: -Math.round(map.tileWidth * (box.left + 0.5)),
    offsetY: -Math.round(height - map.tileHeight / 2),
    label: definitions.resourceGenerators?.[entity.type]?.name ?? null,
    dataset: { resourceGeneratorType: entity.type }
  }
}
