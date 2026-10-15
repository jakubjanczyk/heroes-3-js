import { buildWorld as buildWorldDefault } from './build-world.js';
import { findHero } from './domain/entity-queries.js';
import { normalizeTile } from './domain/value-objects/tile.js';

// A module-owned, mutable copy of the world built from the frozen world-ready snapshot.
// Static data (map, definitions) is shared by reference; entities and occupancy are private,
// so each module applies world facts to its own replica and nobody mutates shared state.
export function createWorldReplica({ scenario, map }, { buildWorld = buildWorldDefault } = {}) {
  const entities = structuredClone(scenario?.entities ?? []);
  const { occupancy, worldState } = buildWorld({
    scenario: { ...scenario, entities },
    map
  });

  function getHero() {
    return findHero(entities);
  }

  function getEntityAt(tile) {
    return occupancy.getAt(tile);
  }

  function applyHeroMoved({ heroId, from, to } = {}) {
    const movedEntity = worldState.getEntityById(heroId);
    const fromTile = normalizeTile(from);
    const toTile = normalizeTile(to);
    if (!movedEntity || !toTile) {
      return false;
    }

    const previousTile = normalizeTile(movedEntity.tile);
    if (!worldState.moveEntity({ entityId: movedEntity.id, toTile })) {
      return false;
    }

    const restoreTile = fromTile ?? previousTile;
    if (restoreTile && (restoreTile.x !== toTile.x || restoreTile.y !== toTile.y)) {
      worldState.restorePersistentEntitiesAt(restoreTile);
    }

    return true;
  }

  function removeEntity(entityId) {
    return worldState.removeEntityById(entityId);
  }

  return {
    map,
    entities,
    occupancy,
    getHero,
    getEntityAt,
    applyHeroMoved,
    removeEntity
  };
}
