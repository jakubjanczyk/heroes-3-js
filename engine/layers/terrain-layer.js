import { clearLayerContainer, getLayerElementFactory } from './dom-layer-utils.js';
import { getMapCenteredOrigin, getTileTopLeft } from './layout.js';

function setStyleVar(element, name, value) {
  element?.style?.setProperty?.(name, value);
}

export function renderTerrainLayer({ container, map, createElement }) {
  const makeElement = getLayerElementFactory(createElement);
  clearLayerContainer(container);
  const origin = getMapCenteredOrigin({
    width: container.clientWidth ?? 0,
    height: container.clientHeight ?? 0,
    map
  });

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = { x, y };
      const tileEl = makeElement('div');
      const topLeft = getTileTopLeft({ map, tile, origin });
      const passable = map.isPassable(tile);

      tileEl.className = passable
        ? 'terrain-tile terrain-tile--passable'
        : 'terrain-tile terrain-tile--blocked';
      tileEl.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`;
      tileEl.dataset.x = String(x);
      tileEl.dataset.y = String(y);

      container.appendChild(tileEl);
    }
  }
}
