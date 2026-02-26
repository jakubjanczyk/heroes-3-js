import { clearLayerContainer, getLayerElementFactory } from './dom-layer-utils.js';
import { getMapCenteredOrigin, getTileCenter } from './layout.js';

function resourceTypeToClass(resourceType) {
  if (typeof resourceType !== 'string' || resourceType.length === 0) {
    return null;
  }

  return resourceType.toLowerCase().replaceAll('_', '-');
}

export function renderEntityLayer({ container, map, entities, createElement }) {
  const makeElement = getLayerElementFactory(createElement);
  clearLayerContainer(container);
  const origin = getMapCenteredOrigin({
    width: container.clientWidth ?? 0,
    height: container.clientHeight ?? 0,
    map
  });
  function getEntityStyle(entity) {
    if (entity.kind === 'HERO') {
      return {
        className: 'entity entity--hero',
        size: 24
      };
    }

    if (entity.kind === 'MONSTER') {
      return {
        className: 'entity entity--monster',
        size: 22
      };
    }

    if (entity.kind === 'RESOURCE') {
      const resourceTypeClass = resourceTypeToClass(entity.type);
      return {
        className:
          resourceTypeClass === null
            ? 'entity entity--resource'
            : `entity entity--resource entity--resource-type-${resourceTypeClass}`,
        size: 20
      };
    }

    return null;
  }

  for (const entity of entities) {
    const entityStyle = getEntityStyle(entity);
    if (!entityStyle) {
      continue;
    }

    const center = getTileCenter({ map, tile: entity.tile, origin });
    const entityEl = makeElement('div');
    entityEl.className = entityStyle.className;
    entityEl.dataset.entityId = entity.id;
    entityEl.dataset.tileX = String(entity.tile.x);
    entityEl.dataset.tileY = String(entity.tile.y);
    if (entity.kind === 'RESOURCE' && typeof entity.type === 'string') {
      entityEl.dataset.resourceType = entity.type;
    }
    entityEl.style.transform = `translate(${center.x - entityStyle.size / 2}px, ${center.y - entityStyle.size / 2}px)`;
    container.appendChild(entityEl);
  }
}
