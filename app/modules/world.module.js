import { buildWorld as buildWorldDefault } from '../../game/build-world.js';
import { loadGame as loadGameDefault } from '../../game/load.js';
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
    buildWorld = buildWorldDefault
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

    worldState?.restorePersistentEntitiesAt?.(restoreTile);
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
        const built = buildWorld({ scenario });
        const { map, occupancy, worldState: nextWorldState } = built;
        worldState = nextWorldState;

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
