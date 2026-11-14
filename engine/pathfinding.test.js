import { describe, expect, test } from 'vitest'

import { createMap } from './map.js'
import { findPath, findPaths } from './pathfinding.js'

describe('pathfinding', () => {
  test('returns direct path for adjacent passable tile', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    })

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: () => false
    })

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ])
  })

  test('returns straight shortest path on open grid', () => {
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    })

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 2, y: 0 },
      map,
      isBlocked: () => false
    })

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ])
  })

  test('returns null when destination tile is blocked terrain', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 1]
    })

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: () => false
    })

    expect(path).toBe(null)
  })

  test('allows a diagonal step between two blocked orthogonals', () => {
    const map = createMap({
      width: 2,
      height: 2,
      tiles: [0, 1, 1, 0]
    })

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 1 },
      map,
      isBlocked: () => false
    })

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ])
  })

  test('avoids a tile that is expensive to leave when a route around it is cheaper', () => {
    const map = createMap({
      width: 3,
      height: 2,
      tiles: new Array(6).fill(0)
    })
    const expensiveTile = { x: 1, y: 0 }

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 2, y: 0 },
      map,
      isBlocked: () => false,
      getStepCost: (from) => (from.x === expensiveTile.x && from.y === expensiveTile.y ? 10 : 1)
    })

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 }
    ])
  })

  test('treats occupied intermediate tile as blocked', () => {
    const map = createMap({
      width: 3,
      height: 1,
      tiles: [0, 0, 0]
    })

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 2, y: 0 },
      map,
      isBlocked: (tile) => tile.x === 1 && tile.y === 0
    })

    expect(path).toBe(null)
  })

  test('prefers straight horizontal route when multiple shortest paths exist', () => {
    const map = createMap({
      width: 7,
      height: 3,
      tiles: new Array(21).fill(0)
    })

    const path = findPath({
      fromTile: { x: 5, y: 1 },
      toTile: { x: 1, y: 1 },
      map,
      isBlocked: () => false
    })

    expect(path).toEqual([
      { x: 5, y: 1 },
      { x: 4, y: 1 },
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 1 }
    ])
  })

  test('chooses the shortest detour around a diagonal wall of blockers', () => {
    const width = 6
    const height = 5
    const tiles = new Array(width * height).fill(0)
    tiles[2 * width + 3] = 1
    tiles[3 * width + 2] = 1
    const map = createMap({ width, height, tiles })

    const path = findPath({
      fromTile: { x: 5, y: 0 },
      toTile: { x: 1, y: 4 },
      map,
      isBlocked: () => false
    })

    expect(path).not.toBe(null)
    expect(path?.[0]).toEqual({ x: 5, y: 0 })
    expect(path?.at(-1)).toEqual({ x: 1, y: 4 })
    expect(path?.length).toBe(6)
    expect(path).not.toContainEqual({ x: 3, y: 2 })
    expect(path).not.toContainEqual({ x: 2, y: 3 })
  })

  test('allows occupied destination tile', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    })

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: (tile) => tile.x === 1 && tile.y === 0
    })

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ])
  })

  test('returns single-tile path when already at destination', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    })

    const path = findPath({
      fromTile: { x: 1, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: () => false
    })

    expect(path).toEqual([{ x: 1, y: 0 }])
  })

  test('returns null when destination is out of bounds', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    })

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 2, y: 0 },
      map,
      isBlocked: () => false
    })

    expect(path).toBe(null)
  })

  test('returns null when start tile is out of bounds', () => {
    const map = createMap({
      width: 2,
      height: 1,
      tiles: [0, 0]
    })

    const path = findPath({
      fromTile: { x: -1, y: 0 },
      toTile: { x: 1, y: 0 },
      map,
      isBlocked: () => false
    })

    expect(path).toBe(null)
  })

  test('allows diagonal move when both adjacent orthogonals are passable', () => {
    const map = createMap({
      width: 2,
      height: 2,
      tiles: [0, 0, 0, 0]
    })

    const path = findPath({
      fromTile: { x: 0, y: 0 },
      toTile: { x: 1, y: 1 },
      map,
      isBlocked: () => false
    })

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 }
    ])
  })
})

describe('pathfinding to several tiles at once', () => {
  // 0 is open ground, 1 blocked. The hero starts at (0, 2); (4, 0) is walled in.
  const map = createMap({
    width: 6,
    height: 4,
    tiles: [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]
  })
  const fromTile = { x: 0, y: 2 }
  const occupied = [
    { x: 2, y: 0 },
    { x: 5, y: 3 }
  ]
  const isBlocked = (tile) => occupied.some((other) => other.x === tile.x && other.y === tile.y)

  test('gives each tile the route a search for that tile alone gives', () => {
    const toTiles = [
      { x: 2, y: 0 },
      { x: 5, y: 3 },
      { x: 4, y: 2 }
    ]

    const paths = findPaths({ fromTile, toTiles, map, isBlocked })

    const costs = paths.map((path) => path.length)
    const singleCosts = toTiles.map(
      (toTile) => findPath({ fromTile, toTile, map, isBlocked }).length
    )
    expect(costs).toEqual(singleCosts)
    paths.forEach((path, index) => {
      expect(path[0]).toEqual(fromTile)
      expect(path.at(-1)).toEqual(toTiles[index])
    })
  })

  test('gives null for a tile no route reaches', () => {
    const paths = findPaths({ fromTile, toTiles: [{ x: 4, y: 0 }], map, isBlocked })

    expect(paths).toEqual([null])
  })

  // (2, 0) holds something, so the route to (2, 1) beneath it can't come down through it.
  test('never routes through another destination the route could not pass', () => {
    const toTiles = [
      { x: 2, y: 0 },
      { x: 2, y: 1 }
    ]

    const [, path] = findPaths({ fromTile, toTiles, map, isBlocked })

    expect(path).not.toContainEqual({ x: 2, y: 0 })
    expect(path).toHaveLength(findPath({ fromTile, toTile: { x: 2, y: 1 }, map, isBlocked }).length)
  })

  test('gives a single-tile route for the starting tile', () => {
    const paths = findPaths({ fromTile, toTiles: [fromTile], map, isBlocked })

    expect(paths).toEqual([[fromTile]])
  })
})
