import { describe, expect, test } from 'vitest';

import { sameTile } from '../../engine/tile-utils.js';
import {
  INTERACTION_OUTCOME_KIND_MINE_ENTERED,
  INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
  INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
  INTERACTION_OUTCOME_KIND_TOWN_VISITED
} from '../domain/interaction-kinds.js';
import { createInteractionSystem } from './interaction-system.js';

// The hero's own tile never hides what is under it, so lookups skip heroes like the app does.
function createOccupantLookup(entities) {
  return (tile) =>
    entities.find((entity) => entity.kind !== 'HERO' && sameTile(entity.tile, tile)) ?? null;
}

describe('interaction system', () => {
  test('resolves monster outcome without mutating entities', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 0 } };
    const monster = { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } };
    const entities = [hero, monster];

    const interactions = createInteractionSystem({
      getOccupantAt: createOccupantLookup(entities),
      definitions: {
        monsters: {
          SKELETON: { name: 'Skeleton' }
        }
      }
    });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 1, y: 0 },
      arrivingEntityId: 'hero-1'
    });

    expect(outcome).toEqual({
      kind: INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
      entityId: 'monster-1',
      entityType: 'SKELETON',
      tile: { x: 1, y: 0 },
      removesEntity: true,
      modal: {
        title: 'Interaction',
        message: 'Skeleton defeated'
      }
    });

    expect(entities).toEqual([hero, monster]);
  });

  test('returns null when destination has no monster', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const interactions = createInteractionSystem({ getOccupantAt: createOccupantLookup(entities) });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 0, y: 0 },
      arrivingEntityId: 'hero-1'
    });

    expect(outcome).toBe(null);
    expect(entities).toEqual([hero]);
  });

  test('resolves resource outcome without mutating entities', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 0 } };
    const resource = { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } };
    const entities = [hero, resource];

    const interactions = createInteractionSystem({
      getOccupantAt: createOccupantLookup(entities),
      definitions: {
        resources: {
          GOLD_PILE: { name: 'Gold pile', amount: 100 }
        }
      }
    });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 1, y: 0 },
      arrivingEntityId: 'hero-1'
    });

    expect(outcome).toEqual({
      kind: INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
      entityId: 'resource-1',
      entityType: 'GOLD_PILE',
      tile: { x: 1, y: 0 },
      removesEntity: true,
      amount: 100,
      resourceName: 'Gold pile'
    });

    expect(entities).toEqual([hero, resource]);
  });

  test('resolves town outcome and leaves town on map', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 0 } };
    const town = { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } };
    const entities = [hero, town];

    const interactions = createInteractionSystem({
      getOccupantAt: createOccupantLookup(entities),
      definitions: {
        towns: {
          CASTLE: { name: 'Castle' }
        }
      }
    });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 1, y: 0 },
      arrivingEntityId: 'hero-1'
    });

    expect(outcome).toEqual({
      kind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
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
  });

  test('resolves mine outcome and leaves mine on map', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 2, y: 0 } };
    const mine = { id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 2, y: 0 } };
    const entities = [hero, mine];

    const interactions = createInteractionSystem({
      getOccupantAt: createOccupantLookup(entities),
      definitions: {
        mines: {
          GOLD_MINE: { name: 'Gold mine' }
        }
      }
    });

    const outcome = interactions.resolveArrivalAtDestination({
      destinationTile: { x: 2, y: 0 },
      arrivingEntityId: 'hero-1'
    });

    expect(outcome).toEqual({
      kind: INTERACTION_OUTCOME_KIND_MINE_ENTERED,
      entityId: 'mine-1',
      entityType: 'GOLD_MINE',
      tile: { x: 2, y: 0 },
      mineName: 'Gold mine'
    });
    expect(entities).toEqual([hero, mine]);
  });
});
