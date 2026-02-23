export function createMap(terrain) {
  const { width, height, tiles } = terrain;
  const tileWidth = 104;
  const tileHeight = 52;
  const halfTileWidth = tileWidth / 2;
  const halfTileHeight = tileHeight / 2;

  function inBounds(tile) {
    return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height;
  }

  function isPassable(tile) {
    if (!inBounds(tile)) {
      return false;
    }

    const index = tile.y * width + tile.x;
    return tiles[index] === 0;
  }

  function tileToScreen(tile) {
    return {
      x: (tile.x - tile.y) * halfTileWidth,
      y: (tile.x + tile.y) * halfTileHeight
    };
  }

  function screenToTile(screenPoint) {
    const x = Math.round(
      (screenPoint.x / halfTileWidth + screenPoint.y / halfTileHeight) / 2
    );
    const y = Math.round(
      (screenPoint.y / halfTileHeight - screenPoint.x / halfTileWidth) / 2
    );

    return { x, y };
  }

  return {
    width,
    height,
    tiles,
    tileWidth,
    tileHeight,
    halfTileWidth,
    halfTileHeight,
    inBounds,
    isPassable,
    tileToScreen,
    screenToTile
  };
}
