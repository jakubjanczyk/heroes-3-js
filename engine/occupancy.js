function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}

export function createOccupancyIndex(entities) {
  const byTile = new Map();
  const byEntityId = new Map();
  for (const entity of entities) {
    const key = tileKey(entity.tile);
    byTile.set(key, entity);
    byEntityId.set(entity.id, key);
  }

  return {
    getAt(tile) {
      return byTile.get(tileKey(tile)) ?? null;
    },
    moveEntity(entity, toTile) {
      const previousKey = byEntityId.get(entity.id);
      if (previousKey) {
        byTile.delete(previousKey);
      }
      const nextKey = tileKey(toTile);
      byTile.set(nextKey, entity);
      byEntityId.set(entity.id, nextKey);
    }
  };
}
