import { describe, expect, test } from 'vitest';

import { setupTerrainRendering } from './terrain-rendering.js';

describe('terrain rendering setup', () => {
  test('renders immediately and wires rAF and resize rendering', () => {
    const calls = [];
    const listeners = new Map();
    const window = {
      requestAnimationFrame(handler) {
        handler();
      },
      addEventListener(type, handler) {
        listeners.set(type, handler);
      }
    };

    setupTerrainRendering({
      terrainLayer: { id: 'terrain' },
      map: { id: 'map' },
      createElement: () => ({}),
      renderTerrainLayer: (args) => {
        calls.push(args);
      },
      window
    });

    listeners.get('resize')?.();

    expect(calls).toHaveLength(3);
    expect(calls[0].container).toEqual({ id: 'terrain' });
  });
});
