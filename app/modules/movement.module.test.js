import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { registerMovementModule } from './movement.module.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';

describe('movement module', () => {
  test('creates movement system on world-ready and emits movement facts', async () => {
    const bus = createFakeBus();
    const moveCalls = [];

    registerMovementModule(
      {
        bus,
        config: {
          movementStepDelayMs: 0
        }
      },
      {
        createMovementSystem: (config) => ({
          async moveHeroTo(targetTile, options) {
            moveCalls.push({ targetTile, options });
            config.spendMovementPoints(2);
            config.onMoveStart({ targetTile });
            config.onStep({
              hero: { id: 'hero-1' },
              from: { x: 0, y: 0 },
              to: { x: 1, y: 0 }
            });
            config.onMoveFinish({ targetTile });
            return true;
          }
        })
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      map: {},
      occupancy: {}
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 6, max: 15 });
    bus.emit(APP_COMMAND_MOVE_REQUESTED, {
      targetTile: { x: 2, y: 0 },
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]
    });
    await Promise.resolve();

    expect(moveCalls).toEqual([
      {
        targetTile: { x: 2, y: 0 },
        options: {
          path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]
        }
      }
    ]);
    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
      detail: { amount: 2 }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_MOVE_STARTED,
      detail: { targetTile: { x: 2, y: 0 } }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_HERO_MOVED,
      detail: {
        heroId: 'hero-1',
        from: { x: 0, y: 0 },
        to: { x: 1, y: 0 }
      }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_MOVE_FINISHED,
      detail: { moved: true, targetTile: { x: 2, y: 0 } }
    });
  });

  test('does not create movement system when no hero exists', () => {
    const bus = createFakeBus();
    let createMovementSystemCalls = 0;

    registerMovementModule(
      { bus, config: {} },
      {
        createMovementSystem: () => {
          createMovementSystemCalls += 1;
          return {};
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [] },
      map: {},
      occupancy: {}
    });
    bus.emit(APP_COMMAND_MOVE_REQUESTED, {
      targetTile: { x: 1, y: 0 },
      path: null
    });

    expect(createMovementSystemCalls).toBe(0);
  });

  test('ignores move request while previous move command is still running', async () => {
    const bus = createFakeBus();
    const calls = [];
    let resolveMove;

    registerMovementModule(
      { bus, config: {} },
      {
        createMovementSystem: () => ({
          moveHeroTo(targetTile) {
            calls.push(targetTile);
            return new Promise((resolve) => {
              resolveMove = resolve;
            });
          }
        })
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      map: {},
      occupancy: {}
    });

    bus.emit(APP_COMMAND_MOVE_REQUESTED, { targetTile: { x: 1, y: 0 }, path: null });
    bus.emit(APP_COMMAND_MOVE_REQUESTED, { targetTile: { x: 2, y: 0 }, path: null });
    expect(calls).toEqual([{ x: 1, y: 0 }]);

    resolveMove(true);
    await Promise.resolve();
  });
});
