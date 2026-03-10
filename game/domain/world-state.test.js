import { describe, expect, test } from 'vitest';

import { createWorldState } from './world-state.js';

describe('world state', () => {
  test('gets entities by id', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const state = createWorldState({
      scenario: { entities: [hero] },
      occupancy: {}
    });

    expect(state.getEntityById('hero-1')).toBe(hero);
    expect(state.getEntityById('missing')).toBe(null);
  });

  test('moves entity and syncs occupancy index', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 1 } };
    const moveCalls = [];
    const state = createWorldState({
      scenario: { entities: [hero] },
      occupancy: {
        moveEntity(entity, toTile) {
          moveCalls.push({ entity, toTile });
        }
      }
    });

    const moved = state.moveEntity({ entityId: 'hero-1', toTile: { x: 2.9, y: 3.1 } });

    expect(moved).toBe(hero);
    expect(hero.tile).toEqual({ x: 2, y: 3 });
    expect(moveCalls).toEqual([
      {
        entity: hero,
        toTile: { x: 2, y: 3 }
      }
    ]);
  });

  test('does not move entity for invalid tile payload', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    let moveCalled = false;
    const state = createWorldState({
      scenario: { entities: [hero] },
      occupancy: {
        moveEntity() {
          moveCalled = true;
        }
      }
    });

    const moved = state.moveEntity({ entityId: 'hero-1', toTile: { x: 'x', y: 0 } });

    expect(moved).toBe(null);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(moveCalled).toBe(false);
  });

  test('removes entity from scenario and occupancy', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const resource = { id: 'resource-1', kind: 'RESOURCE', tile: { x: 1, y: 0 } };
    const removeCalls = [];
    const scenario = { entities: [hero, resource] };
    const state = createWorldState({
      scenario,
      occupancy: {
        removeEntity(entity) {
          removeCalls.push(entity);
        }
      }
    });

    const removed = state.removeEntityById('resource-1');

    expect(removed).toBe(resource);
    expect(scenario.entities).toEqual([hero]);
    expect(removeCalls).toEqual([resource]);
  });

  test('restores persistent town occupancy at tile', () => {
    const town = { id: 'town-1', kind: 'TOWN', tile: { x: 4, y: 5 } };
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 4, y: 5 } };
    const moveCalls = [];
    const state = createWorldState({
      scenario: { entities: [hero, town] },
      occupancy: {
        moveEntity(entity, toTile) {
          moveCalls.push({ entity, toTile });
        }
      }
    });

    expect(state.restorePersistentEntitiesAt({ x: 4, y: 5 })).toBe(true);
    expect(state.restorePersistentEntitiesAt({ x: 0, y: 0 })).toBe(false);
    expect(moveCalls).toEqual([
      {
        entity: town,
        toTile: { x: 4, y: 5 }
      }
    ]);
  });
});
