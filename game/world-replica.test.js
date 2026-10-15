import { describe, expect, test } from 'vitest';

import { createMap } from '../engine/map.js';
import { createWorldReplica } from './world-replica.js';

function createSnapshot(entities) {
  const terrain = { width: 4, height: 1, tiles: [0, 0, 0, 0] };
  return {
    scenario: { meta: { id: 'demo' }, terrain, entities },
    map: createMap(terrain)
  };
}

describe('world replica', () => {
  test('copies entities and shares the static map', () => {
    const snapshot = createSnapshot([{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]);

    const replica = createWorldReplica(snapshot);

    expect(replica.map).toBe(snapshot.map);
    expect(replica.entities).not.toBe(snapshot.scenario.entities);
    expect(replica.getHero()).not.toBe(snapshot.scenario.entities[0]);
    expect(replica.getHero()?.tile).toEqual({ x: 0, y: 0 });
  });

  test('works from a deeply frozen snapshot', () => {
    const snapshot = createSnapshot([{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]);
    Object.freeze(snapshot.scenario.entities[0].tile);
    Object.freeze(snapshot.scenario.entities[0]);
    Object.freeze(snapshot.scenario.entities);

    const replica = createWorldReplica(snapshot);

    expect(replica.applyHeroMoved({ heroId: 'hero-1', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } })).toBe(
      true
    );
    expect(replica.getHero()?.tile).toEqual({ x: 1, y: 0 });
  });

  test('moves the hero and keeps occupancy in sync', () => {
    const replica = createWorldReplica(
      createSnapshot([{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }])
    );

    replica.applyHeroMoved({ heroId: 'hero-1', from: { x: 0, y: 0 }, to: { x: 2, y: 0 } });

    expect(replica.getHero()?.tile).toEqual({ x: 2, y: 0 });
    expect(replica.getEntityAt({ x: 2, y: 0 })?.id).toBe('hero-1');
    expect(replica.getEntityAt({ x: 0, y: 0 })).toBe(null);
  });

  test('ignores hero moved without a known hero id', () => {
    const replica = createWorldReplica(
      createSnapshot([{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }])
    );

    expect(replica.applyHeroMoved({ to: { x: 1, y: 0 } })).toBe(false);
    expect(replica.getHero()?.tile).toEqual({ x: 0, y: 0 });
  });

  test('restores a town at the tile the hero leaves', () => {
    const replica = createWorldReplica(
      createSnapshot([
        { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } }
      ])
    );

    replica.applyHeroMoved({ heroId: 'hero-1', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } });
    expect(replica.getEntityAt({ x: 1, y: 0 })?.id).toBe('hero-1');

    replica.applyHeroMoved({ heroId: 'hero-1', from: { x: 1, y: 0 }, to: { x: 2, y: 0 } });
    expect(replica.getEntityAt({ x: 1, y: 0 })?.id).toBe('town-1');
  });

  test('removes entities from the list and occupancy', () => {
    const replica = createWorldReplica(
      createSnapshot([
        { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'monster-1', kind: 'MONSTER', tile: { x: 1, y: 0 } },
        { id: 'resource-1', kind: 'RESOURCE', tile: { x: 2, y: 0 } }
      ])
    );

    replica.removeEntity('monster-1');
    replica.removeEntity('resource-1');

    expect(replica.entities.map((entity) => entity.id)).toEqual(['hero-1']);
    expect(replica.getEntityAt({ x: 1, y: 0 })).toBe(null);
    expect(replica.getEntityAt({ x: 2, y: 0 })).toBe(null);
  });

  test('replicas from the same snapshot are independent', () => {
    const snapshot = createSnapshot([
      { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
      { id: 'monster-1', kind: 'MONSTER', tile: { x: 3, y: 0 } }
    ]);
    const first = createWorldReplica(snapshot);
    const second = createWorldReplica(snapshot);

    first.applyHeroMoved({ heroId: 'hero-1', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } });
    first.removeEntity('monster-1');

    expect(second.getHero()?.tile).toEqual({ x: 0, y: 0 });
    expect(second.getEntityAt({ x: 3, y: 0 })?.id).toBe('monster-1');
    expect(snapshot.scenario.entities).toHaveLength(2);
    expect(snapshot.scenario.entities[0].tile).toEqual({ x: 0, y: 0 });
  });
});
