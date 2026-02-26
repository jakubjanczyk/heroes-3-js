import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TURN_ENDED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerTurnController } from './turn-controller.js';

describe('turn controller', () => {
  test('ends turn and emits facts when not moving', () => {
    const bus = createFakeBus();
    const turnSystem = {
      ended: 0,
      endTurn() {
        this.ended += 1;
      },
      getRemainingMovementPoints() {
        return 15;
      }
    };

    registerTurnController({ bus, turnSystem, maxMovementPoints: 15 });

    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});

    expect(turnSystem.ended).toBe(1);
    expect(bus.emitted).toContainEqual({ type: APP_FACT_TURN_ENDED, detail: {} });
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_MOVEMENT_POINTS_CHANGED,
      detail: { value: 15, max: 15 }
    });
  });

  test('ignores end-turn command while movement is active', () => {
    const bus = createFakeBus();
    const turnSystem = {
      ended: 0,
      endTurn() {
        this.ended += 1;
      },
      getRemainingMovementPoints() {
        return 4;
      }
    };

    registerTurnController({ bus, turnSystem, maxMovementPoints: 15 });

    bus.emit(APP_FACT_MOVE_STARTED, {});
    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});
    bus.emit(APP_FACT_MOVE_FINISHED, {});
    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});

    expect(turnSystem.ended).toBe(1);
  });
});
