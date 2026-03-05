import { createMap as createMapDefault } from '../../engine/map.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../../engine/occupancy.js';
import { createWorldState as createWorldStateDefault } from '../../game/domain/world-state.js';
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

export function registerWorldModule(
  { bus, env },
  {
    loadGame = loadGameDefault,
    createMap = createMapDefault,
    createOccupancyIndex = createOccupancyIndexDefault,
    createWorldState = createWorldStateDefault
  } = {}
) {
  let hasStarted = false;
  let worldState = null;

  function getEntityById(entityId) {
    return worldState?.getEntityById?.(entityId) ?? null;
  }

  function removeEntityFromWorld(entityId) {
    worldState?.removeEntityById?.(entityId);
  }

  bus.addEventListener(APP_FACT_HERO_MOVED, (event) => {
    const movedEntity = getEntityById(event.detail?.heroId);
    const fromTile = event.detail?.from;
    const toTile = event.detail?.to;
    if (!movedEntity || !toTile) {
      return;
    }

    const nextTile = {
      x: Number(toTile.x),
      y: Number(toTile.y)
    };
    if (!Number.isFinite(nextTile.x) || !Number.isFinite(nextTile.y)) {
      return;
    }

    const previousTile = {
      x: Number(movedEntity.tile?.x),
      y: Number(movedEntity.tile?.y)
    };

    const didMove = worldState?.moveEntity?.({
      entityId: movedEntity.id,
      toTile: nextTile
    });
    if (!didMove) {
      return;
    }

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

    const persistentTown = worldState?.getPersistentTownAt?.(restoreTile);
    if (!persistentTown) {
      return;
    }

    worldState?.moveEntity?.({
      entityId: persistentTown.id,
      toTile: restoreTile
    });
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

        worldState = createWorldState({
          scenario,
          occupancy
        });

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
