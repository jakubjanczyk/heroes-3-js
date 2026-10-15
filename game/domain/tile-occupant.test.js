import { describe, expect, test } from 'vitest';

import { createOccupancyIndex } from '../../engine/occupancy.js';
import { getOccupantAt } from './tile-occupant.js';

const town = { id: 'town-1', kind: 'TOWN', tile: { x: 1, y: 0 } };
const monster = { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 0 } };
const staticOccupancy = createOccupancyIndex([town, monster]);

describe('tile occupant', () => {
  test('returns the static entity on the tile', () => {
    expect(getOccupantAt({ tile: { x: 2, y: 0 }, staticOccupancy })).toBe(monster);
    expect(getOccupantAt({ tile: { x: 3, y: 0 }, staticOccupancy })).toBe(null);
  });

  test('skips removed entities', () => {
    expect(
      getOccupantAt({ tile: { x: 2, y: 0 }, staticOccupancy, removedIds: new Set(['monster-1']) })
    ).toBe(null);
  });

  test('the asking hero never hides what is under it', () => {
    const occupant = getOccupantAt({
      tile: { x: 1, y: 0 },
      staticOccupancy,
      heroPositions: { 'hero-1': { x: 1, y: 0 } },
      excludeHeroId: 'hero-1'
    });

    expect(occupant).toBe(town);
  });

  test('another hero on the tile comes first', () => {
    const occupant = getOccupantAt({
      tile: { x: 1, y: 0 },
      staticOccupancy,
      heroPositions: { 'hero-1': { x: 0, y: 0 }, 'hero-2': { x: 1, y: 0 } },
      excludeHeroId: 'hero-1'
    });

    expect(occupant).toEqual({ id: 'hero-2', kind: 'HERO', tile: { x: 1, y: 0 } });
  });
});
