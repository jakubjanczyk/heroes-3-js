import { clearLayerContainer, getLayerElementFactory } from './dom-layer-utils.js';
import { getMapCenteredOrigin, getTileCenter } from './layout.js';
import { getResourceSpriteStyle } from './resource-sprites.js';

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
        width: 24,
        height: 24,
        offsetX: -12,
        offsetY: -12
      };
    }

    if (entity.kind === 'MONSTER') {
      return {
        className: 'entity entity--monster',
        width: 22,
        height: 22,
        offsetX: -11,
        offsetY: -11
      };
    }

    if (entity.kind === 'RESOURCE') {
      const resourceSpriteStyle = getResourceSpriteStyle(entity.type);
      const resourceTypeClass = resourceTypeToClass(entity.type);
      return {
        className:
          resourceTypeClass === null
            ? 'entity entity--resource'
            : `entity entity--resource entity--resource-type-${resourceTypeClass}`,
        width: resourceSpriteStyle.width,
        height: resourceSpriteStyle.height,
        offsetX: -Math.round(resourceSpriteStyle.width / 2),
        offsetY: -Math.round(resourceSpriteStyle.height / 2),
        backgroundImage: resourceSpriteStyle.backgroundImage
      };
    }

    if (entity.kind === 'TOWN') {
      return {
        className: 'entity entity--town',
        width: 224,
        height: 96,
        offsetX: -112,
        offsetY: -92
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
    entityEl.style.width = `${entityStyle.width}px`;
    entityEl.style.height = `${entityStyle.height}px`;
    if (entityStyle.backgroundImage) {
      entityEl.style.backgroundImage = `url('${entityStyle.backgroundImage}')`;
    }
    if (entity.kind === 'RESOURCE' && typeof entity.type === 'string') {
      entityEl.dataset.resourceType = entity.type;
    }
    if (entity.kind === 'TOWN' && typeof entity.type === 'string') {
      entityEl.dataset.townType = entity.type;
    }
    entityEl.style.transform = `translate(${center.x + entityStyle.offsetX}px, ${center.y + entityStyle.offsetY}px)`;
    container.appendChild(entityEl);
  }
}
