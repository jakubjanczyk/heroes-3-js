import { typeToClass } from './shared.js'

// No pictures yet: the artifact shows its name on its tile.
export function getEntityLayerStyle({ entity, map, definitions = {} }) {
  return {
    className: `entity entity--artifact entity--artifact-type-${typeToClass(entity.type)}`,
    width: map.tileWidth,
    height: map.tileHeight,
    offsetX: -Math.round(map.tileWidth / 2),
    offsetY: -Math.round(map.tileHeight / 2),
    label: definitions.artifacts?.[entity.type]?.name ?? null,
    dataset: { artifactType: entity.type }
  }
}
