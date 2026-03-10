// @vitest-environment jsdom
import { describe, test } from 'vitest';

import {
  clickTile,
  closeInteractionModal,
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectInteractionModalClosed,
  expectInteractionModalOpen,
  expectMonsterAt,
  expectMonsterDefeating,
  expectMonsterNotPresent,
  expectMonsterPresent,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewTargetAt,
  flushMicrotasks,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js';

describe('monster interaction behavior', () => {
  test('given scenario contains a monster when app boots then monster is rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }
        ]
      }
    });

    expectMonsterAt(1, 0, 'monster-1');
  });

  test('given monster blocks the direct path when player clicks tile behind it then no path preview is shown', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }
        ]
      }
    });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
  });

  test('given player confirms monster attack when movement finishes then modal opens and monster disappears after modal close', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }
        ]
      },
      appConfig: {
        interactionModalTransitionMs: 20,
        monsterDefeatFadeOutMs: 20
      }
    });

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();
    await waitMs();

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectMonsterPresent('monster-1');
    expectInteractionModalOpen('Monster defeated');

    await clickTile(user, 2, 0);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);

    await closeInteractionModal(user);

    expectInteractionModalOpen();

    await waitMs(25);
    await flushMicrotasks();

    expectInteractionModalClosed();
    expectMonsterDefeating('monster-1');

    await waitMs(25);
    await flushMicrotasks();

    expectMonsterNotPresent('monster-1');

    await clickTile(user, 2, 0);
    await flushMicrotasks();

    expectPreviewTargetAt(2, 0);
  });

  test('given monster is not adjacent when player confirms attack then hero stops on tile before monster and fight still costs one step', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 2, y: 0 } }
        ]
      },
      appConfig: {
        interactionModalTransitionMs: 20,
        monsterDefeatFadeOutMs: 20
      }
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expectHeroAt(1, 0);
    expectMovementPoints(13);
    expectMonsterPresent('monster-1');

    await closeInteractionModal(user);
    await waitMs(50);
    await flushMicrotasks();

    expectMonsterNotPresent('monster-1');
  });

  test('given final step before monster resolves when movement is still animating then modal waits until hero fully reaches the last tile', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 2, y: 0 } }
        ]
      },
      movementStepDelayMs: 20,
      appConfig: {
        interactionModalTransitionMs: 0,
        monsterDefeatFadeOutMs: 0
      }
    });

    confirmTileClickByDispatch(2, 0);
    await waitMs(25);
    await flushMicrotasks();

    expectHeroAt(1, 0);
    expectInteractionModalClosed();
    expectMonsterPresent('monster-1');

    await waitMs(25);
    await flushMicrotasks();

    expectInteractionModalOpen('Monster defeated');
  });

  test('given default-speed movement when hero is still visually arriving before a monster then modal stays closed', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 2, y: 0 } }
        ]
      },
      movementStepDelayMs: 220,
      appConfig: {
        interactionModalTransitionMs: 0,
        monsterDefeatFadeOutMs: 0
      }
    });

    confirmTileClickByDispatch(2, 0);
    await waitMs(250);
    await flushMicrotasks();

    expectInteractionModalClosed();
    expectMonsterPresent('monster-1');

    await waitMs(220);
    await flushMicrotasks();

    expectInteractionModalOpen('Monster defeated');
  });
});
