// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { setupMovementBehaviorApp } from './behavior.utils.js';

const DEFAULT_MINIMAP_BOUNDS = {
  left: 0,
  top: 0,
  width: 200,
  height: 200,
  right: 200,
  bottom: 200
};

const LARGE_VIEWPORT_SIZE = { width: 1000, height: 700 };

function createPassableMapScenario() {
  return {
    width: 60,
    height: 40,
    tiles: new Array(60 * 40).fill(0),
    entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 20, y: 15 } }]
  };
}

async function setupLargeMapMinimapApp() {
  await setupMovementBehaviorApp({
    loadGameOptions: createPassableMapScenario(),
    viewportSize: LARGE_VIEWPORT_SIZE
  });
}

function getElementOrFail(selector) {
  const element = document.querySelector(selector);
  expect(element).toBeTruthy();
  return element;
}

function getMinimapTile(x, y) {
  return document.querySelector(`.minimap-tile[data-x="${x}"][data-y="${y}"]`);
}

function getTownMarker(x, y) {
  return document.querySelector(`.minimap-town-marker[data-tile-x="${x}"][data-tile-y="${y}"]`);
}

function mockMinimapBounds(minimapMap, bounds = DEFAULT_MINIMAP_BOUNDS) {
  minimapMap.getBoundingClientRect = () => bounds;
}

function clickMinimap(minimapMap, clientX, clientY) {
  minimapMap.dispatchEvent(new window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY
  }));
}

describe('minimap behavior', () => {
  test('given app boots when world is ready then minimap renders full map with passable and blocked terrain', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 3,
        height: 2,
        tiles: [0, 1, 0, 1, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    });

    const minimapTiles = document.querySelectorAll('.minimap-tile');
    expect(minimapTiles).toHaveLength(6);

    const blockedTile = getMinimapTile(1, 0);
    const passableTile = getMinimapTile(1, 1);

    expect(blockedTile?.className).toContain('minimap-tile--blocked');
    expect(passableTile?.className).toContain('minimap-tile--passable');
  });

  test('given app boots with towns when minimap is rendered then town markers appear at town coordinates', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: {
        width: 8,
        height: 7,
        tiles: new Array(8 * 7).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } },
          { id: 'town-2', kind: 'TOWN', type: 'CASTLE', tile: { x: 6, y: 2 } }
        ]
      }
    });

    const townMarkers = document.querySelectorAll('.minimap-town-marker');
    expect(townMarkers).toHaveLength(2);
    expect(getTownMarker(4, 3)).toBeTruthy();
    expect(getTownMarker(6, 2)).toBeTruthy();
  });

  test('given camera starts and then pans when viewport changes then minimap viewport box updates position', async () => {
    await setupLargeMapMinimapApp();

    const viewportBox = getElementOrFail('#minimap-viewport');
    const before = viewportBox.style.getPropertyValue('--minimap-viewport-left');

    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(viewportBox.style.getPropertyValue('--minimap-viewport-left')).not.toBe(before);
  });

  test('given player clicks minimap when click hits a valid map region then camera recenters to clicked area', async () => {
    await setupLargeMapMinimapApp();

    const worldElement = getElementOrFail('.world');
    const minimapMap = getElementOrFail('#minimap-map');

    const before = worldElement.style.transform;
    mockMinimapBounds(minimapMap);

    clickMinimap(minimapMap, 160, 120);

    expect(worldElement.style.transform).not.toBe(before);
  });

  test('given player clicks near minimap border when recentering exceeds bounds then camera clamps at map edge', async () => {
    await setupLargeMapMinimapApp();

    const worldElement = getElementOrFail('.world');
    const minimapMap = getElementOrFail('#minimap-map');

    mockMinimapBounds(minimapMap);

    clickMinimap(minimapMap, 199, 199);

    expect(worldElement.style.transform).toBe('translate(-920px, -580px)');
  });
});
