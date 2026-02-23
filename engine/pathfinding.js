function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}

function getNeighbors(tile, toTile) {
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      neighbors.push({ x: tile.x + dx, y: tile.y + dy });
    }
  }

  neighbors.sort((a, b) => {
    const aDx = a.x - toTile.x;
    const aDy = a.y - toTile.y;
    const bDx = b.x - toTile.x;
    const bDy = b.y - toTile.y;
    const aDistanceSq = aDx * aDx + aDy * aDy;
    const bDistanceSq = bDx * bDx + bDy * bDy;
    return aDistanceSq - bDistanceSq;
  });

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
  const path = [endTile];
  let currentKey = tileKey(endTile);

  while (cameFrom.has(currentKey)) {
    const prev = cameFrom.get(currentKey);
    path.push(prev);
    currentKey = tileKey(prev);
  }

  return path.reverse();
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

  const queue = [fromTile];
  const seen = new Set([tileKey(fromTile)]);
  const cameFrom = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    if (sameTile(current, toTile)) {
      return reconstructPath(cameFrom, current);
    }

    for (const next of getNeighbors(current, toTile)) {
      if (!map.inBounds(next)) {
        continue;
      }
      if (!map.isPassable(next) && !sameTile(next, toTile)) {
        continue;
      }
      if (isBlocked(next) && !sameTile(next, toTile)) {
        continue;
      }
      if (!allowsDiagonalStep({ from: current, to: next, map })) {
        continue;
      }

      const nextKey = tileKey(next);
      if (seen.has(nextKey)) {
        continue;
      }

      seen.add(nextKey);
      cameFrom.set(nextKey, current);
      queue.push(next);
    }
  }

  return null;
}
