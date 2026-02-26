import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import {
  createFakeBus,
  getLastEmittedByType
} from '../../tests/test-utils/fake-bus.js';
import { registerPreviewController } from './preview-controller.js';
import { createHeroWorld } from './runtime-test-utils.js';

describe('preview controller', () => {
  test('builds preview on first click and emits move request on second click', () => {
    const { hero, map, occupancy } = createHeroWorld({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const bus = createFakeBus({ snapshotDetail: true });

    registerPreviewController({
      bus,
      map,
      occupancy,
      getHero: () => hero,
      getRemainingMovementPoints: () => 15
    });

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });

    const previewEvent = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(previewEvent?.detail.targetTile).toEqual({ x: 2, y: 0 });
    expect(previewEvent?.detail.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });

    const moveRequest = getLastEmittedByType(bus, APP_COMMAND_MOVE_REQUESTED);
    expect(moveRequest?.detail.targetTile).toEqual({ x: 2, y: 0 });
    expect(moveRequest?.detail.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);
  });

  test('shrinks preview path as hero moves and clears after finishing at target', () => {
    const { hero, map, occupancy } = createHeroWorld({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const bus = createFakeBus({ snapshotDetail: true });

    registerPreviewController({
      bus,
      map,
      occupancy,
      getHero: () => hero,
      getRemainingMovementPoints: () => 15
    });

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });
    bus.emit(APP_FACT_MOVE_STARTED, {});
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 1, y: 0 } });
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 2, y: 0 } });
    hero.tile = { x: 2, y: 0 };
    bus.emit(APP_FACT_MOVE_FINISHED, {});

    const previewUpdates = bus.emitted
      .filter((entry) => entry.type === APP_UI_PREVIEW_UPDATED)
      .map((entry) => entry.detail.path);

    expect(previewUpdates).toContainEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);
    expect(previewUpdates).toContainEqual([{ x: 2, y: 0 }]);
    expect(previewUpdates.at(-1)).toBe(null);
  });

  test('re-emits preview when movement points change for active preview', () => {
    const { hero, map, occupancy } = createHeroWorld({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const bus = createFakeBus({ snapshotDetail: true });
    let remaining = 3;

    registerPreviewController({
      bus,
      map,
      occupancy,
      getHero: () => hero,
      getRemainingMovementPoints: () => remaining
    });

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 1, y: 0 } });
    remaining = 1;
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 1, max: 15 });

    const previewEvent = getLastEmittedByType(bus, APP_UI_PREVIEW_UPDATED);
    expect(previewEvent?.detail.maxAffordableSteps).toBe(1);
  });

  test('does not emit move request when remaining movement points are zero', () => {
    const { hero, map, occupancy } = createHeroWorld({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const bus = createFakeBus({ snapshotDetail: true });

    registerPreviewController({
      bus,
      map,
      occupancy,
      getHero: () => hero,
      getRemainingMovementPoints: () => 0
    });

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 1, y: 0 } });
    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 1, y: 0 } });

    const moveRequests = bus.emitted.filter((entry) => entry.type === APP_COMMAND_MOVE_REQUESTED);
    expect(moveRequests).toEqual([]);
  });
});
