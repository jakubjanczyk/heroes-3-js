import { createEdgePanController } from './edge-pan-controller.js'
import { getMapCenteredOrigin } from './layers/layout.js'
import { sameTile } from './tile-utils.js'

function getArrowPanDelta(key, panStep) {
  if (key === 'ArrowLeft') {
    return [panStep, 0]
  }
  if (key === 'ArrowRight') {
    return [-panStep, 0]
  }
  if (key === 'ArrowUp') {
    return [0, panStep]
  }
  if (key === 'ArrowDown') {
    return [0, -panStep]
  }

  return null
}

export function attachCameraInput({
  camera,
  viewport,
  window = globalThis.window,
  panStep = 16,
  edgeSize = 24,
  edgePanDelayMs = 0,
  edgePanSpeed = 700,
  now = () => Date.now(),
  requestAnimationFrame = window?.requestAnimationFrame?.bind(window),
  cancelAnimationFrame = window?.cancelAnimationFrame?.bind(window),
  map = null,
  onTileClick = null,
  onTileHover = null
}) {
  const edgePanController = createEdgePanController({
    camera,
    viewport,
    edgeSize,
    edgePanDelayMs,
    edgePanSpeed,
    now,
    requestAnimationFrame,
    cancelAnimationFrame
  })

  function getTileFromEventTarget(target) {
    let node = target ?? null
    while (node) {
      const rawX = node?.dataset?.x
      const rawY = node?.dataset?.y
      if (rawX !== undefined && rawY !== undefined) {
        const x = Number.parseInt(rawX, 10)
        const y = Number.parseInt(rawY, 10)
        if (Number.isFinite(x) && Number.isFinite(y)) {
          return { x, y }
        }
      }
      node = node.parentElement ?? null
    }
    return null
  }

  function onKeyDown(event) {
    const delta = getArrowPanDelta(event.key, panStep)
    if (!delta) {
      return
    }

    camera.moveBy(delta[0], delta[1])
  }

  // The map tile under the pointer, or null when it is off the map.
  function getTileAtPointer(event) {
    const targetTile = getTileFromEventTarget(event?.target)
    if (targetTile && map.inBounds(targetTile)) {
      return targetTile
    }
    if (typeof event?.clientX !== 'number' || typeof event?.clientY !== 'number') {
      return null
    }

    const rect = viewport.getBoundingClientRect()
    const offset = camera.getOffset?.() ?? { x: 0, y: 0 }
    const origin = getMapCenteredOrigin({
      width: viewport.clientWidth ?? 0,
      height: viewport.clientHeight ?? 0,
      map
    })
    const tile = map.screenToTile({
      x: event.clientX - rect.left - offset.x - origin.x,
      y: event.clientY - rect.top - offset.y - origin.y
    })

    return map.inBounds(tile) ? tile : null
  }

  function onMouseMove(event) {
    edgePanController.onMouseMove(event)
  }

  let hoveredTile = null

  // Reports the tile under the pointer only when it changes, null once it leaves the map.
  function setHoveredTile(tile) {
    if (sameTile(tile, hoveredTile) || typeof onTileHover !== 'function') {
      return
    }

    hoveredTile = tile
    onTileHover(tile)
  }

  function onViewportMouseMove(event) {
    if (map) {
      setHoveredTile(getTileAtPointer(event))
    }
  }

  function onMouseEnter() {
    edgePanController.onMouseEnter()
  }

  function onMouseLeave() {
    edgePanController.onMouseLeave()
    setHoveredTile(null)
  }

  function onViewportClick(event) {
    if (!map || typeof onTileClick !== 'function') {
      return
    }

    const tile = getTileAtPointer(event)
    if (tile) {
      onTileClick(tile)
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('mousemove', onMouseMove)
  viewport.addEventListener('mousemove', onViewportMouseMove)
  viewport.addEventListener('mouseenter', onMouseEnter)
  viewport.addEventListener('mouseleave', onMouseLeave)
  viewport.addEventListener('click', onViewportClick)

  return () => {
    edgePanController.destroy()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('mousemove', onMouseMove)
    viewport.removeEventListener('mousemove', onViewportMouseMove)
    viewport.removeEventListener('mouseenter', onMouseEnter)
    viewport.removeEventListener('mouseleave', onMouseLeave)
    viewport.removeEventListener('click', onViewportClick)
  }
}
