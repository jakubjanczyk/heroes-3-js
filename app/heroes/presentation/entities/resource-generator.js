import {
  visitableDefinition,
  visitableFootprint
} from '../../../../game/heroes/visitable-objects/definitions.js'
import { typeToClass } from './shared.js'

// The tiles around the entrance the object's picture covers: those it blocks, unless its data
// gives a wider `picture`.
function pictureBox(definitions, entity) {
  const { picture } = visitableDefinition(definitions, entity)
  if (picture) {
    return picture
  }
  const tiles = [{ x: 0, y: 0 }, ...visitableFootprint(definitions, entity)]
  const columns = tiles.map(({ x }) => x)
  return {
    left: -Math.min(...columns),
    right: Math.max(...columns),
    rows: 1 - Math.min(...tiles.map(({ y }) => y))
  }
}

// No pictures yet: the object shows its name across its tiles.
export function getEntityLayerStyle({ entity, map, definitions = {} }) {
  const box = pictureBox(definitions, entity)
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
