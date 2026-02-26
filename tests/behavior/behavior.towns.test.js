// @vitest-environment jsdom
import { describe, test } from 'vitest';

import {
  closeInteractionModal,
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectInteractionModalOpen,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewTargetAt,
  expectTownAt,
  expectTownPresent,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('town interaction behavior', () => {
  test('given scenario contains a town when app boots then town is rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 8,
        height: 7,
        tiles: new Array(56).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
        ],
        definitions: {
          towns: {
            CASTLE: { name: 'Castle' }
          }
        }
      }
    });

    expectTownAt(4, 3, 'town-1');
  });

  test('given town is on the map when player previews blocked footprint tiles then each blocked tile has no preview', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 8,
        height: 7,
        tiles: new Array(56).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
        ],
        definitions: {
          towns: {
            CASTLE: { name: 'Castle' }
          }
        }
      }
    });

    const blockedTiles = [
      [3, 1],
      [4, 1],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [2, 3],
      [3, 3]
    ];

    for (const [x, y] of blockedTiles) {
      dispatchTileClick(x, y);
      await flushMicrotasks();
      expectNoPreview();
    }
  });

  test('given town is on the map when player previews known non-blocked nearby tiles then preview appears', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 8,
        height: 7,
        tiles: new Array(56).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
        ],
        definitions: {
          towns: {
            CASTLE: { name: 'Castle' }
          }
        }
      }
    });

    const reachableTiles = [
      [6, 4],
      [5, 1],
      [5, 3],
      [6, 2],
      [6, 3]
    ];

    for (const [x, y] of reachableTiles) {
      dispatchTileClick(x, y);
      await flushMicrotasks();
      expectPreviewTargetAt(x, y);
    }
  });

  test('given player confirms move to town entry when movement resolves then hero steps into town tile and town remains', async () => {
    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 8,
        height: 7,
        tiles: new Array(56).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 4, y: 5 } },
          { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
        ],
        definitions: {
          towns: {
            CASTLE: { name: 'Castle' }
          }
        }
      },
      appConfig: {
        interactionModalTransitionMs: 0
      }
    });

    confirmTileClickByDispatch(4, 3);
    await flushMicrotasks();

    expectHeroAt(4, 3);
    expectMovementPoints(13);
    expectInteractionModalOpen('Castle visited');

    await closeInteractionModal(user);
    await flushMicrotasks();

    expectTownPresent('town-1');
  });
});
