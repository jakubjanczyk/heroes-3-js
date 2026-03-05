import { resolveArrivalOutcome } from '../domain/entity-behaviors.js';

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function createInteractionSystem({ entities, definitions = {} }) {
  const monsterDefinitions = definitions.monsters ?? {};
  const resourceDefinitions = definitions.resources ?? {};
  const townDefinitions = definitions.towns ?? {};
  const interactionDefinitions = {
    monsters: monsterDefinitions,
    resources: resourceDefinitions,
    towns: townDefinitions
  };

  function resolveArrivalAtDestination({ destinationTile }) {
    const interactionEntity =
      entities.find(
        (entity) => entity.kind !== 'HERO' && sameTile(entity.tile, destinationTile)
      ) ?? null;
    if (!interactionEntity) {
      return null;
    }

    return resolveArrivalOutcome({
      entity: interactionEntity,
      definitions: interactionDefinitions,
      tile: destinationTile
    });
  }

  function finalizeMonsterDefeat({ entityId }) {
    const monster = entities.find((entity) => entity.id === entityId) ?? null;
    return Boolean(monster && monster.kind === 'MONSTER');
  }

  function finalizeResourceCollection({ entityId }) {
    const resource = entities.find((entity) => entity.id === entityId) ?? null;
    return Boolean(resource && resource.kind === 'RESOURCE');
  }

  return {
    resolveArrivalAtDestination,
    finalizeMonsterDefeat,
    finalizeResourceCollection
  };
}
