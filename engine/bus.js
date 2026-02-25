export function createBus() {
  const listenersByType = new Map();

  function addEventListener(type, handler) {
    const listeners = listenersByType.get(type) ?? new Set();
    listeners.add(handler);
    listenersByType.set(type, listeners);
  }

  function removeEventListener(type, handler) {
    const listeners = listenersByType.get(type);
    if (!listeners) {
      return;
    }

    listeners.delete(handler);
    if (listeners.size === 0) {
      listenersByType.delete(type);
    }
  }

  function removeAllEventListeners(type) {
    if (typeof type === 'string') {
      listenersByType.delete(type);
      return;
    }

    listenersByType.clear();
  }

  function emit(type, detail) {
    const event = { type, detail };
    const listeners = listenersByType.get(type);
    if (!listeners) {
      return;
    }

    for (const handler of [...listeners]) {
      handler(event);
    }
  }

  return {
    addEventListener,
    removeEventListener,
    removeAllEventListeners,
    emit
  };
}
