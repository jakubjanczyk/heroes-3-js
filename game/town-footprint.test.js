import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { createMap } from '../engine/map.js';
import { findPath } from '../engine/pathfinding.js';
import { tileKey } from '../engine/tile-utils.js';
import { createTownFootprintBlockers } from './town-footprint.js';
import { findHero, isTown } from './domain/entity-queries.js';

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
      '5,1',
      '5,2',
      '5,3',
      '6,2',
      '6,3'
    ]);
  });

  test('clips blocked tiles that would fall outside map bounds', () => {
    const blockers = createTownFootprintBlockers({
      entities: [{ id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } }],
      map: createOpenMap(3, 3)
    });

    expect(toSortedTileKeys(blockers)).toEqual(['0,0', '2,0']);
  });

  test('skips blocked tiles already occupied by another entity', () => {
    const blockers = createTownFootprintBlockers({
      entities: [
        { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 3, y: 2 } },
        { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
      ],
      map: createOpenMap(8, 7)
    });

    expect(blockers).toHaveLength(11);
    expect(toSortedTileKeys(blockers)).not.toContain('3,2');
  });

  test('keeps demo town footprints consistent and towns reachable', () => {
    const scenario = JSON.parse(
      readFileSync(new URL('../scenarios/scenario.json', import.meta.url), 'utf8')
    );
    const map = createMap(scenario.terrain);
    const towns = scenario.entities.filter(isTown);
    const hero = findHero(scenario.entities);

    expect(towns.length).toBeGreaterThanOrEqual(1);
    expect(hero).toBeTruthy();

    const blockers = createTownFootprintBlockers({
      entities: scenario.entities,
      map
    });

    expect(blockers).toHaveLength(towns.length * 12);
    expect(new Set(toSortedTileKeys(blockers)).size).toBe(blockers.length);

    const blockedTileKeys = new Set();
    for (const entity of scenario.entities) {
      blockedTileKeys.add(tileKey(entity.tile));
    }
    for (const blocker of blockers) {
      blockedTileKeys.add(tileKey(blocker.tile));
    }

    for (const town of towns) {
      const townBlockers = blockers.filter((blocker) => blocker.townId === town.id);
      expect(townBlockers).toHaveLength(12);
      expect(townBlockers.some((blocker) => tileKey(blocker.tile) === tileKey(town.tile))).toBe(false);

      for (const blocker of townBlockers) {
        expect(map.inBounds(blocker.tile)).toBe(true);
      }

      const path = findPath({
        fromTile: hero.tile,
        toTile: town.tile,
        map,
        isBlocked: (tile) => {
          const key = tileKey(tile);
          return blockedTileKeys.has(key) && key !== tileKey(town.tile);
        }
      });

      expect(path).toBeTruthy();
      expect(path?.length).toBeGreaterThan(1);
    }
  });
});
