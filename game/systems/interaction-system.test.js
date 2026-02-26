import { describe, expect, test } from 'vitest';

import { createOccupancyIndex } from '../../engine/occupancy.js';
import { createInteractionSystem } from './interaction-system.js';

describe('interaction system', () => {
  test('resolves monster outcome, then removes monster only when finalized', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 0 } };
    const monster = { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } };
    const entities = [hero, monster];
    const occupancy = createOccupancyIndex(entities);
    occupancy.moveEntity(hero, hero.tile);

    const interactions = createInteractionSystem({
      entities,
      occupancy,
      definitions: {
        monsters: {
          SKELETON: { name: 'Skeleton' }
        }
      }
    });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 1, y: 0 }
    });

    expect(outcome).toEqual({
      kind: 'MONSTER_DEFEATED',
      entityId: 'monster-1',
      entityType: 'SKELETON',
      tile: { x: 1, y: 0 },
      modal: {
        title: 'Interaction',
        message: 'Skeleton defeated'
      }
    });

    expect(entities).toEqual([hero, monster]);
    expect(occupancy.getAt({ x: 1, y: 0 })?.id).toBe('hero-1');

    const finalized = interactions.finalizeMonsterDefeat({ entityId: 'monster-1' });
    expect(finalized).toBe(true);
    expect(entities).toEqual([hero]);
    expect(occupancy.getAt({ x: 1, y: 0 })?.id).toBe('hero-1');
  });

  test('returns null when destination has no monster', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const occupancy = createOccupancyIndex(entities);
    const interactions = createInteractionSystem({ entities, occupancy });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 0, y: 0 }
    });

    expect(outcome).toBe(null);
    expect(entities).toEqual([hero]);
  });

  test('resolves resource outcome and removes resource immediately when finalized', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 0 } };
    const resource = { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } };
    const entities = [hero, resource];
    const occupancy = createOccupancyIndex(entities);
    occupancy.moveEntity(hero, hero.tile);

    const interactions = createInteractionSystem({
      entities,
      occupancy,
      definitions: {
        resources: {
          GOLD_PILE: { name: 'Gold pile', amount: 100 }
        }
      }
    });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 1, y: 0 }
    });

    expect(outcome).toEqual({
      kind: 'RESOURCE_COLLECTED',
      entityId: 'resource-1',
      entityType: 'GOLD_PILE',
      tile: { x: 1, y: 0 },
      amount: 100,
      resourceName: 'Gold pile'
    });

    const finalized = interactions.finalizeResourceCollection({ entityId: 'resource-1' });
    expect(finalized).toBe(true);
    expect(entities).toEqual([hero]);
    expect(occupancy.getAt({ x: 1, y: 0 })?.id).toBe('hero-1');
  });

  test('resolves town outcome and leaves town on map', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 0 } };
    const town = { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } };
    const entities = [hero, town];
    const occupancy = createOccupancyIndex(entities);
    occupancy.moveEntity(hero, hero.tile);

    const interactions = createInteractionSystem({
      entities,
      occupancy,
      definitions: {
        towns: {
          CASTLE: { name: 'Castle' }
        }
      }
    });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 1, y: 0 }
    });

    expect(outcome).toEqual({
      kind: 'TOWN_VISITED',
      entityId: 'town-1',
      entityType: 'CASTLE',
      tile: { x: 1, y: 0 },
      townName: 'Castle',
      modal: {
        title: 'Interaction',
        message: 'Castle visited'
      }
    });
    expect(entities).toEqual([hero, town]);
    expect(occupancy.getAt({ x: 1, y: 0 })?.id).toBe('hero-1');
  });
});
