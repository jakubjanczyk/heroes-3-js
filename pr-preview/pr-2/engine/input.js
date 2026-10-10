import { getMapCenteredOrigin } from './layers/layout.js';
import { createEdgePanController } from './edge-pan-controller.js';

function getArrowPanDelta(key, panStep) {
  if (key === 'ArrowLeft') {
    return [panStep, 0];
  }
  if (key === 'ArrowRight') {
    return [-panStep, 0];
  }
  if (key === 'ArrowUp') {
    return [0, panStep];
  }
  if (key === 'ArrowDown') {
    return [0, -panStep];
  }

  return null;
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
  onTileClick = null
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
  });

  function getTileFromEventTarget(target) {
    let node = target ?? null;
    while (node) {
      const rawX = node?.dataset?.x;
      const rawY = node?.dataset?.y;
      if (rawX !== undefined && rawY !== undefined) {
        const x = Number.parseInt(rawX, 10);
        const y = Number.parseInt(rawY, 10);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          return { x, y };
        }
      }
      node = node.parentElement ?? null;
    }
    return null;
  }

  function onKeyDown(event) {
    const delta = getArrowPanDelta(event.key, panStep);
    if (!delta) {
      return;
    }

    camera.moveBy(delta[0], delta[1]);
  }

  function onMouseMove(event) {
    edgePanController.onMouseMove(event);
  }

  function onMouseEnter() {
    edgePanController.onMouseEnter();
  }

  function onMouseLeave() {
    edgePanController.onMouseLeave();
  }

  function onViewportClick(event) {
    if (!map || typeof onTileClick !== 'function') {
      return;
    }

    const targetTile = getTileFromEventTarget(event?.target);
    if (targetTile && map.inBounds(targetTile)) {
      onTileClick(targetTile);
      return;
    }
    if (typeof event?.clientX !== 'number' || typeof event?.clientY !== 'number') {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const offset = camera.getOffset?.() ?? { x: 0, y: 0 };
    const origin = getMapCenteredOrigin({
      width: viewport.clientWidth ?? 0,
      height: viewport.clientHeight ?? 0,
      map
    });
    const tile = map.screenToTile({
      x: event.clientX - rect.left - offset.x - origin.x,
      y: event.clientY - rect.top - offset.y - origin.y
    });

    if (!map.inBounds(tile)) {
      return;
    }

    onTileClick(tile);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('mousemove', onMouseMove);
  viewport.addEventListener('mouseenter', onMouseEnter);
  viewport.addEventListener('mouseleave', onMouseLeave);
  viewport.addEventListener('click', onViewportClick);

  return () => {
    edgePanController.destroy();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('mousemove', onMouseMove);
    viewport.removeEventListener('mouseenter', onMouseEnter);
    viewport.removeEventListener('mouseleave', onMouseLeave);
    viewport.removeEventListener('click', onViewportClick);
  };
}
