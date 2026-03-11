export function createBus({
  debug = false,
  log = null,
  eventLog = null,
  shouldLogEvent = () => false
} = {}) {
  const listenersByType = new Map();
  const writeLog = typeof log === 'function' ? log : () => {};
  const recordEvent = typeof eventLog?.record === 'function' ? eventLog.record.bind(eventLog) : null;
  let isSilent = false;

  function debugLog(entry) {
    if (!debug) {
      return;
    }

    writeLog(entry);
  }

  function addEventListener(type, handler) {
    const listeners = listenersByType.get(type) ?? new Set();
    listeners.add(handler);
    listenersByType.set(type, listeners);

    debugLog({
      action: 'subscribe',
      type,
      subscribers: listeners.size
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
      subscribers: listenersByType.get(type)?.size ?? 0
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

  function emit(type, detail, options = {}) {
    const shouldRecord = options.log !== false && shouldLogEvent(type, detail);
    if (shouldRecord && recordEvent) {
      const logDetail =
        typeof structuredClone === 'function'
          ? (() => {
              try {
                return structuredClone(detail);
              } catch {
                return detail;
              }
            })()
          : detail;

      void recordEvent({ type, detail: logDetail }).catch((error) => {
        debugLog({
          action: 'log-error',
          type,
          detail: {
            message: error instanceof Error ? error.message : String(error)
          },
          subscribers: listenersByType.get(type)?.size ?? 0
        });
      });
    }

    const event = { type, detail };
    const listeners = [...(listenersByType.get(type) ?? [])];

    debugLog({
      action: 'emit',
      type,
      detail,
      subscribers: listeners.length
    });

    if (isSilent) {
      return;
    }

    for (const handler of listeners) {
      handler(event);
    }
  }

  return {
    addEventListener,
    removeEventListener,
    removeAllEventListeners,
    emit,
    get silent() {
      return isSilent;
    },
    set silent(value) {
      isSilent = Boolean(value);
    }
  };
}
