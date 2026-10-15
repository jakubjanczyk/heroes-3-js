import { describe, expect, test } from 'vitest';

import { applyHeroMoved, createHeroPositions, getHeroTile } from './hero-positions.js';

describe('hero positions', () => {
  test('starts from every hero in the scenario', () => {
    const positions = createHeroPositions([
      { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
      { id: 'hero-2', kind: 'HERO', tile: { x: 4, y: 2 } },
      { id: 'town-1', kind: 'TOWN', tile: { x: 1, y: 1 } }
    ]);

    expect(positions).toEqual({ 'hero-1': { x: 0, y: 0 }, 'hero-2': { x: 4, y: 2 } });
  });

  test('moves only the hero named in the fact', () => {
    const positions = createHeroPositions([
      { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } },
      { id: 'hero-2', kind: 'HERO', tile: { x: 4, y: 2 } }
    ]);

    const next = applyHeroMoved(positions, { heroId: 'hero-2', from: { x: 4, y: 2 }, to: { x: 5, y: 2 } });

    expect(getHeroTile(next, 'hero-1')).toEqual({ x: 0, y: 0 });
    expect(getHeroTile(next, 'hero-2')).toEqual({ x: 5, y: 2 });
    expect(getHeroTile(positions, 'hero-2')).toEqual({ x: 4, y: 2 });
  });

  test('ignores facts without a known hero or a valid tile', () => {
    const positions = createHeroPositions([{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]);

    expect(applyHeroMoved(positions, { to: { x: 1, y: 0 } })).toBe(positions);
    expect(applyHeroMoved(positions, { heroId: 'hero-9', to: { x: 1, y: 0 } })).toBe(positions);
    expect(applyHeroMoved(positions, { heroId: 'hero-1', to: null })).toBe(positions);
  });
});
