import { describe, expect, test } from 'vitest';

import {
  applyMovementPointsChanged,
  applyTurnEnded,
  createTurnState,
  decideEndTurn,
  decideSpendMovementPoints
} from './turn-system.js';

describe('turn system', () => {
  test('starts on turn 1 with full movement points', () => {
    expect(createTurnState({ maxMovementPoints: 15 })).toEqual({
      maxMovementPoints: 15,
      remainingMovementPoints: 15,
      turnNumber: 1
    });
  });

  test('falls back to 15 max movement points for invalid config', () => {
    expect(createTurnState({ maxMovementPoints: 'x' }).maxMovementPoints).toBe(15);
    expect(createTurnState().maxMovementPoints).toBe(15);
  });

  test('deciding to spend movement points returns the new remaining value without changing state', () => {
    const state = createTurnState({ maxMovementPoints: 15 });

    expect(decideSpendMovementPoints(state, 3)).toEqual({ remainingMovementPoints: 12 });
    expect(state.remainingMovementPoints).toBe(15);
  });

  test('refuses to overspend and ignores non-positive or fractional-below-one amounts', () => {
    const state = applyMovementPointsChanged(createTurnState({ maxMovementPoints: 15 }), 2);

    expect(decideSpendMovementPoints(state, 3)).toBe(null);
    expect(decideSpendMovementPoints(state, 0)).toBe(null);
    expect(decideSpendMovementPoints(state, -1)).toBe(null);
    expect(decideSpendMovementPoints(state, 0.5)).toBe(null);
    expect(decideSpendMovementPoints(state, 1.9)).toEqual({ remainingMovementPoints: 1 });
  });

  test('deciding to end the turn returns the next turn number and full movement points without changing state', () => {
    const state = applyMovementPointsChanged(createTurnState({ maxMovementPoints: 20 }), 6);

    expect(decideEndTurn(state)).toEqual({ turnNumber: 2, remainingMovementPoints: 20 });
    expect(state).toEqual({ maxMovementPoints: 20, remainingMovementPoints: 6, turnNumber: 1 });
  });

  test('applying facts returns updated state, including zero movement points', () => {
    let state = createTurnState({ maxMovementPoints: 15 });

    state = applyMovementPointsChanged(state, 0);
    state = applyTurnEnded(state, 4);

    expect(state).toEqual({ maxMovementPoints: 15, remainingMovementPoints: 0, turnNumber: 4 });
    expect(decideEndTurn(state)).toEqual({ turnNumber: 5, remainingMovementPoints: 15 });
  });

  test('applying facts clamps movement points to the max and ignores invalid values', () => {
    const state = createTurnState({ maxMovementPoints: 15 });

    expect(applyMovementPointsChanged(state, 99).remainingMovementPoints).toBe(15);
    expect(applyMovementPointsChanged(state, 'x')).toBe(state);
    expect(applyTurnEnded(state, 'x')).toBe(state);
  });
});
