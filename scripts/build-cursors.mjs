// Builds the Heroes 3 cursors in assets/cursors (game/ui/cursors.css) from the pixel art below:
// rows of palette keys, '.' a transparent pixel. Each picture is drawn on a 16x16 grid and saved
// twice as large, so the cursors keep the chunky pixels of the game. The horse, swords and
// rearing horse also come numbered 2 to 4, for the day the hero would get there, the edge
// scrolling arrow comes in all eight directions, and the battle's sword in all six sides of a hex.
// Usage: node scripts/build-cursors.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

const OUTPUT_DIR = process.argv[2] ?? 'assets/cursors'
const GRID_SIZE = 16
const SCALE = 2

const PALETTE = {
  k: [16, 12, 8, 255],
  Y: [250, 220, 110, 255],
  G: [212, 160, 48, 255],
  O: [140, 96, 20, 255],
  W: [248, 248, 248, 255],
  S: [176, 180, 196, 255],
  D: [100, 104, 120, 255],
  R: [190, 40, 30, 255],
  B: [150, 92, 44, 255],
  b: [92, 52, 22, 255],
  M: [40, 26, 14, 255]
}

// The pointer used everywhere off the map and over tiles the hero can't go to.
const ARROW_ROWS = [
  'k...............',
  'kk..............',
  'kYk.............',
  'kYYk............',
  'kYGYk...........',
  'kYGGYk..........',
  'kYGGGYk.........',
  'kYGGGGYk........',
  'kYGGGGGYk.......',
  'kYGGGGGGYk......',
  'kYGGGkkkkkk.....',
  'kYGkGGk.........',
  'kYk.kGGk........',
  'kk..kOGk........',
  'k....kOGk.......',
  '.....kkk........'
]

// Over the hero: a plumed helmet.
const HERO_ROWS = [
  '.......RR.......',
  '......RRRR......',
  '.....kkRRkk.....',
  '...kkSWWWWSkk...',
  '..kSWWSSSSSSDk..',
  '..kSWSSSSSSSDk..',
  '..kYYYYYYYYYYk..',
  '..kSSkkkkkkSDk..',
  '..kSSSSSSSSSDk..',
  '..kSkkkkkkkkDk..',
  '..kSSSSSSSSSDk..',
  '..kSDkSkSkSDDk..',
  '...kSDSDSDSDk...',
  '....kkSSSSkk....',
  '......kkkk......',
  '................'
]

// Over another of the player's heroes: two arrows trading places.
const EXCHANGE_ROWS = [
  '................',
  '..........k.....',
  '..........kk....',
  '.kkkkkkkkkkYk...',
  '.kYYYYYYYYYGYk..',
  '.kGGGGGGGGGGGOk.',
  '.kkkkkkkkkkGOk..',
  '..........kOk...',
  '...kOk..........',
  '..kOGkkkkkkkkkk.',
  '.kOGGGGGGGGGGGk.',
  '..kYGYYYYYYYYYk.',
  '...kYkkkkkkkkkk.',
  '....kk..........',
  '.....k..........',
  '................'
]

// Over an empty tile the hero can walk to: a galloping horse.
const MOVE_ROWS = [
  '................',
  '...........kk...',
  '..........kBBk..',
  '.........kBWBBk.',
  '...kk...kMBBBBBk',
  '..kMMk.kMBBBkkk.',
  '.kM.kkkBBBBBk...',
  '..k.kBBBBBBBk...',
  '...kBBBBBBBBk...',
  '...kBBBBBBBk....',
  '...kBkkkkkBBk...',
  '..kBk.....kbBk..',
  '.kBk.......kbk..',
  '.kk.........kk..',
  '................',
  '................'
]

// Over a monster: crossed swords.
const ATTACK_ROWS = [
  'kk............kk',
  'kWk..........kWk',
  'kSWk........kWSk',
  '.kSWk......kWSk.',
  '..kSWk....kWSk..',
  '...kSWk..kWSk...',
  '....kSWkkWSk....',
  '.....kSWWSk.....',
  '.....kWSSWk.....',
  '....kWSkkSWk....',
  '.kk.kSk..kSk.kk.',
  '.kYkYk....kYkYk.',
  '..kYGk....kGYk..',
  '.kYkkGk..kGkkYk.',
  'kGk..kk..kk..kGk',
  'kk............kk'
]

// Over anything else the hero can visit: a rearing horse.
const VISIT_ROWS = [
  '..........kk....',
  '.........kBBk...',
  '........kBWBBk..',
  '.......kMBBBBBk.',
  '......kMMBBkBBBk',
  '......kMBBk.kkk.',
  '.....kMBBBk.....',
  '.....kMBBBBkkkk.',
  '....kMBBBBBBBBBk',
  '....kBBBBBBkkkBk',
  '...kBBBBBbbbk.kk',
  '..kBBBBBBkkkbk..',
  '.kMBBBBBBk...k..',
  'kMk.kBBkBk......',
  'kMk.kBk.kBk.....',
  '.k..kkk..kkk....'
]

// Over the player's own town: a castle with a red flag, as Heroes 3 shows it.
const CASTLE_ROWS = [
  '.......kR.......',
  '.......kRRk.....',
  '.......kRk......',
  '.......k........',
  '.k.k.kkkkk.k.k..',
  '.kkkk.kSSk.kkkk.',
  '.kSDk.kSDk.kSDk.',
  '.kSDkkkSDkkkSDk.',
  '.kSSSSSSSSSSSDk.',
  '.kSWSSSSSSSWSDk.',
  '.kSSSSSkkSSSSDk.',
  '.kSSSSkbbkSSSDk.',
  '.kSSSkbbbbkSSDk.',
  '.kSDSkbbbbkSDDk.',
  '.kDDDkbbbbkDDDk.',
  '.kkkkkkkkkkkkkk.'
]

// While the map scrolls from its edge: a gold arrow pointing the way it scrolls. Drawn pointing
// up and up-right; the other directions are these turned a quarter at a time.
const SCROLL_N_ROWS = [
  '.......kk.......',
  '......kYYk......',
  '.....kYGGYk.....',
  '....kYGGGGYk....',
  '...kYGGGGGGYk...',
  '..kYGGGGGGGGYk..',
  '.kYGGGGGGGGGGYk.',
  'kkkkkYGGGGOkkkkk',
  '....kYGGGGOk....',
  '....kYGGGGOk....',
  '....kYGGGGOk....',
  '....kYGGGGOk....',
  '....kYGGGGOk....',
  '....kkkkkkkk....',
  '................',
  '................'
]

const SCROLL_NE_ROWS = [
  '......kkkkkkkkkk',
  '......kYYYYYYYYk',
  '.......kYGGGGGOk',
  '........kYGGGGOk',
  '.......kYGGGGGOk',
  '......kYGGGGGGOk',
  '.....kYGGGkYGGOk',
  '....kYGGGk.kYGOk',
  '...kYGGGk...kYOk',
  '..kYGGGk.....kOk',
  '.kYGGGk.......kk',
  'kYGGGk..........',
  'kGGGk...........',
  '.kGk............',
  '..k.............',
  '................'
]

// In battle, over a hex the active stack can walk to: a boot.
const BATTLE_WALK_ROWS = [
  '................',
  '....kkkkk.......',
  '....kYYYk.......',
  '....kBBBk.......',
  '....kBBBk.......',
  '....kBBBk.......',
  '....kBBBk.......',
  '....kBBBk.......',
  '....kBBBBkk.....',
  '....kBBBBBBkk...',
  '....kBBBBBBBBk..',
  '...kBBBBBBBBBBk.',
  '...kbbbbbbbbbbk.',
  '...kkkkkkkkkkkk.',
  '................',
  '................'
]

// In battle, over a hex the active stack can fly to: a white wing.
const BATTLE_FLY_ROWS = [
  '................',
  '..........kk....',
  '........kkWWk...',
  '......kkWWWWk...',
  '....kkWWWSWWk...',
  '...kWWWSSWWWk...',
  '..kWWSSWWWWk....',
  '..kWSWWWWWk.....',
  '.kWWWWWWkk......',
  '.kSWWWkkWWk.....',
  '.kWWkkWWWk......',
  '..kkWWWSk.......',
  '...kWWkk........',
  '...kkk..........',
  '................',
  '................'
]

// In battle, over one of the player's own stacks: a question mark.
const BATTLE_QUERY_ROWS = [
  '................',
  '....kkkkkkk.....',
  '...kYYYYYYYk....',
  '..kYGkkkkkGYk...',
  '..kYk.....kYk...',
  '..kkk.....kYk...',
  '.........kYGk...',
  '........kYGk....',
  '.......kYGk.....',
  '.......kYk......',
  '.......kYk......',
  '.......kkk......',
  '................',
  '.......kkk......',
  '.......kYk......',
  '.......kkk......'
]

// In battle, over an enemy the stack can attack: a sword pointing in from the side it attacks
// from. Drawn pointing right, from the left side.
// The battle's spell cursor: a sparkle, aimed from its middle.
const BATTLE_SPELL_ROWS = [
  '.......k........',
  '......kWk.......',
  '..k...kYk...k...',
  '.kWk..kYk..kWk..',
  '..kYk.kYk.kYk...',
  '...kYkYGYkYk....',
  '....kYGWGYk.....',
  'kkkkYGWWWGYkkkk.',
  'kWYYGWWWWWGYYWk.',
  'kkkkYGWWWGYkkkk.',
  '....kYGWGYk.....',
  '...kYkYGYkYk....',
  '..kYk.kYk.kYk...',
  '.kWk..kYk..kWk..',
  '..k...kWk...k...',
  '.......k........'
]

const BATTLE_ATTACK_FROM_LEFT_ROWS = [
  '................',
  '................',
  '................',
  '................',
  '...k............',
  '..kYk...........',
  '..kGk.kkkkkkkk..',
  'kkkGkkWWWWWWWWk.',
  'kOOGOOSSSSSSSSSk',
  'kkkGkkDDDDDDDDk.',
  '..kGk.kkkkkkkk..',
  '..kYk...........',
  '...k............',
  '................',
  '................',
  '................'
]

// The same sword pointing down and right, from the top left side, then outlined.
function drawDiagonalSword() {
  const pixels = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('.'))
  for (let i = 0; i <= 3; i += 1) {
    pixels[i][i] = i === 0 ? 'G' : 'O'
  }
  for (let x = 2; x <= 6; x += 1) {
    pixels[8 - x][x] = 'Y'
  }
  for (let i = 5; i < GRID_SIZE; i += 1) {
    pixels[i][i] = 'S'
    if (i + 1 < GRID_SIZE) {
      pixels[i][i + 1] = 'W'
    }
  }

  return withOutline(pixels)
}

// Every empty pixel next to the picture turns black.
function withOutline(pixels) {
  const isDrawn = (x, y) => pixels[y]?.[x] !== undefined && !['.', 'k'].includes(pixels[y][x])
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const touchesDrawn = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1]
      ].some(([nextX, nextY]) => isDrawn(nextX, nextY))
      if (pixels[y][x] === '.' && touchesDrawn) {
        pixels[y][x] = 'k'
      }
    }
  }
  return pixels.map((row) => row.join(''))
}

const emptyPixels = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('.'))

// Red feathers at the tail, their bottom-left corner at (left, bottom).
function drawFletching(pixels, { left, bottom }) {
  for (const [x, y] of [
    [0, -2],
    [1, -2],
    [2, 0],
    [2, -1],
    [1, -1],
    [0, 0]
  ]) {
    pixels[bottom + y][left + x] = 'R'
  }
}

// In battle, over an enemy the active stack can shoot: an arrow flying up to the right.
function drawShootArrow() {
  const pixels = emptyPixels()
  for (let x = 3; x <= 12; x += 1) {
    pixels[15 - x][x] = 'B'
  }
  // The head: a solid triangle pointing to the top-right corner.
  for (let y = 1; y <= 4; y += 1) {
    for (let x = 10 + y; x <= 14; x += 1) {
      pixels[y][x] = 'S'
    }
  }
  drawFletching(pixels, { left: 1, bottom: 14 })
  return withOutline(pixels)
}

// When the shot does half damage for the distance: the arrow snapped in two, the head half bent
// down at a right angle to the tail.
function drawBrokenShootArrow() {
  const pixels = emptyPixels()
  for (let x = 3; x <= 6; x += 1) {
    pixels[10 - x][x] = 'B'
  }
  for (let x = 9; x <= 12; x += 1) {
    pixels[x - 3][x] = 'B'
  }
  // The head: a solid triangle pointing down to the right.
  for (let y = 8; y <= 11; y += 1) {
    for (let x = 22 - y; x <= 14; x += 1) {
      pixels[y][x] = 'S'
    }
  }
  drawFletching(pixels, { left: 1, bottom: 9 })
  return withOutline(pixels)
}

// In battle, over a hex the active stack cannot reach: a red circle crossed out.
function drawBlockedSign() {
  const centre = (GRID_SIZE - 1) / 2
  return Array.from({ length: GRID_SIZE }, (_, y) =>
    Array.from({ length: GRID_SIZE }, (_, x) => {
      const distance = Math.hypot(x - centre, y - centre)
      if (distance > 7.6) {
        return '.'
      }

      if (distance > 7 || (distance > 4.2 && distance <= 4.8)) {
        return 'k'
      }

      if (distance > 4.8 || Math.abs(x - y) <= 1) {
        return 'R'
      }

      return '.'
    }).join('')
  )
}

const mirrorLeftToRight = (rows) => rows.map((row) => [...row].reverse().join(''))
const mirrorTopToBottom = (rows) => [...rows].reverse()

// The day number, white on a black patch in the bottom right corner.
const DIGIT_ROWS = {
  2: ['WWW', '..W', 'WWW', 'W..', 'WWW'],
  3: ['WWW', '..W', 'WWW', '..W', 'WWW'],
  4: ['W.W', 'W.W', 'WWW', '..W', '..W']
}

function withDayNumber(rows, day) {
  const digit = DIGIT_ROWS[day]
  const patchWidth = digit[0].length + 2
  const patchHeight = digit.length + 2
  const left = GRID_SIZE - patchWidth
  const top = GRID_SIZE - patchHeight

  return rows.map((row, y) => {
    if (y < top) {
      return row
    }

    const patch = [...'k'.repeat(patchWidth)]
    const digitRow = digit[y - top - 1]
    if (digitRow) {
      ;[...digitRow].forEach((key, x) => {
        if (key !== '.') {
          patch[x + 1] = key
        }
      })
    }
    return row.slice(0, left) + patch.join('')
  })
}

// The picture turned a quarter clockwise.
function turnClockwise(rows) {
  return rows.map((_, y) =>
    rows
      .map((row) => row[y])
      .reverse()
      .join('')
  )
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let bit = 0; bit < 8; bit += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return c >>> 0
})

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

function encodePng(rows) {
  const size = GRID_SIZE * SCALE
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1)
    for (let x = 0; x < size; x += 1) {
      const colour = PALETTE[rows[Math.floor(y / SCALE)][Math.floor(x / SCALE)]]
      if (colour) {
        raw.set(colour, rowStart + 1 + x * 4)
      }
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ])
}

function assertGrid(name, rows) {
  const isGrid = rows.length === GRID_SIZE && rows.every((row) => row.length === GRID_SIZE)
  if (!isGrid) {
    throw new Error(`Cursor "${name}" must be ${GRID_SIZE}x${GRID_SIZE}`)
  }
  for (const key of rows.join('')) {
    if (key !== '.' && !PALETTE[key]) {
      throw new Error(`Cursor "${name}" uses "${key}", which is not in the palette`)
    }
  }
}

const diagonalSword = drawDiagonalSword()
const CURSORS = {
  arrow: ARROW_ROWS,
  hero: HERO_ROWS,
  castle: CASTLE_ROWS,
  'battle-walk': BATTLE_WALK_ROWS,
  'battle-fly': BATTLE_FLY_ROWS,
  'battle-blocked': drawBlockedSign(),
  'battle-query': BATTLE_QUERY_ROWS,
  'battle-spell': BATTLE_SPELL_ROWS,
  'battle-shoot': drawShootArrow(),
  'battle-shoot-penalty': drawBrokenShootArrow(),
  'battle-attack-from-left': BATTLE_ATTACK_FROM_LEFT_ROWS,
  'battle-attack-from-right': mirrorLeftToRight(BATTLE_ATTACK_FROM_LEFT_ROWS),
  'battle-attack-from-top-left': diagonalSword,
  'battle-attack-from-top-right': mirrorLeftToRight(diagonalSword),
  'battle-attack-from-bottom-left': mirrorTopToBottom(diagonalSword),
  'battle-attack-from-bottom-right': mirrorLeftToRight(mirrorTopToBottom(diagonalSword))
}
for (const [name, rows] of Object.entries({
  move: MOVE_ROWS,
  attack: ATTACK_ROWS,
  visit: VISIT_ROWS,
  exchange: EXCHANGE_ROWS
})) {
  CURSORS[name] = rows
  for (const day of [2, 3, 4]) {
    CURSORS[`${name}-${day}`] = withDayNumber(rows, day)
  }
}

let scrollN = SCROLL_N_ROWS
let scrollNe = SCROLL_NE_ROWS
for (const [straight, diagonal] of [
  ['n', 'ne'],
  ['e', 'se'],
  ['s', 'sw'],
  ['w', 'nw']
]) {
  CURSORS[`scroll-${straight}`] = scrollN
  CURSORS[`scroll-${diagonal}`] = scrollNe
  scrollN = turnClockwise(scrollN)
  scrollNe = turnClockwise(scrollNe)
}

mkdirSync(OUTPUT_DIR, { recursive: true })
for (const [name, rows] of Object.entries(CURSORS)) {
  assertGrid(name, rows)
  writeFileSync(join(OUTPUT_DIR, `${name}.png`), encodePng(rows))
}
