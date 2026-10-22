// Heroes 3 adventure map movement (checked against VCMI's pathfinder):
// - a step costs the movementCost of the tile the hero leaves: its road when both tiles have a
//   road, else its terrain; a diagonal step costs it times √2;
// - a diagonal step that no longer fits is still allowed when a straight one would, and takes
//   all points left;
// - when what is left after a step can't pay the cheapest straight step from the new tile (a
//   road step when a road continues from it), it drops to 0;
// - a hero next to a monster can still attack it with whatever points are left, however few.
const DEFAULT_TERRAIN_MOVEMENT_COST = 100
const NEIGHBOR_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
]

function terrainCost(map, tile) {
  return map.getTerrainType(tile)?.movementCost ?? DEFAULT_TERRAIN_MOVEMENT_COST
}

function straightStepCost(map, from, to) {
  const fromRoad = map.getRoadType(from)
  return fromRoad && map.getRoadType(to) ? fromRoad.movementCost : terrainCost(map, from)
}

// The cheapest straight step the hero could take next from `tile`.
function cheapestStepFrom(map, tile) {
  const costs = NEIGHBOR_OFFSETS.map(([dx, dy]) =>
    straightStepCost(map, tile, { x: tile.x + dx, y: tile.y + dy })
  )
  return Math.min(...costs)
}

function isDiagonalStep(from, to) {
  return from.x !== to.x && from.y !== to.y
}

function stepCost({ map, from, to }) {
  const straightCost = straightStepCost(map, from, to)
  return isDiagonalStep(from, to) ? Math.floor(straightCost * Math.SQRT2) : straightCost
}

function chargeAttackStep({ cost, remaining }) {
  return remaining > 0 ? Math.min(cost, remaining) : null
}

function chargeWalkStep({ map, from, to, remaining, beforeAttack }) {
  const cost = stepCost({ map, from, to })
  const takesAllLeft =
    cost > remaining && isDiagonalStep(from, to) && remaining >= straightStepCost(map, from, to)
  if (cost > remaining && !takesAllLeft) {
    return null
  }

  // Points too few for another step still pay for the attack that follows.
  const dropsToZero = !beforeAttack && remaining - cost < cheapestStepFrom(map, to)
  return takesAllLeft || dropsToZero ? remaining : cost
}

// `endsInAttack` says the last step of `path` attacks what stands on its last tile.
function chargeSteps({ map, path, remainingMovementPoints, endsInAttack = false }) {
  const charges = []
  let remaining = remainingMovementPoints
  const attackStepIndex = endsInAttack ? path.length - 1 : -1

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1]
    const to = path[index]
    const charge =
      index === attackStepIndex
        ? chargeAttackStep({ cost: stepCost({ map, from, to }), remaining })
        : chargeWalkStep({ map, from, to, remaining, beforeAttack: index + 1 === attackStepIndex })
    if (charge === null) {
      break
    }

    charges.push(charge)
    remaining -= charge
  }

  return charges
}

export const heroesMovementRules = Object.freeze({ stepCost, chargeSteps })
