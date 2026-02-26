function cloneDetail(detail) {
  if (detail === undefined) {
    return undefined;
  }

  try {
    return structuredClone(detail);
  } catch {
    return detail;
  }
}

export function createFakeBus({ snapshotDetail = false } = {}) {
  const listenersByType = new Map();
  const emitted = [];

  return {
    emitted,
    addEventListener(type, handler) {
      const listeners = listenersByType.get(type) ?? [];
      listeners.push(handler);
      listenersByType.set(type, listeners);
    },
    emit(type, detail) {
      emitted.push({
        type,
        detail: snapshotDetail ? cloneDetail(detail) : detail
      });

      for (const listener of listenersByType.get(type) ?? []) {
        listener({ type, detail });
      }
    }
  };
}

export function getLastEmittedByType(bus, type) {
  return [...bus.emitted].reverse().find((entry) => entry.type === type) ?? null;
}
