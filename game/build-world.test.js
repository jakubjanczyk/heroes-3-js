import { describe, expect, test } from 'vitest';

import { buildWorld } from './build-world.js';
import { MINE_BLOCKER_KIND } from './mine-footprint.js';
import { TOWN_BLOCKER_KIND } from './town-footprint.js';

describe('build world', () => {
  test('adds town footprint blockers to occupancy input', () => {
    let occupancyEntities = null;
    const scenario = {
      meta: { id: 'demo' },
      terrain: { width: 12, height: 12, tiles: new Array(144).fill(0) },
      entities: [
        { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 6, y: 6 } }
      ]
    };

    buildWorld(
      { scenario },
      {
        createMap: () => ({
          inBounds: ({ x, y }) => x >= 0 && y >= 0 && x < 12 && y < 12
        }),
        createOccupancyIndex: (entities) => {
          occupancyEntities = entities;
          return { entities };
        },
        createWorldState: ({ scenario: worldScenario, occupancy }) => ({
          scenario: worldScenario,
          occupancy
        })
      }
    );

    expect(occupancyEntities).toBeTruthy();
    expect(occupancyEntities).toHaveLength(14);
    expect(occupancyEntities.filter((entity) => entity.kind === TOWN_BLOCKER_KIND)).toHaveLength(12);
  });

  test('adds mine footprint blockers to occupancy input', () => {
    let occupancyEntities = null;
    const scenario = {
      meta: { id: 'demo' },
      terrain: { width: 12, height: 12, tiles: new Array(144).fill(0) },
      entities: [
        { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 6, y: 6 } }
      ]
    };

    buildWorld(
      { scenario },
      {
        createMap: () => ({
          inBounds: ({ x, y }) => x >= 0 && y >= 0 && x < 12 && y < 12
        }),
        createOccupancyIndex: (entities) => {
          occupancyEntities = entities;
          return { entities };
        },
        createWorldState: ({ scenario: worldScenario, occupancy }) => ({
          scenario: worldScenario,
          occupancy
        })
      }
    );

    expect(occupancyEntities).toBeTruthy();
    expect(occupancyEntities).toHaveLength(7);
    expect(occupancyEntities.filter((entity) => entity.kind === MINE_BLOCKER_KIND)).toHaveLength(5);
  });
});
