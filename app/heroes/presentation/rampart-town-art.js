// Stand-ins for the Rampart town picture until it has sprites, drawn as the Castle's are: an
// 800x374 background and an SVG drawing per building in its own frame. Laid out after the game's
// Rampart: timber and thatch, stone at the foot of the bigger buildings, the Mage Guild a pagoda
// in a lake.

import { archedOpening, cloud, OPENING, OUTLINE, polygon, rect, smoke } from './town-art-shapes.js'

const THATCH = '#c2a25e'
const THATCH_SHADE = '#8f7238'
const TIMBER = '#6b4428'
const TIMBER_DARK = '#3f2716'
const STONE = '#a8a296'
const STONE_SHADE = '#7c766a'
const PAPER = '#f2e2b4'
const LEAF = '#3f7a2e'
const LEAF_DARK = '#2a5420'
const LEAF_LIGHT = '#5f9a3a'
const WATER = '#5d93b8'
const WATER_LIGHT = '#9cc6de'
const ROCK = '#9b8f7c'
const ROCK_SHADE = '#6e6455'
const GOLD = '#e6bb3e'
const RED_LACQUER = '#a8322a'

function line(x1, y1, x2, y2, stroke, width = 1.5) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}"/>`
}

function ellipse(cx, cy, rx, ry, fill, extra = '') {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`
}

// A steep thatched roof, its far side in shade.
function thatchRoof(x, y, width, height) {
  return [
    polygon(
      `${x - 6},${y + height} ${x + width / 2},${y} ${x + width + 6},${y + height}`,
      THATCH,
      OUTLINE
    ),
    polygon(
      `${x + width / 2},${y} ${x + width + 6},${y + height} ${x + width * 0.7},${y + height}`,
      THATCH_SHADE
    ),
    `<path d="M${x + width * 0.25} ${y + height * 0.5}h${width * 0.5}M${x + width * 0.12} ${y + height * 0.78}h${width * 0.76}" stroke="${THATCH_SHADE}" stroke-width="1"/>`
  ].join('')
}

// A timber house under thatch: dark posts, paper windows, the door in the middle.
function thatchedHouse(x, y, width, height, roofHeight) {
  const posts = Array.from({ length: Math.floor(width / 14) + 1 }, (_, index) =>
    line(x + index * 14, y, x + index * 14, y + height, TIMBER_DARK, 1.4)
  ).join('')
  const windows = Array.from({ length: Math.max(1, Math.floor(width / 28)) }, (_, index) =>
    rect(x + 6 + index * 28, y + height * 0.25, 8, 8, PAPER, OUTLINE)
  ).join('')
  return [
    rect(x, y, width, height, TIMBER, OUTLINE),
    posts,
    windows,
    rect(x + width / 2 - 5, y + height - 15, 10, 15, OPENING),
    thatchRoof(x, y - roofHeight, width, roofHeight)
  ].join('')
}

function stoneBase(x, y, width, height) {
  return [
    rect(x, y, width, height, STONE, OUTLINE),
    rect(x + width * 0.68, y, width * 0.32, height, STONE_SHADE),
    `<path d="M${x} ${y + height / 2}h${width}" stroke="${STONE_SHADE}" stroke-width="1"/>`
  ].join('')
}

function chimney(x, y, height) {
  return [rect(x, y, 9, height, STONE, OUTLINE), rect(x - 1, y - 3, 11, 3, STONE_SHADE)].join('')
}

function tree(x, y, size, fill = LEAF) {
  return [
    rect(x - size * 0.08, y, size * 0.16, size * 0.6, TIMBER),
    ellipse(x, y - size * 0.15, size * 0.45, size * 0.55, fill, OUTLINE),
    ellipse(x + size * 0.15, y - size * 0.3, size * 0.2, size * 0.22, LEAF_LIGHT)
  ].join('')
}

function pine(x, y, height, fill = LEAF_DARK) {
  return polygon(
    `${x},${y - height} ${x + height * 0.3},${y} ${x - height * 0.3},${y}`,
    fill,
    OUTLINE
  )
}

function rock(x, y, width, height) {
  return [
    `<path d="M${x} ${y + height} Q${x + width * 0.1} ${y} ${x + width * 0.5} ${y} T${x + width} ${y + height} Z" fill="${ROCK}" ${OUTLINE}/>`,
    `<path d="M${x + width * 0.55} ${y + 2} Q${x + width * 0.9} ${y + height * 0.3} ${x + width} ${y + height} H${x + width * 0.6} Z" fill="${ROCK_SHADE}"/>`
  ].join('')
}

// A red lacquered post carved with signs, as in front of the Homestead.
function totem(x, y, height) {
  return [
    rect(x, y, 8, height, RED_LACQUER, OUTLINE),
    `<path d="M${x + 2} ${y + 6}h4M${x + 2} ${y + 14}h4M${x + 2} ${y + 22}h4" stroke="${GOLD}" stroke-width="1.5"/>`
  ].join('')
}

function villageHall() {
  return [thatchedHouse(20, 52, 70, 34, 30), chimney(70, 28, 16), smoke(74, 22)].join('')
}

function townHall() {
  return [
    thatchedHouse(12, 70, 104, 44, 40),
    thatchedHouse(48, 30, 36, 22, 22),
    chimney(100, 34, 26),
    smoke(104, 28)
  ].join('')
}

function cityHall() {
  return [
    stoneBase(6, 92, 136, 22),
    thatchedHouse(10, 62, 128, 30, 34),
    thatchedHouse(46, 18, 56, 26, 28),
    chimney(16, 40, 30),
    chimney(124, 40, 30)
  ].join('')
}

function capitol() {
  return [
    stoneBase(2, 88, 150, 26),
    thatchedHouse(6, 58, 142, 30, 34),
    stoneBase(54, 30, 46, 30),
    thatchedHouse(48, 8, 58, 22, 30),
    rect(76, -26, 2, 6, GOLD),
    chimney(12, 36, 30),
    chimney(134, 36, 30),
    totem(40, 82, 32),
    totem(108, 82, 32)
  ].join('')
}

function palisade(x, y, width, height) {
  return Array.from({ length: Math.floor(width / 7) }, (_, index) =>
    polygon(
      `${x + index * 7},${y + height} ${x + index * 7},${y + 4} ${x + index * 7 + 3},${y} ${x + index * 7 + 6},${y + 4} ${x + index * 7 + 6},${y + height}`,
      TIMBER,
      OUTLINE
    )
  ).join('')
}

// A stone keep with timber floors under thatch, as the game's Rampart castle.
function keep(x, y, width, height) {
  return [
    stoneBase(x, y + height * 0.45, width, height * 0.55),
    rect(x + 4, y + height * 0.12, width - 8, height * 0.33, TIMBER, OUTLINE),
    `<path d="M${x + 4} ${y + height * 0.28}h${width - 8}" stroke="${TIMBER_DARK}" stroke-width="1.6"/>`,
    rect(x + width * 0.3, y + height * 0.18, 6, 6, PAPER),
    rect(x + width * 0.6, y + height * 0.18, 6, 6, PAPER),
    thatchRoof(x, y - height * 0.2, width, height * 0.32)
  ].join('')
}

function fort() {
  return [
    palisade(10, 126, 210, 34),
    keep(96, 66, 52, 90),
    archedOpening(110, 136, 22, 24, TIMBER_DARK)
  ].join('')
}

function citadel() {
  return [
    palisade(0, 132, 210, 30),
    keep(18, 88, 40, 72),
    keep(152, 88, 40, 72),
    keep(74, 46, 64, 114),
    archedOpening(95, 132, 22, 28, TIMBER_DARK)
  ].join('')
}

function castle() {
  return [
    stoneBase(0, 130, 214, 32),
    keep(4, 74, 42, 86),
    keep(168, 74, 42, 86),
    keep(40, 56, 36, 80),
    keep(138, 56, 36, 80),
    keep(70, 20, 74, 140),
    archedOpening(95, 128, 24, 34, TIMBER_DARK),
    rect(106, -12, 2, 8, GOLD)
  ].join('')
}

function tavern() {
  return [
    thatchedHouse(8, 40, 76, 34, 34),
    chimney(70, 16, 22),
    smoke(74, 10),
    line(84, 50, 94, 50, TIMBER_DARK),
    rect(88, 52, 12, 12, TIMBER, OUTLINE),
    rect(91, 55, 5, 6, GOLD)
  ].join('')
}

function blacksmith() {
  return [
    stoneBase(8, 44, 70, 34),
    thatchRoof(4, 16, 78, 28),
    chimney(60, 0, 26),
    smoke(64, -6),
    archedOpening(26, 56, 16, 22),
    `<circle cx="34" cy="68" r="3" fill="#ff8a2a"/>`
  ].join('')
}

function marketplace() {
  const tent = (x, y, color) =>
    [
      rect(x + 4, y + 18, 34, 18, TIMBER, OUTLINE),
      polygon(`${x},${y + 18} ${x + 21},${y} ${x + 42},${y + 18}`, color, OUTLINE),
      `<path d="M${x + 10} ${y + 12}l22 0M${x + 21} ${y}v18" stroke="#7a3a6a" stroke-width="1.2" opacity="0.7"/>`,
      `<circle cx="${x + 14}" cy="${y + 24}" r="3" fill="#d64a2a"/><circle cx="${x + 26}" cy="${y + 25}" r="3" fill="${GOLD}"/>`
    ].join('')
  return [
    tent(4, 6, '#f0ead8'),
    tent(52, 14, '#e8c8d8'),
    tent(100, 4, '#d8e8c8'),
    `<g fill="${TIMBER}" ${OUTLINE}><circle cx="150" cy="44" r="4"/><circle cx="158" cy="44" r="4"/><circle cx="154" cy="37" r="4"/></g>`,
    rect(46, 50, 8, 8, TIMBER_DARK, OUTLINE)
  ].join('')
}

// A wooden cart heaped with crystal, Rampart's own resource.
function resourceSilo() {
  return [
    rect(6, 20, 48, 16, TIMBER, OUTLINE),
    `<path d="M6 26h48M18 20v16M30 20v16M42 20v16" stroke="${TIMBER_DARK}" stroke-width="1"/>`,
    polygon('12,20 18,6 24,20', '#e86aa8', OUTLINE),
    polygon('24,20 31,2 38,20', '#f08ac0', OUTLINE),
    polygon('36,20 42,8 48,20', '#e86aa8', OUTLINE),
    `<circle cx="16" cy="40" r="7" fill="none" stroke="${TIMBER_DARK}" stroke-width="2.4"/><circle cx="44" cy="40" r="7" fill="none" stroke="${TIMBER_DARK}" stroke-width="2.4"/>`,
    line(54, 28, 66, 36, TIMBER_DARK, 2.4)
  ].join('')
}

// The pagoda's frame for each level: its top left corner on the picture (the town's `picture`),
// so a pagoda of any level stands on the same spot of the lake.
const GUILD_FRAMES = {
  1: [454, 200],
  2: [438, 178],
  3: [418, 153],
  4: [406, 129],
  5: [384, 104]
}
const GUILD_CENTER = [500, 288]

function pagodaStorey(cx, bottom, width) {
  return [
    rect(cx - width * 0.34, bottom - 16, width * 0.68, 16, RED_LACQUER, OUTLINE),
    rect(cx - width * 0.26, bottom - 12, width * 0.52, 8, '#f6d58a'),
    `<path d="M${cx - width / 2} ${bottom - 14} Q${cx} ${bottom - 26} ${cx + width / 2} ${bottom - 14} L${cx + width * 0.4} ${bottom - 20} H${cx - width * 0.4} Z" fill="${THATCH_SHADE}" ${OUTLINE}/>`
  ].join('')
}

// Mage Guild level 1 to 5: a pagoda in a lake, a storey more for each level.
function mageGuild(level) {
  const [frameX, frameY] = GUILD_FRAMES[level]
  const cx = GUILD_CENTER[0] - frameX
  const waterline = GUILD_CENTER[1] - frameY
  const storeys = Array.from({ length: level }, (_, index) =>
    pagodaStorey(cx, waterline - 4 - index * 18, 64 - index * 6)
  ).join('')
  const top = waterline - 4 - level * 18
  return [
    ellipse(cx, waterline, 44 + level * 6, 9, WATER, OUTLINE),
    ellipse(cx - 10, waterline - 2, 18, 2.5, WATER_LIGHT),
    rect(cx - 30, waterline - 8, 3, 10, RED_LACQUER),
    rect(cx + 27, waterline - 8, 3, 10, RED_LACQUER),
    storeys,
    polygon(`${cx - 12},${top - 6} ${cx},${top - 22} ${cx + 12},${top - 6}`, THATCH, OUTLINE),
    rect(cx - 1, top - 30, 2, 9, GOLD)
  ].join('')
}

function mysticPond() {
  return [
    rock(0, 20, 22, 14),
    ellipse(60, 30, 50, 12, WATER, OUTLINE),
    ellipse(48, 27, 22, 3, WATER_LIGHT),
    rock(98, 22, 20, 12),
    `<g fill="#f6f0f8"><circle cx="76" cy="31" r="2.4"/><circle cx="34" cy="33" r="2"/></g>`
  ].join('')
}

function fountainOfFortune() {
  return [
    mysticPond(),
    rect(52, 6, 16, 22, STONE, OUTLINE),
    ellipse(60, 6, 14, 4, STONE_SHADE, OUTLINE),
    `<path d="M60 4 Q50 -10 42 10M60 4 Q70 -10 78 10" stroke="${WATER_LIGHT}" stroke-width="2" fill="none"/>`,
    `<circle cx="60" cy="0" r="3" fill="${GOLD}"/>`
  ].join('')
}

function treasury() {
  return [
    stoneBase(6, 28, 56, 30),
    thatchRoof(4, 4, 60, 24),
    rect(26, 40, 14, 18, '#5a4630', OUTLINE),
    `<circle cx="33" cy="49" r="2" fill="${GOLD}"/>`,
    `<g fill="${GOLD}" ${OUTLINE}><circle cx="66" cy="54" r="3"/><circle cx="71" cy="55" r="3"/><circle cx="68" cy="50" r="3"/></g>`
  ].join('')
}

// A mine's mouth in the hill beside the Dwarf Cottage, with a cart on its rails.
function minersGuild() {
  return [
    `<path d="M0 64 Q2 20 34 14 Q54 20 60 64 Z" fill="${ROCK}" ${OUTLINE}/>`,
    archedOpening(16, 36, 22, 28),
    `<path d="M14 64V34h26v30" stroke="${TIMBER}" stroke-width="3" fill="none"/>`,
    rect(38, 56, 14, 8, TIMBER, OUTLINE),
    `<g fill="${STONE_SHADE}"><circle cx="42" cy="55" r="2.5"/><circle cx="47" cy="54" r="2.5"/></g>`
  ].join('')
}

function dendroidSaplings() {
  return [tree(8, 54, 18, LEAF_LIGHT), tree(20, 60, 14, LEAF_LIGHT), tree(4, 66, 12)].join('')
}

function centaurStables(upgraded) {
  return [
    thatchedHouse(10, 36, 90, 30, 28),
    palisade(100, 48, 56, 18),
    `<path d="M102 56h54" stroke="${TIMBER_DARK}" stroke-width="1.2"/>`,
    upgraded ? totem(0, 34, 32) : ''
  ].join('')
}

function dwarfCottage(upgraded) {
  const top = upgraded ? 11 : 22
  return [
    `<path d="M0 ${top + 50} Q6 ${top} 44 ${top - 6} Q76 ${top} 80 ${top + 50} Z" fill="${ROCK}" ${OUTLINE}/>`,
    archedOpening(30, top + 22, 18, 28, TIMBER_DARK),
    rect(12, top + 22, 8, 8, PAPER, OUTLINE),
    rect(58, top + 22, 8, 8, PAPER, OUTLINE),
    chimney(52, top - 8, 14),
    upgraded ? smoke(56, top - 14) : ''
  ].join('')
}

function homestead(upgraded) {
  return [
    stoneBase(10, 64, 110, 20),
    thatchedHouse(14, 46, 102, 18, 40),
    chimney(6, 28, 56),
    chimney(116, 28, 56),
    upgraded ? thatchRoof(50, 8, 30, 20) : '',
    upgraded ? totem(30, 60, 26) : '',
    upgraded ? totem(92, 60, 26) : ''
  ].join('')
}

function enchantedSpring(upgraded) {
  const top = upgraded ? 45 : 0
  return [
    rock(14, top + 14, 60, 66 - top / 3),
    `<path d="M44 ${top + 22} Q40 ${top + 60} 46 ${top + 84}" stroke="${WATER_LIGHT}" stroke-width="5" fill="none"/>`,
    ellipse(46, top + 88, 34, 8, WATER, OUTLINE),
    // A winged horse on the rock.
    `<path d="M34 ${top + 12} q6 -8 18 -4 l4 -4 2 4 -2 4 -8 2 -2 6 -4 0 0 -5 -6 0 -2 5 -4 0z" fill="#f4f2f8" ${OUTLINE}/>`,
    `<path d="M44 ${top + 6} l-6 -12 10 8z" fill="${upgraded ? '#d8dce6' : 'white'}" ${OUTLINE}/>`
  ].join('')
}

// Two trees bent into an arch, the Dendroids' home.
function dendroidArches(upgraded) {
  return [
    `<path d="M10 90 Q8 30 46 26 Q86 30 84 90" stroke="${TIMBER}" stroke-width="8" fill="none"/>`,
    ellipse(28, 30, 22, 18, LEAF, OUTLINE),
    ellipse(66, 28, 24, 18, LEAF, OUTLINE),
    ellipse(46, 16, 20, 14, LEAF_LIGHT, OUTLINE),
    upgraded ? ellipse(86, 46, 14, 16, LEAF_DARK, OUTLINE) : '',
    upgraded ? ellipse(8, 48, 14, 16, LEAF_DARK, OUTLINE) : ''
  ].join('')
}

function unicornGlade(upgraded) {
  return [
    tree(16, 64, 40, LEAF_DARK),
    tree(86, 60, 44, LEAF_DARK),
    ellipse(52, 86, 40, 8, LEAF_LIGHT),
    // A unicorn in the clearing.
    `<path d="M38 80 q4 -12 20 -10 l6 -6 3 3 -4 6 -2 8 h-3 v-5 h-14 v5 h-3z" fill="white" ${OUTLINE}/>`,
    line(66, 64, 72, 56, GOLD, 1.6),
    upgraded ? `<path d="M40 72 h18 v4 h-18z" fill="#c8a040" ${OUTLINE}/>` : ''
  ].join('')
}

function dragonCliffs(upgraded) {
  const top = upgraded ? 22 : 0
  return [
    `<path d="M0 130 L14 ${top + 40} L46 ${top + 10} L80 ${top} L116 ${top + 26} L150 ${top + 50} L160 130 Z" fill="${ROCK}" ${OUTLINE}/>`,
    `<path d="M80 ${top} L116 ${top + 26} L150 ${top + 50} L160 130 H104 Z" fill="${ROCK_SHADE}"/>`,
    archedOpening(66, 84, 34, 46),
    // A dragon spreading its wings on the peak.
    `<path d="M80 ${top + 2} l-26 -14 10 12 -16 -2 30 10z M80 ${top + 2} l26 -14 -10 12 16 -2 -30 10z" fill="${upgraded ? GOLD : '#4e9a3a'}" ${OUTLINE}/>`,
    `<circle cx="80" cy="${top - 4}" r="3.5" fill="${upgraded ? GOLD : '#4e9a3a'}" ${OUTLINE}/>`
  ].join('')
}

const BUILDING_ART = {
  VILLAGE_HALL: villageHall,
  TOWN_HALL: townHall,
  CITY_HALL: cityHall,
  CAPITOL: capitol,
  FORT: fort,
  CITADEL: citadel,
  CASTLE: castle,
  TAVERN: tavern,
  BLACKSMITH: blacksmith,
  MARKETPLACE: marketplace,
  RESOURCE_SILO: resourceSilo,
  MAGE_GUILD_1: () => mageGuild(1),
  MAGE_GUILD_2: () => mageGuild(2),
  MAGE_GUILD_3: () => mageGuild(3),
  MAGE_GUILD_4: () => mageGuild(4),
  MAGE_GUILD_5: () => mageGuild(5),
  MYSTIC_POND: mysticPond,
  FOUNTAIN_OF_FORTUNE: fountainOfFortune,
  TREASURY: treasury,
  MINERS_GUILD: minersGuild,
  DENDROID_SAPLINGS: dendroidSaplings,
  CENTAUR_STABLES: () => centaurStables(false),
  UPG_CENTAUR_STABLES: () => centaurStables(true),
  DWARF_COTTAGE: () => dwarfCottage(false),
  UPG_DWARF_COTTAGE: () => dwarfCottage(true),
  HOMESTEAD: () => homestead(false),
  UPG_HOMESTEAD: () => homestead(true),
  ENCHANTED_SPRING: () => enchantedSpring(false),
  UPG_ENCHANTED_SPRING: () => enchantedSpring(true),
  DENDROID_ARCHES: () => dendroidArches(false),
  UPG_DENDROID_ARCHES: () => dendroidArches(true),
  UNICORN_GLADE: () => unicornGlade(false),
  UPG_UNICORN_GLADE: () => unicornGlade(true),
  DRAGON_CLIFFS: () => dragonCliffs(false),
  UPG_DRAGON_CLIFFS: () => dragonCliffs(true)
}

function hutGroup(huts) {
  return huts.map(([x, y, width]) => thatchedHouse(x, y, width, width * 0.4, width * 0.45)).join('')
}

// The village grows with the hall: a group of houses comes with the Town Hall, another with the
// City Hall and a third with the Capitol, each placed on the picture as the buildings are.
const HOUSES = [
  {
    hallsShowingThem: ['TOWN_HALL', 'CITY_HALL', 'CAPITOL'],
    x: 293,
    y: 235,
    art: () =>
      hutGroup([
        [8, 20, 34],
        [48, 30, 30]
      ])
  },
  {
    hallsShowingThem: ['CITY_HALL', 'CAPITOL'],
    x: 295,
    y: 191,
    art: () =>
      hutGroup([
        [6, 22, 26],
        [40, 18, 30],
        [76, 26, 24]
      ])
  },
  {
    hallsShowingThem: ['CAPITOL'],
    x: 260,
    y: 171,
    art: () =>
      hutGroup([
        [4, 18, 22],
        [124, 22, 26]
      ])
  }
]

function forestedHill(points, fill) {
  return `<path d="${points}" fill="${fill}"/>`
}

function mist(x, y, scale, opacity) {
  return `<g opacity="${opacity}">${cloud(x, y, scale)}</g>`
}

// A wide green meadow in a valley between forested hills, mist over its far end. It reaches past
// the 800x374 picture, as the Castle's does.
function backdrop() {
  const pinesLeft = [30, 62, 96, 130, 168, 204, 240]
    .map((x, index) => pine(x, 128 - (index % 2) * 6, 34 + (index % 3) * 6))
    .join('')
  const pinesRight = [600, 636, 668, 704, 742, 778]
    .map((x, index) => pine(x, 132 - (index % 2) * 6, 30 + (index % 3) * 6))
    .join('')
  return [
    `<defs><linearGradient id="rampart-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8c0c4"/><stop offset="0.7" stop-color="#e4e6e2"/></linearGradient><linearGradient id="rampart-meadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f8a3a"/><stop offset="1" stop-color="#46702a"/></linearGradient></defs>`,
    rect(-800, -600, 2400, 1000, 'url(#rampart-sky)'),
    forestedHill('M200 140 Q330 70 430 100 Q520 70 640 140 Z', '#7d8f84'),
    forestedHill('M-800 150 V-20 L-200 -10 Q60 -20 160 30 Q300 70 400 136 L-800 150 Z', '#2f4a34'),
    forestedHill('M1600 150 V-20 L1000 -10 Q760 0 700 40 Q620 80 560 136 L1600 150 Z', '#35523a'),
    pinesLeft,
    pinesRight,
    mist(470, 70, 3.2, 0.7),
    mist(380, 96, 2.2, 0.55),
    mist(600, 60, 2.6, 0.6),
    `<path d="M-800 140 Q200 120 400 130 T1600 140 V1000 H-800 Z" fill="url(#rampart-meadow)"/>`,
    `<path d="M120 374 Q300 300 420 240 Q440 230 470 232 Q420 260 380 300 T300 374 Z" fill="#7fa04e" opacity="0.5"/>`,
    rock(-4, 244, 60, 34),
    rock(606, 212, 70, 26),
    rock(700, 222, 100, 32)
  ].join('')
}

function guildWindow() {
  return [
    `<defs><linearGradient id="rampart-window-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8c0c4"/><stop offset="1" stop-color="#eceee8"/></linearGradient></defs>`,
    rect(0, 0, 138, 198, 'url(#rampart-window-sky)'),
    forestedHill('M0 130 V40 Q30 50 60 90 Q70 110 80 130 Z', '#2f4a34'),
    forestedHill('M138 130 V30 Q110 40 90 80 Q80 110 70 130 Z', '#35523a'),
    pine(14, 96, 30),
    pine(122, 92, 30),
    mist(70, 80, 1.4, 0.7),
    `<path d="M0 124 Q70 116 138 124 V198 H0 Z" fill="#5f8a3a"/>`,
    rock(10, 160, 30, 16)
  ].join('')
}

export const RAMPART_TOWN_ART = {
  backdropName: "Rampart's misty valley",
  backdrop,
  buildings: BUILDING_ART,
  houses: HOUSES,
  guildWindow: { name: "View of Rampart's valley", art: guildWindow }
}
