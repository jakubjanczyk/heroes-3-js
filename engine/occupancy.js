function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}

export function createOccupancyIndex(entities) {
  const byTile = new Map();
  for (const entity of entities) {
    byTile.set(tileKey(entity.tile), entity);
  }

  return {
    getAt(tile) {
      return byTile.get(tileKey(tile)) ?? null;
    }
  };
}
