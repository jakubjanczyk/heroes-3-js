import { describe, expect, test } from 'vitest';

import { createMap } from '../engine/map.js';
import { createMineFootprintBlockers } from './mine-footprint.js';

function createOpenMap(width, height) {
  return createMap({
    width,
    height,
    tiles: new Array(width * height).fill(0)
  });
}

function toSortedTileKeys(blockers) {
  return blockers
    .map((blocker) => `${blocker.tile.x},${blocker.tile.y}`)
    .sort((a, b) => a.localeCompare(b));
}

describe('mine footprint blockers', () => {
  test('creates all non-entry blockers for 3x2 mine footprint', () => {
    const blockers = createMineFootprintBlockers({
      entities: [{ id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 5, y: 3 } }],
      map: createOpenMap(12, 8)
    });

    expect(toSortedTileKeys(blockers)).toEqual(['4,2', '4,3', '5,2', '6,2', '6,3']);
  });

  test('clips blockers that would fall outside map bounds', () => {
    const blockers = createMineFootprintBlockers({
      entities: [{ id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 0, y: 0 } }],
      map: createOpenMap(4, 4)
    });

    expect(toSortedTileKeys(blockers)).toEqual(['1,0']);
  });

  test('skips blocker tile already occupied by another entity', () => {
    const blockers = createMineFootprintBlockers({
      entities: [
        { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 4, y: 3 } },
        { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 5, y: 2 } },
        { id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 5, y: 3 } }
      ],
      map: createOpenMap(12, 8)
    });

    expect(toSortedTileKeys(blockers)).toEqual(['4,2', '6,2', '6,3']);
  });
});
