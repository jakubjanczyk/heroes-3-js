import { renderPixelArt } from './pixel-art.js'

// Drawn at the same 1.25 scale as the resource sprites, so a chest sits among them at their size.
const SCALE = 1.25

// The Heroes 3 map chest: open, seen from above at an angle, red-brown panels in a light gold
// frame with its contents glinting inside.
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

let backgroundImage

export function getTreasureChestSpriteStyle() {
  backgroundImage ??= renderPixelArt({ rows: CHEST_ROWS, palette: CHEST_PALETTE, scale: SCALE })
  return {
    width: Math.round(CHEST_ROWS[0].length * SCALE),
    height: Math.round(CHEST_ROWS.length * SCALE),
    backgroundImage
  }
}
