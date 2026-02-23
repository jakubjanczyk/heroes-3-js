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

    isMoving = true;
    for (const stepTile of path.slice(1)) {
      occupancy.moveEntity(hero, stepTile);
      hero.tile = stepTile;
      onStep({ hero, to: stepTile });
      await sleep(stepDelayMs);
    }
    isMoving = false;
    return true;
  }

  return {
    moveHeroTo
  };
}
