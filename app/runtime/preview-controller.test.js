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
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import { registerPreviewController } from './preview-controller.js';

function createFakeBus() {
  const listenersByType = new Map();
  const emitted = [];

  return {
    emitted,
    addEventListener(type, handler) {
      const listeners = listenersByType.get(type) ?? [];
      listeners.push(handler);
      listenersByType.set(type, listeners);
    },
    emit(type, detail) {
      emitted.push({ type, detail: structuredClone(detail) });
      for (const listener of listenersByType.get(type) ?? []) {
        listener({ type, detail });
      }
    }
  };
}

function getLastEvent(bus, type) {
  return [...bus.emitted].reverse().find((entry) => entry.type === type) ?? null;
}

describe('preview controller', () => {
  test('builds preview on first click and emits move request on second click', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const occupancy = createOccupancyIndex([hero]);
    const bus = createFakeBus();

    registerPreviewController({
      bus,
      map,
      occupancy,
      getHero: () => hero,
      getRemainingMovementPoints: () => 15
    });

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });

    const previewEvent = getLastEvent(bus, APP_UI_PREVIEW_UPDATED);
    expect(previewEvent?.detail.targetTile).toEqual({ x: 2, y: 0 });
    expect(previewEvent?.detail.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);

    bus.emit(APP_COMMAND_TILE_CLICKED, { tile: { x: 2, y: 0 } });

    const moveRequest = getLastEvent(bus, APP_COMMAND_MOVE_REQUESTED);
    expect(moveRequest?.detail.targetTile).toEqual({ x: 2, y: 0 });
    expect(moveRequest?.detail.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);
  });

  test('shrinks preview path as hero moves and clears after finishing at target', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });
    const occupancy = createOccupancyIndex([hero]);
    const bus = createFakeBus();

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
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex([hero]);
    const bus = createFakeBus();
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

    const previewEvent = getLastEvent(bus, APP_UI_PREVIEW_UPDATED);
    expect(previewEvent?.detail.maxAffordableSteps).toBe(1);
  });

  test('does not emit move request when remaining movement points are zero', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });
    const occupancy = createOccupancyIndex([hero]);
    const bus = createFakeBus();

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
