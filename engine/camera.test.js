import { describe, expect, test } from 'vitest';

import { createCamera } from './camera.js';
import { getMapCenteredOrigin } from './layers/layout.js';
import { createMap } from './map.js';

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

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function getBounds({ viewport, map }) {
  const origin = getMapCenteredOrigin({
    width: viewport.clientWidth,
    height: viewport.clientHeight,
    map
  });
  const mapPixelWidth = map.width * map.tileWidth;
  const mapPixelHeight = map.height * map.tileHeight;

  function getAxisBounds(viewportSize, mapSize, originOffset) {
    const anchor = -originOffset;
    if (mapSize <= viewportSize) {
      return { min: anchor, max: anchor };
    }

    return {
      min: viewportSize - originOffset - mapSize,
      max: anchor
    };
  }

  return {
    x: getAxisBounds(viewport.clientWidth, mapPixelWidth, origin.x),
    y: getAxisBounds(viewport.clientHeight, mapPixelHeight, origin.y)
  };
}

function clampTranslation({ map, viewport, x, y }) {
  const bounds = getBounds({ viewport, map });
  return {
    x: clamp(x, bounds.x.min, bounds.x.max),
    y: clamp(y, bounds.y.min, bounds.y.max)
  };
}

function getCenteredTranslation({ map, viewport, tile }) {
  const origin = getMapCenteredOrigin({
    width: viewport.clientWidth,
    height: viewport.clientHeight,
    map
  });
  const screen = map.tileToScreen(tile);
  return {
    x: viewport.clientWidth / 2 - (origin.x + screen.x + map.halfTileWidth),
    y: viewport.clientHeight / 2 - (origin.y + screen.y + map.halfTileHeight)
  };
}

function toTranslate({ x, y }) {
  return `translate(${x}px, ${y}px)`;
}

describe('camera', () => {
  test('moveBy and moveTo update world transform within map bounds', () => {
    const map = createMap({
      width: 60,
      height: 40,
      tiles: new Array(2400).fill(0)
    });
    const viewport = createViewport(800, 600);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });

    camera.moveBy(-12, -8);
    expect(world.style.transform).toBe('translate(-12px, -8px)');

    camera.moveTo(-40, -24);
    expect(world.style.transform).toBe('translate(-40px, -24px)');
  });

  test('clamps movement to map boundaries', () => {
    const map = createMap({
      width: 60,
      height: 40,
      tiles: new Array(2400).fill(0)
    });
    const viewport = createViewport(800, 600);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });
    const bounds = getBounds({ viewport, map });

    camera.moveBy(50, 50);
    expect(world.style.transform).toBe(toTranslate({ x: bounds.x.max, y: bounds.y.max }));

    camera.moveTo(-9999, -9999);
    expect(world.style.transform).toBe(toTranslate({ x: bounds.x.min, y: bounds.y.min }));

    camera.moveBy(-100, -100);
    expect(world.style.transform).toBe(toTranslate({ x: bounds.x.min, y: bounds.y.min }));
  });

  test('centerOnTile uses clamped centered translation', () => {
    const map = createMap({
      width: 40,
      height: 30,
      tiles: new Array(1200).fill(0)
    });
    const viewport = createViewport(1000, 700);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });
    const tile = { x: 20, y: 15 };
    const centered = getCenteredTranslation({ map, viewport, tile });
    const clamped = clampTranslation({ map, viewport, x: centered.x, y: centered.y });

    camera.centerOnTile(tile);

    expect(world.style.transform).toBe(toTranslate(clamped));
  });

  test('follow tile and pan offset combine into final camera position', () => {
    const map = createMap({
      width: 50,
      height: 40,
      tiles: new Array(2000).fill(0)
    });
    const viewport = createViewport(900, 600);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });
    const followedTile = { x: 20, y: 15 };
    const centered = getCenteredTranslation({ map, viewport, tile: followedTile });
    const expected = clampTranslation({
      map,
      viewport,
      x: centered.x - 40,
      y: centered.y - 20
    });

    camera.setFollowTileGetter(() => followedTile);
    camera.moveBy(-40, -20);
    camera.update();

    expect(world.style.transform).toBe(toTranslate(expected));
  });

  test('lock follow ignores manual pan and clearPan removes old offsets', () => {
    const map = createMap({
      width: 50,
      height: 40,
      tiles: new Array(2000).fill(0)
    });
    const viewport = createViewport(900, 600);
    const world = createWorld();
    const camera = createCamera({ viewport, world, map });
    const followedTile = { x: 20, y: 15 };
    const centered = getCenteredTranslation({ map, viewport, tile: followedTile });
    const expected = clampTranslation({ map, viewport, x: centered.x, y: centered.y });

    camera.setFollowTileGetter(() => followedTile);
    camera.moveBy(-20, -10);
    camera.lockFollow();
    camera.moveBy(-30, -40);
    camera.clearPan();
    camera.update();

    expect(world.style.transform).toBe(toTranslate(expected));
  });
});
