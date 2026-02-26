export function createBus({ debug = false, log = null } = {}) {
  const listenersByType = new Map();
  const writeLog = typeof log === 'function' ? log : () => {};

  function debugLog(entry) {
    if (!debug) {
      return;
    }

    writeLog(entry);
  }

  function getListenerCount(type) {
    if (typeof type === 'string') {
      return listenersByType.get(type)?.size ?? 0;
    }

    let total = 0;
    for (const listeners of listenersByType.values()) {
      total += listeners.size;
    }
    return total;
  }

  function addEventListener(type, handler) {
    const listeners = listenersByType.get(type) ?? new Set();
    listeners.add(handler);
    listenersByType.set(type, listeners);

    debugLog({
      action: 'subscribe',
      type,
      subscribers: getListenerCount(type)
    });
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

    debugLog({
      action: 'unsubscribe',
      type,
      subscribers: getListenerCount(type)
    });
  }

  function removeAllEventListeners(type) {
    if (typeof type === 'string') {
      listenersByType.delete(type);
      debugLog({
        action: 'remove-all',
        type,
        subscribers: 0
      });
      return;
    }

    listenersByType.clear();
    debugLog({
      action: 'remove-all',
      type: '*',
      subscribers: 0
    });
  }

  function emit(type, detail) {
    const event = { type, detail };
    const listeners = [...(listenersByType.get(type) ?? [])];

    debugLog({
      action: 'emit',
      type,
      detail,
      subscribers: listeners.length
    });

    for (const handler of listeners) {
      handler(event);
    }
  }

  return {
    addEventListener,
    removeEventListener,
    removeAllEventListeners,
    getListenerCount,
    emit
  };
}
