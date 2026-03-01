import { describe, expect, test } from 'vitest';

import { createMap } from '../map.js';
import {
  getMapCenteredOrigin,
  getTileCenter,
  getTileTopLeft,
  getViewportCenter
} from './layout.js';

describe('layer layout helpers', () => {
  test('anchors map origin to top-left corner', () => {
    const map = createMap({
      width: 4,
      height: 3,
      tiles: new Array(12).fill(0)
    });

    const origin = getMapCenteredOrigin({
      width: 1000,
      height: 700,
      map
    });

    expect(origin).toEqual({
      x: 0,
      y: 0
    });
  });

  test('returns top-left and center screen points for a tile', () => {
    const map = createMap({
      width: 4,
      height: 3,
      tiles: new Array(12).fill(0)
    });
    const origin = { x: 300, y: 180 };
    const tile = { x: 2, y: 1 };
    const screen = map.tileToScreen(tile);

    expect(getTileTopLeft({ map, tile, origin })).toEqual({
      x: origin.x + screen.x,
      y: origin.y + screen.y
    });

    expect(getTileCenter({ map, tile, origin })).toEqual({
      x: origin.x + screen.x + map.halfTileWidth,
      y: origin.y + screen.y + map.halfTileHeight
    });
  });

  test('returns viewport center in pixels', () => {
    expect(getViewportCenter({ width: 1001, height: 701 })).toEqual({
      x: 500.5,
      y: 350.5
    });
  });
});
