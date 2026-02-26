// @vitest-environment jsdom
import { describe, test } from 'vitest';

import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectInteractionModalClosed,
  expectMovementPoints,
  expectNoPreview,
  expectResourceAt,
  expectResourceCollecting,
  expectResourceNotPresent,
  expectResourcePresent,
  expectResourceTotal,
  flushMicrotasks,
  setupMovementBehaviorApp,
  waitMs
} from './behavior.utils.js';

describe('resource interaction behavior', () => {
  test('given scenario contains resources when app boots then resources are rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } }
        ]
      }
    });

    expectResourceAt(1, 0, 'resource-1');
  });

  test('given resource blocks direct path when player clicks tile behind it then no path preview is shown', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } }
        ]
      }
    });

    dispatchTileClick(2, 0);
    await flushMicrotasks();

    expectNoPreview();
    expectHeroAt(0, 0);
  });

  test('given player confirms collecting a resource when movement finishes then hero stops before it and HUD total updates immediately', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } }
        ],
        definitions: {
          resources: {
            GOLD_PILE: { name: 'Gold pile', amount: 100 }
          }
        }
      },
      appConfig: {
        resourceCollectFadeOutMs: 20
      }
    });

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectResourceCollecting('resource-1');
    expectInteractionModalClosed();

    await waitMs(25);
    await flushMicrotasks();

    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
  });

  test('given two resource kinds are collected when each interaction resolves then HUD tracks totals independently', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 5,
        height: 1,
        tiles: [0, 0, 0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } },
          { id: 'resource-2', kind: 'RESOURCE', type: 'WOOD_PILE', tile: { x: 3, y: 0 } }
        ],
        definitions: {
          resources: {
            GOLD_PILE: { name: 'Gold pile', amount: 100 },
            WOOD_PILE: { name: 'Wood pile', amount: 5 }
          }
        }
      },
      appConfig: {
        resourceCollectFadeOutMs: 20
      }
    });

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectResourceCollecting('resource-1');
    expectResourcePresent('resource-2');
    expectInteractionModalClosed();

    await waitMs(25);
    await flushMicrotasks();

    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
    expectResourceTotal('Wood pile', 0);

    confirmTileClickByDispatch(3, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(11);

    await waitMs(25);
    await flushMicrotasks();

    expectResourceNotPresent('resource-2');
    expectResourceTotal('Gold pile', 100);
    expectResourceTotal('Wood pile', 5);
    expectInteractionModalClosed();
  });
});
