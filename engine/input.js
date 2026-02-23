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
  edgeSize = 24
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

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('mousemove', onMouseMove);
  viewport.addEventListener('mouseenter', onMouseEnter);
  viewport.addEventListener('mouseleave', onMouseLeave);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('mousemove', onMouseMove);
    viewport.removeEventListener('mouseenter', onMouseEnter);
    viewport.removeEventListener('mouseleave', onMouseLeave);
  };
}
