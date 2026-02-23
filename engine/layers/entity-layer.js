import { clearLayerContainer, getLayerElementFactory } from './dom-layer-utils.js';
import { getMapCenteredOrigin, getTileCenter } from './layout.js';

export function renderEntityLayer({ container, map, entities, createElement }) {
  const makeElement = getLayerElementFactory(createElement);
  clearLayerContainer(container);
  const origin = getMapCenteredOrigin({
    width: container.clientWidth ?? 0,
    height: container.clientHeight ?? 0,
    map
  });
  const heroSize = 24;

  for (const entity of entities) {
    if (entity.kind !== 'HERO') {
      continue;
    }

    const center = getTileCenter({ map, tile: entity.tile, origin });
    const entityEl = makeElement('div');
    entityEl.className = 'entity entity--hero';
    entityEl.dataset.entityId = entity.id;
    entityEl.style.transform = `translate(${center.x - heroSize / 2}px, ${center.y - heroSize / 2}px)`;
    container.appendChild(entityEl);
  }
}
