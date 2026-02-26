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
});
