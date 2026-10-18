// Heroes 3 adventure map movement (checked against VCMI's pathfinder):
// - a step costs the movementCost of the tile the hero leaves; a diagonal step costs it times √2;
// - a diagonal step that no longer fits is still allowed when a straight one would, and takes
//   all points left;
// - when what is left after a step can't pay a straight step from the new tile, it drops to 0.
const DEFAULT_TERRAIN_MOVEMENT_COST = 100

function straightStepCost(map, tile) {
  return map.getTerrainType(tile)?.movementCost ?? DEFAULT_TERRAIN_MOVEMENT_COST
}

function isDiagonalStep(from, to) {
  return from.x !== to.x && from.y !== to.y
}

function stepCost({ map, from, to }) {
  const straightCost = straightStepCost(map, from)
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
      cost > remaining && isDiagonalStep(from, to) && remaining >= straightStepCost(map, from)
    if (cost > remaining && !takesAllLeft) {
      break
    }

    const charge = takesAllLeft || remaining - cost < straightStepCost(map, to) ? remaining : cost
    charges.push(charge)
    remaining -= charge
  }

  return charges
}

export const heroesMovementRules = Object.freeze({ stepCost, chargeSteps })
