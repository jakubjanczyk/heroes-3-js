export function getMapCenteredOrigin() {
  return { x: 0, y: 0 };
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
