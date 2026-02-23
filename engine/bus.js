export function createBus() {
  const listenersByType = new Map();

  function addEventListener(type, handler) {
    const listeners = listenersByType.get(type) ?? [];
    listeners.push(handler);
    listenersByType.set(type, listeners);
  }

  function emit(type, detail) {
    const event = { type, detail };
    const listeners = listenersByType.get(type) ?? [];
    for (const handler of listeners) {
      handler(event);
    }
  }

  return {
    addEventListener,
    emit
  };
}
