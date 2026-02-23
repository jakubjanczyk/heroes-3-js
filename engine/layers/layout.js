export function getMapCenteredOrigin({ width, height, map }) {
  const mapPixelWidth = (map.width + map.height) * map.halfTileWidth;
  const mapPixelHeight = (map.width + map.height) * map.halfTileHeight;
  const minXOffset = (map.height - 1) * map.halfTileWidth;
  const x = Math.round((width - mapPixelWidth) / 2 + minXOffset);
  const y = Math.round((height - mapPixelHeight) / 2);

  return { x, y };
}

export function getTileTopLeft({ map, tile, origin }) {
  const screen = map.tileToScreen(tile);
  return {
    x: origin.x + screen.x,
    y: origin.y + screen.y
  };
}

export function getTileCenter({ map, tile, origin }) {
  const topLeft = getTileTopLeft({ map, tile, origin });
  return {
    x: topLeft.x + map.halfTileWidth,
    y: topLeft.y + map.halfTileHeight
  };
}

export function getViewportCenter({ width, height }) {
  return {
    x: width / 2,
    y: height / 2
  };
}
