import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_APP_START,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { registerWorldModule } from './world.module.js';
import { createFakeBus, getLastEmittedByType } from '../../tests/test-utils/fake-bus.js';

async function flushMicrotasks(times = 3) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

function createDemoGame() {
  return {
    scenario: {
      meta: { id: 'demo' },
      terrain: { width: 4, height: 1, tiles: [0, 0, 0, 0] },
      entities: [
        { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 3, y: 0 } }
      ]
    },
    definitions: {
      resources: {
        GOLD_PILE: { name: 'Gold pile', amount: 100 }
      }
    }
  };
}

describe('world module', () => {
  test('loads world on app start and emits world-ready fact once', async () => {
    const bus = createFakeBus();
    let loadGameCalls = 0;

    registerWorldModule(
      {
        bus,
        env: { fetch: async () => {} }
      },
      {
        loadGame: async () => {
          loadGameCalls += 1;
          return createDemoGame();
        }
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    expect(loadGameCalls).toBe(1);
    expect(bus.emitted.filter((entry) => entry.type === APP_FACT_WORLD_READY)).toHaveLength(1);

    const worldReady = getLastEmittedByType(bus, APP_FACT_WORLD_READY);
    expect(worldReady?.detail.scenario.meta.id).toBe('demo');
    expect(worldReady?.detail.definitions.resources.GOLD_PILE.amount).toBe(100);
    expect(worldReady?.detail.map.width).toBe(4);
    expect(worldReady?.detail.map.isPassable({ x: 1, y: 0 })).toBe(true);
  });

  test('emits world-load-failed when loadGame throws', async () => {
    const bus = createFakeBus();
    const expectedError = new Error('boom');

    registerWorldModule(
      {
        bus,
        env: { fetch: async () => {} }
      },
      {
        loadGame: async () => {
          throw expectedError;
        }
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    expect(bus.emitted).toContainEqual({
      type: APP_FACT_WORLD_LOAD_FAILED,
      detail: {
        error: expectedError
      }
    });
  });

  test('emits a deeply frozen snapshot with no live world state', async () => {
    const bus = createFakeBus();

    registerWorldModule(
      {
        bus,
        env: { fetch: async () => {} }
      },
      {
        loadGame: async () => createDemoGame()
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    const snapshot = getLastEmittedByType(bus, APP_FACT_WORLD_READY)?.detail;
    expect(Object.keys(snapshot).sort()).toEqual(['definitions', 'map', 'scenario']);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.scenario.entities)).toBe(true);
    expect(Object.isFrozen(snapshot.scenario.entities[0].tile)).toBe(true);
    expect(Object.isFrozen(snapshot.definitions.resources.GOLD_PILE)).toBe(true);
    expect(Object.isFrozen(snapshot.map)).toBe(true);
  });
});
