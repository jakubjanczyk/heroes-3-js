import { describe, expect, test } from 'vitest';

import { createTurnSystem } from './turn-system.js';

describe('turn system', () => {
  test('starts with 15 movement points by default', () => {
    const turn = createTurnSystem();

    expect(turn.getRemainingMovementPoints()).toBe(15);
  });

  test('spends movement points and blocks overspend', () => {
    const turn = createTurnSystem();

    expect(turn.canMoveSteps(3)).toBe(true);
    expect(turn.spendMovementPoints(3)).toBe(true);
    expect(turn.getRemainingMovementPoints()).toBe(12);
    expect(turn.canMoveSteps(13)).toBe(false);
    expect(turn.spendMovementPoints(13)).toBe(false);
    expect(turn.getRemainingMovementPoints()).toBe(12);
  });

  test('endTurn resets movement points to max', () => {
    const turn = createTurnSystem({ maxMovementPoints: 20 });

    expect(turn.spendMovementPoints(6)).toBe(true);
    expect(turn.getRemainingMovementPoints()).toBe(14);

    turn.endTurn();

    expect(turn.getRemainingMovementPoints()).toBe(20);
  });
});
