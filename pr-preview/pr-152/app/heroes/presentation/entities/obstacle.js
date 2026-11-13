// No pictures yet: each tile the obstacle blocks is filled with its kind's colour.
export function getEntityLayerStyle({ entity, map, definitions = {} }) {
  const obstacle = definitions.obstacles?.[entity.type]
  return {
    className: `entity entity--obstacle entity--obstacle-${obstacle?.look ?? 'rock'}`,
    width: map.tileWidth,
    height: map.tileHeight,
    offsetX: -map.halfTileWidth,
    offsetY: -map.halfTileHeight,
    parts: obstacle?.blocks ?? []
  }
}
