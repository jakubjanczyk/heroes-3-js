import { isHero } from './entity-queries.js';
import { toEntityIdOrNull } from './value-objects/entity-id.js';
import { normalizeTile } from './value-objects/tile.js';

// Hero tiles keyed by hero id. Heroes are the only entities that move.
export function createHeroPositions(entities) {
  const positions = {};
  for (const entity of entities ?? []) {
    const tile = normalizeTile(entity?.tile);
    if (isHero(entity) && tile) {
      positions[entity.id] = tile;
    }
  }

  return Object.freeze(positions);
}

export function applyHeroMoved(positions, { heroId, to } = {}) {
  const id = toEntityIdOrNull(heroId);
  const tile = normalizeTile(to);
  if (!id || !tile || !(id in positions)) {
    return positions;
  }

  return Object.freeze({ ...positions, [id]: tile });
}

export function getHeroTile(positions, heroId) {
  return positions?.[heroId] ?? null;
}
