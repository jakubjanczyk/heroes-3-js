// Builds app/heroes/presentation/adventure-sprite-atlas.js, in the same format as the resource
// atlas (homm3-resource-atlas.js), from the pixel art below. Sprites we draw ourselves live here as
// rows of palette keys, so they stay easy to edit: '.' is a transparent pixel, every other key an
// [r, g, b, a] colour.
// Usage: node scripts/build-adventure-sprite-atlas.mjs
import { writeFileSync } from 'node:fs'

const OUTPUT_PATH = 'app/heroes/presentation/adventure-sprite-atlas.js'

// The map chest: open, seen from above at an angle, red-brown panels in a light gold frame with
// its contents glinting inside.
const CHEST_ROWS = [
  '................................',
  '.......kkkkkkkkkkkkkkkkkkkkkkk..',
  '.......kTTTTTTTTTTTTTTTTTTTTTk..',
  '......ktRRRRRRtRRRRRRtRRRRRtk...',
  '......ktrrrrrrtrrrrrrtrrrrrtk...',
  '.....ktrrrrrrtrrrrrrtrrrrrtk....',
  '.....ktrrrrrrtrrrrrrtrrrrrtk....',
  '....ktrrrrrrtrrrrrrtrrrrrtk.....',
  '....ktttttttttttttttttttttk.....',
  '....kuuuuuwuuuuuuuuuwuuuuuukk...',
  '...kusnnnwswnnnsnwnnsnnnnukuk...',
  '..kusnnnnsnnnnwnnnwsnnwnukudk...',
  '.kusnnnnsnnnnsnnnnsnnnnukuddk...',
  '.kTTTTTTTTTTTTTTTTTTTTTTkuddk...',
  '.ktRRRRRtuRRRRRRtuRRRRRtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkuddk...',
  '.ktrrrrrturrrrrrturrrrrtkudk....',
  '.ktdddddtuddddddtudddddtkuk.....',
  '.kuuuuuuuuuuuuuuuuuuuuuukk......',
  '.kkkkkkkkkkkkkkkkkkkkkkkk.......',
  '...SSSSSSSSSSSSSSSSSSSSSSSSSSSS.',
  '......SSSSSSSSSSSSSSSSSSSSSSS...'
]

const CHEST_PALETTE = {
  k: [40, 18, 8, 255],
  t: [214, 178, 120, 255],
  T: [240, 214, 160, 255],
  u: [150, 110, 64, 255],
  r: [150, 42, 22, 255],
  R: [186, 70, 36, 255],
  d: [100, 30, 14, 255],
  n: [34, 30, 48, 255],
  s: [170, 172, 192, 255],
  w: [240, 240, 248, 255],
  S: [0, 0, 0, 90]
}

// The chest dialog's gold: a heap of coin stacks.
const GOLD_ROWS = [
  '..............OYYGGGO...............',
  '...............OOOOO................',
  '..............OGGYGGO.WYYYY.........',
  '........WYYYY.kOOOOOkOYYGGGO........',
  '.......OYYGGGOOYGGYGO.OOOOO.........',
  '........OOOOO.kOOOOOkOGGYGGO........',
  '.......OGYGGYOOGYGGYOkOOOOOk........',
  '.......kOOOOOkkOOOOOkOYGGYGO........',
  '.......OGGYGGOOGGYGGOkOOOOOk........',
  '.......kOOOOOkkOOOOOkOGYGGYO........',
  '.......OYGGYGOOYGGYGOkOOOOOk........',
  '.......kOOOOWYYYYOOOkOGGYGGWYYYY....',
  '.......OGYGOYYGGGOGWYYYYOOOYYGGGO...',
  '.....WYYYYOOOOOOOOOYYGGGOYGOOOOO....',
  '....OYYGGGOOGYGGYOGOOOOOOOOGGYGGO...',
  '.....OOOOOOkOOOOOkOYGGYGOGkOOOOOk...',
  '....OYGGYGOOGGYGGOkOOOOOkOOYGGYGO...',
  '....kOOOOOkkOOOOOkOGYGGYOGkOOOOOk...',
  '....OGYGGYOOYGGYGOkOOOOOkOOGYGGYO...',
  '....kOOOOOkkOOOOOkOGGYGGOWYYYYOOk...',
  '....OGGYGGOOGYGGYOkOOOOOOYYGGGOGO...',
  '....kOOOOOkkOOOOOkOYGGYGOOOOOOOOk...',
  '....OYGGYGOOGGYGGOkOOOOOOGGYGGOGO...',
  '....kOOOOWYYYYOOOkOGYGGYkOOOOOkOk...',
  '....OGYGOYYGGGOYWYYYYOOOOYGGYGO.....',
  '....kOOOOOOOOOOOYYGGGOGGkOOOOOk.....',
  '........OGYGGYO.OOOOOOOOOGYGGYO.....',
  '........kOOOOOkOYGGYGO..kOOOOOk.....',
  '.....WYYOGGYGGOkOOOOOk..OGGYGGO.....',
  '....GGGGGOOOOOkOGYGGYO..kOOOOOkWYY..',
  '....OOOOOYGGYGOkOOOOOk........GGGGG.',
  '........kOOOOOkOGGYGGO........OOOOO.',
  '...WYY.........kOOOOOk.....WYY......',
  '..GGGGG..............WYY..GGGGG.....',
  '..OOOOO.WYY.........GGGGG.OOOOO.....',
  '.......GGGGG..WYY...OOOOO...........',
  '.......OOOOO.GGGGG......WYY.........',
  '.............OOOOO.....GGGGG........',
  '.......................OOOOO........',
  '....................................'
]

const GOLD_PALETTE = {
  k: [70, 40, 6, 255],
  O: [150, 100, 18, 255],
  G: [222, 176, 52, 255],
  Y: [250, 220, 110, 255],
  W: [255, 250, 220, 255]
}

// The chest dialog's experience: a red banner with a gold star on a blue disc.
const EXPERIENCE_ROWS = [
  '....................................',
  '..OYGYYYGYYYGYYYGYYYGYYYGYYYGYYYGO..',
  '...OOOOOOOOOOOOOOOOOOOOOOOOOOOOOO...',
  '......dRRRrrrrwwwwxxxxrrrrRRRd......',
  '......dRRRrrrrwwwwxssxrrrrRRRd......',
  '......dRRRrrrrwwwwxssxrrrrRRRd......',
  '......dRRRrrrrwwwwxssxrrrrRRRd......',
  '......dRRRrrrrwwwkkxsxrrrrRRRd......',
  '......dRRRrrrrwwwkkxxxrrrrRRRd......',
  '......dRRRrrrrwkkkkkkxrrrrRRRd......',
  '......dRRRrrrkkBkYGkBkkrrrRRRd......',
  '......dRRRrkkBBBkYGkBBBkkrRRRd......',
  '......dRRRkBBBBBkYGkBBBBbkRRRd......',
  '......dGGkkBBBBkYYGGkBBbbkkGGd......',
  '......dROkBBBBBkYYGGkBbbbbkORd......',
  '.....kkkkkkkkkkYYxxGGkkkkkkkkkk.....',
  '......dkYYYYYYYYYxxGGGGGGGGGkd......',
  '......dRkYYYYYYYYxxGGGGGGGGkRd......',
  '......dRBkkYYxxxxWsxxxxGGkkbRd......',
  '......dRBBBkYYxWWWssSxOOkbbbRd......',
  '......dRBBBBkYYxssssxOOkbbbbRd......',
  '......dRkBBBBkGxssssxOkbbbbkRd......',
  '......dGkBBBkGGxsxxsxOOkbbbkGd......',
  '......dRkBBBkGGxxGGxxOOkbbbkRd......',
  '......dRRkBBkGxGGkkGOxOkbbkRRd......',
  '......dRRkkbkGGGkbbkOOOkbkkRRd......',
  '......dRRRkkGGkkbbbbkkOOkkRRRd......',
  '......dRRRrkGkbbbbbbbbkOkrRRRd......',
  '......dRRRrkkkkbbbbbbkkkkrRRRd......',
  '......dRRRkrrrwkkkkkkxrrrkRRRd......',
  '......dRRRrrrrwwwwxxxxrrrrRRRd......',
  '......dRRRrrrrwwwwxxsxrrrrRRRd......',
  '......dRRRrrrrww....xxrrrrRRRd......',
  '......dRRRrrrrw......xrrrrRRRd......',
  '......dRRRrrr..........rrrRRRd......',
  '......dRRRrr............rrRRRd......',
  '......dRRR................RRRd......',
  '......dR....................Rd......',
  '......d......................d......',
  '....................................',
  '....................................',
  '....................................'
]

const EXPERIENCE_PALETTE = {
  k: [60, 30, 10, 255],
  x: [70, 72, 86, 255],
  r: [176, 30, 26, 255],
  R: [212, 52, 40, 255],
  d: [110, 16, 14, 255],
  w: [236, 236, 240, 255],
  s: [170, 172, 184, 255],
  S: [120, 122, 136, 255],
  b: [40, 60, 150, 255],
  B: [70, 96, 190, 255],
  Y: [250, 222, 120, 255],
  G: [220, 176, 60, 255],
  O: [150, 104, 24, 255],
  W: [255, 255, 255, 255]
}

const SPRITES = [
  { key: 'treasureChest', rows: CHEST_ROWS, palette: CHEST_PALETTE },
  { key: 'chestGold', rows: GOLD_ROWS, palette: GOLD_PALETTE },
  { key: 'chestExperience', rows: EXPERIENCE_ROWS, palette: EXPERIENCE_PALETTE }
]

// Places the sprites side by side, top-aligned, in one RGBA image.
function packAtlas(sprites) {
  const width = sprites.reduce((sum, { rows }) => sum + rows[0].length, 0)
  const height = Math.max(...sprites.map(({ rows }) => rows.length))
  const rgba = new Array(width * height * 4).fill(0)
  const placed = []
  let left = 0

  for (const { key, rows, palette } of sprites) {
    const spriteWidth = rows[0].length
    rows.forEach((row, y) => {
      for (let x = 0; x < spriteWidth; x += 1) {
        const colour = palette[row[x]]
        if (colour) {
          rgba.splice((y * width + left + x) * 4, 4, ...colour)
        }
      }
    })
    placed.push({ key, x: left, w: spriteWidth, h: rows.length })
    left += spriteWidth
  }

  return { width, height, rgba, placed }
}

function formatAtlas({ width, height, rgba, placed }) {
  const uv = (value) => value.toFixed(6)
  const sprites = placed
    .map(
      ({ key, x, w, h }) =>
        `  ${key}: { u0: ${uv(x / width)}, v0: ${uv(0)}, u1: ${uv((x + w) / width)}, v1: ${uv(h / height)}, w: ${w}, h: ${h} },`
    )
    .join('\n')
  const lines = []
  for (let index = 0; index < rgba.length; index += 64) {
    lines.push(`  ${rgba.slice(index, index + 64).join(', ')},`)
  }

  return `// Generated by scripts/build-adventure-sprite-atlas.mjs; edit the pixel art there.
export const ADVENTURE_ATLAS_WIDTH = ${width};
export const ADVENTURE_ATLAS_HEIGHT = ${height};

export const ADVENTURE_ATLAS_SPRITES = {
${sprites}
};

export const ADVENTURE_ATLAS_RGBA = new Uint8Array([
${lines.join('\n')}
]);
`
}

writeFileSync(OUTPUT_PATH, formatAtlas(packAtlas(SPRITES)))
