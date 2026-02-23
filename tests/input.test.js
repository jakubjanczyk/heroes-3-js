import { describe, expect, test } from 'vitest';

import { attachCameraInput } from '../engine/input.js';

function createEventTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    },
    emit(type, event) {
      const handlers = listeners.get(type) ?? [];
      for (const handler of handlers) {
        handler(event);
      }
    }
  };
}

describe('camera input', () => {
  test('arrow keys pan camera by fixed step', () => {
    const moves = [];
    const camera = {
      moveBy(dx, dy) {
        moves.push([dx, dy]);
      }
    };
    const viewport = createEventTarget();
    const window = createEventTarget();

    attachCameraInput({ camera, viewport, window, panStep: 18, edgeSize: 32 });
    window.emit('keydown', { key: 'ArrowRight' });
    window.emit('keydown', { key: 'ArrowUp' });

    expect(moves).toEqual([
      [-18, 0],
      [0, 18]
    ]);
  });

  test('edge scroll pans only while mouse is over viewport', () => {
    const moves = [];
    const camera = {
      moveBy(dx, dy) {
        moves.push([dx, dy]);
      }
    };
    const viewport = createEventTarget();
    viewport.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 400
    });
    const window = createEventTarget();

    attachCameraInput({ camera, viewport, window, panStep: 10, edgeSize: 40 });

    window.emit('mousemove', { clientX: 10, clientY: 10 });
    expect(moves).toEqual([]);

    viewport.emit('mouseenter', {});
    window.emit('mousemove', { clientX: 10, clientY: 10 });
    window.emit('mousemove', { clientX: 490, clientY: 390 });
    viewport.emit('mouseleave', {});
    window.emit('mousemove', { clientX: 10, clientY: 10 });

    expect(moves).toEqual([
      [10, 10],
      [-10, -10]
    ]);
  });
});
