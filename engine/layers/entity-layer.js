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

export function renderEntityLayer({ container, map, entities, createElement }) {
  const makeElement = getCreateElement(createElement);
  clearContainer(container);
  const layerWidth = container.clientWidth ?? 0;
  const layerHeight = container.clientHeight ?? 0;
  const mapPixelWidth = (map.width + map.height) * map.halfTileWidth;
  const mapPixelHeight = (map.width + map.height) * map.halfTileHeight;
  const minXOffset = (map.height - 1) * map.halfTileWidth;
  const originX = Math.round((layerWidth - mapPixelWidth) / 2 + minXOffset);
  const originY = Math.round((layerHeight - mapPixelHeight) / 2);
  const heroSize = 24;

  for (const entity of entities) {
    if (entity.kind !== 'HERO') {
      continue;
    }

    const screen = map.tileToScreen(entity.tile);
    const entityEl = makeElement('div');
    entityEl.className = 'entity entity--hero';
    entityEl.dataset.entityId = entity.id;
    entityEl.style.transform = `translate(${originX + screen.x + map.halfTileWidth - heroSize / 2}px, ${originY + screen.y + map.halfTileHeight - heroSize / 2}px)`;
    container.appendChild(entityEl);
  }
}
