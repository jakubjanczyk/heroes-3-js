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
