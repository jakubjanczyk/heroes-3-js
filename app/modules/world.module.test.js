import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_APP_START,
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { tileKey } from '../../engine/tile-utils.js';
import { findHero } from '../../game/domain/entity-queries.js';
import { registerWorldModule } from './world.module.js';
import { createFakeBus, getLastEmittedByType } from '../../tests/test-utils/fake-bus.js';

async function flushMicrotasks(times = 3) {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('world module', () => {
  test('loads world on app start and emits world-ready fact once', async () => {
    const bus = createFakeBus();
    const calls = {
      loadGame: 0,
      buildWorld: 0
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
        buildWorld: ({ scenario }) => {
          calls.buildWorld += 1;
          return {
            map: { terrain: scenario.terrain },
            occupancy: { entities: scenario.entities },
            worldState: {
              getEntityById() {
                return null;
              }
            }
          };
        }
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    expect(calls).toEqual({
      loadGame: 1,
      buildWorld: 1
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
    await flushMicrotasks();

    expect(bus.emitted).toContainEqual({
      type: APP_FACT_WORLD_LOAD_FAILED,
      detail: {
        error: expectedError
      }
    });
  });

  test('adds town footprint blockers to occupancy input', async () => {
    const bus = createFakeBus();
    let builtScenario = null;

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
        buildWorld: ({ scenario }) => {
          builtScenario = scenario;
          return {
            map: { inBounds: () => true },
            occupancy: { entities: scenario.entities },
            worldState: {
              getEntityById() {
                return null;
              }
            }
          };
        }
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    expect(builtScenario?.entities).toHaveLength(2);
  });

  test('emits pristine world-ready snapshot without replay-derived fields', async () => {
    const bus = createFakeBus();

    registerWorldModule(
      {
        bus,
        env: {
          fetch: async () => {}
        }
      },
      {
        loadGame: async () => ({
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
        }),
        createMap: () => ({
          inBounds: ({ x, y }) => x >= 0 && y >= 0 && x < 4 && y < 1
        }),
        createOccupancyIndex: () => ({})
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    const worldReady = getLastEmittedByType(bus, APP_FACT_WORLD_READY);
    expect(worldReady?.detail.turn).toBeUndefined();
    expect(worldReady?.detail.resourceTotalsByType).toBeUndefined();
    expect(worldReady?.detail.previewTargetTile).toBeUndefined();
  });

  test('ignores hero moved fact when heroId is missing', async () => {
    const bus = createFakeBus({ snapshotDetail: true });
    let moveCalls = 0;

    registerWorldModule(
      {
        bus,
        env: {
          fetch: async () => {}
        }
      },
      {
        loadGame: async () => ({
          scenario: {
            meta: { id: 'demo' },
            terrain: { width: 2, height: 1, tiles: [0, 0] },
            entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
          },
          definitions: {}
        }),
        createMap: () => ({
          inBounds: ({ x, y }) => x >= 0 && y >= 0 && x < 2 && y < 1
        }),
        createOccupancyIndex: () => ({
          moveEntity() {
            moveCalls += 1;
          },
          removeEntity() {}
        })
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 1, y: 0 } });

    const worldReady = getLastEmittedByType(bus, APP_FACT_WORLD_READY);
    const hero = worldReady?.detail.scenario.entities.find((entity) => entity.id === 'hero-1');

    expect(moveCalls).toBe(0);
    expect(hero?.tile).toEqual({ x: 0, y: 0 });
  });

  test('restores persistent entities at hero previous tile after movement', async () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const restoreCalls = [];

    registerWorldModule(
      {
        bus,
        env: {
          fetch: async () => {}
        }
      },
      {
        loadGame: async () => ({
          scenario: {
            meta: { id: 'demo' },
            terrain: { width: 4, height: 1, tiles: [0, 0, 0, 0] },
            entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 0 } }]
          },
          definitions: {}
        }),
        buildWorld: ({ scenario }) => {
          const entities = scenario.entities;
          return {
            map: {
              inBounds: ({ x, y }) => x >= 0 && y >= 0 && x < 4 && y < 1
            },
            occupancy: {},
            worldState: {
              getEntityById(entityId) {
                return entities.find((entity) => entity.id === entityId) ?? null;
              },
              moveEntity({ entityId, toTile }) {
                const entity = entities.find((candidate) => candidate.id === entityId) ?? null;
                if (!entity) {
                  return null;
                }

                entity.tile = toTile;
                return entity;
              },
              restorePersistentEntitiesAt(tile) {
                restoreCalls.push(tile);
                return false;
              }
            }
          };
        }
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    bus.emit(APP_FACT_HERO_MOVED, {
      heroId: 'hero-1',
      from: { x: 1, y: 0 },
      to: { x: 2, y: 0 }
    });

    expect(restoreCalls).toEqual([{ x: 1, y: 0 }]);
  });

  test('keeps world state in sync when replayed world facts are re-emitted', async () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const occupancyState = {
      byEntityId: new Map(),
      byTile: new Map()
    };

    registerWorldModule(
      {
        bus,
        env: {
          fetch: async () => {}
        }
      },
      {
        loadGame: async () => ({
          scenario: {
            meta: { id: 'demo' },
            terrain: { width: 4, height: 1, tiles: [0, 0, 0, 0] },
            entities: [
              { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
              { id: 'monster-1', kind: 'MONSTER', tile: { x: 1, y: 0 } },
              { id: 'resource-1', kind: 'RESOURCE', tile: { x: 2, y: 0 } }
            ]
          },
          definitions: {}
        }),
        buildWorld: ({ scenario }) => {
          const entities = scenario.entities;
          occupancyState.byEntityId.clear();
          occupancyState.byTile.clear();
          for (const entity of entities) {
            occupancyState.byEntityId.set(entity.id, tileKey(entity.tile));
            occupancyState.byTile.set(tileKey(entity.tile), entity.id);
          }

          const occupancy = {
            moveEntity(entity, toTile) {
              const previousKey = occupancyState.byEntityId.get(entity.id);
              if (previousKey) {
                occupancyState.byTile.delete(previousKey);
              }

              const nextKey = tileKey(toTile);
              occupancyState.byEntityId.set(entity.id, nextKey);
              occupancyState.byTile.set(nextKey, entity.id);
            },
            removeEntity(entity) {
              if (!entity) {
                return;
              }

              const key = occupancyState.byEntityId.get(entity.id);
              if (key) {
                occupancyState.byTile.delete(key);
              }
              occupancyState.byEntityId.delete(entity.id);
            }
          };

          return {
            map: {
              inBounds: ({ x, y }) => x >= 0 && y >= 0 && x < 4 && y < 1
            },
            occupancy,
            worldState: {
              getEntityById(entityId) {
                return entities.find((entity) => entity.id === entityId) ?? null;
              },
              removeEntityById(entityId) {
                const index = entities.findIndex((entity) => entity.id === entityId);
                if (index < 0) {
                  return null;
                }
                const [removed] = entities.splice(index, 1);
                occupancy.removeEntity(removed);
                return removed;
              },
              moveEntity({ entityId, toTile }) {
                const entity = entities.find((candidate) => candidate.id === entityId) ?? null;
                if (!entity) {
                  return null;
                }
                occupancy.moveEntity(entity, toTile);
                entity.tile = toTile;
                return entity;
              },
              restorePersistentEntitiesAt() {
                return false;
              }
            }
          };
        }
      }
    );

    bus.emit(APP_COMMAND_APP_START, {});
    await flushMicrotasks();

    bus.emit(APP_FACT_HERO_MOVED, { heroId: 'hero-1', to: { x: 3, y: 0 } });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, { entityId: 'resource-1' });
    bus.emit(APP_FACT_MONSTER_DEFEATED, { entityId: 'monster-1' });

    const worldReady = getLastEmittedByType(bus, APP_FACT_WORLD_READY);
    const hero = findHero(worldReady?.detail.scenario.entities ?? []);
    const resource = worldReady?.detail.scenario.entities.find((entity) => entity.id === 'resource-1');
    const monster = worldReady?.detail.scenario.entities.find((entity) => entity.id === 'monster-1');

    expect(hero?.tile).toEqual({ x: 3, y: 0 });
    expect(resource).toBeFalsy();
    expect(monster).toBeFalsy();
    expect(occupancyState.byEntityId.get('hero-1')).toBe('3,0');
    expect(occupancyState.byEntityId.has('resource-1')).toBe(false);
    expect(occupancyState.byEntityId.has('monster-1')).toBe(false);
  });

});
