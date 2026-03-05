import { findPath } from '../../engine/pathfinding.js';
import { isArrivalInteractionEntity } from '../../game/domain/entity-behaviors.js';
import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY,
  APP_UI_RESOURCE_COLLECTION_STARTED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import { sameTile } from './shared/tile-utils.js';

export function registerPreviewModule({ bus }) {
  let map = null;
  let occupancy = null;
  let hero = null;
  let previewPath = null;
  let previewTarget = null;
  let isMoving = false;
  let isInteractionModalOpen = false;
  let remainingMovementPoints = Number.POSITIVE_INFINITY;
  const collectingResourceEntityIds = new Set();

  function emitPreview() {
    bus.emit(APP_UI_PREVIEW_UPDATED, {
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
      bus.emit(APP_FACT_PREVIEW_CLEARED, {}, { log });
    }
  }

  function setPreview({ targetTile, path, log = true, emitFact = true }) {
    const hadPreview = Boolean(previewPath || previewTarget);
    const hadSameTarget = Boolean(previewTarget && targetTile && sameTile(previewTarget, targetTile));

    previewTarget = targetTile;
    previewPath = path;
    emitPreview();

    if (emitFact && targetTile && (!hadPreview || !hadSameTarget)) {
      bus.emit(
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
      if (
        destinationOccupant.kind === 'RESOURCE' &&
        collectingResourceEntityIds.has(destinationOccupant.id)
      ) {
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

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    const world = event.detail;
    map = world.map;
    occupancy = world.occupancy;
    hero = world.scenario.entities.find((entity) => entity.kind === 'HERO') ?? null;
    collectingResourceEntityIds.clear();
    clearPreview({ log: false, emitFact: false });
  });

  bus.addEventListener(APP_UI_RESOURCE_COLLECTION_STARTED, (event) => {
    const entityId = event.detail?.entityId;
    if (typeof entityId !== 'string' || entityId.length === 0) {
      return;
    }

    collectingResourceEntityIds.add(entityId);
    clearPreview();
  });

  bus.addEventListener(APP_FACT_MOVEMENT_POINTS_CHANGED, (event) => {
    remainingMovementPoints = Number(event.detail.value);
    if (previewPath || previewTarget) {
      emitPreview();
    }
  });

  bus.addEventListener(APP_COMMAND_TILE_CLICKED, (event) => {
    if (!hero || isMoving || isInteractionModalOpen) {
      return;
    }

    const { tile } = event.detail;
    if (previewTarget && sameTile(previewTarget, tile)) {
      if (remainingMovementPoints < 1) {
        return;
      }

      bus.emit(APP_COMMAND_MOVE_REQUESTED, {
        targetTile: tile,
        path: previewPath
      });
      return;
    }

    const path = buildPath(tile);
    if (!path || path.length < 2) {
      clearPreview();
      return;
    }

    setPreview({ targetTile: tile, path });
  });

  bus.addEventListener(APP_FACT_MOVE_STARTED, () => {
    isMoving = true;
    if (previewPath || previewTarget) {
      emitPreview();
    }
  });

  bus.addEventListener(APP_FACT_HERO_MOVED, (event) => {
    const to = event.detail.to;
    if (!previewPath || previewPath.length === 0) {
      return;
    }

    while (previewPath.length > 0 && !sameTile(previewPath[0], to)) {
      previewPath.shift();
    }

    if (previewTarget && sameTile(previewTarget, to)) {
      previewTarget = null;
    }

    emitPreview();
  });

  bus.addEventListener(APP_FACT_MOVE_FINISHED, (event) => {
    if (event.detail.interaction?.kind === 'RESOURCE_COLLECT') {
      isMoving = false;
      clearPreview();
      return;
    }

    isMoving = false;
    if (previewTarget && hero && !sameTile(hero.tile, previewTarget)) {
      emitPreview();
      return;
    }

    clearPreview();
  });

  bus.addEventListener(APP_UI_INTERACTION_MODAL_OPENED, () => {
    isInteractionModalOpen = true;
    clearPreview();
  });

  bus.addEventListener(APP_UI_INTERACTION_MODAL_CLOSED, () => {
    isInteractionModalOpen = false;
  });

  bus.addEventListener(APP_FACT_PREVIEW_TARGET_SELECTED, (event) => {
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
  });

  bus.addEventListener(APP_FACT_PREVIEW_CLEARED, () => {
    if (!previewPath && !previewTarget) {
      return;
    }

    clearPreview({ log: false, emitFact: false });
  });

  bus.addEventListener(APP_FACT_RESOURCE_COLLECTED, (event) => {
    const entityId = event.detail?.entityId;
    if (typeof entityId === 'string' && entityId.length > 0) {
      collectingResourceEntityIds.delete(entityId);
    }
    clearPreview();
  });
}
