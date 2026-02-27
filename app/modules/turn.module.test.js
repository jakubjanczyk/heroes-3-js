import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { registerTurnModule } from './turn.module.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';

describe('turn module', () => {
  test('emits turn state updates and blocks end-turn while moving', () => {
    const bus = createFakeBus();
    const fakeTurnSystem = {
      remaining: 15,
      turnNumber: 1,
      endTurnCalls: 0,
      spendMovementPoints(amount) {
        this.remaining = Math.max(0, this.remaining - amount);
        return true;
      },
      endTurn() {
        this.endTurnCalls += 1;
        this.turnNumber += 1;
        this.remaining = 15;
      },
      getRemainingMovementPoints() {
        return this.remaining;
      },
      getTurnNumber() {
        return this.turnNumber;
      }
    };

    registerTurnModule(
      {
        bus,
        config: {
          maxMovementPoints: 15
        }
      },
      {
        createTurnSystem: () => fakeTurnSystem
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 4 });
    bus.emit(APP_FACT_MOVE_STARTED, {});
    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});
    bus.emit(APP_FACT_MOVE_FINISHED, {});
    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});

    const movementStates = bus.emitted.filter((entry) => entry.type === APP_FACT_MOVEMENT_POINTS_CHANGED);
    expect(movementStates).toEqual([
      { type: APP_FACT_MOVEMENT_POINTS_CHANGED, detail: { value: 15, max: 15 } },
      { type: APP_FACT_MOVEMENT_POINTS_CHANGED, detail: { value: 11, max: 15 } },
      { type: APP_FACT_MOVEMENT_POINTS_CHANGED, detail: { value: 15, max: 15 } }
    ]);
    expect(fakeTurnSystem.endTurnCalls).toBe(1);
    expect(bus.emitted).toContainEqual({ type: APP_FACT_TURN_ENDED, detail: { turnNumber: 2 } });
  });

  test('ignores spend requests before world is ready and for non-positive amounts', () => {
    const bus = createFakeBus();
    const fakeTurnSystem = {
      remaining: 15,
      spendCalls: [],
      spendMovementPoints(amount) {
        this.spendCalls.push(amount);
        this.remaining -= amount;
        return true;
      },
      endTurn() {},
      getRemainingMovementPoints() {
        return this.remaining;
      }
    };

    registerTurnModule(
      {
        bus,
        config: {
          maxMovementPoints: 15
        }
      },
      {
        createTurnSystem: () => fakeTurnSystem
      }
    );

    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 5 });
    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 0 });
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: -2 });
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 3.9 });

    expect(fakeTurnSystem.spendCalls).toEqual([3]);
  });

  test('syncs remaining movement points from replayed movement-points facts', () => {
    const bus = createFakeBus();

    registerTurnModule({
      bus,
      config: {
        maxMovementPoints: 15
      }
    });

    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 0, max: 15 });
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 1 });

    const movementStates = bus.emitted.filter((entry) => entry.type === APP_FACT_MOVEMENT_POINTS_CHANGED);
    expect(movementStates).toEqual([
      { type: APP_FACT_MOVEMENT_POINTS_CHANGED, detail: { value: 15, max: 15 } },
      { type: APP_FACT_MOVEMENT_POINTS_CHANGED, detail: { value: 0, max: 15 } }
    ]);
  });

  test('syncs turn number from replayed turn-ended facts', () => {
    const bus = createFakeBus();

    registerTurnModule({
      bus,
      config: {
        maxMovementPoints: 15
      }
    });

    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_FACT_TURN_ENDED, { turnNumber: 5 });
    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});

    const turnEndedFacts = bus.emitted.filter((entry) => entry.type === APP_FACT_TURN_ENDED);
    expect(turnEndedFacts).toEqual([
      { type: APP_FACT_TURN_ENDED, detail: { turnNumber: 5 } },
      { type: APP_FACT_TURN_ENDED, detail: { turnNumber: 6 } }
    ]);
  });
});
