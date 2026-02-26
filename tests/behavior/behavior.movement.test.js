// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  clickEndTurn,
  clickTile,
  confirmMove,
  expectHasOverLimitTargetMarker,
  expectHeroAt,
  expectMovementPoints,
  flushMicrotasks,
  setupLinearMovementApp,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('movement behavior', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;

  beforeAll(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: (callback) => {
        callback(0);
        return 0;
      },
      configurable: true,
      writable: true
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: originalRequestAnimationFrame,
      configurable: true,
      writable: true
    });
  });

  test('given a fresh turn when player confirms a reachable destination then hero moves and movement points decrease by path length', async () => {
    const { user } = await setupMovementBehaviorApp();

    await confirmMove(user, 2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);
  });

  test('given path longer than remaining MP when player confirms then hero moves only up to limit and stops', async () => {
    const { user } = await setupLinearMovementApp();

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
  });
  test('given hero stopped at MP limit when player confirms same red target again then path remains and hero does not move', async () => {
    const { user } = await setupLinearMovementApp();

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectHasOverLimitTargetMarker();

    await clickTile(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectHasOverLimitTargetMarker();
  });

  test('given MP is zero when player confirms any move then hero does not move', async () => {
    const { user } = await setupLinearMovementApp();

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);

    await confirmMove(user, 14, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
  });

  test('given a detour route around blocked terrain when player confirms then hero reaches destination via that route and MP decreases by full detour length', async () => {
    const width = 4;
    const height = 2;
    const tiles = [
      0, 1, 1, 0,
      0, 0, 0, 0
    ];
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width,
        height,
        tiles,
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    await confirmMove(user, 3, 0);
    await flushMicrotasks();

    expectHeroAt(3, 0);
    expectMovementPoints(10);
  });

  test('given move is in progress when player clicks End turn then End turn is ignored until movement completes', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 2,
        height: 1,
        tiles: [0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      },
      movementStepDelayMs: 40
    });

    await confirmMove(user, 1, 0);
    await flushMicrotasks();

    expectMovementPoints(14);

    await clickEndTurn(user);
    expectMovementPoints(14);

    await new Promise((resolve) => {
      setTimeout(resolve, 60);
    });

    await clickEndTurn(user);
    expectMovementPoints(15);
  });

  test('given movement completed when player clicks End turn then MP resets to 15', async () => {
    const { user } = await setupMovementBehaviorApp();

    await confirmMove(user, 2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);

    await clickEndTurn(user);

    expectMovementPoints(15);
  });

  test('given queued red remainder after End turn then affordable part becomes green based on refreshed MP', async () => {
    const { user } = await setupLinearMovementApp();

    await confirmMove(user, 16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectHasOverLimitTargetMarker();

    await clickEndTurn(user);

    expectMovementPoints(15);
    expect(document.querySelector('.path-preview-target-line-over-limit')).toBeFalsy();
    expect(document.querySelector('.path-preview-target-line')).toBeTruthy();
  });
});
