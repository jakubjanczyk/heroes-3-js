import { renderPixelArt } from './pixel-art.js'

// Drawn at the same 1.25 scale as the resource sprites, so a chest sits among them at their size.
const SCALE = 1.25

// A wooden chest with gold bands and lock, in the style of the Heroes 3 map chest.
const CHEST_ROWS = [
  '............................',
  '.....KKKKKKKKKKKKKKKKKK.....',
  '...KKOHHHHHHHHHHHHHHHHYKK...',
  '..KHYOHHHHHHHHHHHHHHHHYOHK..',
  '.KLLYOLLLLLLLLLLLLLLLLYOLLK.',
  '.KLLYODLLLLLDLLLLLDLLLYODLK.',
  '.KLLYOLLLLLLLLLLLLLLLLYOLLK.',
  '.KWWYOWWWWWKKKKKKWWWWWYOWWK.',
  '.KDDYODDDDDKYGGGKDDDDDYODDK.',
  '.KGOYOGOGOGKYGGGKOGOGOYOGOK.',
  '.KLLYOLLLLLKYKKGKLLLLLYOLLK.',
  '.KLLYOLLLLLKYKKGKLLLLLYOLLK.',
  '.KWWYOWWWWWKYKGGKWWWWWYOWWK.',
  '.KDDYODDDDDKKKKKKDDDDDYODDK.',
  '.KWWYOWWWWWWWWWWWWWWWWYOWWK.',
  '.KWWYOWWWWWWWWWWWWWWWWYOWWK.',
  '.KWWYOWWWWWWWWWWWWWWWWYOWWK.',
  '.KDDYODDDDDDDDDDDDDDDDYODDK.',
  '.KWWYOWWWWWWWWWWWWWWWWYOWWK.',
  '.KKKKKKKKKKKKKKKKKKKKKKKKKK.',
  '...SSSSSSSSSSSSSSSSSSSSSSSS.',
  '.....SSSSSSSSSSSSSSSSSSSS...'
]

const CHEST_PALETTE = {
  K: [28, 16, 8, 255],
  D: [74, 42, 18, 255],
  W: [122, 74, 34, 255],
  L: [160, 106, 50, 255],
  H: [192, 138, 72, 255],
  G: [217, 168, 56, 255],
  Y: [244, 220, 120, 255],
  O: [138, 100, 24, 255],
  S: [0, 0, 0, 80]
}

// Stands for experience in the chest dialog, where Heroes 3 shows its experience picture.
const EXPERIENCE_ROWS = [
  '........................',
  '...........k............',
  '...........k............',
  '...........k............',
  '..........kGk...........',
  '..........kGk...........',
  '.........kGGGk..........',
  '.........kGGGk..........',
  '.........kGGGk..........',
  '.kkkkkkkkYYYYGkkkkkkkk..',
  '...kGGGGYYYYYGGGGGGk....',
  '....kGGGYYYWWGGGGGk.....',
  '.....kGGYYWWWWOOOk......',
  '......kGYYWWWWOOk.......',
  '.......kYYYWWGOk........',
  '.......kYYYYYGOk........',
  '......kGGYYkYGOOk.......',
  '......kGGGk.kGOOk.......',
  '......kGkk...kkOk.......',
  '.....kGk.......kOk......',
  '.....kk.........kk......',
  '........................',
  '........................',
  '........................'
]

const EXPERIENCE_PALETTE = {
  k: [58, 34, 6, 255],
  O: [176, 120, 20, 255],
  G: [230, 176, 48, 255],
  Y: [250, 222, 110, 255],
  W: [255, 250, 220, 255]
}

function spriteStyle(rows, palette) {
  let backgroundImage
  return () => {
    backgroundImage ??= renderPixelArt({ rows, palette, scale: SCALE })
    return {
      width: Math.round(rows[0].length * SCALE),
      height: Math.round(rows.length * SCALE),
      backgroundImage
    }
  }
}

export const getTreasureChestSpriteStyle = spriteStyle(CHEST_ROWS, CHEST_PALETTE)
export const getExperienceIconStyle = spriteStyle(EXPERIENCE_ROWS, EXPERIENCE_PALETTE)
