export function createMap(terrain) {
  const { width, height, tiles } = terrain;
  const tileWidth = 32;
  const tileHeight = 32;
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
      x: tile.x * tileWidth,
      y: tile.y * tileHeight
    };
  }

  function screenToTile(screenPoint) {
    const x = Math.floor(screenPoint.x / tileWidth);
    const y = Math.floor(screenPoint.y / tileHeight);

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
