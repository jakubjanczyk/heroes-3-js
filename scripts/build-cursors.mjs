// Builds the Heroes 3 cursors in assets/cursors (game/ui/cursors.css) from the pixel art below:
// rows of palette keys, '.' a transparent pixel. Each picture is drawn on a 16x16 grid and saved
// twice as large, so the cursors keep the chunky pixels of the game. The horse, swords and
// rearing horse also come numbered 2 to 4, for the day the hero would get there.
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
  '.........kk.....',
  '........kBBk....',
  '.......kBWBBk...',
  '......kMBBBBBk..',
  '.....kMBBBkkk...',
  '....kMBBBBk.....',
  '...kBkBBBBBk....',
  '..kBk.kBBBBk....',
  '..kk..kBBBBk....',
  '......kBBBBk....',
  '.....kBBBBBk....',
  '....kBBkkBBk....',
  '...kMk..kBk.....',
  '..kMk...kBk.....',
  '.kBk....kBBk....',
  '.kk.....kkkk....'
]

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

const CURSORS = { arrow: ARROW_ROWS, hero: HERO_ROWS }
for (const [name, rows] of Object.entries({
  move: MOVE_ROWS,
  attack: ATTACK_ROWS,
  visit: VISIT_ROWS
})) {
  CURSORS[name] = rows
  for (const day of [2, 3, 4]) {
    CURSORS[`${name}-${day}`] = withDayNumber(rows, day)
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true })
for (const [name, rows] of Object.entries(CURSORS)) {
  assertGrid(name, rows)
  writeFileSync(join(OUTPUT_DIR, `${name}.png`), encodePng(rows))
}
