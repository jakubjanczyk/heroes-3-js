import { describe, expect, test } from 'vitest';

import { createMap } from '../engine/map.js';
import { createCamera } from '../engine/camera.js';

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

    camera.centerOnTile(tile);

    expect(world.style.transform).toBe(
      `translate(${500 - screen.x}px, ${350 - screen.y}px)`
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

    camera.setFollowTileGetter(() => followedTile);
    camera.moveBy(20, -10);
    camera.update();

    expect(world.style.transform).toBe(
      `translate(${450 - screen.x + 20}px, ${300 - screen.y - 10}px)`
    );
  });
});
