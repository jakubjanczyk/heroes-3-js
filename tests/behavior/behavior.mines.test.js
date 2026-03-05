// @vitest-environment jsdom
import { describe, test } from 'vitest';

import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectInteractionModalClosed,
  expectMineAt,
  expectMinePresent,
  expectNoPreview,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('mine interaction behavior', () => {
  test('given scenario contains all mine types when app boots then each mine is rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 2, y: 0 } },
          { id: 'mine-2', kind: 'MINE', type: 'SAWMILL', tile: { x: 4, y: 0 } },
          { id: 'mine-3', kind: 'MINE', type: 'ORE_PIT', tile: { x: 6, y: 0 } },
          { id: 'mine-4', kind: 'MINE', type: 'ALCHEMIST_LAB', tile: { x: 8, y: 0 } },
          { id: 'mine-5', kind: 'MINE', type: 'SULFUR_DUNE', tile: { x: 10, y: 0 } },
          { id: 'mine-6', kind: 'MINE', type: 'CRYSTAL_CAVERN', tile: { x: 12, y: 0 } },
          { id: 'mine-7', kind: 'MINE', type: 'GEM_POND', tile: { x: 14, y: 0 } }
        ]
      }
    });

    expectMineAt(2, 0, 'mine-1');
    expectMineAt(4, 0, 'mine-2');
    expectMineAt(6, 0, 'mine-3');
    expectMineAt(8, 0, 'mine-4');
    expectMineAt(10, 0, 'mine-5');
    expectMineAt(12, 0, 'mine-6');
    expectMineAt(14, 0, 'mine-7');
  });

  test('given hero enters mine bottom-center tile when movement resolves then mine stays and no modal appears', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 6,
        height: 3,
        tiles: new Array(18).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 1 } },
          { id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 2, y: 1 } }
        ]
      }
    });

    confirmTileClickByDispatch(2, 1);
    await flushMicrotasks();

    expectHeroAt(2, 1);
    expectInteractionModalClosed();
    expectMinePresent('mine-1');
  });

  test('given mine is rendered as 3x2 when player previews non-entry footprint tiles then no preview is shown', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 8,
        height: 4,
        tiles: new Array(32).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 2 } },
          { id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 3, y: 2 } }
        ]
      }
    });

    dispatchTileClick(2, 1);
    await flushMicrotasks();
    expectNoPreview();

    dispatchTileClick(3, 1);
    await flushMicrotasks();
    expectNoPreview();

    dispatchTileClick(4, 1);
    await flushMicrotasks();
    expectNoPreview();

    dispatchTileClick(2, 2);
    await flushMicrotasks();
    expectNoPreview();

    dispatchTileClick(4, 2);
    await flushMicrotasks();
    expectNoPreview();
  });
});
