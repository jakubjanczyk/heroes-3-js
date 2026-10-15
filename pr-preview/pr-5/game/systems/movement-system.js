import { findPath } from '../../engine/pathfinding.js';
import { sameTile } from '../../engine/tile-utils.js';
import { findHero } from '../domain/entity-queries.js';
import { toEntityIdOrNull } from '../domain/value-objects/entity-id.js';

function isValidPlannedPath(path, fromTile, toTile, map) {
  if (!Array.isArray(path) || path.length < 2) {
    return false;
  }

  if (!sameTile(path[0], fromTile) || !sameTile(path[path.length - 1], toTile)) {
    return false;
  }

  for (let index = 0; index < path.length; index += 1) {
    const tile = path[index];
    if (!map.inBounds(tile) || !map.isPassable(tile)) {
      return false;
    }

    if (index === 0) {
      continue;
    }

    const prev = path[index - 1];
    const dx = Math.abs(tile.x - prev.x);
    const dy = Math.abs(tile.y - prev.y);
    if ((dx === 0 && dy === 0) || dx > 1 || dy > 1) {
      return false;
    }
  }

  return true;
}

async function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getFinalSettleDelayMs(stepDelayMs) {
  const clampedStepDelayMs = Number.isFinite(stepDelayMs) ? Math.max(0, stepDelayMs) : 0;
  return clampedStepDelayMs;
}

export function createMovementSystem({
  entities,
  map,
  occupancy,
  sleep = defaultSleep,
  stepDelayMs = 80,
  getMaxMovableSteps = () => Number.POSITIVE_INFINITY,
  spendMovementPoints = () => {},
  onMoveStart = () => {},
  onMoveFinish = () => {},
  onStep = () => {}
}) {
  let isMoving = false;

  function getHero() {
    return findHero(entities);
  }

  async function moveHeroTo(toTile, { path: plannedPath = null, arrivalPlan = null } = {}) {
    if (isMoving) {
      return false;
    }

    const hero = getHero();
    if (!hero) {
      return false;
    }

    const path = isValidPlannedPath(plannedPath, hero.tile, toTile, map)
      ? plannedPath
      : findPath({
          fromTile: hero.tile,
          toTile,
          map,
          isBlocked: (tile) => {
            const occupant = occupancy.getAt(tile);
            return occupant !== null && occupant.id !== hero.id;
          }
        });

    if (!path || path.length < 2) {
      return false;
    }
    const totalStepCount = path.length - 1;
    const cappedStepCount = Math.min(
      totalStepCount,
      Math.max(0, Math.floor(getMaxMovableSteps(totalStepCount)))
    );
    if (cappedStepCount < 1) {
      return false;
    }

    const destinationOccupant = occupancy.getAt(toTile);
    const normalizedArrivalPlan =
      destinationOccupant &&
      destinationOccupant.id !== hero.id &&
      destinationOccupant.id === toEntityIdOrNull(arrivalPlan?.entityId) &&
      typeof arrivalPlan?.movementInteractionKind === 'string' &&
      arrivalPlan.movementInteractionKind.length > 0
        ? {
            entityId: destinationOccupant.id,
            movementInteractionKind: arrivalPlan.movementInteractionKind,
            stopBeforeTarget: Boolean(arrivalPlan.stopBeforeTarget)
          }
        : null;

    const didTriggerArrivalInteraction =
      Boolean(normalizedArrivalPlan) && cappedStepCount === totalStepCount;
    if (
      destinationOccupant &&
      destinationOccupant.id !== hero.id &&
      !didTriggerArrivalInteraction &&
      cappedStepCount === totalStepCount
    ) {
      return false;
    }

    const executedStepCount = didTriggerArrivalInteraction
      ? normalizedArrivalPlan.stopBeforeTarget
        ? Math.max(0, cappedStepCount - 1)
        : cappedStepCount
      : cappedStepCount;

    const movementInteractionKind = didTriggerArrivalInteraction
      ? normalizedArrivalPlan.movementInteractionKind
      : null;

    const fromTile = { x: hero.tile.x, y: hero.tile.y };
    let currentTile = { x: hero.tile.x, y: hero.tile.y };
    const reachedTile = path[executedStepCount];
    isMoving = true;
    onMoveStart({
      hero,
      from: fromTile,
      targetTile: toTile,
      reachedTile,
      cappedStepCount
    });
    try {
      for (const stepTile of path.slice(1, executedStepCount + 1)) {
        const stepFromTile = { x: currentTile.x, y: currentTile.y };
        await sleep(stepDelayMs);
        currentTile = { x: stepTile.x, y: stepTile.y };
        onStep({ hero, from: stepFromTile, to: stepTile });
        spendMovementPoints(1);
      }

      if (executedStepCount > 0) {
        await sleep(getFinalSettleDelayMs(stepDelayMs));
      }

      if (didTriggerArrivalInteraction && normalizedArrivalPlan.stopBeforeTarget) {
        spendMovementPoints(1);
      }
    } finally {
      isMoving = false;
      onMoveFinish({
        hero,
        from: fromTile,
        targetTile: toTile,
        reachedTile: currentTile,
        cappedStepCount,
        interaction: movementInteractionKind
          ? {
              kind: movementInteractionKind,
              entityId: normalizedArrivalPlan.entityId,
              targetTile: toTile
            }
          : null
      });
    }

    return true;
  }

  return {
    moveHeroTo
  };
}
