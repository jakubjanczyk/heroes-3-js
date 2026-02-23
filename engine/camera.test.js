import { describe, expect, test } from 'vitest';

import { createMap } from './map.js';
import { createCamera } from './camera.js';

function createViewport(width, height) {
  return {
    clientWidth: width,
    clientHeight: height
  };
}

function createWorld() {
  return {
    style: {}
  };
}

describe('camera', () => {
  test('moveBy and moveTo update world transform', () => {
    const map = createMap({
      width: 3,
      height: 3,
      tiles: new Array(9).fill(0)
    });
    const viewport = createViewport(800, 600);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });

    camera.moveBy(12, -8);
    expect(world.style.transform).toBe('translate(12px, -8px)');

    camera.moveTo(-40, 24);
    expect(world.style.transform).toBe('translate(-40px, 24px)');
  });

  test('centerOnTile moves camera to place tile at viewport center', () => {
    const map = createMap({
      width: 5,
      height: 5,
      tiles: new Array(25).fill(0)
    });
    const viewport = createViewport(1000, 700);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });

    const tile = { x: 2, y: 1 };
    const screen = map.tileToScreen(tile);
    const mapPixelWidth = (map.width + map.height) * map.halfTileWidth;
    const mapPixelHeight = (map.width + map.height) * map.halfTileHeight;
    const minXOffset = (map.height - 1) * map.halfTileWidth;
    const originX = Math.round((1000 - mapPixelWidth) / 2 + minXOffset);
    const originY = Math.round((700 - mapPixelHeight) / 2);

    camera.centerOnTile(tile);

    expect(world.style.transform).toBe(
      `translate(${500 - (originX + screen.x + map.halfTileWidth)}px, ${350 - (originY + screen.y + map.halfTileHeight)}px)`
    );
  });

  test('follow tile and pan offset combine into final camera position', () => {
    const map = createMap({
      width: 5,
      height: 5,
      tiles: new Array(25).fill(0)
    });
    const viewport = createViewport(900, 600);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });
    const followedTile = { x: 3, y: 2 };
    const screen = map.tileToScreen(followedTile);
    const mapPixelWidth = (map.width + map.height) * map.halfTileWidth;
    const mapPixelHeight = (map.width + map.height) * map.halfTileHeight;
    const minXOffset = (map.height - 1) * map.halfTileWidth;
    const originX = Math.round((900 - mapPixelWidth) / 2 + minXOffset);
    const originY = Math.round((600 - mapPixelHeight) / 2);

    camera.setFollowTileGetter(() => followedTile);
    camera.moveBy(20, -10);
    camera.update();

    expect(world.style.transform).toBe(
      `translate(${450 - (originX + screen.x + map.halfTileWidth) + 20}px, ${300 - (originY + screen.y + map.halfTileHeight) - 10}px)`
    );
  });

  test('lock follow ignores manual pan and clearPan removes old offsets', () => {
    const map = createMap({
      width: 5,
      height: 5,
      tiles: new Array(25).fill(0)
    });
    const viewport = createViewport(900, 600);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });
    const followedTile = { x: 3, y: 2 };
    const screen = map.tileToScreen(followedTile);
    const mapPixelWidth = (map.width + map.height) * map.halfTileWidth;
    const mapPixelHeight = (map.width + map.height) * map.halfTileHeight;
    const minXOffset = (map.height - 1) * map.halfTileWidth;
    const originX = Math.round((900 - mapPixelWidth) / 2 + minXOffset);
    const originY = Math.round((600 - mapPixelHeight) / 2);

    camera.setFollowTileGetter(() => followedTile);
    camera.moveBy(20, -10);
    camera.lockFollow();
    camera.moveBy(30, 40);
    camera.clearPan();
    camera.update();

    expect(world.style.transform).toBe(
      `translate(${450 - (originX + screen.x + map.halfTileWidth)}px, ${300 - (originY + screen.y + map.halfTileHeight)}px)`
    );
  });
});
