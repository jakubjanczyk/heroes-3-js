import { describe, expect, test } from 'vitest';

import { createOccupancyIndex } from '../../engine/occupancy.js';
import { getOccupantAt } from './tile-occupant.js';

const monster = { id: 'monster-1', kind: 'MONSTER', tile: { x: 2, y: 0 } };
const staticOccupancy = createOccupancyIndex([monster]);

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
});
