import { createMap } from '../../engine/map.js';
import { createOccupancyIndex } from '../../engine/occupancy.js';

export function createHeroWorld({
  width = 3,
  height = 1,
  tiles = null,
  heroId = 'hero-1',
  heroTile = { x: 0, y: 0 }
} = {}) {
  const resolvedTiles = tiles ?? new Array(width * height).fill(0);
  const hero = { id: heroId, kind: 'HERO', tile: heroTile };
  const map = createMap({
    width,
    height,
    tiles: resolvedTiles
  });
  const occupancy = createOccupancyIndex([hero]);

  return {
    hero,
    map,
    occupancy
  };
}
