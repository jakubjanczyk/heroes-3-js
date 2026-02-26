import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_APP_START,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { registerWorldModule } from './world.module.js';
import { createFakeBus, getLastEmittedByType } from '../../tests/test-utils/fake-bus.js';

describe('world module', () => {
  test('loads world on app start and emits world-ready fact once', async () => {
    const bus = createFakeBus();
    const calls = {
      loadGame: 0,
      createMap: 0,
      createOccupancyIndex: 0
    };

    registerWorldModule(
      {
        bus,
        env: { fetch: async () => {} }
      },
      {
        loadGame: async () => {
          calls.loadGame += 1;
          return {
            scenario: {
              meta: { id: 'demo' },
              terrain: { width: 1, height: 1, tiles: [0] },
              entities: []
            },
            definitions: { hero: { id: 'hero' } }
          };
        },
        createMap: (terrain) => {
          calls.createMap += 1;
          return { terrain };
        },
        createOccupancyIndex: (entities) => {
          calls.createOccupancyIndex += 1;
          return { entities };
        }
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    bus.emit(APP_COMMAND_APP_START, {});
    await Promise.resolve();

    expect(calls).toEqual({
      loadGame: 1,
      createMap: 1,
      createOccupancyIndex: 1
    });

    const worldReady = getLastEmittedByType(bus, APP_FACT_WORLD_READY);
    expect(worldReady?.detail.scenario.meta.id).toBe('demo');
    expect(worldReady?.detail.definitions.hero.id).toBe('hero');
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
    await Promise.resolve();

    expect(bus.emitted).toContainEqual({
      type: APP_FACT_WORLD_LOAD_FAILED,
      detail: {
        error: expectedError
      }
    });
  });
});
