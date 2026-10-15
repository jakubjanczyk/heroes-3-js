export function createEdgePanController({
  camera,
  viewport,
  edgeSize = 24,
  edgePanDelayMs = 0,
  edgePanSpeed = 700,
  now = () => Date.now(),
  requestAnimationFrame = globalThis.requestAnimationFrame,
  cancelAnimationFrame = globalThis.cancelAnimationFrame
}) {
  let isMouseOverViewport = false;
  let edgeDirection = null;
  let edgeDirectionStartedAt = 0;
  let edgeVelocity = { x: 0, y: 0 };
  let edgePanFrameHandle = null;
  let edgePanLastTimestamp = null;

  function scheduleEdgePanFrame(callback) {
    if (typeof requestAnimationFrame === 'function') {
      let isSynchronous = true;
      const id = requestAnimationFrame((timestamp) => {
        if (isSynchronous) {
          setTimeout(() => {
            callback(timestamp);
          }, 0);
          return;
        }

        callback(timestamp);
      });
      isSynchronous = false;
      return { kind: 'raf', id };
    }

    const id = setTimeout(() => {
      callback(now());
    }, 16);
    return { kind: 'timeout', id };
  }

  function clearEdgePanFrame(handle) {
    if (handle === null) {
      return;
    }

    if (handle.kind === 'raf' && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(handle.id);
      return;
    }

    clearTimeout(handle.id);
  }

  function stopEdgePanLoop() {
    clearEdgePanFrame(edgePanFrameHandle);
    edgePanFrameHandle = null;
    edgePanLastTimestamp = null;
  }

  function clearEdgeDirection() {
    edgeDirection = null;
    edgeDirectionStartedAt = 0;
    edgeVelocity = { x: 0, y: 0 };
    stopEdgePanLoop();
  }

  function getEdgeIntensity({ value, min, max }) {
    if (value <= min + edgeSize) {
      return Math.max(0, Math.min(1, (min + edgeSize - value) / edgeSize));
    }
    if (value >= max - edgeSize) {
      return -Math.max(0, Math.min(1, (value - (max - edgeSize)) / edgeSize));
    }

    return 0;
  }

  function setEdgeVelocityFromPointer(event) {
    const rect = viewport.getBoundingClientRect();
    const nextVelocity = {
      x: getEdgeIntensity({ value: event.clientX, min: rect.left, max: rect.right }),
      y: getEdgeIntensity({ value: event.clientY, min: rect.top, max: rect.bottom })
    };

    edgeVelocity = nextVelocity;

    if (nextVelocity.x !== 0 || nextVelocity.y !== 0) {
      const nextDirection = `${Math.sign(nextVelocity.x)}:${Math.sign(nextVelocity.y)}`;
      if (edgeDirection !== nextDirection) {
        edgeDirection = nextDirection;
        edgeDirectionStartedAt = now();
      }
      return;
    }

    clearEdgeDirection();
  }

  function shouldPanFromEdge() {
    if (edgeVelocity.x === 0 && edgeVelocity.y === 0) {
      return false;
    }

    if (edgePanDelayMs <= 0) {
      return true;
    }

    return now() - edgeDirectionStartedAt >= edgePanDelayMs;
  }

  function runEdgePanFrame(timestamp) {
    edgePanFrameHandle = null;

    if (!isMouseOverViewport || (edgeVelocity.x === 0 && edgeVelocity.y === 0)) {
      stopEdgePanLoop();
      return;
    }

    if (edgePanLastTimestamp === null) {
      edgePanLastTimestamp = timestamp;
    }

    const deltaMs = Math.max(0, Math.min(50, timestamp - edgePanLastTimestamp));
    edgePanLastTimestamp = timestamp;

    if (shouldPanFromEdge()) {
      const deltaSeconds = deltaMs / 1000;
      const dx = edgeVelocity.x * edgePanSpeed * deltaSeconds;
      const dy = edgeVelocity.y * edgePanSpeed * deltaSeconds;
      if (dx !== 0 || dy !== 0) {
        camera.moveBy(dx, dy);
      }
    }

    edgePanFrameHandle = scheduleEdgePanFrame(runEdgePanFrame);
  }

  function ensureEdgePanLoop() {
    if (edgePanFrameHandle !== null) {
      return;
    }

    edgePanFrameHandle = scheduleEdgePanFrame(runEdgePanFrame);
  }

  function onMouseMove(event) {
    if (!isMouseOverViewport) {
      return;
    }

    setEdgeVelocityFromPointer(event);
    if (edgeVelocity.x !== 0 || edgeVelocity.y !== 0) {
      ensureEdgePanLoop();
    }
  }

  function onMouseEnter() {
    isMouseOverViewport = true;
  }

  function onMouseLeave() {
    isMouseOverViewport = false;
    clearEdgeDirection();
  }

  function destroy() {
    clearEdgeDirection();
  }

  return {
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
    destroy
  };
}
