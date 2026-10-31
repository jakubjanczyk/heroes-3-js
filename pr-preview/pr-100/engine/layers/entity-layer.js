import { clearLayerContainer, getLayerElementFactory, setStyleVar } from './dom-layer-utils.js'
import { getMapCenteredOrigin, getTileCenter } from './layout.js'

// Parts sit at tile offsets from the entity's tile, for a picture drawn tile by tile.
function appendParts(entityEl, entity, parts, makeElement) {
  for (const offset of parts) {
    const partEl = makeElement('div')
    partEl.className = 'entity-part'
    partEl.dataset.tileX = String(entity.tile.x + offset.x)
    partEl.dataset.tileY = String(entity.tile.y + offset.y)
    setStyleVar(partEl, '--part-x', String(offset.x))
    setStyleVar(partEl, '--part-y', String(offset.y))
    entityEl.appendChild(partEl)
  }
}

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
      const entityEl = createEntityElement(makeElement('div'), entity, entityStyle, center)
      appendParts(entityEl, entity, entityStyle.parts ?? [], makeElement)
      container.appendChild(entityEl)
    }
  }
}
