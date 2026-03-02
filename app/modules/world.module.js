import { createMap as createMapDefault } from '../../engine/map.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../../engine/occupancy.js';
import { loadGame as loadGameDefault } from '../../game/load.js';
import { createTownFootprintBlockers } from '../../game/town-footprint.js';
import {
  APP_COMMAND_APP_START,
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY
} from '../events.js';

function removeEntityById(entities, entityId) {
  const index = entities.findIndex((entity) => entity.id === entityId);
  if (index < 0) {
    return null;
  }

  const [removed] = entities.splice(index, 1);
  return removed ?? null;
}

export function registerWorldModule(
  { bus, env },
  {
    loadGame = loadGameDefault,
    createMap = createMapDefault,
    createOccupancyIndex = createOccupancyIndexDefault
  } = {}
) {
  let hasStarted = false;
  let worldState = null;

  function getEntityById(entityId) {
    if (!worldState || typeof entityId !== 'string' || entityId.length === 0) {
      return null;
    }

    return worldState.scenario.entities.find((entity) => entity.id === entityId) ?? null;
  }

  function removeEntityFromWorld(entityId) {
    if (!worldState || typeof entityId !== 'string' || entityId.length === 0) {
      return;
    }

    const removedEntity = removeEntityById(worldState.scenario.entities, entityId);
    if (!removedEntity) {
      return;
    }

    worldState.occupancy.removeEntity?.(removedEntity);
  }

  bus.addEventListener(APP_FACT_HERO_MOVED, (event) => {
    const movedEntity = getEntityById(event.detail?.heroId);
    const fromTile = event.detail?.from;
    const toTile = event.detail?.to;
    if (!movedEntity || !toTile) {
      return;
    }

    const x = Number(toTile.x);
    const y = Number(toTile.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    const nextTile = {
      x: Math.floor(x),
      y: Math.floor(y)
    };

    const previousTile = {
      x: Number(movedEntity.tile?.x),
      y: Number(movedEntity.tile?.y)
    };

    worldState?.occupancy.moveEntity?.(movedEntity, nextTile);
    movedEntity.tile = nextTile;

    const fromX = Number(fromTile?.x);
    const fromY = Number(fromTile?.y);
    const restoreTile =
      Number.isFinite(fromX) && Number.isFinite(fromY)
        ? { x: Math.floor(fromX), y: Math.floor(fromY) }
        : previousTile;
    const shouldRestoreTile =
      Number.isFinite(restoreTile.x) &&
      Number.isFinite(restoreTile.y) &&
      (restoreTile.x !== nextTile.x || restoreTile.y !== nextTile.y);

    if (!shouldRestoreTile) {
      return;
    }

    const persistentTown = worldState?.scenario?.entities?.find?.(
      (entity) =>
        entity.kind === 'TOWN' &&
        entity.tile?.x === restoreTile.x &&
        entity.tile?.y === restoreTile.y
    );
    if (!persistentTown) {
      return;
    }

    worldState?.occupancy.moveEntity?.(persistentTown, restoreTile);
  });

  bus.addEventListener(APP_FACT_MONSTER_DEFEATED, (event) => {
    removeEntityFromWorld(event.detail?.entityId);
  });

  bus.addEventListener(APP_FACT_RESOURCE_COLLECTED, (event) => {
    removeEntityFromWorld(event.detail?.entityId);
  });

  bus.addEventListener(APP_COMMAND_APP_START, () => {
    if (hasStarted) {
      return;
    }

    hasStarted = true;
    void (async () => {
      try {
        const { scenario, definitions } = await loadGame({ fetch: env.fetch });
        const map = createMap(scenario.terrain);
        const townFootprintBlockers = createTownFootprintBlockers({
          entities: scenario.entities,
          map
        });
        const occupancy = createOccupancyIndex([...scenario.entities, ...townFootprintBlockers]);

        worldState = {
          scenario,
          occupancy
        };

        bus.emit(APP_FACT_WORLD_READY, {
          scenario,
          definitions,
          map,
          occupancy
        });
      } catch (error) {
        bus.emit(APP_FACT_WORLD_LOAD_FAILED, {
          error
        });
      }
    })();
  });
}
