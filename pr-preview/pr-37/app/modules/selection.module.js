import { sameTile } from '../../engine/tile-utils.js'
import { resolveMovementRules } from '../../game/domain/movement/movement-rules.js'
import {
  APP_COMMAND_MOVE_CONTINUE_REQUESTED,
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_ROUTE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_ROUTE_PLANNED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_PREVIEW_UPDATED,
  APP_UI_SYSTEM_OPTIONS_CLOSED,
  APP_UI_SYSTEM_OPTIONS_OPENED
} from '../events.js'
import { defineModule } from './shared/module-runtime.js'

export const registerSelectionModule = defineModule(
  ({ emit, config }) => {
    const movementRules = resolveMovementRules(config?.content?.movementRules)
    let map = null
    let isWorldReady = false
    let requestedTile = null
    let previewPath = null
    let previewTarget = null
    let isMoving = false
    let isInteractionModalOpen = false
    let isSystemOptionsOpen = false
    let isMapCovered = false
    let remainingMovementPoints = Number.POSITIVE_INFINITY

    function affordableStepCount() {
      if (!map || !previewPath || previewPath.length < 2) {
        return 0
      }

      return movementRules.chargeSteps({ map, path: previewPath, remainingMovementPoints }).length
    }

    function canMove() {
      return (
        isWorldReady &&
        !isMoving &&
        !isInteractionModalOpen &&
        !isSystemOptionsOpen &&
        !isMapCovered &&
        previewPath?.length >= 2 &&
        affordableStepCount() >= 1
      )
    }

    function requestMove() {
      if (canMove()) {
        emit(APP_COMMAND_MOVE_REQUESTED, { targetTile: previewTarget, path: [...previewPath] })
      }
    }

    function emitPreview() {
      emit(APP_UI_PREVIEW_UPDATED, {
        path: previewPath,
        targetTile: previewTarget,
        maxAffordableSteps: affordableStepCount(),
        canMove: canMove()
      })
    }

    // The selected route is only assigned in fact handlers (or derived from replayed move facts);
    // commands and reactions emit facts instead, so live play and replay share one code path.
    function resetPreview() {
      previewPath = null
      previewTarget = null
      emitPreview()
    }

    function requestClearPreview() {
      if (previewPath || previewTarget) {
        emit(APP_FACT_PREVIEW_CLEARED, {})
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            map = event.detail.map
            isWorldReady = true
            resetPreview()
          }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: (event) => {
            remainingMovementPoints = Number(event.detail.value)
            if (previewPath || previewTarget) {
              emitPreview()
            }
          }
        },
        {
          type: APP_COMMAND_TILE_CLICKED,
          handler: (event) => {
            if (
              !isWorldReady ||
              isMoving ||
              isInteractionModalOpen ||
              isSystemOptionsOpen ||
              isMapCovered
            ) {
              return
            }

            const { tile } = event.detail
            if (previewTarget && sameTile(previewTarget, tile)) {
              requestMove()
              return
            }

            requestedTile = tile
            emit(APP_COMMAND_ROUTE_REQUESTED, { tile })
          }
        },
        {
          type: APP_COMMAND_MOVE_CONTINUE_REQUESTED,
          handler: () => {
            requestMove()
          }
        },
        {
          type: APP_FACT_ROUTE_PLANNED,
          handler: (event) => {
            const { tile, path } = event.detail ?? {}
            if (!requestedTile || !sameTile(requestedTile, tile)) {
              return
            }

            requestedTile = null
            if (!path) {
              requestClearPreview()
              return
            }

            emit(APP_FACT_PREVIEW_TARGET_SELECTED, { tile, path })
          }
        },
        {
          type: APP_FACT_MOVE_STARTED,
          handler: () => {
            isMoving = true
            if (previewPath || previewTarget) {
              emitPreview()
            }
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            const to = event.detail.to
            if (!previewPath || previewPath.length === 0) {
              return
            }

            while (previewPath.length > 0 && !sameTile(previewPath[0], to)) {
              previewPath.shift()
            }

            if (previewTarget && sameTile(previewTarget, to)) {
              resetPreview()
              return
            }

            emitPreview()
          }
        },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: (event) => {
            isMoving = false
            if (event.detail.interaction?.kind) {
              requestClearPreview()
              return
            }

            const reachedTile = event.detail.reachedTile
            if (previewTarget && reachedTile && !sameTile(reachedTile, previewTarget)) {
              emitPreview()
              return
            }

            requestClearPreview()
          }
        },
        {
          type: APP_UI_INTERACTION_MODAL_OPENED,
          handler: () => {
            isInteractionModalOpen = true
            requestClearPreview()
          }
        },
        {
          type: APP_UI_INTERACTION_MODAL_CLOSED,
          handler: () => {
            isInteractionModalOpen = false
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
          type: APP_FACT_PREVIEW_TARGET_SELECTED,
          handler: (event) => {
            const { tile, path } = event.detail ?? {}
            // Saves from before routes were stored in this fact carry no path; drop those.
            if (!tile || !Array.isArray(path) || path.length < 2) {
              resetPreview()
              return
            }

            previewTarget = tile
            previewPath = [...path]
            emitPreview()
          }
        },
        {
          type: APP_FACT_PREVIEW_CLEARED,
          handler: () => {
            resetPreview()
          }
        }
      ]
    }
  },
  {
    id: 'selection',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_COMMAND_TILE_CLICKED,
      APP_COMMAND_MOVE_CONTINUE_REQUESTED,
      APP_FACT_ROUTE_PLANNED,
      APP_FACT_MOVE_STARTED,
      APP_FACT_HERO_MOVED,
      APP_FACT_MOVE_FINISHED,
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_UI_INTERACTION_MODAL_CLOSED,
      APP_UI_SYSTEM_OPTIONS_OPENED,
      APP_UI_SYSTEM_OPTIONS_CLOSED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_FACT_PREVIEW_TARGET_SELECTED,
      APP_FACT_PREVIEW_CLEARED
    ],
    produces: [
      APP_COMMAND_MOVE_REQUESTED,
      APP_COMMAND_ROUTE_REQUESTED,
      APP_UI_PREVIEW_UPDATED,
      APP_FACT_PREVIEW_TARGET_SELECTED,
      APP_FACT_PREVIEW_CLEARED
    ]
  }
)
