import { describe, expect, test } from 'vitest';

import { APP_FACT_WORLD_READY, APP_UI_PREVIEW_UPDATED } from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerPreviewViewModule } from './preview-view.module.js';

describe('preview view module', () => {
  test('renders preview only after map is known from world-ready', () => {
    const bus = createFakeBus();
    const renderCalls = [];
    const effectsLayer = { id: 'effects' };

    registerPreviewViewModule(
      {
        bus,
        env: {
          document: {
            querySelector(selector) {
              return selector === '.effects-layer' ? effectsLayer : null;
            },
            createElement(tag) {
              return { tag };
            }
          }
        }
      },
      {
        renderPathPreviewLayer: (args) => {
          renderCalls.push(args);
        }
      }
    );

    bus.emit(APP_UI_PREVIEW_UPDATED, {
      path: [{ x: 0, y: 0 }],
      targetTile: { x: 1, y: 0 },
      maxAffordableSteps: 10
    });
    expect(renderCalls).toEqual([]);

    bus.emit(APP_FACT_WORLD_READY, { map: { id: 'map' } });
    bus.emit(APP_UI_PREVIEW_UPDATED, {
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      targetTile: { x: 1, y: 0 },
      maxAffordableSteps: 10
    });

    expect(renderCalls).toEqual([
      {
        container: effectsLayer,
        map: { id: 'map' },
        path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        targetTile: { x: 1, y: 0 },
        maxAffordableSteps: 10,
        createElement: expect.any(Function)
      }
    ]);
  });

  test('ignores preview updates when effects layer is missing', () => {
    const bus = createFakeBus();
    let renderCalls = 0;

    registerPreviewViewModule(
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
          }
        }
      },
      {
        renderPathPreviewLayer: () => {
          renderCalls += 1;
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, { map: {} });
    bus.emit(APP_UI_PREVIEW_UPDATED, {
      path: [{ x: 0, y: 0 }],
      targetTile: { x: 1, y: 0 },
      maxAffordableSteps: 10
    });

    expect(renderCalls).toBe(0);
  });
});
