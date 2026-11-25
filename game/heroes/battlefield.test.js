import { describe, expect, test } from 'vitest'

import { findHexPath, getHexBeyond, getHexNeighbours, getReachableHexes } from './battlefield.js'

const hex = (row, column) => ({ row, column })
const sortHexes = (hexes) => [...hexes].sort((a, b) => a.row - b.row || a.column - b.column)
const allFree = () => true
const freeExcept =
  (...taken) =>
  ({ row, column }) =>
    !taken.some((other) => other.row === row && other.column === column)

describe('getHexNeighbours', () => {
  test('a hex on a shifted row touches the hexes below and above it and the ones to their right', () => {
    expect(sortHexes(getHexNeighbours(hex(4, 6)))).toEqual([
      hex(3, 6),
      hex(3, 7),
      hex(4, 5),
      hex(4, 7),
      hex(5, 6),
      hex(5, 7)
    ])
  })

  test('a hex on an unshifted row touches the hexes below and above it and the ones to their left', () => {
    expect(sortHexes(getHexNeighbours(hex(5, 6)))).toEqual([
      hex(4, 5),
      hex(4, 6),
      hex(5, 5),
      hex(5, 7),
      hex(6, 5),
      hex(6, 6)
    ])
  })

  test.each([
    ['top-left', hex(0, 0), [hex(0, 1), hex(1, 0), hex(1, 1)]],
    ['bottom-right', hex(10, 14), [hex(9, 14), hex(10, 13)]],
    ['left edge of an unshifted row', hex(5, 0), [hex(4, 0), hex(5, 1), hex(6, 0)]]
  ])('a hex at the %s of the field has no neighbours off the field', (_, from, neighbours) => {
    expect(sortHexes(getHexNeighbours(from))).toEqual(neighbours)
  })
})

describe('findHexPath', () => {
  test('goes straight along a row', () => {
    expect(findHexPath({ from: hex(5, 0), to: hex(5, 4), isFree: allFree })).toEqual([
      hex(5, 1),
      hex(5, 2),
      hex(5, 3),
      hex(5, 4)
    ])
  })

  test('goes around an occupied hex, one step longer', () => {
    const path = findHexPath({ from: hex(5, 0), to: hex(5, 3), isFree: freeExcept(hex(5, 1)) })

    expect(path).toHaveLength(4)
    expect(path).not.toContainEqual(hex(5, 1))
    expect(path.at(-1)).toEqual(hex(5, 3))
  })

  test('finds no path to an occupied hex', () => {
    expect(
      findHexPath({ from: hex(5, 0), to: hex(5, 3), isFree: freeExcept(hex(5, 3)) })
    ).toBeNull()
  })
})

describe('getReachableHexes', () => {
  test('a walking stack reaches the hexes within its speed in steps', () => {
    expect(
      sortHexes(getReachableHexes({ from: hex(5, 0), speed: 1, flying: false, isFree: allFree }))
    ).toEqual([hex(4, 0), hex(5, 1), hex(6, 0)])
  })

  test('a walking stack does not reach a hex it would have to walk around a stack to get to in time', () => {
    const reachable = getReachableHexes({
      from: hex(5, 0),
      speed: 2,
      flying: false,
      isFree: freeExcept(hex(5, 1))
    })

    expect(reachable).not.toContainEqual(hex(5, 2))
    expect(reachable).not.toContainEqual(hex(5, 1))
  })

  test('a flying stack reaches a hex within its speed behind another stack', () => {
    const reachable = getReachableHexes({
      from: hex(5, 0),
      speed: 2,
      flying: true,
      isFree: freeExcept(hex(5, 1))
    })

    expect(reachable).toContainEqual(hex(5, 2))
    expect(reachable).not.toContainEqual(hex(5, 1))
  })
})

describe('getHexBeyond', () => {
  test.each([
    ['left', 'a shifted', hex(4, 5), hex(4, 6), hex(4, 7)],
    ['right', 'a shifted', hex(4, 7), hex(4, 6), hex(4, 5)],
    ['top-left', 'a shifted', hex(3, 6), hex(4, 6), hex(5, 7)],
    ['top-right', 'a shifted', hex(3, 7), hex(4, 6), hex(5, 6)],
    ['bottom-left', 'a shifted', hex(5, 6), hex(4, 6), hex(3, 7)],
    ['bottom-right', 'a shifted', hex(5, 7), hex(4, 6), hex(3, 6)],
    ['left', 'an unshifted', hex(5, 5), hex(5, 6), hex(5, 7)],
    ['right', 'an unshifted', hex(5, 7), hex(5, 6), hex(5, 5)],
    ['top-left', 'an unshifted', hex(4, 5), hex(5, 6), hex(6, 6)],
    ['top-right', 'an unshifted', hex(4, 6), hex(5, 6), hex(6, 5)],
    ['bottom-left', 'an unshifted', hex(6, 5), hex(5, 6), hex(4, 6)],
    ['bottom-right', 'an unshifted', hex(6, 6), hex(5, 6), hex(4, 5)]
  ])('seen from the %s of a hex on %s row, the hex beyond it is on its other side', (_, __, from, through, beyond) => {
    expect(getHexBeyond(from, through)).toEqual(beyond)
  })

  test('the hex beyond a hex on the top row, seen from below, is off the field', () => {
    expect(getHexBeyond(hex(1, 6), hex(0, 6))).toBeNull()
  })

  test('the hex beyond a hex in the last column, seen from its left, is the edge column', () => {
    expect(getHexBeyond(hex(5, 13), hex(5, 14))).toEqual(hex(5, 15))
  })
})
