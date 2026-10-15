import { describe, expect, test } from 'vitest';

import { createMap } from '../../../engine/map.js';
import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY
} from '../../events.js';
import { createFakeBus } from '../../../tests/test-utils/fake-bus.js';
import { WORLD_REPLICA_EVENTS, createWorldReplicaTracker } from './world-replica-tracker.js';

function registerTracker(bus) {
  const tracker = createWorldReplicaTracker();
  for (const { type, handler } of tracker.subscriptions) {
    bus.addEventListener(type, handler);
  }
  return tracker;
}

function emitWorldReady(bus) {
  bus.emit(APP_FACT_WORLD_READY, {
    scenario: {
      entities: [
        { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 0 } },
        { id: 'resource-1', kind: 'RESOURCE', tile: { x: 3, y: 0 } }
      ]
    },
    map: createMap({ width: 4, height: 1, tiles: [0, 0, 0, 0] }),
    definitions: {}
  });
}

describe('world replica tracker', () => {
  test('has no replica before world is ready', () => {
    const bus = createFakeBus();
    const tracker = registerTracker(bus);

    bus.emit(APP_FACT_HERO_MOVED, { heroId: 'hero-1', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } });

    expect(tracker.get()).toBe(null);
  });

  test('applies world facts to its own replica', () => {
    const bus = createFakeBus();
    const tracker = registerTracker(bus);

    emitWorldReady(bus);
    bus.emit(APP_FACT_HERO_MOVED, { heroId: 'hero-1', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } });
    bus.emit(APP_FACT_MONSTER_DEFEATED, { entityId: 'monster-1' });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, { entityId: 'resource-1' });

    const replica = tracker.get();
    expect(replica.getHero()?.tile).toEqual({ x: 1, y: 0 });
    expect(replica.entities.map((entity) => entity.id)).toEqual(['hero-1']);
  });

  test('two trackers on the same bus keep separate replicas', () => {
    const bus = createFakeBus();
    const first = registerTracker(bus);
    const second = registerTracker(bus);

    emitWorldReady(bus);

    expect(first.get()).not.toBe(second.get());
    expect(first.get().getHero()).not.toBe(second.get().getHero());
  });

  test('lists every event it consumes', () => {
    const tracker = createWorldReplicaTracker();

    expect(tracker.subscriptions.map((entry) => entry.type)).toEqual([...WORLD_REPLICA_EVENTS]);
  });
});
