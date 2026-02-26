import { findPath } from '../../engine/pathfinding.js';
import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import { sameTile } from './tile-utils.js';

export function registerPreviewController({ bus, map, occupancy, getHero, getRemainingMovementPoints }) {
  let previewPath = null;
  let previewTarget = null;
  let isMoving = false;

  function emitPreview() {
    bus.emit(APP_UI_PREVIEW_UPDATED, {
      path: previewPath,
      targetTile: previewTarget,
      maxAffordableSteps: isMoving ? Number.POSITIVE_INFINITY : getRemainingMovementPoints()
    });
  }

  function clearPreview() {
    previewPath = null;
    previewTarget = null;
    emitPreview();
  }

  function buildPath(toTile) {
    const hero = getHero();
    if (!hero) {
      return null;
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

  bus.addEventListener(APP_COMMAND_TILE_CLICKED, (event) => {
    const { tile } = event.detail;
    if (isMoving) {
      return;
    }

    if (previewTarget && sameTile(previewTarget, tile)) {
      if (getRemainingMovementPoints() < 1) {
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

    previewTarget = tile;
    previewPath = path;
    emitPreview();
  });

  bus.addEventListener(APP_FACT_MOVE_STARTED, () => {
    isMoving = true;
    if (previewPath || previewTarget) {
      emitPreview();
    }
  });

  bus.addEventListener(APP_FACT_HERO_MOVED, (event) => {
    const { to } = event.detail;
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

  bus.addEventListener(APP_FACT_MOVE_FINISHED, () => {
    isMoving = false;
    const hero = getHero();
    if (previewTarget && hero && !sameTile(hero.tile, previewTarget)) {
      emitPreview();
      return;
    }

    clearPreview();
  });

  bus.addEventListener(APP_FACT_MOVEMENT_POINTS_CHANGED, () => {
    if (!previewPath && !previewTarget) {
      return;
    }

    emitPreview();
  });
}
