import { createCamera as createCameraDefault } from '../../engine/camera.js';
import { attachCameraInput as attachCameraInputDefault } from '../../engine/input.js';
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_COMMAND_CAMERA_PAN_BY,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_WORLD_READY,
  APP_UI_CAMERA_UPDATED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED,
  APP_UI_WORLD_MOTION_UPDATED
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';
import { WORLD_REPLICA_EVENTS, createWorldReplicaTracker } from './shared/world-replica-tracker.js';

export const registerCameraModule = defineModule((
  { emit, env, config },
  {
    createCamera = createCameraDefault,
    attachCameraInput = attachCameraInputDefault
  } = {}
) => {
  const viewport = env.document?.querySelector('.viewport');
  const configuredStepDurationMs = Number(config?.movementStepDelayMs ?? 220);
  const cameraStepDurationMs = Number.isFinite(configuredStepDurationMs)
    ? Math.max(0, configuredStepDurationMs)
    : 220;
  const world = createWorldReplicaTracker();
  let camera = null;
  let map = null;
  let isMoving = false;
  let detachCameraInput = null;

  function getHeroTile() {
    return world.get()?.getHero()?.tile ?? null;
  }

  function emitCameraUpdated() {
    if (!camera) {
      return;
    }

    const offset = camera.getOffset?.();

    emit(APP_UI_CAMERA_UPDATED, {
      offset,
      viewportSize: {
        width: viewport?.clientWidth ?? 0,
        height: viewport?.clientHeight ?? 0
      }
    });
  }

  function emitWorldMotionUpdated({ followHero = undefined, stepDurationMs = undefined } = {}) {
    const detail = {
      followHero,
      cameraStepDurationMs: stepDurationMs
    };

    if (Object.values(detail).every((v) => v === undefined)) {
      return;
    }

    emit(APP_UI_WORLD_MOTION_UPDATED, detail);
  }

  return {
    subscriptions: [
      ...world.subscriptions,
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          map = event.detail.map;

          if (!viewport || !map) {
            return;
          }

          camera = createCamera({
            viewport,
            map
          });

          emitWorldMotionUpdated({
            followHero: false,
            stepDurationMs: cameraStepDurationMs
          });

          camera.setFollowTileGetter(getHeroTile);
          camera.update();
          emitCameraUpdated();

          const inputCamera = {
            moveBy(dx, dy) {
              emit(APP_COMMAND_CAMERA_PAN_BY, { dx, dy });
            },
            getOffset: camera.getOffset?.bind(camera)
          };

          detachCameraInput?.();
          detachCameraInput =
            attachCameraInput({
              camera: inputCamera,
              viewport,
              window: env.window,
              edgePanDelayMs: 300,
              map,
              onTileClick: (tile) => {
                emit(APP_COMMAND_TILE_CLICKED, { tile });
              }
            }) ?? null;
        }
      },
      {
        type: APP_UI_RESTORE_STARTED,
        handler: () => {
          viewport.dataset.viewportVisibility = 'hidden';
          viewport.dataset.restoring = 'true';
        }
      },
      {
        type: APP_UI_RESTORE_COMPLETED,
        handler: () => {
          const heroTile = getHeroTile();
          if (camera && heroTile) {
            camera.centerOnTile?.(heroTile);
            emitCameraUpdated();
          }

          viewport.dataset.viewportVisibility = 'visible';
          delete viewport.dataset.restoring;
        }
      },
      {
        type: APP_COMMAND_CAMERA_PAN_BY,
        handler: (event) => {
          const { dx = 0, dy = 0 } = event.detail;
          camera.moveBy(dx, dy);
          emitCameraUpdated();
        }
      },
      {
        type: APP_COMMAND_CAMERA_CENTER_ON_TILE,
        handler: (event) => {
          if (!camera || !map) {
            return;
          }

          const tile = event.detail?.tile;
          if (!tile) {
            return;
          }

          if (map.inBounds?.(tile)) {
            camera.centerOnTile?.(tile);
            emitCameraUpdated();
          }
        }
      },
      {
        type: APP_FACT_MOVE_STARTED,
        handler: () => {
          if (!camera) {
            return;
          }

          isMoving = true;
          emitWorldMotionUpdated({ followHero: true });
          camera.clearPan?.();
          camera.lockFollow?.();
          const heroTile = getHeroTile();
          if (heroTile) {
            camera.centerOnTile?.(heroTile);
            emitCameraUpdated();
          }
        }
      },
      {
        type: APP_FACT_HERO_MOVED,
        handler: (event) => {
          if (!camera) {
            return;
          }

          const { to } = event.detail;
          if (isMoving) {
            camera.centerOnTile?.(to);
            emitCameraUpdated();
            return;
          }

          camera.update?.();
          emitCameraUpdated();
        }
      },
      {
        type: APP_FACT_MOVE_FINISHED,
        handler: () => {
          if (!camera) {
            return;
          }

          isMoving = false;
          emitWorldMotionUpdated({ followHero: false });
          camera.unlockFollow?.();
          camera.update?.();
          emitCameraUpdated();
        }
      }
    ],
    dispose: () => {
      detachCameraInput?.();
    }
  };
}, {
  id: 'camera',
  phase: 'domain',
  consumes: [
    ...WORLD_REPLICA_EVENTS,
    APP_FACT_WORLD_READY,
    APP_UI_RESTORE_STARTED,
    APP_UI_RESTORE_COMPLETED,
    APP_COMMAND_CAMERA_PAN_BY,
    APP_COMMAND_CAMERA_CENTER_ON_TILE,
    APP_FACT_MOVE_STARTED,
    APP_FACT_HERO_MOVED,
    APP_FACT_MOVE_FINISHED
  ],
  produces: [
    APP_COMMAND_CAMERA_PAN_BY,
    APP_COMMAND_TILE_CLICKED,
    APP_UI_CAMERA_UPDATED,
    APP_UI_WORLD_MOTION_UPDATED
  ]
});
