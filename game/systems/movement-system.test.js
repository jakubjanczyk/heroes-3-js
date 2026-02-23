import { describe, expect, test } from 'vitest';

import { createMap } from '../../engine/map.js';
import { createOccupancyIndex } from '../../engine/occupancy.js';
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
    expect(hero.tile).toEqual({ x: 1, y: 0 });
    expect(steps).toEqual([{ x: 1, y: 0 }]);
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

  test('updates occupancy index as hero steps to a new tile', async () => {
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

    expect(occupancy.getAt({ x: 0, y: 0 })).toBe(null);
    expect(occupancy.getAt({ x: 1, y: 0 })?.id).toBe('hero-1');
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
    expect(hero.tile).toEqual({ x: 2, y: 0 });
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
});
