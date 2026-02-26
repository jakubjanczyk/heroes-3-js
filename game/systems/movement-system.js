import { findPath } from '../../engine/pathfinding.js';

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

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
    return entities.find((entity) => entity.kind === 'HERO') ?? null;
  }

  function getArrivalInteractionTargetAt(tile, heroId) {
    const occupant = occupancy.getAt(tile);
    if (!occupant || occupant.id === heroId) {
      return null;
    }

    if (occupant.kind === 'RESOURCE' && occupant.isCollecting) {
      return null;
    }

    if (occupant.kind !== 'MONSTER' && occupant.kind !== 'RESOURCE') {
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
    const didTriggerArrivalInteraction =
      Boolean(targetArrivalInteraction) && cappedStepCount === totalStepCount;
    const destinationOccupant = occupancy.getAt(toTile);
    if (
      destinationOccupant &&
      destinationOccupant.id !== hero.id &&
      !didTriggerArrivalInteraction &&
      cappedStepCount === totalStepCount
    ) {
      return false;
    }
    const executedStepCount = didTriggerArrivalInteraction
      ? Math.max(0, cappedStepCount - 1)
      : cappedStepCount;

    spendMovementPoints(cappedStepCount);

    const fromTile = { x: hero.tile.x, y: hero.tile.y };
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
        const stepFromTile = { x: hero.tile.x, y: hero.tile.y };
        await sleep(stepDelayMs);
        occupancy.moveEntity(hero, stepTile);
        hero.tile = stepTile;
        onStep({ hero, from: stepFromTile, to: stepTile });
      }
    } finally {
      isMoving = false;
      onMoveFinish({
        hero,
        from: fromTile,
        targetTile: toTile,
        reachedTile: { x: hero.tile.x, y: hero.tile.y },
        cappedStepCount,
        interaction: didTriggerArrivalInteraction
          ? {
              kind:
                targetArrivalInteraction.kind === 'MONSTER' ? 'MONSTER_COMBAT' : 'RESOURCE_COLLECT',
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
