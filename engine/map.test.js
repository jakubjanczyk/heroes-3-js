import { describe, expect, test } from 'vitest';

import { createMap } from './map.js';

describe('map', () => {
  test('inBounds and isPassable reflect terrain data', () => {
    const map = createMap({
      width: 3,
      height: 2,
      tiles: [
        0, 1, 0,
        1, 0, 0
      ]
    });

    expect(map.inBounds({ x: 0, y: 0 })).toBe(true);
    expect(map.inBounds({ x: 2, y: 1 })).toBe(true);
    expect(map.inBounds({ x: -1, y: 0 })).toBe(false);
    expect(map.inBounds({ x: 3, y: 0 })).toBe(false);
    expect(map.inBounds({ x: 0, y: 2 })).toBe(false);

    expect(map.isPassable({ x: 0, y: 0 })).toBe(true);
    expect(map.isPassable({ x: 1, y: 0 })).toBe(false);
    expect(map.isPassable({ x: 0, y: 1 })).toBe(false);
    expect(map.isPassable({ x: 2, y: 1 })).toBe(true);
    expect(map.isPassable({ x: -1, y: 0 })).toBe(false);
  });

  test('tileToScreen and screenToTile round-trip tile coordinates', () => {
    const map = createMap({
      width: 12,
      height: 8,
      tiles: new Array(12 * 8).fill(0)
    });

    const tile = { x: 4, y: 3 };
    const screen = map.tileToScreen(tile);
    const decoded = map.screenToTile(screen);

    expect(decoded).toEqual(tile);
  });
});
