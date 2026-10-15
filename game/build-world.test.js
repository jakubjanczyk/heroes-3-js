import { describe, expect, test } from 'vitest';

import { buildWorld } from './build-world.js';
import { MINE_BLOCKER_KIND } from './mine-footprint.js';
import { TOWN_BLOCKER_KIND } from './town-footprint.js';

function createOpenTerrain(width, height) {
  return { width, height, tiles: new Array(width * height).fill(0) };
}

function captureOccupancyEntities(scenario) {
  let occupancyEntities = null;
  buildWorld(
    { scenario },
    {
      createMap: () => ({
        inBounds: ({ x, y }) => x >= 0 && y >= 0 && x < 12 && y < 12
      }),
      createOccupancyIndex: (entities) => {
        occupancyEntities = entities;
        return { getAt: () => null };
      }
    }
  );
  return occupancyEntities;
}

describe('build world', () => {
  test('adds town footprint blockers to occupancy input', () => {
    const occupancyEntities = captureOccupancyEntities({
      terrain: createOpenTerrain(12, 12),
      entities: [
        { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 6, y: 6 } }
      ]
    });

    expect(occupancyEntities).toHaveLength(13);
    expect(occupancyEntities.filter((entity) => entity.kind === TOWN_BLOCKER_KIND)).toHaveLength(12);
  });

  test('adds mine footprint blockers to occupancy input', () => {
    const occupancyEntities = captureOccupancyEntities({
      terrain: createOpenTerrain(12, 12),
      entities: [
        { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 6, y: 6 } }
      ]
    });

    expect(occupancyEntities).toHaveLength(6);
    expect(occupancyEntities.filter((entity) => entity.kind === MINE_BLOCKER_KIND)).toHaveLength(5);
  });

  test('leaves heroes out of the static occupancy and exposes lookups only', () => {
    const { map, staticOccupancy } = buildWorld({
      scenario: {
        terrain: createOpenTerrain(3, 1),
        entities: [
          { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 0 } }
        ]
      }
    });

    expect(map.width).toBe(3);
    expect(Object.keys(staticOccupancy)).toEqual(['getAt']);
    expect(staticOccupancy.getAt({ x: 0, y: 0 })).toBe(null);
    expect(staticOccupancy.getAt({ x: 2, y: 0 })?.id).toBe('monster-1');
  });
});
