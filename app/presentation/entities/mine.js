function mineTypeToClass(mineType) {
  if (typeof mineType !== 'string' || mineType.length === 0) {
    return null;
  }

  return mineType.toLowerCase().replaceAll('_', '-');
}

export function getEntityLayerStyle({ entity, map }) {
  const mineTypeClass = mineTypeToClass(entity.type);
  const dataset = {};
  if (typeof entity.type === 'string') {
    dataset.mineType = entity.type;
  }

  const width = map.tileWidth * 3;
  const height = map.tileHeight * 2;
  return {
    className:
      mineTypeClass === null
        ? 'entity entity--mine'
        : `entity entity--mine entity--mine-type-${mineTypeClass}`,
    width,
    height,
    offsetX: -Math.round(width / 2),
    offsetY: -Math.round(height - map.tileHeight / 2),
    dataset
  };
}
