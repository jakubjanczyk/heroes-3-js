// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  clickEndTurn,
  dispatchTileClick,
  expectHeroAt,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewDashAt,
  expectPreviewTargetAt,
  flushMicrotasks,
  setupLinearMovementApp,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('tile click behavior', () => {
  test('given user clicks rendered terrain tile by data-x/data-y then selected tile matches those coordinates', async () => {
    await setupLinearMovementApp({ width: 4 });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(2, 0);
    expectPreviewDashAt(1, 0);
    expectHeroAt(0, 0);
  });

  test('given no path exists around blocked tiles when player clicks destination then no preview is shown and no movement occurs', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 1, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
    expectMovementPoints(15);
  });

  test('given player clicks a blocked terrain tile when no preview exists then no preview is shown and hero does not move', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 2,
        height: 1,
        tiles: [0, 1],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    dispatchTileClick(1, 0);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
    expectMovementPoints(15);
  });

  test('given player clicks the hero current tile when no preview exists then no preview is shown and hero does not move', async () => {
    await setupLinearMovementApp({ width: 4 });

    dispatchTileClick(0, 0);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
    expectMovementPoints(15);
  });

  test('given user clicks outside map bounds then no movement or preview is started', async () => {
    await setupLinearMovementApp({ width: 4 });

    const viewport = document.querySelector('.viewport');
    expect(viewport).toBeTruthy();
    viewport?.dispatchEvent(new window.MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: -999,
      clientY: -999
    }));
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
    expectMovementPoints(15);
  });

  test('given user clicks HUD controls then tile click handling is not triggered', async () => {
    const { user } = await setupLinearMovementApp({ width: 4 });

    const hudTitle = document.querySelector('.hud__title');
    expect(hudTitle).toBeTruthy();
    await user.click(hudTitle);
    await clickEndTurn(user);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
    expectMovementPoints(15);
  });
});
