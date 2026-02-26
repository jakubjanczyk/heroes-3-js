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
});
