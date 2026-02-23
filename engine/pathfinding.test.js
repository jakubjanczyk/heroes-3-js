import { describe, expect, test } from 'vitest';

import { createMap } from './map.js';
import { findPath } from './pathfinding.js';

describe('pathfinding', () => {
  test('returns direct path for adjacent passable tile', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: () => false
    });

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]);
  });

  test('returns straight shortest path on open grid', () => {
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 2, y: 0 },
      map,
      isBlocked: () => false
    });

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);
  });

  test('returns null when destination tile is blocked terrain', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 1]
    });

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: () => false
    });

    expect(path).toBe(null);
  });

  test('does not allow diagonal corner cutting between blocked orthogonals', () => {
    const map = createMap({
      width: 2,
      height: 2,
      tiles: [
        0, 1,
        1, 0
      ]
    });

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 1 },
      map,
      isBlocked: () => false
    });

    expect(path).toBe(null);
  });

  test('treats occupied intermediate tile as blocked', () => {
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    });

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 2, y: 0 },
      map,
      isBlocked: (tile) => tile.x === 1 && tile.y === 0
    });

    expect(path).toBe(null);
  });

  test('prefers straight horizontal route when multiple shortest paths exist', () => {
    const map = createMap({
      width: 7,
      height: 3,
      tiles: new Array(21).fill(0)
    });

    const path = findPath({
      fromTile: { x: 5, y: 1 },
      toTile: { x: 1, y: 1 },
      map,
      isBlocked: () => false
    });

    expect(path).toEqual([
      { x: 5, y: 1 },
      { x: 4, y: 1 },
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 1 }
    ]);
  });

  test('chooses shortest detour in diagonal-style route with blockers', () => {
    const width = 6;
    const height = 5;
    const tiles = new Array(width * height).fill(0);
    tiles[2 * width + 3] = 1;
    tiles[3 * width + 2] = 1;
    const map = createMap({ width, height, tiles });

    const path = findPath({
      fromTile: { x: 5, y: 0 },
      toTile: { x: 1, y: 4 },
      map,
      isBlocked: () => false
    });

    expect(path).not.toBe(null);
    expect(path?.[0]).toEqual({ x: 5, y: 0 });
    expect(path?.at(-1)).toEqual({ x: 1, y: 4 });
    expect(path?.length).toBe(7);
    expect(path).not.toContainEqual({ x: 3, y: 2 });
    expect(path).not.toContainEqual({ x: 2, y: 3 });
  });

  test('allows occupied destination tile', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: (tile) => tile.x === 1 && tile.y === 0
    });

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]);
  });

  test('returns single-tile path when already at destination', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });

    const path = findPath({
      fromTile: { x: 1, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: () => false
    });

    expect(path).toEqual([{ x: 1, y: 0 }]);
  });

  test('returns null when destination is out of bounds', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 2, y: 0 },
      map,
      isBlocked: () => false
    });

    expect(path).toBe(null);
  });

  test('returns null when start tile is out of bounds', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    });

    const path = findPath({
      fromTile: { x: -1, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: () => false
    });

    expect(path).toBe(null);
  });

  test('allows diagonal move when both adjacent orthogonals are passable', () => {
    const map = createMap({
      width: 2,
      height: 2,
      tiles: [
        0, 0,
        0, 0
      ]
    });

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 1 },
      map,
      isBlocked: () => false
    });

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ]);
  });
});
