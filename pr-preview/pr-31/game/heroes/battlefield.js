// The Heroes 3 battlefield: 15 columns by 11 rows of hexes, the attacker on the left and the
// defender on the right. Rows and columns count from 0 here.
export const BATTLEFIELD_COLUMNS = 15
export const BATTLEFIELD_ROWS = 11

// Where an army's stacks start, by how many stacks it has, as in Heroes 3 (VCMI
// config/battleStartpos.json). Empty army slots take no place: three stacks stand as three.
const START_ROWS_BY_STACK_COUNT = [
  [],
  [5],
  [2, 8],
  [2, 5, 8],
  [0, 4, 6, 10],
  [0, 2, 5, 8, 10],
  [0, 2, 4, 6, 8, 10],
  [0, 2, 4, 5, 6, 8, 10]
]

const START_COLUMN_BY_SIDE = { attacker: 0, defender: BATTLEFIELD_COLUMNS - 1 }

export function getStartHexes({ side, stackCount }) {
  const column = START_COLUMN_BY_SIDE[side]
  return (START_ROWS_BY_STACK_COUNT[stackCount] ?? []).map((row) => ({ row, column }))
}

const isOnBattlefield = ({ row, column }) =>
  row >= 0 && row < BATTLEFIELD_ROWS && column >= 0 && column < BATTLEFIELD_COLUMNS

const hexKey = ({ row, column }) => `${row},${column}`

// Even rows sit half a hex to the right, so their diagonal neighbours are shifted right too.
export function getHexNeighbours({ row, column }) {
  const diagonalShift = row % 2 === 0 ? 1 : -1
  return [
    { row, column: column - 1 },
    { row, column: column + 1 },
    ...[row - 1, row + 1].flatMap((nextRow) => [
      { row: nextRow, column },
      { row: nextRow, column: column + diagonalShift }
    ])
  ].filter(isOnBattlefield)
}

export function getHexDistance(from, to) {
  const toCube = ({ row, column }) => ({ q: column - (row + (row % 2)) / 2, r: row })
  const a = toCube(from)
  const b = toCube(to)
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

function walkFrom({ from, isFree, maxSteps = Number.POSITIVE_INFINITY }) {
  const steps = new Map([[hexKey(from), { hex: from, steps: 0, previous: null }]])
  const queue = [from]
  while (queue.length > 0) {
    const current = queue.shift()
    const { steps: currentSteps } = steps.get(hexKey(current))
    if (currentSteps >= maxSteps) {
      continue
    }

    for (const next of getHexNeighbours(current)) {
      if (steps.has(hexKey(next)) || !isFree(next)) {
        continue
      }

      steps.set(hexKey(next), { hex: next, steps: currentSteps + 1, previous: current })
      queue.push(next)
    }
  }
  return steps
}

export function findHexPath({ from, to, isFree }) {
  const reached = walkFrom({ from, isFree })
  if (!reached.has(hexKey(to)) || hexKey(to) === hexKey(from)) {
    return null
  }

  const path = []
  for (let hex = to; hexKey(hex) !== hexKey(from); hex = reached.get(hexKey(hex)).previous) {
    path.unshift(hex)
  }
  return path
}

export function getReachableHexes({ from, speed, flying, isFree }) {
  if (flying) {
    return Array.from({ length: BATTLEFIELD_ROWS }, (_, row) =>
      Array.from({ length: BATTLEFIELD_COLUMNS }, (_, column) => ({ row, column }))
    )
      .flat()
      .filter(
        (hex) => hexKey(hex) !== hexKey(from) && isFree(hex) && getHexDistance(from, hex) <= speed
      )
  }

  return [...walkFrom({ from, isFree, maxSteps: speed }).values()]
    .filter(({ steps }) => steps > 0)
    .map(({ hex }) => hex)
}
