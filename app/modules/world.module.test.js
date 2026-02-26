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

  test('adds town footprint blockers to occupancy input', async () => {
    const bus = createFakeBus();
    let occupancyEntities = null;

    registerWorldModule(
      {
        bus,
        env: { fetch: async () => {} }
      },
      {
        loadGame: async () => ({
          scenario: {
            meta: { id: 'demo' },
            terrain: { width: 12, height: 12, tiles: new Array(144).fill(0) },
            entities: [
              { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
              { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 6, y: 6 } }
            ]
          },
          definitions: { hero: { id: 'hero' }, towns: { CASTLE: { name: 'Castle' } } }
        }),
        createMap: () => ({
          inBounds: ({ x, y }) => x >= 0 && y >= 0 && x < 12 && y < 12
        }),
        createOccupancyIndex: (entities) => {
          occupancyEntities = entities;
          return { entities };
        }
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    await Promise.resolve();

    expect(occupancyEntities).toBeTruthy();
    expect(occupancyEntities).toHaveLength(10);

    const townBlockers = occupancyEntities.filter((entity) => entity.kind === 'TOWN_BLOCKER');
    expect(townBlockers).toHaveLength(8);
  });
});
