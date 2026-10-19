import { renderPixelArt } from './pixel-art.js'

// The pictures the chest dialog offers, drawn after the game's: a heap of gold coins, and the
// experience banner (a red banner with a gold star on a blue disc). The dialog scales them up.
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

const pictures = {}

function picture(key, rows, palette) {
  pictures[key] ??= renderPixelArt({ rows, palette, scale: 1 })
  return pictures[key]
}

export function getGoldPicture() {
  return picture('gold', GOLD_ROWS, GOLD_PALETTE)
}

export function getExperiencePicture() {
  return picture('experience', EXPERIENCE_ROWS, EXPERIENCE_PALETTE)
}
