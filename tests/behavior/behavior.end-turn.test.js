// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  clickEndTurn,
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  expectPreviewDashAt,
  expectPreviewNotOverLimitTargetAt,
  expectPreviewOverLimitDashAt,
  expectPreviewTargetAt,
  flushMicrotasks,
  getPreviewOverLimitDashAt,
  getPreviewTargetAt,
  setupLinearMovementApp,
  waitMs
} from './behavior.utils.js';

describe('end turn behavior', () => {
  test('given hero has spent movement points when player clicks End turn then movement points reset to 15', async () => {
    const { user } = await setupLinearMovementApp({ width: 4 });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);

    await clickEndTurn(user);

    expectMovementPoints(15);
  });

  test('given an affordable preview is selected when player clicks End turn then the selected preview remains and remains affordable after MP resets', async () => {
    const { user } = await setupLinearMovementApp({ width: 6 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(2, 0);
    expectPreviewNotOverLimitTargetAt(2, 0);

    await clickEndTurn(user);
    await flushMicrotasks();

    expectMovementPoints(15);
    expectPreviewTargetAt(2, 0);
    expectPreviewNotOverLimitTargetAt(2, 0);
  });

  test('given queued over-limit route exists when player clicks End turn then route remains selected', async () => {
    const { user } = await setupLinearMovementApp();

    confirmTileClickByDispatch(16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectPreviewTargetAt(16, 0);

    await clickEndTurn(user);

    expectMovementPoints(15);
    expectPreviewTargetAt(16, 0);
  });

  test('given queued over-limit route exists when player clicks End turn then previously red affordable segment turns green', async () => {
    const { user } = await setupLinearMovementApp({ width: 40 });

    confirmTileClickByDispatch(16, 0);
    await flushMicrotasks();
    expectHeroAt(15, 0);
    expectMovementPoints(0);

    dispatchTileClick(31, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(31, 0);
    expectPreviewOverLimitDashAt(16, 0);

    await clickEndTurn(user);
    await flushMicrotasks();

    expectPreviewTargetAt(31, 0);
    expectPreviewDashAt(16, 0);
    expect(getPreviewOverLimitDashAt(16, 0)).toBeFalsy();
  });

  test('given hero is moving when player clicks End turn then turn is not ended until movement completes', async () => {
    const { user } = await setupLinearMovementApp({
      width: 3,
      movementStepDelayMs: 200
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks(3);

    await clickEndTurn(user);
    expectMovementPoints(15);

    await waitMs(660);

    expectMovementPoints(13);
  });

  test('given movement completes after ignored End turn click when player clicks End turn again then turn ends and movement points reset', async () => {
    const { user } = await setupLinearMovementApp({
      width: 3,
      movementStepDelayMs: 200
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks(3);

    await clickEndTurn(user);
    expectMovementPoints(15);

    await waitMs(660);
    expectMovementPoints(13);

    await clickEndTurn(user);
    expectMovementPoints(15);
  });

  test('given full path is now affordable after End turn when player confirms same target then hero completes remaining route', async () => {
    const { user } = await setupLinearMovementApp();

    confirmTileClickByDispatch(16, 0);
    await flushMicrotasks();
    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectPreviewTargetAt(16, 0);

    await clickEndTurn(user);
    expectMovementPoints(15);
    expectPreviewTargetAt(16, 0);

    dispatchTileClick(16, 0);
    await flushMicrotasks();

    expectHeroAt(16, 0);
    expectMovementPoints(14);
  });

  test('given player retargets route after End turn when clicking a different tile then old queued route is replaced', async () => {
    const { user } = await setupLinearMovementApp();

    confirmTileClickByDispatch(16, 0);
    await flushMicrotasks();
    expectHeroAt(15, 0);
    expectPreviewTargetAt(16, 0);

    await clickEndTurn(user);
    expectPreviewTargetAt(16, 0);

    dispatchTileClick(14, 0);
    await flushMicrotasks();

    expect(getPreviewTargetAt(16, 0)).toBeFalsy();
    expectPreviewTargetAt(14, 0);
    expectHeroAt(15, 0);
    expectMovementPoints(15);
  });

  test('given no movement happened this turn when player clicks End turn then movement points remain 15', async () => {
    const { user } = await setupLinearMovementApp();

    expectMovementPoints(15);
    await clickEndTurn(user);
    expectMovementPoints(15);
  });
});
