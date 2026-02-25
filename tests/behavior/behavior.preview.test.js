// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewCornerAt,
  expectPreviewDashAt,
  expectPreviewNotOverLimitTargetAt,
  expectPreviewOverLimitDashAt,
  expectPreviewOverLimitTargetAt,
  expectPreviewTargetAt,
  flushMicrotasks,
  getPreviewCornerAt,
  getPreviewDashAt,
  getPreviewOverLimitDashAt,
  getPreviewSvg,
  getPreviewTargetAt,
  setupLinearMovementApp,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('path preview behavior', () => {
  test('given blocked terrain between hero and destination when player previews a move then preview routes around the obstacle and never crosses blocked tiles', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 4,
        height: 2,
        tiles: [
          0, 1, 1, 0,
          0, 0, 0, 0
        ],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    dispatchTileClick(3, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(3, 0);
    expectPreviewCornerAt(0, 1);
    expectPreviewDashAt(2, 1);
    expect(getPreviewDashAt(1, 0)).toBeFalsy();
    expect(getPreviewCornerAt(1, 0)).toBeFalsy();
  });

  test('given reachable destination when player clicks once then preview path and target X are shown', async () => {
    await setupLinearMovementApp({ width: 4 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(15);
    expect(getPreviewSvg()).toBeTruthy();
    expectPreviewDashAt(1, 0);
    expectPreviewTargetAt(2, 0);
  });

  test('given previewed destination when player clicks same tile second time then movement starts', async () => {
    await setupLinearMovementApp({ width: 4 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expect(getPreviewSvg()).toBeTruthy();
    expectPreviewDashAt(1, 0);
    expectPreviewTargetAt(2, 0);
    expectHeroAt(0, 0);

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);
  });

  test('given preview exists when player clicks different reachable tile then preview retargets to new tile', async () => {
    await setupLinearMovementApp({ width: 5 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(2, 0);
    expectPreviewDashAt(1, 0);
    expectHeroAt(0, 0);

    dispatchTileClick(3, 0);
    await flushMicrotasks();

    expect(getPreviewTargetAt(2, 0)).toBeFalsy();
    expectPreviewTargetAt(3, 0);
    expectPreviewDashAt(1, 0);
    expectPreviewDashAt(2, 0);
    expectHeroAt(0, 0);
  });

  test('given preview exists when player clicks unreachable tile then preview clears', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 1],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    dispatchTileClick(2, 0);
    await flushMicrotasks();
    expect(getPreviewSvg()).toBeTruthy();

    dispatchTileClick(3, 0);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
  });

  test('given destination is reachable only by a diagonal step when player previews then preview shows the target marker', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 2,
        height: 2,
        tiles: [0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    dispatchTileClick(1, 1);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectPreviewTargetAt(1, 1);
  });

  test('given destination is reachable only by a diagonal step when player confirms then hero moves diagonally and MP decreases by 1', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 2,
        height: 2,
        tiles: [0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    confirmTileClickByDispatch(1, 1);
    await flushMicrotasks();

    expectHeroAt(1, 1);
    expectMovementPoints(14);
  });

  test('given diagonal corner-cut would be required when player clicks the diagonal destination then no preview is shown and hero cannot move there', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 2,
        height: 2,
        tiles: [
          0, 1,
          1, 0
        ],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    dispatchTileClick(1, 1);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
    expectMovementPoints(15);
  });

  test('given path exceeds remaining movement points when preview is shown then over-limit segments are red', async () => {
    await setupLinearMovementApp();

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();
    expectHeroAt(10, 0);
    expectMovementPoints(5);

    dispatchTileClick(17, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(17, 0);
    expectPreviewDashAt(11, 0);
    expectPreviewDashAt(15, 0);
    expectPreviewOverLimitDashAt(16, 0);
    expect(getPreviewOverLimitDashAt(15, 0)).toBeFalsy();
  });

  test('given path exceeds remaining movement points when preview is shown then target X is red', async () => {
    await setupLinearMovementApp();

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();
    expectHeroAt(10, 0);
    expectMovementPoints(5);

    dispatchTileClick(17, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);
  });

  test('given remaining MP equals the preview path length exactly when preview is shown then nothing is marked over-limit', async () => {
    await setupLinearMovementApp({ width: 40 });

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();
    expectHeroAt(10, 0);
    expectMovementPoints(5);

    dispatchTileClick(15, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(15, 0);
    expectPreviewNotOverLimitTargetAt(15, 0);
    expect(document.querySelector('.path-preview-dash-over-limit')).toBeFalsy();
    expect(document.querySelector('.path-preview-target-line-over-limit')).toBeFalsy();
  });

  test('given remaining MP is zero when player previews a reachable tile then preview is shown as over-limit and confirming does not move', async () => {
    await setupLinearMovementApp({ width: 40 });

    confirmTileClickByDispatch(15, 0);
    await flushMicrotasks();
    expectHeroAt(15, 0);
    expectMovementPoints(0);

    dispatchTileClick(16, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(16, 0);
    expectPreviewOverLimitTargetAt(16, 0);

    dispatchTileClick(16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectPreviewTargetAt(16, 0);
    expectPreviewOverLimitTargetAt(16, 0);
  });

  test('given preview exists when movement advances step-by-step then already-traversed preview segments disappear as the hero walks', async () => {
    const sleepResolvers = [];
    await setupLinearMovementApp({
      width: 6,
      movementSystemOptions: {
        sleep: () => new Promise((resolve) => {
          sleepResolvers.push(resolve);
        }),
        stepDelayMs: 1
      }
    });

    dispatchTileClick(3, 0);
    await flushMicrotasks();
    expectPreviewDashAt(1, 0);
    expectPreviewDashAt(2, 0);
    expectPreviewTargetAt(3, 0);

    dispatchTileClick(3, 0);
    await flushMicrotasks(3);
    expectHeroAt(0, 0);
    expectPreviewDashAt(1, 0);

    sleepResolvers.shift()?.();
    await flushMicrotasks(3);

    expectHeroAt(1, 0);
    expect(getPreviewDashAt(1, 0)).toBeFalsy();
    expectPreviewDashAt(2, 0);
    expectPreviewTargetAt(3, 0);
  });

  test('given preview exists when player confirms and movement completes at the destination then the preview clears at movement end', async () => {
    await setupLinearMovementApp({ width: 6 });

    confirmTileClickByDispatch(3, 0);
    await flushMicrotasks();

    expectHeroAt(3, 0);
    expectNoPreview();
  });

  test('given a preview is active when user clicks outside map bounds then the preview remains unchanged', async () => {
    await setupLinearMovementApp({ width: 6 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(2, 0);

    const viewport = document.querySelector('.viewport');
    expect(viewport).toBeTruthy();
    viewport?.dispatchEvent(new window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: -999,
      clientY: -999
    }));
    await flushMicrotasks();

    expectPreviewTargetAt(2, 0);
  });
});
