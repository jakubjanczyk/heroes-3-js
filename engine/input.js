import { getMapCenteredOrigin } from './layers/layout.js';

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
  map = null,
  onTileClick = null
}) {
  let isMouseOverViewport = false;

  function onKeyDown(event) {
    const delta = getArrowPanDelta(event.key, panStep);
    if (!delta) {
      return;
    }

    camera.moveBy(delta[0], delta[1]);
  }

  function onMouseMove(event) {
    if (!isMouseOverViewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    let dx = 0;
    let dy = 0;

    if (event.clientX <= rect.left + edgeSize) {
      dx += panStep;
    } else if (event.clientX >= rect.right - edgeSize) {
      dx -= panStep;
    }

    if (event.clientY <= rect.top + edgeSize) {
      dy += panStep;
    } else if (event.clientY >= rect.bottom - edgeSize) {
      dy -= panStep;
    }

    if (dx !== 0 || dy !== 0) {
      camera.moveBy(dx, dy);
    }
  }

  function onMouseEnter() {
    isMouseOverViewport = true;
  }

  function onMouseLeave() {
    isMouseOverViewport = false;
  }

  function onViewportClick(event) {
    if (!map || typeof onTileClick !== 'function') {
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
      x: event.clientX - rect.left - offset.x - origin.x - map.halfTileWidth,
      y: event.clientY - rect.top - offset.y - origin.y - map.halfTileHeight
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
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('mousemove', onMouseMove);
    viewport.removeEventListener('mouseenter', onMouseEnter);
    viewport.removeEventListener('mouseleave', onMouseLeave);
    viewport.removeEventListener('click', onViewportClick);
  };
}
