import { describe, expect, test } from 'vitest';

import {
  isArrivalInteractionEntity,
  requiresSteppingIntoTarget,
  resolveArrivalOutcome,
  toMovementInteractionKind
} from './entity-behaviors.js';

describe('entity behaviors', () => {
  test('identifies arrival interaction entity kinds', () => {
    expect(isArrivalInteractionEntity({ kind: 'MINE' })).toBe(true);
    expect(isArrivalInteractionEntity({ kind: 'MONSTER' })).toBe(true);
    expect(isArrivalInteractionEntity({ kind: 'RESOURCE' })).toBe(true);
    expect(isArrivalInteractionEntity({ kind: 'TOWN' })).toBe(true);
    expect(isArrivalInteractionEntity({ kind: 'HERO' })).toBe(false);
    expect(isArrivalInteractionEntity(null)).toBe(false);
  });

  test('maps entity kinds to movement interaction kind', () => {
    expect(toMovementInteractionKind({ kind: 'MINE' })).toBe('MINE_ENTER');
    expect(toMovementInteractionKind({ kind: 'MONSTER' })).toBe('MONSTER_COMBAT');
    expect(toMovementInteractionKind({ kind: 'RESOURCE' })).toBe('RESOURCE_COLLECT');
    expect(toMovementInteractionKind({ kind: 'TOWN' })).toBe('TOWN_VISIT');
    expect(toMovementInteractionKind({ kind: 'HERO' })).toBe(null);
  });

  test('returns whether interaction requires stepping onto target tile', () => {
    expect(requiresSteppingIntoTarget({ kind: 'MINE' })).toBe(true);
    expect(requiresSteppingIntoTarget({ kind: 'MONSTER' })).toBe(false);
    expect(requiresSteppingIntoTarget({ kind: 'RESOURCE' })).toBe(false);
    expect(requiresSteppingIntoTarget({ kind: 'TOWN' })).toBe(true);
    expect(requiresSteppingIntoTarget({ kind: 'HERO' })).toBe(false);
  });

  test('resolves monster outcome with definition name fallback', () => {
    const withDefinition = resolveArrivalOutcome({
      entity: { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON' },
      definitions: {
        monsters: {
          SKELETON: { name: 'Skeleton' }
        }
      },
      tile: { x: 2, y: 3 }
    });

    expect(withDefinition).toEqual({
      kind: 'MONSTER_DEFEATED',
      entityId: 'monster-1',
      entityType: 'SKELETON',
      tile: { x: 2, y: 3 },
      modal: {
        title: 'Interaction',
        message: 'Skeleton defeated'
      }
    });

    const fallback = resolveArrivalOutcome({
      entity: { id: 'monster-2', kind: 'MONSTER', type: 'UNKNOWN' },
      definitions: {},
      tile: { x: 0, y: 0 }
    });

    expect(fallback?.modal?.message).toBe('Monster defeated');
  });

  test('resolves mine outcome without modal', () => {
    const outcome = resolveArrivalOutcome({
      entity: { id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE' },
      definitions: {
        mines: {
          GOLD_MINE: { name: 'Gold mine' }
        }
      },
      tile: { x: 9, y: 2 }
    });

    expect(outcome).toEqual({
      kind: 'MINE_ENTERED',
      entityId: 'mine-1',
      entityType: 'GOLD_MINE',
      tile: { x: 9, y: 2 },
      mineName: 'Gold mine'
    });
  });

  test('resolves resource outcome with finite amount fallback', () => {
    const outcome = resolveArrivalOutcome({
      entity: { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE' },
      definitions: {
        resources: {
          GOLD_PILE: { name: 'Gold pile', amount: '100' }
        }
      },
      tile: { x: 1, y: 1 }
    });

    expect(outcome).toEqual({
      kind: 'RESOURCE_COLLECTED',
      entityId: 'resource-1',
      entityType: 'GOLD_PILE',
      tile: { x: 1, y: 1 },
      amount: 100,
      resourceName: 'Gold pile'
    });

    const invalidAmountOutcome = resolveArrivalOutcome({
      entity: { id: 'resource-2', kind: 'RESOURCE', type: 'WOOD_PILE' },
      definitions: {
        resources: {
          WOOD_PILE: { name: 'Wood pile', amount: 'n/a' }
        }
      },
      tile: { x: 2, y: 2 }
    });

    expect(invalidAmountOutcome?.amount).toBe(0);
  });

  test('resolves town outcome and returns modal payload', () => {
    const outcome = resolveArrivalOutcome({
      entity: { id: 'town-1', kind: 'TOWN', type: 'CASTLE' },
      definitions: {
        towns: {
          CASTLE: { name: 'Castle' }
        }
      },
      tile: { x: 3, y: 4 }
    });

    expect(outcome).toEqual({
      kind: 'TOWN_VISITED',
      entityId: 'town-1',
      entityType: 'CASTLE',
      tile: { x: 3, y: 4 },
      townName: 'Castle',
      modal: {
        title: 'Interaction',
        message: 'Castle visited'
      }
    });
  });

  test('returns null for unsupported entity kind', () => {
    const outcome = resolveArrivalOutcome({
      entity: { id: 'hero-1', kind: 'HERO', type: 'HERO' },
      definitions: {},
      tile: { x: 0, y: 0 }
    });

    expect(outcome).toBe(null);
  });
});
