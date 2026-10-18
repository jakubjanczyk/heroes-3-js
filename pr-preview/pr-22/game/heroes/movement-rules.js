// Heroes 3 adventure map movement (checked against VCMI's pathfinder):
// - a step costs the movementCost of the tile the hero leaves: its road when both tiles have a
//   road, else its terrain; a diagonal step costs it times √2;
// - a diagonal step that no longer fits is still allowed when a straight one would, and takes
//   all points left;
// - when what is left after a step can't pay the cheapest straight step from the new tile (a
//   road step when a road continues from it), it drops to 0.
const DEFAULT_TERRAIN_MOVEMENT_COST = 100

function terrainCost(map, tile) {
  return map.getTerrainType(tile)?.movementCost ?? DEFAULT_TERRAIN_MOVEMENT_COST
}

function straightStepCost(map, from, to) {
  const fromRoad = map.getRoadType(from)
  return fromRoad && map.getRoadType(to) ? fromRoad.movementCost : terrainCost(map, from)
}

function hasRoadNeighbor(map, tile) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if ((dx !== 0 || dy !== 0) && map.getRoadType({ x: tile.x + dx, y: tile.y + dy })) {
        return true
      }
    }
  }
  return false
}

// The cheapest straight step the hero could take next from `tile`.
function cheapestStepFrom(map, tile) {
  const road = map.getRoadType(tile)
  return road && hasRoadNeighbor(map, tile) ? road.movementCost : terrainCost(map, tile)
}

function isDiagonalStep(from, to) {
  return from.x !== to.x && from.y !== to.y
}

function stepCost({ map, from, to }) {
  const straightCost = straightStepCost(map, from, to)
  return isDiagonalStep(from, to) ? Math.floor(straightCost * Math.SQRT2) : straightCost
}

function chargeSteps({ map, path, remainingMovementPoints }) {
  const charges = []
  let remaining = remainingMovementPoints

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1]
    const to = path[index]
    const cost = stepCost({ map, from, to })
    const takesAllLeft =
      cost > remaining && isDiagonalStep(from, to) && remaining >= straightStepCost(map, from, to)
    if (cost > remaining && !takesAllLeft) {
      break
    }

    const charge = takesAllLeft || remaining - cost < cheapestStepFrom(map, to) ? remaining : cost
    charges.push(charge)
    remaining -= charge
  }

  return charges
}

export const heroesMovementRules = Object.freeze({ stepCost, chargeSteps })
