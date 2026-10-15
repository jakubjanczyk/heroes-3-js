import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_ROUTE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_ROUTE_PLANNED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import { sameTile } from '../../engine/tile-utils.js';
import { defineModule } from './shared/module-runtime.js';

// Owns the select-then-confirm click flow and the selected route. Routes themselves are
// planned by the movement module: selection asks with command.route.requested.
export const registerSelectionModule = defineModule(({ emit }) => {
  let isWorldReady = false;
  let requestedTile = null;
  let previewPath = null;
  let previewTarget = null;
  let isMoving = false;
  let isInteractionModalOpen = false;
  let remainingMovementPoints = Number.POSITIVE_INFINITY;

  function emitPreview() {
    emit(APP_UI_PREVIEW_UPDATED, {
      path: previewPath,
      targetTile: previewTarget,
      maxAffordableSteps: remainingMovementPoints
    });
  }

  // The selected route is only assigned in fact handlers (or derived from replayed move facts);
  // commands and reactions emit facts instead, so live play and replay share one code path.
  function resetPreview() {
    previewPath = null;
    previewTarget = null;
    emitPreview();
  }

  function requestClearPreview() {
    if (previewPath || previewTarget) {
      emit(APP_FACT_PREVIEW_CLEARED, {});
    }
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: () => {
          isWorldReady = true;
          resetPreview();
        }
      },
      {
        type: APP_FACT_MOVEMENT_POINTS_CHANGED,
        handler: (event) => {
          remainingMovementPoints = Number(event.detail.value);
          if (previewPath || previewTarget) {
            emitPreview();
          }
        }
      },
      {
        type: APP_COMMAND_TILE_CLICKED,
        handler: (event) => {
          if (!isWorldReady || isMoving || isInteractionModalOpen) {
            return;
          }

          const { tile } = event.detail;
          if (previewTarget && sameTile(previewTarget, tile)) {
            if (previewPath?.length >= 2 && remainingMovementPoints >= 1) {
              emit(APP_COMMAND_MOVE_REQUESTED, { targetTile: tile, path: [...previewPath] });
            }
            return;
          }

          requestedTile = tile;
          emit(APP_COMMAND_ROUTE_REQUESTED, { tile });
        }
      },
      {
        type: APP_FACT_ROUTE_PLANNED,
        handler: (event) => {
          const { tile, path } = event.detail ?? {};
          if (!requestedTile || !sameTile(requestedTile, tile)) {
            return;
          }

          requestedTile = null;
          if (!path) {
            requestClearPreview();
            return;
          }

          emit(APP_FACT_PREVIEW_TARGET_SELECTED, { tile, path });
        }
      },
      {
        type: APP_FACT_MOVE_STARTED,
        handler: () => {
          isMoving = true;
          if (previewPath || previewTarget) {
            emitPreview();
          }
        }
      },
      {
        type: APP_FACT_HERO_MOVED,
        handler: (event) => {
          const to = event.detail.to;
          if (!previewPath || previewPath.length === 0) {
            return;
          }

          while (previewPath.length > 0 && !sameTile(previewPath[0], to)) {
            previewPath.shift();
          }

          if (previewTarget && sameTile(previewTarget, to)) {
            resetPreview();
            return;
          }

          emitPreview();
        }
      },
      {
        type: APP_FACT_MOVE_FINISHED,
        handler: (event) => {
          isMoving = false;
          if (event.detail.interaction?.kind) {
            requestClearPreview();
            return;
          }

          const reachedTile = event.detail.reachedTile;
          if (previewTarget && reachedTile && !sameTile(reachedTile, previewTarget)) {
            emitPreview();
            return;
          }

          requestClearPreview();
        }
      },
      {
        type: APP_UI_INTERACTION_MODAL_OPENED,
        handler: () => {
          isInteractionModalOpen = true;
          requestClearPreview();
        }
      },
      {
        type: APP_UI_INTERACTION_MODAL_CLOSED,
        handler: () => {
          isInteractionModalOpen = false;
        }
      },
      {
        type: APP_FACT_PREVIEW_TARGET_SELECTED,
        handler: (event) => {
          const { tile, path } = event.detail ?? {};
          // Saves from before routes were stored in this fact carry no path; drop those.
          if (!tile || !Array.isArray(path) || path.length < 2) {
            resetPreview();
            return;
          }

          previewTarget = tile;
          previewPath = [...path];
          emitPreview();
        }
      },
      {
        type: APP_FACT_PREVIEW_CLEARED,
        handler: () => {
          resetPreview();
        }
      }
    ]
  };

}, {
  id: 'selection',
  phase: 'domain',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_FACT_MOVEMENT_POINTS_CHANGED,
    APP_COMMAND_TILE_CLICKED,
    APP_FACT_ROUTE_PLANNED,
    APP_FACT_MOVE_STARTED,
    APP_FACT_HERO_MOVED,
    APP_FACT_MOVE_FINISHED,
    APP_UI_INTERACTION_MODAL_OPENED,
    APP_UI_INTERACTION_MODAL_CLOSED,
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
});
