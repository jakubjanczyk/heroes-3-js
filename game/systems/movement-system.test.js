import { describe, expect, test } from 'vitest';

import { createMap } from '../../engine/map.js';
import { createOccupancyIndex } from '../../engine/occupancy.js';
import {
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT
} from '../domain/interaction-kinds.js';
import { createMovementSystem } from './movement-system.js';

describe('movement system', () => {
  test('moves hero one step to reachable destination', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const steps = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      onStep: ({ to }) => {
        steps.push(to);
      }
    });

    const moved = await movement.moveHeroTo({ x: 1, y: 0 });

    expect(moved).toBe(true);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(steps).toEqual([{ x: 1, y: 0 }]);
  });

  test('spends movement points once per traversed step', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const spent = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      spendMovementPoints: (amount) => {
        spent.push(amount);
      }
    });

    const moved = await movement.moveHeroTo({ x: 2, y: 0 });

    expect(moved).toBe(true);
    expect(spent).toEqual([1, 1]);
  });

  test('does not move hero to blocked destination', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 1]
    });
    const occupancy = createOccupancyIndex(entities);

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {}
    });

    const moved = await movement.moveHeroTo({ x: 1, y: 0 });

    expect(moved).toBe(false);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
  });

  test('does not mutate occupancy index directly while stepping', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex(entities);

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {}
    });

    await movement.moveHeroTo({ x: 1, y: 0 });

    expect(occupancy.getAt({ x: 0, y: 0 })?.id).toBe('hero-1');
    expect(occupancy.getAt({ x: 1, y: 0 })).toBe(null);
  });

  test('ignores new move requests while hero is already moving', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const occupancy = createOccupancyIndex(entities);

    let resolveFirstStep;
    let sleepCalls = 0;
    const sleep = () => {
      sleepCalls += 1;
      if (sleepCalls === 1) {
        return new Promise((resolve) => {
          resolveFirstStep = resolve;
        });
      }
      return Promise.resolve();
    };

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep
    });

    const firstMovePromise = movement.moveHeroTo({ x: 2, y: 0 });
    const secondMoveResult = await movement.moveHeroTo({ x: 1, y: 0 });

    expect(secondMoveResult).toBe(false);

    resolveFirstStep();
    const firstMoveResult = await firstMovePromise;
    expect(firstMoveResult).toBe(true);
  });

  test('routes around blocked terrain when direct path is unavailable', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 3,
      height: 2,
      tiles: [
        0, 1, 0,
        0, 0, 0
      ]
    });
    const occupancy = createOccupancyIndex(entities);
    const steps = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      onStep: ({ to }) => {
        steps.push(to);
      }
    });

    const moved = await movement.moveHeroTo({ x: 2, y: 0 });

    expect(moved).toBe(true);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(steps.length).toBeGreaterThan(2);
  });

  test('returns false when no hero entity exists', async () => {
    const entities = [];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex(entities);

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {}
    });

    const moved = await movement.moveHeroTo({ x: 1, y: 0 });

    expect(moved).toBe(false);
  });

  test('returns false when destination equals current hero tile', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const steps = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      onStep: ({ to }) => {
        steps.push(to);
      }
    });

    const moved = await movement.moveHeroTo({ x: 0, y: 0 });

    expect(moved).toBe(false);
    expect(steps).toEqual([]);
  });

  test('moves as far as possible when path exceeds remaining movement points', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 4,
      height: 1,
      tiles: [0, 0, 0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const spent = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      getMaxMovableSteps: () => 1,
      spendMovementPoints: (stepCount) => {
        spent.push(stepCount);
      }
    });

    const moved = await movement.moveHeroTo({ x: 3, y: 0 });

    expect(moved).toBe(true);
    expect(spent).toEqual([1]);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(occupancy.getAt({ x: 0, y: 0 })?.id).toBe('hero-1');
    expect(occupancy.getAt({ x: 1, y: 0 })).toBe(null);
    expect(occupancy.getAt({ x: 2, y: 0 })).toBe(null);
    expect(occupancy.getAt({ x: 3, y: 0 })).toBe(null);
  });

  test('stops before adjacent monster, spends one point, and reports monster combat interaction', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const monster = { id: 'monster-1', kind: 'MONSTER', tile: { x: 1, y: 0 } };
    const entities = [hero, monster];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const spent = [];
    const steps = [];
    const finishes = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      spendMovementPoints: (amount) => {
        spent.push(amount);
      },
      onStep: ({ to }) => {
        steps.push(to);
      },
      onMoveFinish: (event) => {
        finishes.push(event);
      }
    });

    const moved = await movement.moveHeroTo({ x: 1, y: 0 });

    expect(moved).toBe(true);
    expect(spent).toEqual([1]);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(steps).toEqual([]);
    expect(occupancy.getAt({ x: 0, y: 0 })?.id).toBe('hero-1');
    expect(occupancy.getAt({ x: 1, y: 0 })?.id).toBe('monster-1');
    expect(finishes[0].interaction).toEqual({
      kind: MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
      entityId: 'monster-1',
      targetTile: { x: 1, y: 0 }
    });
  });

  test('does not trigger monster combat when move stops one step short of monster target', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const monster = { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 0 } };
    const entities = [hero, monster];
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const spent = [];
    const finishes = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      getMaxMovableSteps: () => 1,
      spendMovementPoints: (amount) => {
        spent.push(amount);
      },
      onMoveFinish: (event) => {
        finishes.push(event);
      }
    });

    const moved = await movement.moveHeroTo({ x: 2, y: 0 });

    expect(moved).toBe(true);
    expect(spent).toEqual([1]);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(occupancy.getAt({ x: 2, y: 0 })?.id).toBe('monster-1');
    expect(finishes[0].interaction).toBe(null);
  });

  test('stops before adjacent resource, spends one point, and reports resource collect interaction', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const resource = { id: 'resource-1', kind: 'RESOURCE', tile: { x: 1, y: 0 } };
    const entities = [hero, resource];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const spent = [];
    const finishes = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      spendMovementPoints: (amount) => {
        spent.push(amount);
      },
      onMoveFinish: (event) => {
        finishes.push(event);
      }
    });

    const moved = await movement.moveHeroTo({ x: 1, y: 0 });

    expect(moved).toBe(true);
    expect(spent).toEqual([1]);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(occupancy.getAt({ x: 0, y: 0 })?.id).toBe('hero-1');
    expect(occupancy.getAt({ x: 1, y: 0 })?.id).toBe('resource-1');
    expect(finishes[0].interaction).toEqual({
      kind: MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
      entityId: 'resource-1',
      targetTile: { x: 1, y: 0 }
    });
  });

  test('does not move onto a resource destination tile blocked by interaction guard', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const resource = { id: 'resource-1', kind: 'RESOURCE', tile: { x: 1, y: 0 } };
    const entities = [hero, resource];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex(entities);

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      isInteractionBlocked: (entity) => entity.id === 'resource-1',
      sleep: async () => {}
    });

    const moved = await movement.moveHeroTo({ x: 1, y: 0 });

    expect(moved).toBe(false);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(occupancy.getAt({ x: 0, y: 0 })?.id).toBe('hero-1');
    expect(occupancy.getAt({ x: 1, y: 0 })?.id).toBe('resource-1');
  });

  test('steps onto adjacent town, spends one point, and reports town visit interaction', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const town = { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } };
    const entities = [hero, town];
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const spent = [];
    const finishes = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      spendMovementPoints: (amount) => {
        spent.push(amount);
      },
      onMoveFinish: (event) => {
        finishes.push(event);
      }
    });

    const moved = await movement.moveHeroTo({ x: 1, y: 0 });

    expect(moved).toBe(true);
    expect(spent).toEqual([1]);
    expect(hero.tile).toEqual({ x: 0, y: 0 });
    expect(finishes[0].interaction).toEqual({
      kind: MOVEMENT_INTERACTION_KIND_TOWN_VISIT,
      entityId: 'town-1',
      targetTile: { x: 1, y: 0 }
    });
  });

  test('waits a full final step delay before reporting a non-adjacent interaction', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const monster = { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 0 } };
    const entities = [hero, monster];
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const sleepCalls = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      stepDelayMs: 220,
      sleep: async (ms) => {
        sleepCalls.push(ms);
      }
    });

    await movement.moveHeroTo({ x: 2, y: 0 });

    expect(sleepCalls).toEqual([220, 220]);
  });

  test('emits lifecycle callbacks only when movement actually starts', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const starts = [];
    const finishes = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      onMoveStart: (event) => {
        starts.push(event);
      },
      onMoveFinish: (event) => {
        finishes.push(event);
      },
      getMaxMovableSteps: () => 0
    });

    const moved = await movement.moveHeroTo({ x: 2, y: 0 });

    expect(moved).toBe(false);
    expect(starts).toEqual([]);
    expect(finishes).toEqual([]);
  });

  test('reports lifecycle payload for successful movement', async () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const entities = [hero];
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const occupancy = createOccupancyIndex(entities);
    const starts = [];
    const finishes = [];

    const movement = createMovementSystem({
      entities,
      map,
      occupancy,
      sleep: async () => {},
      onMoveStart: (event) => {
        starts.push(event);
      },
      onMoveFinish: (event) => {
        finishes.push(event);
      }
    });

    const moved = await movement.moveHeroTo({ x: 2, y: 0 });

    expect(moved).toBe(true);
    expect(starts).toHaveLength(1);
    expect(starts[0].targetTile).toEqual({ x: 2, y: 0 });
    expect(finishes).toHaveLength(1);
    expect(finishes[0].reachedTile).toEqual({ x: 2, y: 0 });
  });
});
