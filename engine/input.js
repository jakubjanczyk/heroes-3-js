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
  onTileHover = null,
  onEdgeScroll = null,
  onTileInfoPress = null,
  onTileInfoRelease = null,
  longPressMs = 500,
  longPressSlop = 10,
  setTimeout = window?.setTimeout?.bind(window) ?? globalThis.setTimeout,
  clearTimeout = window?.clearTimeout?.bind(window) ?? globalThis.clearTimeout
}) {
  const edgePanController = createEdgePanController({
    camera,
    viewport,
    edgeSize,
    edgePanDelayMs,
    edgePanSpeed,
    now,
    requestAnimationFrame,
    cancelAnimationFrame,
    onScrollDirectionChange: (direction) => onEdgeScroll?.(direction)
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

  // A held right button, or a finger held still for longPressMs, asks what is on a tile until it is let go.
  let isInfoPressActive = false
  let longPress = null
  let ignoreNextClick = false

  function startInfoPress(event) {
    const tile = getTileAtPointer(event)
    if (!tile || typeof onTileInfoPress !== 'function') {
      return
    }

    isInfoPressActive = true
    onTileInfoPress(tile, {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerType: event.pointerType
    })
  }

  function cancelLongPress() {
    if (longPress) {
      clearTimeout(longPress.timer)
      longPress = null
    }
  }

  function onViewportPointerDown(event) {
    ignoreNextClick = false
    if (!map) {
      return
    }

    if (event.pointerType === 'touch') {
      cancelLongPress()
      longPress = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        timer: setTimeout(() => {
          longPress = null
          ignoreNextClick = true
          startInfoPress(event)
        }, longPressMs)
      }
      return
    }

    if (event.button === 2) {
      startInfoPress(event)
    }
  }

  function onWindowPointerMove(event) {
    if (!longPress || event.pointerId !== longPress.pointerId) {
      return
    }

    const distance = Math.hypot(event.clientX - longPress.startX, event.clientY - longPress.startY)
    if (distance > longPressSlop) {
      cancelLongPress()
    }
  }

  function onWindowPointerUp(event) {
    if (longPress && event.pointerId === longPress.pointerId) {
      cancelLongPress()
    }

    const isInfoPressRelease = event.pointerType === 'touch' || event.button === 2
    if (isInfoPressActive && (isInfoPressRelease || event.type === 'pointercancel')) {
      isInfoPressActive = false
      onTileInfoRelease?.()
    }
  }

  function onViewportContextMenu(event) {
    event.preventDefault()
  }

  function onViewportClick(event) {
    // The browser still sends a click when the finger of a long press lifts.
    if (ignoreNextClick) {
      ignoreNextClick = false
      return
    }

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
  viewport.addEventListener('pointerdown', onViewportPointerDown)
  viewport.addEventListener('contextmenu', onViewportContextMenu)
  window.addEventListener('pointermove', onWindowPointerMove)
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointercancel', onWindowPointerUp)

  return () => {
    cancelLongPress()
    edgePanController.destroy()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('mousemove', onMouseMove)
    viewport.removeEventListener('mousemove', onViewportMouseMove)
    viewport.removeEventListener('mouseenter', onMouseEnter)
    viewport.removeEventListener('mouseleave', onMouseLeave)
    viewport.removeEventListener('click', onViewportClick)
    viewport.removeEventListener('pointerdown', onViewportPointerDown)
    viewport.removeEventListener('contextmenu', onViewportContextMenu)
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)
    window.removeEventListener('pointercancel', onWindowPointerUp)
  }
}
