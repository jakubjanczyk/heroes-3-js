import { createCamera } from '../../engine/camera.js'
import { attachCameraInput } from '../../engine/input.js'
import { firstHeroIdOf, heroTile, viewingPlayer } from '../../game/state/queries.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_COMMAND_CAMERA_PAN_BY,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_CAMERA_UPDATED,
  APP_UI_MAP_EDGE_SCROLLED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED,
  APP_UI_SYSTEM_OPTIONS_CLOSED,
  APP_UI_SYSTEM_OPTIONS_OPENED,
  APP_UI_TILE_HOVERED,
  APP_UI_TILE_INFO_DISMISSED,
  APP_UI_TILE_INFO_REQUESTED,
  APP_UI_WORLD_MOTION_UPDATED
} from '../events.js'
import { defineModule } from './shared/module-runtime.js'

export const registerCameraModule = defineModule(
  ({ emit, env, config, state }) => {
    const viewport = env.document?.querySelector('.viewport')
    const configuredStepDurationMs = Number(config?.movementStepDelayMs ?? 220)
    const cameraStepDurationMs = Number.isFinite(configuredStepDurationMs)
      ? Math.max(0, configuredStepDurationMs)
      : 220
    let camera = null
    let map = null
    let detachCameraInput = null
    let isSystemOptionsOpen = false
    let isMapCovered = false

    function centerOn(tile) {
      if (!camera || !tile) {
        return
      }

      camera.centerOnTile?.(tile)
      emitCameraUpdated()
    }

    function emitCameraUpdated() {
      if (!camera) {
        return
      }

      const offset = camera.getOffset?.()

      emit(APP_UI_CAMERA_UPDATED, {
        offset,
        viewportSize: {
          width: viewport?.clientWidth ?? 0,
          height: viewport?.clientHeight ?? 0
        }
      })
    }

    function emitWorldMotionUpdated({ followHero = undefined, stepDurationMs = undefined } = {}) {
      const detail = {
        followHero,
        cameraStepDurationMs: stepDurationMs
      }

      if (Object.values(detail).every((v) => v === undefined)) {
        return
      }

      emit(APP_UI_WORLD_MOTION_UPDATED, detail)
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const world = event.detail
            map = world.map

            if (!viewport || !map) {
              return
            }

            camera = createCamera({
              viewport,
              map
            })

            emitWorldMotionUpdated({
              followHero: false,
              stepDurationMs: cameraStepDurationMs
            })

            // Start on the hero; from here on every hero fact carries the tile to center on.
            const current = state.get()
            centerOn(heroTile(current, firstHeroIdOf(current, viewingPlayer(current))))

            const inputCamera = {
              moveBy(dx, dy) {
                // Arrow keys and edge scrolling must not move the map behind the System options popup
                // or a screen covering it, such as the battle.
                if (isSystemOptionsOpen || isMapCovered) {
                  return
                }

                emit(APP_COMMAND_CAMERA_PAN_BY, { dx, dy })
              },
              getOffset: camera.getOffset?.bind(camera)
            }

            detachCameraInput?.()
            detachCameraInput =
              attachCameraInput({
                camera: inputCamera,
                viewport,
                window: env.window,
                edgePanDelayMs: 300,
                map,
                onTileClick: (tile) => {
                  emit(APP_COMMAND_TILE_CLICKED, { tile })
                },
                // null once the pointer is off the map.
                onTileHover: (tile) => {
                  emit(APP_UI_TILE_HOVERED, { tile })
                },
                // null once edge scrolling stops.
                onEdgeScroll: (direction) => {
                  emit(APP_UI_MAP_EDGE_SCROLLED, { direction })
                },
                onTileInfoPress: (tile, pointer) => {
                  emit(APP_UI_TILE_INFO_REQUESTED, { tile, pointer })
                },
                onTileInfoRelease: () => {
                  emit(APP_UI_TILE_INFO_DISMISSED, {})
                },
                longPressMs: config?.longPressMs
              }) ?? null
          }
        },
        {
          type: APP_UI_RESTORE_STARTED,
          handler: () => {
            viewport.dataset.viewportVisibility = 'hidden'
            viewport.dataset.restoring = 'true'
          }
        },
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            // Replayed hero moves already centered the camera on the hero's last tile.
            viewport.dataset.viewportVisibility = 'visible'
            delete viewport.dataset.restoring
          }
        },
        {
          type: APP_UI_SYSTEM_OPTIONS_OPENED,
          handler: () => {
            isSystemOptionsOpen = true
          }
        },
        {
          type: APP_UI_SYSTEM_OPTIONS_CLOSED,
          handler: () => {
            isSystemOptionsOpen = false
          }
        },
        {
          type: APP_UI_ADVENTURE_MAP_COVERED,
          handler: () => {
            isMapCovered = true
          }
        },
        {
          type: APP_UI_ADVENTURE_MAP_UNCOVERED,
          handler: () => {
            isMapCovered = false
          }
        },
        {
          type: APP_COMMAND_CAMERA_PAN_BY,
          handler: (event) => {
            const { dx = 0, dy = 0 } = event.detail
            camera.moveBy(dx, dy)
            emitCameraUpdated()
          }
        },
        {
          type: APP_COMMAND_CAMERA_CENTER_ON_TILE,
          handler: (event) => {
            if (!camera || !map) {
              return
            }

            const tile = event.detail?.tile
            if (!tile) {
              return
            }

            if (map.inBounds?.(tile)) {
              camera.centerOnTile?.(tile)
              emitCameraUpdated()
            }
          }
        },
        {
          type: APP_FACT_MOVE_STARTED,
          handler: (event) => {
            if (!camera) {
              return
            }

            emitWorldMotionUpdated({ followHero: true })
            camera.clearPan?.()
            camera.lockFollow?.()
            centerOn(event.detail?.from)
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            centerOn(event.detail?.to)
          }
        },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: () => {
            if (!camera) {
              return
            }

            emitWorldMotionUpdated({ followHero: false })
            camera.unlockFollow?.()
          }
        }
      ],
      dispose: () => {
        detachCameraInput?.()
      }
    }
  },
  {
    id: 'camera',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED,
      APP_UI_SYSTEM_OPTIONS_OPENED,
      APP_UI_SYSTEM_OPTIONS_CLOSED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
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
      APP_UI_MAP_EDGE_SCROLLED,
      APP_UI_TILE_HOVERED,
      APP_UI_TILE_INFO_REQUESTED,
      APP_UI_TILE_INFO_DISMISSED,
      APP_UI_WORLD_MOTION_UPDATED
    ]
  }
)
