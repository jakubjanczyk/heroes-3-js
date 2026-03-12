import { buildWorld as buildWorldDefault } from '../../game/build-world.js';
import { loadGame as loadGameDefault } from '../../game/load.js';
import {
  APP_COMMAND_APP_START,
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
  APP_FACT_WORLD_LOAD_FAILED,
  APP_FACT_WORLD_READY,
  APP_UI_RESOURCE_COLLECTION_STARTED
} from '../events.js';
import { normalizeTile } from '../../game/domain/value-objects/tile.js';
import { defineModule } from './shared/module-runtime.js';

export const registerWorldModule = defineModule((
  { emit, env },
  {
    loadGame = loadGameDefault,
    buildWorld = buildWorldDefault
  } = {}
) => {
  let hasStarted = false;
  let worldState = null;

  function getEntityById(entityId) {
    return worldState?.getEntityById?.(entityId) ?? null;
  }

  function removeEntityFromWorld(entityId) {
    worldState?.removeEntityById?.(entityId);
  }

  function emitResourceCollectionBlockingChanged() {
    emit(APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED, {
      entityIds: worldState?.listBlockedEntityIds?.() ?? []
    });
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_HERO_MOVED,
        handler: (event) => {
          const movedEntity = getEntityById(event.detail?.heroId);
          const fromTile = normalizeTile(event.detail?.from);
          const toTile = normalizeTile(event.detail?.to);
          if (!movedEntity || !toTile) {
            return;
          }

          const previousTile = normalizeTile(movedEntity.tile);

          const didMove = worldState?.moveEntity?.({
            entityId: movedEntity.id,
            toTile
          });
          if (!didMove) {
            return;
          }

          const restoreTile = fromTile ?? previousTile;
          const shouldRestoreTile =
            restoreTile && (restoreTile.x !== toTile.x || restoreTile.y !== toTile.y);

          if (!shouldRestoreTile) {
            return;
          }

          worldState?.restorePersistentEntitiesAt?.(restoreTile);
        }
      },
      {
        type: APP_FACT_MONSTER_DEFEATED,
        handler: (event) => {
          removeEntityFromWorld(event.detail?.entityId);
        }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTED,
        handler: (event) => {
          const entityId = event.detail?.entityId;
          const didUnblock = worldState?.unblockEntityById?.(entityId) ?? false;
          removeEntityFromWorld(entityId);
          if (!didUnblock) {
            return;
          }

          emitResourceCollectionBlockingChanged();
        }
      },
      {
        type: APP_UI_RESOURCE_COLLECTION_STARTED,
        handler: (event) => {
          const didBlock = worldState?.blockEntityById?.(event.detail?.entityId) ?? false;
          if (!didBlock) {
            return;
          }

          emitResourceCollectionBlockingChanged();
        }
      },
      {
        type: APP_COMMAND_APP_START,
        handler: () => {
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

              emit(APP_FACT_WORLD_READY, {
                scenario,
                definitions,
                map,
                occupancy
              });

              emitResourceCollectionBlockingChanged();
            } catch (error) {
              emit(APP_FACT_WORLD_LOAD_FAILED, {
                error
              });
            }
          })();
        }
      }
    ]
  };
}, {
  id: 'world',
  phase: 'domain',
  consumes: [
    APP_COMMAND_APP_START,
    APP_FACT_HERO_MOVED,
    APP_FACT_MONSTER_DEFEATED,
    APP_FACT_RESOURCE_COLLECTED,
    APP_UI_RESOURCE_COLLECTION_STARTED
  ],
  produces: [
    APP_FACT_WORLD_READY,
    APP_FACT_WORLD_LOAD_FAILED,
    APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED
  ]
});
