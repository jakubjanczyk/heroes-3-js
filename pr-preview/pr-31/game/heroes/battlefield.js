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

// The top row and every second row under it sit half a hex to the right, so a hex on one of those
// rows touches the hexes above and below it and the ones to their right; on the other rows, the
// ones to their left.
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

// Hexes counted in steps as the crow flies, through cube coordinates.
export function getHexDistance(from, to) {
  const toCube = ({ row, column }) => ({ q: column - (row + (row % 2)) / 2, r: row })
  const a = toCube(from)
  const b = toCube(to)
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

// Breadth-first search over the free hexes: how many steps each one takes from `from`, and the
// hex each was reached from.
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

// The shortest way a walking stack takes from `from` to `to` around the taken hexes, as the hexes
// it steps on, or null when there is none.
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

// The free hexes a stack can move to: a walking stack within its speed in steps around the other
// stacks, a flying one any free hex within its speed as the crow flies.
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
