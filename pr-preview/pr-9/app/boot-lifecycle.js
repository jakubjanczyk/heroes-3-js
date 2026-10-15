import {
  APP_COMMAND_RESET_SESSION_REQUESTED,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from './events.js';

export function createWorld(bus) {
  return new Promise((resolve, reject) => {
    const handleWorldReady = (event) => {
      cleanup();
      resolve(event.detail);
    };

    const handleWorldLoadFailed = (event) => {
      cleanup();
      reject(event.detail.error);
    };

    const cleanup = () => {
      bus.removeEventListener?.(APP_FACT_WORLD_READY, handleWorldReady);
      bus.removeEventListener?.(APP_FACT_WORLD_LOAD_FAILED, handleWorldLoadFailed);
    };

    bus.addEventListener(APP_FACT_WORLD_READY, handleWorldReady);
    bus.addEventListener(APP_FACT_WORLD_LOAD_FAILED, handleWorldLoadFailed);
  });
}

export function createDisposer() {
  let hasDisposed = false;
  const disposers = [];

  const dispose = () => {
    if (hasDisposed) {
      return;
    }

    hasDisposed = true;
    while (disposers.length > 0) {
      const disposer = disposers.pop();
      try {
        disposer();
      } catch {}
    }
  };

  const add = (disposer) => {
    if (typeof disposer !== 'function') {
      return;
    }

    if (hasDisposed) {
      try {
        disposer();
      } catch {}
      return;
    }

    disposers.push(disposer);
  };

  return {
    add,
    dispose
  };
}

export function setupResetListener(appBus, appEventLog, window, onResetStart) {
  let hasResetStarted = false;

  const handleResetRequested = () => {
    if (hasResetStarted) {
      return;
    }

    hasResetStarted = true;
    onResetStart?.();

    void (async () => {
      try {
        await appEventLog.reset?.();
      } finally {
        window?.location?.reload?.();
      }
    })();
  };

  appBus.addEventListener(APP_COMMAND_RESET_SESSION_REQUESTED, handleResetRequested);

  return () => {
    appBus.removeEventListener?.(APP_COMMAND_RESET_SESSION_REQUESTED, handleResetRequested);
  };
}
