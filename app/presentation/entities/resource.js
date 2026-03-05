import { getResourceSpriteStyle } from '../../../engine/layers/resource-sprites.js';

export const fadeOut = Object.freeze({
  selector: '.entity--resource',
  className: 'entity--resource-collecting'
});

function resourceTypeToClass(resourceType) {
  if (typeof resourceType !== 'string' || resourceType.length === 0) {
    return null;
  }

  return resourceType.toLowerCase().replaceAll('_', '-');
}

export function getEntityLayerStyle({ entity }) {
  const resourceSpriteStyle = getResourceSpriteStyle(entity.type);
  const resourceTypeClass = resourceTypeToClass(entity.type);
  const dataset = {};
  if (typeof entity.type === 'string') {
    dataset.resourceType = entity.type;
  }

  return {
    className:
      resourceTypeClass === null
        ? 'entity entity--resource'
        : `entity entity--resource entity--resource-type-${resourceTypeClass}`,
    width: resourceSpriteStyle.width,
    height: resourceSpriteStyle.height,
    offsetX: -Math.round(resourceSpriteStyle.width / 2),
    offsetY: -Math.round(resourceSpriteStyle.height / 2),
    backgroundImage: resourceSpriteStyle.backgroundImage,
    dataset
  };
}
