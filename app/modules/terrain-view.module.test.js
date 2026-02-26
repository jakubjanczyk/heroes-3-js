import { describe, expect, test } from 'vitest';

import { APP_FACT_WORLD_READY } from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerTerrainViewModule } from './terrain-view.module.js';

describe('terrain view module', () => {
  test('renders on world-ready and on resize/rAF updates', () => {
    const bus = createFakeBus();
    const renderCalls = [];
    const listeners = new Map();
    const terrainLayer = { id: 'terrain' };
    const document = {
      querySelector(selector) {
        return selector === '.terrain-layer' ? terrainLayer : null;
      },
      createElement(tag) {
        return { tag };
      }
    };
    const window = {
      requestAnimationFrame(handler) {
        handler();
      },
      addEventListener(type, handler) {
        listeners.set(type, handler);
      }
    };

    registerTerrainViewModule(
      {
        bus,
        env: { document, window }
      },
      {
        renderTerrainLayer: (args) => {
          renderCalls.push(args);
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, { map: { id: 'map' } });
    listeners.get('resize')?.();

    expect(renderCalls).toHaveLength(3);
    expect(renderCalls[0].container).toBe(terrainLayer);
    expect(renderCalls[0].map).toEqual({ id: 'map' });
  });

  test('skips rendering when terrain layer is absent', () => {
    const bus = createFakeBus();
    let renderCalls = 0;

    registerTerrainViewModule(
      {
        bus,
        env: {
          document: {
            querySelector() {
              return null;
            },
            createElement() {
              return {};
            }
          },
          window: {}
        }
      },
      {
        renderTerrainLayer: () => {
          renderCalls += 1;
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, { map: { id: 'map' } });
    expect(renderCalls).toBe(0);
  });
});
