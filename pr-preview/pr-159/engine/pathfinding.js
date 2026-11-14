import { sameTile, tileKey } from './tile-utils.js'

function stateKey(tile, dirX, dirY) {
  return `${tile.x},${tile.y}|${dirX},${dirY}`
}

function getNeighbors(tile) {
  const neighbors = []
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue
      }
      neighbors.push({ x: tile.x + dx, y: tile.y + dy })
    }
  }
  return neighbors
}

function reconstructPath(cameFrom, endTile) {
  const path = []
  let currentState = endTile

  while (currentState) {
    path.push({ x: currentState.tile.x, y: currentState.tile.y })
    currentState = cameFrom.get(currentState.key) ?? null
  }

  return path.reverse()
}

function distanceSq(tile, toTile) {
  const dx = tile.x - toTile.x
  const dy = tile.y - toTile.y
  return dx * dx + dy * dy
}

function isBetterCost(a, b) {
  if (b === null) {
    return true
  }
  if (a.cost !== b.cost) {
    return a.cost < b.cost
  }
  if (a.turns !== b.turns) {
    return a.turns < b.turns
  }
  return false
}

function compareStates(a, b, toTile) {
  if (a.cost !== b.cost) {
    return a.cost - b.cost
  }
  if (a.turns !== b.turns) {
    return a.turns - b.turns
  }

  const distanceDifference = toTile ? distanceSq(a.tile, toTile) - distanceSq(b.tile, toTile) : 0
  if (distanceDifference !== 0) {
    return distanceDifference
  }

  return a.order - b.order
}

function heapPush(heap, state, toTile) {
  heap.push(state)
  let index = heap.length - 1

  while (index > 0) {
    const parentIndex = Math.floor((index - 1) / 2)
    if (compareStates(heap[index], heap[parentIndex], toTile) >= 0) {
      break
    }

    ;[heap[index], heap[parentIndex]] = [heap[parentIndex], heap[index]]
    index = parentIndex
  }
}

function heapPop(heap, toTile) {
  if (heap.length === 0) {
    return null
  }

  const root = heap[0]
  const last = heap.pop()
  if (heap.length === 0) {
    return root
  }

  heap[0] = last
  let index = 0

  while (true) {
    const leftIndex = 2 * index + 1
    const rightIndex = leftIndex + 1
    let smallestIndex = index

    if (
      leftIndex < heap.length &&
      compareStates(heap[leftIndex], heap[smallestIndex], toTile) < 0
    ) {
      smallestIndex = leftIndex
    }

    if (
      rightIndex < heap.length &&
      compareStates(heap[rightIndex], heap[smallestIndex], toTile) < 0
    ) {
      smallestIndex = rightIndex
    }

    if (smallestIndex === index) {
      return root
    }

    ;[heap[index], heap[smallestIndex]] = [heap[smallestIndex], heap[index]]
    index = smallestIndex
  }
}

// A destination may be impassable or blocked: the route ends on it to interact.
function canEnter(tile, routeCost, { map, isTarget, canPass }) {
  return map.inBounds(tile) && (isTarget(tile) || canPass(tile, routeCost))
}

function stepTo(current, next, { order, getStepCost }) {
  const dirX = next.x - current.tile.x
  const dirY = next.y - current.tile.y
  const isStart = current.dirX === 0 && current.dirY === 0
  const keepsDirection = current.dirX === dirX && current.dirY === dirY
  return {
    key: stateKey(next, dirX, dirY),
    tile: next,
    dirX,
    dirY,
    cost: current.cost + getStepCost(current.tile, next, current.cost),
    turns: current.turns + (isStart || keepsDirection ? 0 : 1),
    order
  }
}

// Cheapest route by `getStepCost(from, to, routeCost)`; among equally cheap routes, the one with
// fewest turns. `routeCost` is what the route cost before the step, or with it for `canPass` and
// `canLeave`. `canPass(tile, routeCost)` says whether a route may go through `tile` (by default a
// passable tile `isBlocked` doesn't block); `canLeave(from, to, routeCost)` whether a route that
// got to `from` may go on to `to`.
export function findPath({
  fromTile,
  toTile,
  map,
  isBlocked = () => false,
  canPass = (tile) => map.isPassable(tile) && !isBlocked(tile),
  getStepCost = () => 1,
  canLeave = () => true
}) {
  if (!map.inBounds(fromTile) || !map.inBounds(toTile)) {
    return null
  }

  if (sameTile(fromTile, toTile)) {
    return [fromTile]
  }

  if (!map.isPassable(toTile)) {
    return null
  }

  let path = null
  searchRoute({
    fromTile,
    toTile,
    map,
    canPass,
    getStepCost,
    canLeave,
    isTarget: (tile) => sameTile(tile, toTile),
    onTargetReached: (reached) => {
      path = reached
      return true
    }
  })
  return path
}

// The cheapest route to each of `toTiles`, as `findPath` would find it, or null for one it can't
// reach, from one search instead of one per tile.
export function findPaths({
  fromTile,
  toTiles,
  map,
  isBlocked = () => false,
  canPass = (tile) => map.isPassable(tile) && !isBlocked(tile),
  getStepCost = () => 1,
  canLeave = () => true
}) {
  const paths = toTiles.map((toTile) => (sameTile(fromTile, toTile) ? [fromTile] : null))
  if (!map.inBounds(fromTile)) {
    return toTiles.map(() => null)
  }

  const indexesByTile = new Map()
  toTiles.forEach((toTile, index) => {
    if (paths[index] || !map.inBounds(toTile) || !map.isPassable(toTile)) {
      return
    }
    const key = tileKey(toTile)
    indexesByTile.set(key, [...(indexesByTile.get(key) ?? []), index])
  })

  let remaining = indexesByTile.size
  if (remaining === 0) {
    return paths
  }

  searchRoute({
    fromTile,
    map,
    canPass,
    getStepCost,
    canLeave,
    isTarget: (tile) => indexesByTile.has(tileKey(tile)),
    onTargetReached: (path) => {
      const key = tileKey(path.at(-1))
      const indexes = indexesByTile.get(key)
      if (paths[indexes[0]]) {
        return false
      }
      for (const index of indexes) {
        paths[index] = path
      }
      remaining -= 1
      return remaining === 0
    }
  })
  return paths
}

// Queues each neighbour of `current` a route may step onto, when that is the best way there yet.
function expandFrom(current, search) {
  const { map, canPass, getStepCost, canLeave, isTarget, toTile } = search
  for (const next of getNeighbors(current.tile)) {
    const nextState = stepTo(current, next, { order: search.nextStateOrder, getStepCost })
    search.nextStateOrder += 1
    if (
      !canEnter(next, nextState.cost, { map, isTarget, canPass }) ||
      !canLeave(current.tile, next, nextState.cost)
    ) {
      continue
    }

    const bestKnown = search.bestByState.get(nextState.key) ?? null
    if (!isBetterCost({ cost: nextState.cost, turns: nextState.turns }, bestKnown)) {
      continue
    }
    search.bestByState.set(nextState.key, { cost: nextState.cost, turns: nextState.turns })
    search.cameFrom.set(nextState.key, current)
    heapPush(search.frontier, nextState, toTile)
  }
}

// Searches outwards from `fromTile`, calling `onTargetReached(path)` with the cheapest route to each
// tile `isTarget` names, until it returns true or nothing is left to search. A target is only
// gone through when `canPass` lets a route through it.
function searchRoute({ fromTile, toTile = null, onTargetReached, ...rules }) {
  const startState = {
    key: stateKey(fromTile, 0, 0),
    tile: fromTile,
    dirX: 0,
    dirY: 0,
    cost: 0,
    turns: 0,
    order: 0
  }
  const search = {
    ...rules,
    toTile,
    frontier: [startState],
    nextStateOrder: 1,
    bestByState: new Map([[startState.key, { cost: 0, turns: 0 }]]),
    cameFrom: new Map()
  }

  while (search.frontier.length > 0) {
    const current = heapPop(search.frontier, toTile)
    const isReachedTarget = current !== startState && rules.isTarget(current.tile)
    if (isReachedTarget && onTargetReached(reconstructPath(search.cameFrom, current))) {
      return
    }
    if (!isReachedTarget || rules.canPass(current.tile, current.cost)) {
      expandFrom(current, search)
    }
  }
}
