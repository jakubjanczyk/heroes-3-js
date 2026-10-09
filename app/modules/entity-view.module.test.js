import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../events.js';
import { createMap } from '../../engine/map.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerEntityViewModule } from './entity-view.module.js';

describe('entity view module', () => {
  test('updates hero position in place without rerendering the layer', () => {
    const bus = createFakeBus();
    const renderCalls = [];
    const heroElement = {
      style: {
        setProperty(name, value) {
          this[name] = value;
        }
      },
      dataset: {}
    };
    const entityLayer = {
      id: 'entity-layer',
      clientWidth: 640,
      clientHeight: 480,
      style: {
        setProperty(name, value) {
          this[name] = value;
        }
      },
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
        },
        config: {
          movementStepDelayMs: 240
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

    expect(renderCalls).toHaveLength(1);
    expect(renderCalls[0].entities).toEqual([{ id: 'hero-1' }]);
    expect(entityLayer.style['--hero-step-duration']).toBe('240ms');
    expect(heroElement.dataset.tileX).toBe('1');
    expect(heroElement.dataset.tileY).toBe('0');
    expect(heroElement.style.transform).toBe('translate(36px, 4px)');
  });

  test('uses hero presentation offsets when updating position in place', () => {
    const bus = createFakeBus();
    const heroElement = {
      style: {
        setProperty(name, value) {
          this[name] = value;
        }
      },
      dataset: {}
    };
    const entityLayer = {
      id: 'entity-layer',
      clientWidth: 640,
      clientHeight: 480,
      style: {
        setProperty(name, value) {
          this[name] = value;
        }
      },
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
        renderEntityLayer: () => {},
        getEntityStyle: ({ entity }) => {
          if (entity.id === 'hero-1') {
            return {
              className: 'entity entity--hero',
              width: 30,
              height: 30,
              offsetX: -20,
              offsetY: -18
            };
          }

          return {
            className: 'entity',
            width: 10,
            height: 10,
            offsetX: -5,
            offsetY: -5
          };
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      map,
      scenario: { entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO' }] }
    });
    bus.emit(APP_FACT_HERO_MOVED, { heroId: 'hero-1', to: { x: 1, y: 0 } });

    expect(heroElement.style.transform).toBe('translate(28px, -2px)');
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

  test('keeps hero transitions disabled while restore is active', () => {
    const bus = createFakeBus();
    const heroElements = [
      {
        style: {
          setProperty(name, value) {
            this[name] = value;
          }
        },
        dataset: {}
      }
    ];
    const entityLayer = {
      id: 'entity-layer',
      clientWidth: 640,
      clientHeight: 480,
      style: {
        setProperty(name, value) {
          this[name] = value;
        }
      },
      querySelector(selector) {
        if (selector === '.entity--hero[data-entity-id="hero-1"]') {
          return heroElements[0] ?? null;
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector === '.entity--hero') {
          return heroElements;
        }
        return [];
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
              if (selector === '.entity-layer') {
                return entityLayer;
              }
              return null;
            },
            createElement(tag) {
              return { tag };
            }
          }
        }
      },
      {
        renderEntityLayer: () => {
          heroElements[0] = {
            style: {
              setProperty(name, value) {
                this[name] = value;
              }
            },
            dataset: {}
          };
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      map,
      scenario: { entities: [{ id: 'hero-1' }] }
    });
    bus.emit(APP_UI_RESTORE_STARTED, {});
    bus.emit(APP_FACT_HERO_MOVED, { heroId: 'hero-1', to: { x: 1, y: 0 } });

    expect(heroElements[0].style.transition).toBe('none');

    bus.emit(APP_FACT_MONSTER_DEFEATED, { entityId: 'monster-1' });

    expect(heroElements[0].style.transition).toBe('none');

    bus.emit(APP_UI_RESTORE_COMPLETED, {});

    expect(heroElements[0].style.transition).toBe('');
  });

  function setupEntityViewWithEntityElements({ config = {} } = {}) {
    const bus = createFakeBus();
    const elementsById = new Map();
    const createEntityElement = (entityId) => {
      const classes = new Set();
      const element = {
        removed: false,
        classList: {
          add: (name) => classes.add(name),
          contains: (name) => classes.has(name)
        },
        remove() {
          element.removed = true;
          elementsById.delete(entityId);
        }
      };
      elementsById.set(entityId, element);
      return element;
    };
    const entityLayer = {
      style: { setProperty() {} },
      querySelector(selector) {
        const match = /^\[data-entity-id="(.+)"\]$/.exec(selector);
        return match ? elementsById.get(match[1]) ?? null : null;
      },
      querySelectorAll() {
        return [];
      }
    };

    registerEntityViewModule(
      {
        bus,
        env: {
          document: {
            querySelector: (selector) => (selector === '.entity-layer' ? entityLayer : null),
            createElement: () => ({})
          }
        },
        config
      },
      { renderEntityLayer: () => {} }
    );

    bus.emit(APP_FACT_WORLD_READY, { map: {}, scenario: { entities: [] } });

    return { bus, createEntityElement };
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  test('fades out defeated monster and removes it after the configured duration', () => {
    vi.useFakeTimers();
    const { bus, createEntityElement } = setupEntityViewWithEntityElements({
      config: { monsterDefeatFadeOutMs: 100 }
    });
    const monster = createEntityElement('monster-1');

    bus.emit(APP_FACT_MONSTER_DEFEATED, { entityId: 'monster-1' });

    expect(monster.classList.contains('entity--monster-defeating')).toBe(true);
    expect(monster.removed).toBe(false);

    vi.advanceTimersByTime(100);

    expect(monster.removed).toBe(true);
  });

  test('fades out collected resource and removes it after the configured duration', () => {
    vi.useFakeTimers();
    const { bus, createEntityElement } = setupEntityViewWithEntityElements({
      config: { resourceCollectFadeOutMs: 50 }
    });
    const resource = createEntityElement('resource-1');

    bus.emit(APP_FACT_RESOURCE_COLLECTED, { entityId: 'resource-1' });

    expect(resource.classList.contains('entity--resource-collecting')).toBe(true);
    expect(resource.removed).toBe(false);

    vi.advanceTimersByTime(50);

    expect(resource.removed).toBe(true);
  });

  test('removes entities immediately without fade-out while restoring', () => {
    const { bus, createEntityElement } = setupEntityViewWithEntityElements({
      config: { monsterDefeatFadeOutMs: 100, resourceCollectFadeOutMs: 100 }
    });
    const monster = createEntityElement('monster-1');
    const resource = createEntityElement('resource-1');

    bus.emit(APP_UI_RESTORE_STARTED, {});
    bus.emit(APP_FACT_MONSTER_DEFEATED, { entityId: 'monster-1' });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, { entityId: 'resource-1' });

    expect(monster.removed).toBe(true);
    expect(monster.classList.contains('entity--monster-defeating')).toBe(false);
    expect(resource.removed).toBe(true);
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
