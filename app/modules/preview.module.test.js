import { describe, expect, test } from 'vitest';

import { createMap } from '../../engine/map.js';
import { createOccupancyIndex } from '../../engine/occupancy.js';
import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import { createFakeBus, getLastEmittedByType } from '../../tests/test-utils/fake-bus.js';
import { registerPreviewModule } from './preview.module.js';

describe('preview module', () => {
  test('emits preview updates and move request on second click', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({ width: 3, height: 1, tiles: [0, 0, 0] });
    const occupancy = createOccupancyIndex([hero]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });
    const preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.targetTile).toEqual({ x: 2, y: 0 });
    expect(preview?.detail.path?.length).toBe(3);

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });
    const moveRequest = getLastEmittedByType(bus, APP_COMMAND_MOVE_REQUESTED);
    expect(moveRequest?.detail.targetTile).toEqual({ x: 2, y: 0 });
  });

  test('does not emit move request when movement points are zero', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({ width: 2, height: 1, tiles: [0, 0] });
    const occupancy = createOccupancyIndex([hero]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 0, max: 15 });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 1, y: 0 } });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 1, y: 0 } });

    const moveRequests = bus.emitted.filter((entry) => entry.type === APP_COMMAND_MOVE_REQUESTED);
    expect(moveRequests).toEqual([]);
  });

  test('shrinks preview as hero moves and clears when movement reaches destination', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({ width: 4, height: 1, tiles: [0, 0, 0, 0] });
    const occupancy = createOccupancyIndex([hero]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 3, y: 0 } });
    bus.emit(APP_FACT_MOVE_STARTED, { targetTile: { x: 3, y: 0 } });
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 1, y: 0 } });
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 2, y: 0 } });
    hero.tile = { x: 3, y: 0 };
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 3, y: 0 } });
    bus.emit(APP_FACT_MOVE_FINISHED, {});

    const previews = bus.emitted.filter((entry) => entry.type === APP_UI_PREVIEW_UPDATED);
    expect(previews.at(-1)?.detail.path).toBe(null);
    expect(previews.some((entry) => entry.detail.path?.length === 3)).toBe(true);
    expect(previews.some((entry) => entry.detail.path?.length === 2)).toBe(true);
  });

  test('blocks tile-click preview while interaction modal is open and resumes after close', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({ width: 3, height: 1, tiles: [0, 0, 0] });
    const occupancy = createOccupancyIndex([hero]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });
    bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {
      title: 'Interaction',
      message: 'Monster defeated'
    });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });

    let preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.path).toBe(null);

    bus.emit(APP_UI_INTERACTION_MODAL_CLOSED, {});
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });

    preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.path?.length).toBe(3);
  });

  test('does not preview a route that would pass through a resource tile', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const resource = { id: 'resource-1', kind: 'RESOURCE', tile: { x: 1, y: 0 } };
    const map = createMap({ width: 3, height: 1, tiles: [0, 0, 0] });
    const occupancy = createOccupancyIndex([hero, resource]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero, resource] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });

    const preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.path).toBe(null);
    expect(preview?.detail.targetTile).toBe(null);
  });

  test('does not preview when destination is a non-interactable town footprint blocker tile', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const townBlocker = { id: 'town-1__blocker_0', kind: 'TOWN_BLOCKER', tile: { x: 1, y: 0 } };
    const map = createMap({ width: 2, height: 1, tiles: [0, 0] });
    const occupancy = createOccupancyIndex([hero, townBlocker]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 1, y: 0 } });

    const preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.path).toBe(null);
    expect(preview?.detail.targetTile).toBe(null);
  });

  test('previews route when destination is a town entry tile', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const town = { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } };
    const map = createMap({ width: 2, height: 1, tiles: [0, 0] });
    const occupancy = createOccupancyIndex([hero, town]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero, town] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 1, y: 0 } });

    const preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]);
    expect(preview?.detail.targetTile).toEqual({ x: 1, y: 0 });
  });

  test('clears preview when a resource gets collected', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({ width: 3, height: 1, tiles: [0, 0, 0] });
    const occupancy = createOccupancyIndex([hero]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, { entityId: 'resource-1' });

    const preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.path).toBe(null);
    expect(preview?.detail.targetTile).toBe(null);
  });

  test('clears preview immediately when movement finishes with resource collect interaction', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({ width: 3, height: 1, tiles: [0, 0, 0] });
    const occupancy = createOccupancyIndex([hero]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });
    bus.emit(APP_FACT_MOVE_FINISHED, {
      targetTile: { x: 2, y: 0 },
      interaction: {
        kind: 'RESOURCE_COLLECT',
        entityId: 'resource-1',
        targetTile: { x: 2, y: 0 }
      }
    });

    const preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.path).toBe(null);
    expect(preview?.detail.targetTile).toBe(null);
  });

  test('emits persisted preview facts when selecting and clearing preview target', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({ width: 4, height: 1, tiles: [0, 0, 0, 0] });
    const occupancy = createOccupancyIndex([hero]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 15, max: 15 });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 3, y: 0 } });

    expect(bus.emitted).toContainEqual({
      type: APP_FACT_PREVIEW_TARGET_SELECTED,
      detail: {
        tile: { x: 3, y: 0 }
      }
    });

    bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {});

    expect(bus.emitted).toContainEqual({
      type: APP_FACT_PREVIEW_CLEARED,
      detail: {}
    });
  });

  test('restores preview from replayed preview facts without re-persisting preview facts', () => {
    const bus = createFakeBus({ snapshotDetail: true });
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({ width: 4, height: 1, tiles: [0, 0, 0, 0] });
    const occupancy = createOccupancyIndex([hero]);

    registerPreviewModule({ bus });

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { entities: [hero] },
      map,
      occupancy
    });
    bus.emit(APP_FACT_PREVIEW_TARGET_SELECTED, {
      tile: { x: 3, y: 0 }
    });

    const preview = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(preview?.detail.targetTile).toEqual({ x: 3, y: 0 });
    expect(preview?.detail.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 }
    ]);

    const replayPersistedPreviewFacts = bus.emitted.filter(
      (entry) =>
        entry.type === APP_FACT_PREVIEW_TARGET_SELECTED || entry.type === APP_FACT_PREVIEW_CLEARED
    );
    expect(replayPersistedPreviewFacts).toEqual([
      {
        type: APP_FACT_PREVIEW_TARGET_SELECTED,
        detail: {
          tile: { x: 3, y: 0 }
        }
      }
    ]);
  });
});
