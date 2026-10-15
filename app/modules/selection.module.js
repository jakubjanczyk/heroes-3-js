import { findPath } from '../../engine/pathfinding.js';
import { isArrivalInteractionEntity } from '../../game/domain/entity-behaviors.js';
import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import { sameTile } from '../../engine/tile-utils.js';
import { findHero } from '../../game/domain/entity-queries.js';
import { NO_REMOVED_ENTITIES, applyEntityRemoved } from '../../game/domain/removed-entities.js';
import { getOccupantAt } from '../../game/domain/tile-occupant.js';
import { defineModule } from './shared/module-runtime.js';

export const registerSelectionModule = defineModule(({ emit }) => {
  let map = null;
  let staticOccupancy = null;
  let heroId = null;
  let heroTile = null;
  let removedIds = NO_REMOVED_ENTITIES;
  let previewPath = null;
  let previewTarget = null;
  let isMoving = false;
  let isInteractionModalOpen = false;
  let remainingMovementPoints = Number.POSITIVE_INFINITY;

  function getOccupant(tile) {
    return getOccupantAt({ tile, staticOccupancy, removedIds });
  }

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

  function applySelectedTarget(tile) {
    const path = buildPath(tile);
    if (!path || path.length < 2) {
      resetPreview();
      return;
    }

    previewTarget = tile;
    previewPath = path;
    emitPreview();
  }

  function requestClearPreview() {
    if (previewPath || previewTarget) {
      emit(APP_FACT_PREVIEW_CLEARED, {});
    }
  }

  function buildPath(toTile) {
    if (!map || !heroTile) {
      return null;
    }

    const destinationOccupant = getOccupant(toTile);
    if (destinationOccupant && !isArrivalInteractionEntity(destinationOccupant)) {
      return null;
    }

    return findPath({
      fromTile: heroTile,
      toTile,
      map,
      isBlocked: (tile) => getOccupant(tile) !== null
    });
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          const world = event.detail;
          map = world.map;
          staticOccupancy = world.staticOccupancy;
          const hero = findHero(world.scenario.entities);
          heroId = hero?.id ?? null;
          heroTile = hero?.tile ?? null;
          removedIds = NO_REMOVED_ENTITIES;
          resetPreview();
        }
      },
      {
        type: APP_FACT_ENTITY_REMOVED,
        handler: (event) => {
          removedIds = applyEntityRemoved(removedIds, event.detail?.entityId);
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
          if (!heroTile || isMoving || isInteractionModalOpen) {
            return;
          }

          const { tile } = event.detail;
          if (previewTarget && sameTile(previewTarget, tile)) {
            if (previewPath?.length >= 2 && remainingMovementPoints >= 1) {
              emit(APP_COMMAND_MOVE_REQUESTED, { targetTile: tile, path: [...previewPath] });
            }
            return;
          }

          const path = buildPath(tile);
          if (!path || path.length < 2) {
            requestClearPreview();
            return;
          }

          emit(APP_FACT_PREVIEW_TARGET_SELECTED, { tile });
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
          if (event.detail.heroId === heroId && to) {
            heroTile = to;
          }
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
          if (previewTarget && heroTile && !sameTile(heroTile, previewTarget)) {
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
          const tile = event.detail?.tile;
          if (!heroTile || !tile) {
            return;
          }

          applySelectedTarget(tile);
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
    APP_FACT_ENTITY_REMOVED,
    APP_FACT_MOVEMENT_POINTS_CHANGED,
    APP_COMMAND_TILE_CLICKED,
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
    APP_UI_PREVIEW_UPDATED,
    APP_FACT_PREVIEW_TARGET_SELECTED,
    APP_FACT_PREVIEW_CLEARED
  ]
});
