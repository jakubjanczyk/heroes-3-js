import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { createMap } from '../engine/map.js';
import { createTownFootprintBlockers } from './town-footprint.js';

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

describe('town footprint blockers', () => {
  test('creates configured blocked tiles around an in-bounds town entry tile', () => {
    const blockers = createTownFootprintBlockers({
      entities: [{ id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }],
      map: createOpenMap(8, 7)
    });

    expect(toSortedTileKeys(blockers)).toEqual([
      '2,2',
      '2,3',
      '3,1',
      '3,2',
      '3,3',
      '4,1',
      '4,2',
      '5,2'
    ]);
  });

  test('clips blocked tiles that would fall outside map bounds', () => {
    const blockers = createTownFootprintBlockers({
      entities: [{ id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } }],
      map: createOpenMap(3, 3)
    });

    expect(toSortedTileKeys(blockers)).toEqual(['0,0']);
  });

  test('skips blocked tiles already occupied by another entity', () => {
    const blockers = createTownFootprintBlockers({
      entities: [
        { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 3, y: 2 } },
        { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
      ],
      map: createOpenMap(8, 7)
    });

    expect(blockers).toHaveLength(7);
    expect(toSortedTileKeys(blockers)).not.toContain('3,2');
  });

  test('matches expected blocked tiles for current demo scenario town', () => {
    const scenario = JSON.parse(
      readFileSync(new URL('../scenarios/scenario.json', import.meta.url), 'utf8')
    );
    const map = createMap(scenario.terrain);

    const blockers = createTownFootprintBlockers({
      entities: scenario.entities,
      map
    });

    expect(toSortedTileKeys(blockers)).toEqual([
      '10,6',
      '7,6',
      '7,7',
      '8,5',
      '8,6',
      '8,7',
      '9,5',
      '9,6'
    ]);
  });
});
