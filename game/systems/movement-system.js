import { findPath } from '../../engine/pathfinding.js';

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
  onStep = () => {}
}) {
  let isMoving = false;

  function getHero() {
    return entities.find((entity) => entity.kind === 'HERO') ?? null;
  }

  async function moveHeroTo(toTile) {
    if (isMoving) {
      return false;
    }

    const hero = getHero();
    if (!hero) {
      return false;
    }

    const path = findPath({
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
    spendMovementPoints(cappedStepCount);

    isMoving = true;
    for (const stepTile of path.slice(1, cappedStepCount + 1)) {
      await sleep(stepDelayMs);
      occupancy.moveEntity(hero, stepTile);
      hero.tile = stepTile;
      onStep({ hero, to: stepTile });
    }
    isMoving = false;
    return true;
  }

  return {
    moveHeroTo
  };
}
