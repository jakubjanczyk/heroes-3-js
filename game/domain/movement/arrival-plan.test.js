import { describe, expect, test } from 'vitest';

import {
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT
} from '../interaction-kinds.js';
import { buildArrivalPlan } from './arrival-plan.js';

describe('arrival plan', () => {
  test('returns null when destination tile has no occupant', () => {
    const plan = buildArrivalPlan({
      occupancy: {
        getAt() {
          return null;
        }
      },
      targetTile: { x: 2, y: 0 },
      movingEntityId: 'hero-1'
    });

    expect(plan).toBe(null);
  });

  test('builds stop-before plan for monster destination', () => {
    const plan = buildArrivalPlan({
      occupancy: {
        getAt() {
          return { id: 'monster-1', kind: 'MONSTER', tile: { x: 1, y: 0 } };
        }
      },
      targetTile: { x: 1, y: 0 },
      movingEntityId: 'hero-1'
    });

    expect(plan).toEqual({
      entityId: 'monster-1',
      movementInteractionKind: MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
      stopBeforeTarget: true
    });
  });

  test('builds step-into-target plan for town destination', () => {
    const plan = buildArrivalPlan({
      occupancy: {
        getAt() {
          return { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } };
        }
      },
      targetTile: { x: 1, y: 0 },
      movingEntityId: 'hero-1'
    });

    expect(plan).toEqual({
      entityId: 'town-1',
      movementInteractionKind: MOVEMENT_INTERACTION_KIND_TOWN_VISIT,
      stopBeforeTarget: false
    });
  });

  test('returns null when destination interaction is currently blocked', () => {
    const plan = buildArrivalPlan({
      occupancy: {
        getAt() {
          return { id: 'resource-1', kind: 'RESOURCE', tile: { x: 1, y: 0 } };
        }
      },
      targetTile: { x: 1, y: 0 },
      movingEntityId: 'hero-1',
      isInteractionBlocked: (entity) => entity.id === 'resource-1'
    });

    expect(plan).toBe(null);
  });
});
