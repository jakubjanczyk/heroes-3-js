// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  clickEndTurn,
  expectHeroAt,
  expectMovementPoints,
  expectNoPreview,
  flushMicrotasks,
  getTerrainTile,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('app boot behavior', () => {
  test('given app starts when scenario loads then terrain tiles are rendered from data', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 2,
        tiles: [0, 1, 2, 3, 4, 5],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    const terrainTiles = document.querySelectorAll('.terrain-tile');
    expect(terrainTiles).toHaveLength(6);
    expect(getTerrainTile(0, 0)).toBeTruthy();
    expect(getTerrainTile(2, 1)).toBeTruthy();
  });

  test('given app starts when hero exists then hero is rendered with expected entity id', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [{ id: 'hero-custom', kind: 'HERO', type: 'HERO', tile: { x: 1, y: 0 } }]
      }
    });

    const heroEntity = document.querySelector('.entity--hero[data-entity-id="hero-custom"]');
    expect(heroEntity).toBeTruthy();
    expect(heroEntity?.dataset.tileX).toBe('1');
    expect(heroEntity?.dataset.tileY).toBe('0');
  });

  test('given app starts when HUD loads then movement points show 15 out of 15', async () => {
    await setupMovementBehaviorApp();
    expectMovementPoints(15);
  });

  test('given HUD is outside viewport when user clicks End turn then no map tile selection occurs', async () => {
    const { user } = await setupMovementBehaviorApp();

    await clickEndTurn(user);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(15);
    expectNoPreview();
  });
});
