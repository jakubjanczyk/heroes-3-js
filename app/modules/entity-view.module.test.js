import { describe, expect, test } from 'vitest';

import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { createMap } from '../../engine/map.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerEntityViewModule } from './entity-view.module.js';

describe('entity view module', () => {
  test('updates hero position in place and rerenders for interaction facts', () => {
    const bus = createFakeBus();
    const renderCalls = [];
    const heroElement = {
      style: {},
      dataset: {}
    };
    const entityLayer = {
      id: 'entity-layer',
      clientWidth: 640,
      clientHeight: 480,
      querySelector(selector) {
        if (selector === '.entity--hero[data-entity-id="hero-1"]') {
          return heroElement;
        }
        return null;
      }
    };
    const map = createMap({
      width: 4,
      height: 1,
      tiles: [0, 0, 0, 0]
    });

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
      map,
      scenario: { entities: [{ id: 'hero-1' }] }
    });
    bus.emit(APP_FACT_HERO_MOVED, { heroId: 'hero-1', to: { x: 1, y: 0 } });
    bus.emit(APP_FACT_MONSTER_DEFEATED, { entityId: 'monster-1' });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, { entityId: 'resource-1' });

    expect(renderCalls).toHaveLength(3);
    expect(renderCalls[0].entities).toEqual([{ id: 'hero-1' }]);
    expect(heroElement.dataset.tileX).toBe('1');
    expect(heroElement.dataset.tileY).toBe('0');
    expect(heroElement.style.transform).toBe('translate(36px, 4px)');
  });

  test('falls back to rerender when hero element is missing', () => {
    const bus = createFakeBus();
    const renderCalls = [];
    const map = createMap({
      width: 4,
      height: 1,
      tiles: [0, 0, 0, 0]
    });
    const entityLayer = {
      id: 'entity-layer',
      querySelector() {
        return null;
      }
    };

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
      map,
      scenario: { entities: [{ id: 'hero-1' }] }
    });
    bus.emit(APP_FACT_HERO_MOVED, { heroId: 'hero-1', to: { x: 1, y: 0 } });

    expect(renderCalls).toHaveLength(2);
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
