import { findPath } from '../../engine/pathfinding.js';
import { isArrivalInteractionEntity } from '../../game/domain/entity-behaviors.js';
import { findHero } from '../../game/domain/entity-queries.js';
import {
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import { sameTile } from '../../engine/tile-utils.js';
import { defineModule } from './shared/module-runtime.js';

export const registerPreviewModule = defineModule(({ emit }) => {
  let map = null;
  let occupancy = null;
  let hero = null;
  let previewPath = null;
  let previewTarget = null;
  let isMoving = false;
  let isInteractionModalOpen = false;
  let remainingMovementPoints = Number.POSITIVE_INFINITY;
  const blockedResourceEntityIds = new Set();

  function emitPreview() {
    emit(APP_UI_PREVIEW_UPDATED, {
      path: previewPath,
      targetTile: previewTarget,
      maxAffordableSteps: remainingMovementPoints
    });
  }

  function clearPreview({ log = true, emitFact = true } = {}) {
    const hadPreview = Boolean(previewPath || previewTarget);
    previewPath = null;
    previewTarget = null;
    emitPreview();

    if (emitFact && hadPreview) {
      emit(APP_FACT_PREVIEW_CLEARED, {}, { log });
    }
  }

  function setPreview({ targetTile, path, log = true, emitFact = true }) {
    const hadPreview = Boolean(previewPath || previewTarget);
    const hadSameTarget = Boolean(previewTarget && targetTile && sameTile(previewTarget, targetTile));

    previewTarget = targetTile;
    previewPath = path;
    emitPreview();

    if (emitFact && targetTile && (!hadPreview || !hadSameTarget)) {
      emit(
        APP_FACT_PREVIEW_TARGET_SELECTED,
        {
          tile: targetTile
        },
        { log }
      );
    }
  }

  function buildPath(toTile) {
    if (!map || !occupancy || !hero) {
      return null;
    }

    const destinationOccupant = occupancy.getAt(toTile);
    if (destinationOccupant && destinationOccupant.id !== hero.id) {
      if (blockedResourceEntityIds.has(destinationOccupant.id)) {
        return null;
      }

      if (!isArrivalInteractionEntity(destinationOccupant)) {
        return null;
      }
    }

    return findPath({
      fromTile: hero.tile,
      toTile,
      map,
      isBlocked: (tile) => {
        const occupant = occupancy.getAt(tile);
        return occupant !== null && occupant.id !== hero.id;
      }
    });
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          const world = event.detail;
          map = world.map;
          occupancy = world.occupancy;
          hero = findHero(world.scenario.entities);
          blockedResourceEntityIds.clear();
          clearPreview({ log: false, emitFact: false });
        }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
        handler: (event) => {
          blockedResourceEntityIds.clear();
          for (const entityId of event.detail?.entityIds ?? []) {
            if (typeof entityId === 'string' && entityId.length > 0) {
              blockedResourceEntityIds.add(entityId);
            }
          }

          clearPreview();
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
          if (!hero || isMoving || isInteractionModalOpen) {
            return;
          }

          const { tile } = event.detail;
          if (previewTarget && sameTile(previewTarget, tile)) {
            return;
          }

          const path = buildPath(tile);
          if (!path || path.length < 2) {
            clearPreview();
            return;
          }

          setPreview({ targetTile: tile, path });
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
            clearPreview({ emitFact: false });
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
            clearPreview();
            return;
          }
          if (previewTarget && hero && !sameTile(hero.tile, previewTarget)) {
            emitPreview();
            return;
          }

          clearPreview();
        }
      },
      {
        type: APP_UI_INTERACTION_MODAL_OPENED,
        handler: () => {
          isInteractionModalOpen = true;
          clearPreview();
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
          if (!hero || isMoving || isInteractionModalOpen) {
            return;
          }

          const tile = event.detail?.tile;
          if (!tile) {
            return;
          }

          if (previewTarget && sameTile(previewTarget, tile) && previewPath?.length) {
            return;
          }

          const path = buildPath(tile);
          if (!path || path.length < 2) {
            clearPreview({ log: false, emitFact: false });
            return;
          }

          setPreview({
            targetTile: tile,
            path,
            log: false,
            emitFact: false
          });
        }
      },
      {
        type: APP_FACT_PREVIEW_CLEARED,
        handler: () => {
          if (!previewPath && !previewTarget) {
            return;
          }

          clearPreview({ log: false, emitFact: false });
        }
      }
    ]
  };

}, {
  id: 'preview',
  phase: 'domain',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
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
    APP_UI_PREVIEW_UPDATED,
    APP_FACT_PREVIEW_TARGET_SELECTED,
    APP_FACT_PREVIEW_CLEARED
  ]
});
