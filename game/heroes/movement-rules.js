import { heroById } from './state/hero-details.js'

// Adventure map movement:
// - a step costs the movementCost of the tile the hero leaves: its road when both tiles have a
//   road, else its terrain; a diagonal step costs it times √2;
// - a diagonal step that no longer fits is still allowed when a straight one would, and takes
//   all points left;
// - when what is left after a step can't pay the cheapest straight step from the new tile (a
//   road step when a road continues from it), it drops to 0.
// A flying hero pays the lesser of a step's usual cost and 100 + the flight's penalty, and the
// latter for a step off a tile they can't land on.
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

function walkingStepCost(map, from, to) {
  const fromRoad = map.getRoadType(from)
  return fromRoad && map.getRoadType(to) ? fromRoad.movementCost : terrainCost(map, from)
}

function straightStepCost({ map, from, to, flight, canLand }) {
  if (!flight) {
    return walkingStepCost(map, from, to)
  }
  const flyingCost = DEFAULT_TERRAIN_MOVEMENT_COST + flight.penalty
  return canLand(from) ? Math.min(walkingStepCost(map, from, to), flyingCost) : flyingCost
}

// The cheapest straight step the hero could take next from `tile`.
function cheapestStepFrom(move, tile) {
  const costs = NEIGHBOR_OFFSETS.map(([dx, dy]) =>
    straightStepCost({ ...move, from: tile, to: { x: tile.x + dx, y: tile.y + dy } })
  )
  return Math.min(...costs)
}

function isDiagonalStep(from, to) {
  return from.x !== to.x && from.y !== to.y
}

function stepCost(step) {
  const { map, from, to, flight = null, canLand = map.isPassable } = step
  const straightCost = straightStepCost({ map, from, to, flight, canLand })
  return isDiagonalStep(from, to) ? Math.floor(straightCost * Math.SQRT2) : straightCost
}

function chargeSteps({ map, path, remainingMovementPoints, flight = null, canLand }) {
  const move = { map, flight, canLand: canLand ?? map.isPassable }
  const charges = []
  let remaining = remainingMovementPoints

  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1]
    const to = path[index]
    const cost = stepCost({ ...move, from, to })
    const takesAllLeft =
      cost > remaining &&
      isDiagonalStep(from, to) &&
      remaining >= straightStepCost({ ...move, from, to })
    if (cost > remaining && !takesAllLeft) {
      break
    }

    const charge = takesAllLeft || remaining - cost < cheapestStepFrom(move, to) ? remaining : cost
    charges.push(charge)
    remaining -= charge
  }

  return charges
}

const flightOf = (state, heroId) => heroById(state, heroId)?.flight ?? null

export const heroesMovementRules = Object.freeze({ stepCost, chargeSteps, flightOf })
