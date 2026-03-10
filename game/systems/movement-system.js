import { findPath } from '../../engine/pathfinding.js';
import { sameTile } from '../../engine/tile-utils.js';
import { getArrivalInteraction } from '../domain/entity-behaviors/registry.js';
import { findHero } from '../domain/entity-queries.js';

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
  isInteractionBlocked = () => false,
  spendMovementPoints = () => {},
  onMoveStart = () => {},
  onMoveFinish = () => {},
  onStep = () => {}
}) {
  let isMoving = false;

  function getHero() {
    return findHero(entities);
  }

  function getArrivalInteractionTargetAt(tile, heroId) {
    const occupant = occupancy.getAt(tile);
    if (!occupant || occupant.id === heroId) {
      return null;
    }

    if (isInteractionBlocked(occupant)) {
      return null;
    }

    if (!getArrivalInteraction(occupant)) {
      return null;
    }

    return occupant;
  }

  async function moveHeroTo(toTile, { path: plannedPath = null } = {}) {
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
    const targetArrivalInteraction = getArrivalInteractionTargetAt(toTile, hero.id);
    const arrivalInteractionBehavior = targetArrivalInteraction
      ? getArrivalInteraction(targetArrivalInteraction)
      : null;
    const didTriggerArrivalInteraction =
      Boolean(arrivalInteractionBehavior) && cappedStepCount === totalStepCount;
    const destinationOccupant = occupancy.getAt(toTile);
    if (
      destinationOccupant &&
      destinationOccupant.id !== hero.id &&
      !didTriggerArrivalInteraction &&
      cappedStepCount === totalStepCount
    ) {
      return false;
    }
    const interactionRequiresSteppingIntoTarget =
      arrivalInteractionBehavior?.requiresSteppingIntoTarget ?? false;
    const executedStepCount = didTriggerArrivalInteraction
      ? interactionRequiresSteppingIntoTarget
        ? cappedStepCount
        : Math.max(0, cappedStepCount - 1)
      : cappedStepCount;

    const movementInteractionKind = didTriggerArrivalInteraction
      ? arrivalInteractionBehavior?.movementInteractionKind ?? null
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

      if (didTriggerArrivalInteraction && !interactionRequiresSteppingIntoTarget) {
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
              entityId: targetArrivalInteraction.id,
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
