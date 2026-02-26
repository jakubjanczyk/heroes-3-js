import { describe, expect, test } from 'vitest';

import { APP_COMMAND_MOVE_REQUESTED } from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerMovementController } from './movement-controller.js';

describe('movement controller', () => {
  test('forwards planned path to movement system without emitting lifecycle facts', async () => {
    const bus = createFakeBus();
    const moveCalls = [];

    registerMovementController({
      bus,
      movement: {
        async moveHeroTo(targetTile, options) {
          moveCalls.push({ targetTile, options });
          return true;
        }
      }
    });

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
    const factEvents = bus.emitted.filter((entry) => entry.type.startsWith('fact.'));
    expect(factEvents).toEqual([]);
  });

  test('ignores new move requests while current move is in progress', async () => {
    const bus = createFakeBus();
    let resolveMove;
    const moveCalls = [];

    registerMovementController({
      bus,
      movement: {
        moveHeroTo(targetTile) {
          moveCalls.push(targetTile);
          return new Promise((resolve) => {
            resolveMove = resolve;
          });
        }
      }
    });

    bus.emit(APP_COMMAND_MOVE_REQUESTED, { targetTile: { x: 1, y: 0 }, path: null });
    bus.emit(APP_COMMAND_MOVE_REQUESTED, { targetTile: { x: 2, y: 0 }, path: null });
    expect(moveCalls).toEqual([{ x: 1, y: 0 }]);

    resolveMove(true);
    await Promise.resolve();
  });
});
