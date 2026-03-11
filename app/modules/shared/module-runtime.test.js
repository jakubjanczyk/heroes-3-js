import { describe, expect, test, vi } from 'vitest';

import { createModuleRuntime, defineModule } from './module-runtime.js';

function createBus() {
  const listenersByType = new Map();
  const emitted = [];

  return {
    emitted,
    addEventListener(type, handler) {
      const listeners = listenersByType.get(type) ?? new Set();
      listeners.add(handler);
      listenersByType.set(type, listeners);
    },
    removeEventListener(type, handler) {
      const listeners = listenersByType.get(type);
      if (!listeners) {
        return;
      }

      listeners.delete(handler);
    },
    emit(type, detail) {
      emitted.push({ type, detail });
      for (const listener of listenersByType.get(type) ?? []) {
        listener({ type, detail });
      }
    }
  };
}

describe('module runtime', () => {
  test('registers, emits, and disposes bus listeners', () => {
    const bus = createBus();
    const runtime = createModuleRuntime({ bus, env: {}, config: {} });
    const handler = vi.fn();

    runtime.on('fact.ready', handler);
    runtime.emit('fact.ready', { ok: true });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.emitted).toEqual([{ type: 'fact.ready', detail: { ok: true } }]);

    runtime.dispose();
    runtime.emit('fact.ready', { ok: false });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('registers and disposes DOM listeners', () => {
    const bus = createBus();
    const runtime = createModuleRuntime({ bus, env: {}, config: {} });
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const handler = vi.fn();

    runtime.onDom(target, 'click', handler);

    expect(target.addEventListener).toHaveBeenCalledWith('click', handler, undefined);

    runtime.dispose();

    expect(target.removeEventListener).toHaveBeenCalledWith('click', handler, undefined);
  });

  test('supports setup cleanup via defineModule', () => {
    const cleanup = vi.fn();
    const bus = createBus();
    const registerModule = defineModule(() => cleanup);

    const dispose = registerModule({ bus, env: {}, config: {} });
    dispose();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('is safe when removeEventListener is unavailable', () => {
    const bus = {
      addEventListener() {},
      emit() {}
    };
    const runtime = createModuleRuntime({ bus, env: {}, config: {} });

    expect(() => {
      runtime.on('fact.any', () => {});
      runtime.dispose();
    }).not.toThrow();
  });
});
