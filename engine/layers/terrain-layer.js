function clearContainer(container) {
  if (typeof container.replaceChildren === 'function') {
    container.replaceChildren();
    return;
  }

  if (Array.isArray(container.children)) {
    container.children.length = 0;
  }
}

function getCreateElement(createElement) {
  if (typeof createElement === 'function') {
    return createElement;
  }

  return (tagName) => document.createElement(tagName);
}

export function renderTerrainLayer({ container, map, createElement }) {
  const makeElement = getCreateElement(createElement);
  clearContainer(container);
  const layerWidth = container.clientWidth ?? 0;
  const layerHeight = container.clientHeight ?? 0;
  const mapPixelWidth = (map.width + map.height) * map.halfTileWidth;
  const mapPixelHeight = (map.width + map.height) * map.halfTileHeight;
  const minXOffset = (map.height - 1) * map.halfTileWidth;
  const originX = Math.round((layerWidth - mapPixelWidth) / 2 + minXOffset);
  const originY = Math.round((layerHeight - mapPixelHeight) / 2);

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = { x, y };
      const tileEl = makeElement('div');
      const screen = map.tileToScreen(tile);
      const passable = map.isPassable(tile);

      tileEl.className = passable
        ? 'terrain-tile terrain-tile--passable'
        : 'terrain-tile terrain-tile--blocked';
      tileEl.style.transform = `translate(${originX + screen.x}px, ${originY + screen.y}px)`;
      tileEl.dataset.x = String(x);
      tileEl.dataset.y = String(y);

      container.appendChild(tileEl);
    }
  }
}
