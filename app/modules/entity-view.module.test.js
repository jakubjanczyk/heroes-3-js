import { describe, expect, test } from 'vitest';

import { APP_FACT_HERO_MOVED, APP_FACT_WORLD_READY } from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerEntityViewModule } from './entity-view.module.js';

describe('entity view module', () => {
  test('renders entities on world-ready and after hero moved facts', () => {
    const bus = createFakeBus();
    const renderCalls = [];
    const entityLayer = { id: 'entity-layer' };

    registerEntityViewModule(
      {
        bus,
        env: {
          document: {
            querySelector(selector) {
              return selector === '.entity-layer' ? entityLayer : null;
            },
            createElement(tag) {
              return { tag };
            }
          }
        }
      },
      {
        renderEntityLayer: (args) => {
          renderCalls.push(args);
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      map: { id: 'map' },
      scenario: { entities: [{ id: 'hero-1' }] }
    });
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 1, y: 0 } });

    expect(renderCalls).toHaveLength(2);
    expect(renderCalls[0].entities).toEqual([{ id: 'hero-1' }]);
  });

  test('does not render when entity layer is missing', () => {
    const bus = createFakeBus();
    let renderCalls = 0;

    registerEntityViewModule(
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
        renderEntityLayer: () => {
          renderCalls += 1;
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      map: {},
      scenario: { entities: [] }
    });
    bus.emit(APP_FACT_HERO_MOVED, {});

    expect(renderCalls).toBe(0);
  });
});
