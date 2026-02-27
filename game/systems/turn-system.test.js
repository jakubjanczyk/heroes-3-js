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

  test('supports restoring remaining movement points and turn number', () => {
    const turn = createTurnSystem({
      maxMovementPoints: 15,
      remainingMovementPoints: 11,
      turnNumber: 4
    });

    expect(turn.getRemainingMovementPoints()).toBe(11);
    expect(turn.getTurnNumber()).toBe(4);

    turn.endTurn();

    expect(turn.getTurnNumber()).toBe(5);
    expect(turn.getRemainingMovementPoints()).toBe(15);
  });

  test('restores zero remaining movement points without resetting to max', () => {
    const turn = createTurnSystem({
      maxMovementPoints: 15,
      remainingMovementPoints: 0,
      turnNumber: 3
    });

    expect(turn.getTurnNumber()).toBe(3);
    expect(turn.getRemainingMovementPoints()).toBe(0);
  });

  test('supports explicit synchronization of replayed turn state', () => {
    const turn = createTurnSystem({ maxMovementPoints: 15 });

    turn.setTurnNumber(6);
    turn.setRemainingMovementPoints(4);

    expect(turn.getTurnNumber()).toBe(6);
    expect(turn.getRemainingMovementPoints()).toBe(4);
  });
});
