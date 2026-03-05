import { clearLayerContainer, getLayerElementFactory } from './dom-layer-utils.js';
import { getMapCenteredOrigin, getTileCenter } from './layout.js';

export function renderEntityLayer({
  container,
  map,
  entities,
  createElement,
  getEntityStyle
}) {
  const makeElement = getLayerElementFactory(createElement);
  clearLayerContainer(container);
  if (typeof getEntityStyle !== 'function') {
    return;
  }
  const origin = getMapCenteredOrigin({
    width: container.clientWidth ?? 0,
    height: container.clientHeight ?? 0,
    map
  });

  for (const entity of entities) {
    const entityStyle = getEntityStyle({ entity, map });
    if (!entityStyle) {
      continue;
    }

    const center = getTileCenter({ map, tile: entity.tile, origin });
    const entityEl = makeElement('div');
    entityEl.className = entityStyle.className;
    entityEl.dataset.entityId = entity.id;
    entityEl.dataset.tileX = String(entity.tile.x);
    entityEl.dataset.tileY = String(entity.tile.y);
    if (entityStyle.dataset && typeof entityStyle.dataset === 'object') {
      for (const [key, value] of Object.entries(entityStyle.dataset)) {
        if (typeof value === 'string') {
          entityEl.dataset[key] = value;
        }
      }
    }
    entityEl.style.width = `${entityStyle.width}px`;
    entityEl.style.height = `${entityStyle.height}px`;
    if (entityStyle.backgroundImage) {
      entityEl.style.backgroundImage = `url('${entityStyle.backgroundImage}')`;
    }
    entityEl.style.transform = `translate(${center.x + entityStyle.offsetX}px, ${center.y + entityStyle.offsetY}px)`;
    container.appendChild(entityEl);
  }
}
