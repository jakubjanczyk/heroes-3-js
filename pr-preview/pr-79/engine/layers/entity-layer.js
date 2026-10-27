import { clearLayerContainer, getLayerElementFactory, setStyleVar } from './dom-layer-utils.js'
import { getMapCenteredOrigin, getTileCenter } from './layout.js'

function createEntityElement(entityEl, entity, entityStyle, center) {
  entityEl.className = entityStyle.className
  entityEl.dataset.entityId = entity.id
  entityEl.dataset.tileX = String(entity.tile.x)
  entityEl.dataset.tileY = String(entity.tile.y)
  for (const [key, value] of Object.entries(entityStyle.dataset ?? {})) {
    if (typeof value === 'string') {
      entityEl.dataset[key] = value
    }
  }
  setStyleVar(entityEl, '--entity-width', `${entityStyle.width}px`)
  setStyleVar(entityEl, '--entity-height', `${entityStyle.height}px`)
  setStyleVar(entityEl, '--entity-center-x', `${center.x}px`)
  setStyleVar(entityEl, '--entity-center-y', `${center.y}px`)
  setStyleVar(entityEl, '--entity-offset-x', `${entityStyle.offsetX}px`)
  setStyleVar(entityEl, '--entity-offset-y', `${entityStyle.offsetY}px`)
  if (entityStyle.label) {
    entityEl.textContent = entityStyle.label
  }
  if (entityStyle.backgroundImage) {
    setStyleVar(entityEl, '--entity-background-image', `url('${entityStyle.backgroundImage}')`)
  } else {
    entityEl.style?.removeProperty?.('--entity-background-image')
  }
  entityEl.style.transform = `translate(${center.x + entityStyle.offsetX}px, ${center.y + entityStyle.offsetY}px)`
  return entityEl
}

export function renderEntityLayer({ container, map, entities, createElement, getEntityStyle }) {
  const makeElement = getLayerElementFactory(createElement)
  clearLayerContainer(container)
  if (typeof getEntityStyle !== 'function') {
    return
  }
  const origin = getMapCenteredOrigin({
    width: container.clientWidth ?? 0,
    height: container.clientHeight ?? 0,
    map
  })

  for (const entity of entities) {
    const entityStyle = getEntityStyle({ entity, map })
    if (entityStyle) {
      const center = getTileCenter({ map, tile: entity.tile, origin })
      container.appendChild(createEntityElement(makeElement('div'), entity, entityStyle, center))
    }
  }
}
