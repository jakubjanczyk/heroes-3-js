function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

function stateKey(tile, dirX, dirY) {
  return `${tile.x},${tile.y}|${dirX},${dirY}`;
}

function getNeighbors(tile) {
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      neighbors.push({ x: tile.x + dx, y: tile.y + dy });
    }
  }
  return neighbors;
}

function isDiagonalStep(from, to) {
  return from.x !== to.x && from.y !== to.y;
}

function allowsDiagonalStep({ from, to, map }) {
  if (!isDiagonalStep(from, to)) {
    return true;
  }

  const orthogonalA = { x: to.x, y: from.y };
  const orthogonalB = { x: from.x, y: to.y };
  return map.isPassable(orthogonalA) && map.isPassable(orthogonalB);
}

function reconstructPath(cameFrom, endTile) {
  const path = [];
  let currentState = endTile;

  while (currentState) {
    path.push({ x: currentState.tile.x, y: currentState.tile.y });
    currentState = cameFrom.get(currentState.key) ?? null;
  }

  return path.reverse();
}

function distanceSq(tile, toTile) {
  const dx = tile.x - toTile.x;
  const dy = tile.y - toTile.y;
  return dx * dx + dy * dy;
}

function isBetterCost(a, b) {
  if (b === null) {
    return true;
  }
  if (a.steps !== b.steps) {
    return a.steps < b.steps;
  }
  if (a.turns !== b.turns) {
    return a.turns < b.turns;
  }
  return false;
}

function pickBestStateIndex(frontier, toTile) {
  let bestIndex = 0;
  for (let i = 1; i < frontier.length; i += 1) {
    const candidate = frontier[i];
    const best = frontier[bestIndex];

    if (candidate.steps < best.steps) {
      bestIndex = i;
      continue;
    }
    if (candidate.steps > best.steps) {
      continue;
    }

    if (candidate.turns < best.turns) {
      bestIndex = i;
      continue;
    }
    if (candidate.turns > best.turns) {
      continue;
    }

    if (distanceSq(candidate.tile, toTile) < distanceSq(best.tile, toTile)) {
      bestIndex = i;
    }
  }
  return bestIndex;
}

export function findPath({ fromTile, toTile, map, isBlocked }) {
  if (!map.inBounds(fromTile) || !map.inBounds(toTile)) {
    return null;
  }

  if (sameTile(fromTile, toTile)) {
    return [fromTile];
  }

  if (!map.isPassable(toTile)) {
    return null;
  }

  const startState = {
    key: stateKey(fromTile, 0, 0),
    tile: fromTile,
    dirX: 0,
    dirY: 0,
    steps: 0,
    turns: 0
  };
  const frontier = [startState];
  const bestByState = new Map([[startState.key, { steps: 0, turns: 0 }]]);
  const cameFrom = new Map();

  while (frontier.length > 0) {
    const bestIndex = pickBestStateIndex(frontier, toTile);
    const current = frontier.splice(bestIndex, 1)[0];
    if (sameTile(current.tile, toTile)) {
      return reconstructPath(cameFrom, current);
    }

    for (const next of getNeighbors(current.tile)) {
      if (!map.inBounds(next)) {
        continue;
      }
      if (!map.isPassable(next) && !sameTile(next, toTile)) {
        continue;
      }
      if (isBlocked(next) && !sameTile(next, toTile)) {
        continue;
      }
      if (!allowsDiagonalStep({ from: current.tile, to: next, map })) {
        continue;
      }

      const dirX = next.x - current.tile.x;
      const dirY = next.y - current.tile.y;
      const turns = current.turns + (current.dirX === 0 && current.dirY === 0 ? 0 : current.dirX === dirX && current.dirY === dirY ? 0 : 1);
      const nextState = {
        key: stateKey(next, dirX, dirY),
        tile: next,
        dirX,
        dirY,
        steps: current.steps + 1,
        turns
      };
      const bestKnown = bestByState.get(nextState.key) ?? null;
      if (!isBetterCost({ steps: nextState.steps, turns: nextState.turns }, bestKnown)) {
        continue;
      }
      bestByState.set(nextState.key, { steps: nextState.steps, turns: nextState.turns });
      cameFrom.set(nextState.key, current);
      frontier.push(nextState);
    }
  }

  return null;
}
