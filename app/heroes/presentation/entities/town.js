export function getEntityLayerStyle({ entity, map }) {
  const townTileWidth = Math.round(map.tileWidth * 4.5);
  const townTileHeight = Math.round(map.tileHeight * 2.25);
  const dataset = {};
  if (typeof entity.type === 'string') {
    dataset.townType = entity.type;
  }

  return {
    className: 'entity entity--town',
    width: townTileWidth,
    height: townTileHeight,
    offsetX: -Math.round(townTileWidth / 2),
    offsetY: -Math.round(map.tileHeight * 1.875),
    dataset
  };
}
