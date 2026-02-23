import { describe, expect, test } from 'vitest';

import { createOccupancyIndex } from './occupancy.js';

describe('occupancy index', () => {
  test('returns entity at tile using stable x,y key format', () => {
    const entities = [
      { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 1 } },
      { id: 'monster-1', kind: 'MONSTER', tile: { x: 4, y: 2 } }
    ];
    const occupancy = createOccupancyIndex(entities);

    expect(occupancy.getAt({ x: 1, y: 1 })?.id).toBe('hero-1');
    expect(occupancy.getAt({ x: 4, y: 2 })?.id).toBe('monster-1');
    expect(occupancy.getAt({ x: 0, y: 0 })).toBe(null);
  });

  test('updates tile index when entity moves', () => {
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 1, y: 1 } };
    const occupancy = createOccupancyIndex([hero]);

    occupancy.moveEntity(hero, { x: 2, y: 1 });

    expect(occupancy.getAt({ x: 1, y: 1 })).toBe(null);
    expect(occupancy.getAt({ x: 2, y: 1 })?.id).toBe('hero-1');
  });
});
