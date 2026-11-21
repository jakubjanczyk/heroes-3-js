import { fightsFor } from './battle-stats.js'
import { getOccupiedHexes, hexKey, isSameHex } from './battlefield.js'

const WALL_COLUMN_BY_ROW = { 0: 11, 1: 11, 2: 10, 3: 10, 4: 9, 6: 9, 7: 10, 8: 10, 9: 11, 10: 11 }

const WALL_HEXES = Object.entries(WALL_COLUMN_BY_ROW).map(([row, column]) => ({
  row: Number(row),
  column
}))

const DRAWBRIDGE_HEXES = [
  { row: 5, column: 9 },
  { row: 5, column: 10 }
]

const IN_FRONT_OF_THE_DRAWBRIDGE = { row: 5, column: 8 }

const wallKeys = new Set(WALL_HEXES.map(hexKey))

const isDrawbridgeHex = (hex) => DRAWBRIDGE_HEXES.some((part) => isSameHex(part, hex))

const covers = (stack, hex) => getOccupiedHexes(stack).some((part) => isSameHex(part, hex))

// A dead stack holds it open too; a sacrificed one leaves nothing behind.
const isDrawbridgeOpen = (stacks) =>
  stacks.some((stack) => !stack.sacrificed && DRAWBRIDGE_HEXES.some((hex) => covers(stack, hex)))

const isDrawbridgeBlocked = (stacks) =>
  stacks.some(
    (stack) =>
      stack.count > 0 &&
      fightsFor(stack) === 'attacker' &&
      covers(stack, IN_FRONT_OF_THE_DRAWBRIDGE)
  )

// Shut, it is a wall for the attacker, and the defender's stacks open it unless an attacker's
// stack stands in front of it.
export function blocksStanding({ stacks, side, hex }) {
  if (wallKeys.has(hexKey(hex))) {
    return true
  }
  if (!isDrawbridgeHex(hex) || isDrawbridgeOpen(stacks)) {
    return false
  }
  return side !== 'defender' || isDrawbridgeBlocked(stacks)
}

export function describeWalls(stacks) {
  const open = isDrawbridgeOpen(stacks)
  return [
    ...WALL_HEXES.map((hex) => ({ ...hex, part: 'wall' })),
    ...DRAWBRIDGE_HEXES.map((hex) => ({ ...hex, part: 'drawbridge', open }))
  ]
}
