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

function setupTurnModule() {
  const bus = createFakeBus();
  registerTurnModule({ bus, config: { maxMovementPoints: 15, movementStepDelayMs: 0 } });
  return bus;
}

function emittedOfType(bus, type) {
  return bus.emitted.filter((entry) => entry.type === type);
}

describe('turn module', () => {
  test('announces full movement points when the world is ready', () => {
    const bus = setupTurnModule();

    bus.emit(APP_FACT_WORLD_READY, {});

    expect(emittedOfType(bus, APP_FACT_MOVEMENT_POINTS_CHANGED)).toEqual([
      { type: APP_FACT_MOVEMENT_POINTS_CHANGED, detail: { value: 15, max: 15 } }
    ]);
  });

  test('spend commands emit movement-points facts based on the last applied value', () => {
    const bus = setupTurnModule();

    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 4 });
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 4 });

    expect(emittedOfType(bus, APP_FACT_MOVEMENT_POINTS_CHANGED).map((entry) => entry.detail)).toEqual([
      { value: 15, max: 15 },
      { value: 11, max: 15 },
      { value: 7, max: 15 }
    ]);
  });

  test('ignores spend requests before world is ready, for non-positive amounts and for overspending', () => {
    const bus = setupTurnModule();

    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 5 });
    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 0 });
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: -2 });
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 16 });
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 3.9 });

    expect(emittedOfType(bus, APP_FACT_MOVEMENT_POINTS_CHANGED).map((entry) => entry.detail)).toEqual([
      { value: 15, max: 15 },
      { value: 12, max: 15 }
    ]);
  });

  test('end turn emits the next turn number and full movement points, and is blocked while moving', () => {
    const bus = setupTurnModule();

    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 4 });
    bus.emit(APP_FACT_MOVE_STARTED, {});
    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});
    bus.emit(APP_FACT_MOVE_FINISHED, {});
    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});

    expect(emittedOfType(bus, APP_FACT_TURN_ENDED)).toEqual([
      { type: APP_FACT_TURN_ENDED, detail: { turnNumber: 2 } }
    ]);
    expect(emittedOfType(bus, APP_FACT_MOVEMENT_POINTS_CHANGED).map((entry) => entry.detail)).toEqual([
      { value: 15, max: 15 },
      { value: 11, max: 15 },
      { value: 15, max: 15 }
    ]);
  });

  test('replayed movement-points facts set the state that later commands decide from', () => {
    const bus = setupTurnModule();

    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 0, max: 15 });
    bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, { amount: 1 });

    expect(emittedOfType(bus, APP_FACT_MOVEMENT_POINTS_CHANGED).map((entry) => entry.detail)).toEqual([
      { value: 15, max: 15 },
      { value: 0, max: 15 }
    ]);
  });

  test('replayed turn-ended facts set the turn number that the next end turn continues from', () => {
    const bus = setupTurnModule();

    bus.emit(APP_FACT_WORLD_READY, {});
    bus.emit(APP_FACT_TURN_ENDED, { turnNumber: 5 });
    bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});

    expect(emittedOfType(bus, APP_FACT_TURN_ENDED)).toEqual([
      { type: APP_FACT_TURN_ENDED, detail: { turnNumber: 5 } },
      { type: APP_FACT_TURN_ENDED, detail: { turnNumber: 6 } }
    ]);
  });
});
