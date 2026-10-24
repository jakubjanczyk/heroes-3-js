// Stand-ins for the Castle town picture until it has sprites: an 800x374 background and an SVG
// drawing per building, each in its own frame whose top left corner the town's `picture` data
// places. Laid out after the Heroes 3 Castle, so that each
// building can be told apart at a glance.

const STONE = '#e6e2d6'
const STONE_SHADE = '#bcb5a5'
const STONE_DARK = '#80796d'
const ROOF = '#a8553a'
const ROOF_SHADE = '#7a3a24'
const TIMBER = '#4a2e1c'
const PLASTER = '#f0e5c8'
const WOOD = '#8a5a32'
const WOOD_DARK = '#5c3a1f'
const BLUE = '#2c40a0'
const BLUE_DARK = '#1d2b70'
const GOLD = '#e6bb3e'
const OPENING = '#2b2420'
const OUTLINE = 'stroke="#2a221c" stroke-width="0.8" stroke-linejoin="round"'

function rect(x, y, width, height, fill, extra = '') {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" ${extra}/>`
}

function polygon(points, fill, extra = '') {
  return `<polygon points="${points}" fill="${fill}" ${extra}/>`
}

// Merlons along the top of a wall or tower.
function crenels(x, y, width, size = 4) {
  const count = Math.max(2, Math.floor(width / (size * 2)))
  const step = width / count
  return Array.from({ length: count }, (_, index) =>
    rect(x + index * step, y - size, step / 2 + size / 4, size, STONE, OUTLINE)
  ).join('')
}

function archedOpening(x, y, width, height, fill = OPENING) {
  const radius = width / 2
  return `<path d="M${x} ${y + height}V${y + radius}a${radius} ${radius} 0 0 1 ${width} 0V${y + height}z" fill="${fill}"/>`
}

// A stone tower: its sunlit face, the shaded side, merlons and windows.
function stoneTower(x, y, width, height, { windows = 2, crenellated = true } = {}) {
  const shade = width * 0.32
  const windowWidth = Math.max(2, width * 0.16)
  const openings = Array.from({ length: windows }, (_, index) =>
    archedOpening(
      x + width * 0.3,
      y + 8 + (index * (height - 16)) / Math.max(1, windows),
      windowWidth,
      windowWidth * 2
    )
  ).join('')
  return [
    rect(x, y, width, height, STONE, OUTLINE),
    rect(x + width - shade, y, shade, height, STONE_SHADE),
    crenellated ? crenels(x, y, width) : '',
    openings
  ].join('')
}

function conicalRoof(x, y, width, height, fill = BLUE) {
  return polygon(
    `${x},${y + height} ${x + width / 2},${y} ${x + width},${y + height}`,
    fill,
    OUTLINE
  )
}

// A blue banner with a gold cross on a pole.
function banner(x, y, height = 14) {
  return [
    `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + height + 4}" stroke="${STONE_DARK}" stroke-width="1"/>`,
    polygon(
      `${x + 0.5},${y} ${x + 8},${y} ${x + 8},${y + height} ${x + 4.25},${y + height - 3} ${x + 0.5},${y + height}`,
      BLUE,
      OUTLINE
    ),
    rect(x + 3.5, y + 2, 1.5, height - 6, GOLD),
    rect(x + 2, y + 5, 4.5, 1.5, GOLD)
  ].join('')
}

// A half-timbered house: plaster walls with dark beams under a tiled roof.
function timberHouse(x, y, width, height, roofHeight) {
  const beams = Array.from(
    { length: Math.floor(width / 10) },
    (_, index) =>
      `<line x1="${x + 5 + index * 10}" y1="${y}" x2="${x + 5 + index * 10}" y2="${y + height}" stroke="${TIMBER}" stroke-width="1.6"/>`
  ).join('')
  const windows = Array.from({ length: Math.floor(width / 20) }, (_, index) =>
    rect(x + 8 + index * 20, y + height * 0.25, 5, 7, OPENING)
  ).join('')
  return [
    rect(x, y, width, height, PLASTER, OUTLINE),
    beams,
    `<line x1="${x}" y1="${y + height * 0.55}" x2="${x + width}" y2="${y + height * 0.55}" stroke="${TIMBER}" stroke-width="1.6"/>`,
    windows,
    polygon(
      `${x - 4},${y} ${x + width * 0.2},${y - roofHeight} ${x + width * 0.8},${y - roofHeight} ${x + width + 4},${y}`,
      ROOF,
      OUTLINE
    ),
    polygon(
      `${x + width * 0.8},${y - roofHeight} ${x + width + 4},${y} ${x + width * 0.62},${y}`,
      ROOF_SHADE
    )
  ].join('')
}

function cloud(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="white" opacity="0.85"><ellipse cx="0" cy="0" rx="34" ry="10"/><ellipse cx="-18" cy="-6" rx="16" ry="10"/><ellipse cx="10" cy="-10" rx="20" ry="13"/></g>`
}

function smoke(x, y) {
  return `<g fill="#9a958d" opacity="0.6"><circle cx="${x}" cy="${y}" r="4"/><circle cx="${x + 4}" cy="${y - 7}" r="5"/><circle cx="${x + 9}" cy="${y - 15}" r="6"/></g>`
}

function villageHall() {
  return [timberHouse(40, 150, 80, 45, 30), archedOpening(74, 177, 12, 18), banner(78, 108)].join(
    ''
  )
}

function townHall() {
  return [
    timberHouse(20, 128, 125, 67, 38),
    timberHouse(62, 100, 40, 28, 22),
    archedOpening(74, 172, 16, 23),
    banner(80, 62, 16)
  ].join('')
}

function cityHall() {
  return [
    timberHouse(10, 128, 145, 67, 34),
    stoneTower(66, 50, 32, 80, { windows: 3, crenellated: false }),
    conicalRoof(62, 22, 40, 28, ROOF),
    archedOpening(74, 170, 16, 25),
    banner(30, 100),
    banner(128, 100)
  ].join('')
}

function capitol() {
  return [
    timberHouse(2, 120, 70, 75, 34),
    timberHouse(96, 120, 66, 75, 34),
    stoneTower(64, 40, 38, 155, { windows: 4, crenellated: false }),
    conicalRoof(58, 4, 50, 36, ROOF),
    rect(81, 0, 2, 6, GOLD),
    stoneTower(10, 66, 18, 26, { windows: 1, crenellated: false }),
    conicalRoof(7, 46, 24, 20, ROOF),
    stoneTower(138, 66, 18, 26, { windows: 1, crenellated: false }),
    conicalRoof(135, 46, 24, 20, ROOF),
    banner(36, 132, 22),
    banner(50, 132, 22),
    banner(110, 132, 22),
    banner(124, 132, 22),
    archedOpening(74, 165, 18, 30)
  ].join('')
}

function curtainWall(x, y, width, height) {
  return [
    rect(x, y, width, height, STONE, OUTLINE),
    crenels(x, y, width),
    rect(x, y + height - 4, width, 4, STONE_SHADE)
  ].join('')
}

function fort() {
  return [
    curtainWall(30, 140, 160, 35),
    stoneTower(20, 118, 26, 57, { windows: 1 }),
    stoneTower(174, 118, 26, 57, { windows: 1 }),
    archedOpening(98, 150, 22, 25)
  ].join('')
}

function citadel() {
  return [
    curtainWall(24, 130, 172, 45),
    stoneTower(78, 64, 60, 80, { windows: 2 }),
    stoneTower(14, 96, 28, 79, { windows: 2 }),
    stoneTower(178, 96, 28, 79, { windows: 2 }),
    archedOpening(97, 142, 24, 33),
    banner(102, 40),
    banner(24, 72),
    banner(188, 72)
  ].join('')
}

function castle() {
  return [
    curtainWall(10, 112, 196, 63),
    stoneTower(64, 40, 80, 100, { windows: 3 }),
    stoneTower(48, 10, 20, 130, { windows: 4 }),
    stoneTower(140, 10, 20, 130, { windows: 4 }),
    stoneTower(2, 60, 26, 115, { windows: 3 }),
    stoneTower(182, 60, 26, 115, { windows: 3 }),
    stoneTower(94, 22, 22, 40, { windows: 1 }),
    archedOpening(92, 138, 26, 37),
    banner(54, 26, 18),
    banner(146, 26, 18),
    banner(80, 56, 18),
    banner(122, 56, 18),
    banner(8, 76),
    banner(190, 76)
  ].join('')
}

function tavern() {
  return [
    timberHouse(6, 42, 66, 53, 36),
    `<line x1="72" y1="56" x2="80" y2="56" stroke="${TIMBER}" stroke-width="1.5"/>`,
    rect(70, 58, 10, 12, WOOD, OUTLINE),
    // A tankard on the sign.
    rect(72.5, 61, 4, 6, GOLD),
    rect(76.5, 62, 1.5, 3, GOLD),
    rect(30, 76, 12, 19, WOOD_DARK)
  ].join('')
}

function brotherhood() {
  return [
    stoneTower(6, 20, 56, 60, { windows: 0 }),
    polygon('22,30 46,30 46,48 34,58 22,48', BLUE, OUTLINE),
    // Crossed swords on the shield.
    `<path d="M26 34 L42 52 M42 34 L26 52" stroke="${GOLD}" stroke-width="2.4" stroke-linecap="round"/>`,
    banner(10, 2),
    banner(52, 2)
  ].join('')
}

function blacksmith() {
  return [
    rect(10, 40, 90, 55, STONE_SHADE, OUTLINE),
    rect(10, 40, 60, 55, STONE, OUTLINE),
    polygon('4,40 26,10 84,10 106,40', ROOF_SHADE, OUTLINE),
    rect(78, 0, 12, 28, STONE_DARK, OUTLINE),
    smoke(84, -6),
    polygon('20,58 64,58 68,68 16,68', '#b02a26', OUTLINE),
    // The anvil by the door.
    `<path d="M74 82h16l-3 4h-3v5h4v4h-12v-4h4v-5h-3z" fill="#3a3a40"/>`,
    archedOpening(32, 72, 16, 23),
    `<circle cx="42" cy="84" r="3" fill="#ff8a2a"/>`
  ].join('')
}

function marketplace() {
  const stall = (x, y, color) =>
    [
      rect(x + 4, y + 16, 34, 18, WOOD, OUTLINE),
      polygon(`${x},${y + 16} ${x + 6},${y} ${x + 36},${y} ${x + 42},${y + 16}`, color, OUTLINE),
      `<path d="M${x + 13} ${y}l-2 16M${x + 24} ${y}v16M${x + 34} ${y}l2 16" stroke="white" stroke-width="2.4" opacity="0.6"/>`,
      `<circle cx="${x + 14}" cy="${y + 20}" r="3" fill="#d64a2a"/><circle cx="${x + 26}" cy="${y + 21}" r="3" fill="#f0c43a"/>`
    ].join('')
  return [
    stall(4, 2, '#4caf50'),
    stall(52, 10, '#3a6ee0'),
    stall(100, 2, '#f0c43a'),
    stall(146, 14, '#d64a8a'),
    rect(48, 54, 10, 8, WOOD_DARK, OUTLINE),
    rect(96, 56, 8, 8, WOOD_DARK, OUTLINE)
  ].join('')
}

function resourceSilo() {
  return [
    rect(10, 22, 30, 34, WOOD, OUTLINE),
    `<path d="M10 30h30M10 40h30M10 50h30" stroke="${WOOD_DARK}" stroke-width="1"/>`,
    conicalRoof(6, 2, 38, 20, ROOF),
    // A log pile and a heap of ore beside it.
    `<g fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="0.8"><circle cx="44" cy="54" r="3"/><circle cx="50" cy="54" r="3"/><circle cx="47" cy="49" r="3"/></g>`,
    polygon('0,58 6,48 14,58', '#6c6c72', OUTLINE)
  ].join('')
}

// Mage Guild level 1 to 5: a floor more for each level, under a pink dome.
function mageGuild(level) {
  const floorHeight = 24
  const height = 36 + floorHeight * (level - 1)
  const top = 175 - height
  const floors = Array.from({ length: level }, (_, index) =>
    [
      rect(18, top + index * floorHeight, 44, 3, GOLD),
      archedOpening(36, top + 10 + index * floorHeight, 8, 12, '#4a3a8a')
    ].join('')
  ).join('')
  return [
    rect(18, top, 44, height, STONE, OUTLINE),
    rect(48, top, 14, height, STONE_SHADE),
    floors,
    `<path d="M14 ${top}a26 22 0 0 1 52 0z" fill="#d07aa0" ${OUTLINE}/>`,
    `<circle cx="40" cy="${top - 24}" r="3.5" fill="${GOLD}"/>`
  ].join('')
}

function shipyard() {
  return [
    rect(0, 34, 80, 6, WOOD, OUTLINE),
    `<path d="M6 40v10M24 40v10M42 40v10M60 40v10M76 40v10" stroke="${WOOD_DARK}" stroke-width="2"/>`,
    // A hull on the slipway, its ribs showing.
    `<path d="M14 30 Q40 44 68 30 L64 20 H18 Z" fill="${WOOD}" ${OUTLINE}/>`,
    `<path d="M26 22v12M36 21v15M46 21v15M56 22v12" stroke="${WOOD_DARK}" stroke-width="1.5"/>`,
    `<line x1="41" y1="0" x2="41" y2="21" stroke="${WOOD_DARK}" stroke-width="2"/>`,
    `<path d="M41 2 L58 14 L41 16z" fill="${PLASTER}" ${OUTLINE}/>`
  ].join('')
}

function lighthouse() {
  return [
    polygon('0,130 6,112 30,112 36,130', STONE_DARK, OUTLINE),
    polygon('8,112 12,30 24,30 28,112', 'white', OUTLINE),
    polygon('9.5,82 10.5,66 25.5,66 26.5,82', '#c83a2a'),
    polygon('11,50 11.6,40 24.4,40 25,50', '#c83a2a'),
    rect(10, 16, 16, 14, '#ffe27a', OUTLINE),
    `<circle cx="18" cy="23" r="12" fill="#fff3b0" opacity="0.45"/>`,
    conicalRoof(8, 4, 20, 12, '#c83a2a')
  ].join('')
}

function stables() {
  return [
    rect(4, 22, 56, 30, WOOD, OUTLINE),
    polygon('0,22 14,4 50,4 64,22', ROOF_SHADE, OUTLINE),
    rect(10, 30, 14, 22, WOOD_DARK, OUTLINE),
    rect(40, 30, 14, 22, WOOD_DARK, OUTLINE),
    // A horse's head looking out of a stall.
    `<path d="M14 40 q2-8 8-8 l2 3 -3 1 v8 h-7z" fill="#e8dcc6" ${OUTLINE}/>`,
    polygon('26,52 32,40 38,52', '#d8b04a')
  ].join('')
}

function trainingGrounds(upgraded) {
  const tent = (x, y, width, height) =>
    [
      polygon(
        `${x},${y + height} ${x + width * 0.15},${y + height * 0.35} ${x + width / 2},${y} ${x + width * 0.85},${y + height * 0.35} ${x + width},${y + height}`,
        BLUE,
        OUTLINE
      ),
      `<path d="M${x + width / 2} ${y}V${y + height}M${x + width * 0.3} ${y + height * 0.2}L${x + width * 0.2} ${y + height}M${x + width * 0.7} ${y + height * 0.2}L${x + width * 0.8} ${y + height}" stroke="${GOLD}" stroke-width="1.6"/>`,
      archedOpening(x + width / 2 - 5, y + height - 12, 10, 12, BLUE_DARK)
    ].join('')
  return [
    tent(0, 14, 64, 42),
    tent(54, 22, 50, 34),
    upgraded ? tent(150, 18, 56, 38) : '',
    // The jousting barrier and its pennants.
    rect(96, 48, 112, 4, PLASTER, OUTLINE),
    `<path d="M100 52v10M130 52v10M160 52v10M190 52v10" stroke="${WOOD_DARK}" stroke-width="2"/>`,
    banner(112, 20, 18),
    banner(132, 20, 18),
    upgraded ? banner(30, 0, 14) : ''
  ].join('')
}

function guardhouse(upgraded) {
  const top = upgraded ? 8 : 30
  return [
    stoneTower(10, top, 40, 100 - top, { windows: upgraded ? 3 : 2 }),
    // Pikes over the battlements.
    `<path d="M14 ${top - 4}l-4 -22M24 ${top - 4}v-24M36 ${top - 4}v-24M46 ${top - 4}l4 -22" stroke="${WOOD_DARK}" stroke-width="1.4"/>`,
    `<path d="M10 ${top - 26}l-1 -5 3 4zM24 ${top - 28}v-5l1.5 5zM36 ${top - 28}v-5l1.5 5zM50 ${top - 26}l1 -5 1 5z" fill="#c8cdd4" stroke="#c8cdd4" stroke-width="1.5"/>`,
    archedOpening(24, 80, 12, 20),
    upgraded ? banner(46, top + 6) : '',
    upgraded ? rect(10, top + 2, 40, 2, GOLD) : ''
  ].join('')
}

function archersTower(upgraded) {
  return [
    rect(12, 26, 22, 66, STONE, OUTLINE),
    rect(26, 26, 8, 66, STONE_SHADE),
    `<path d="M19 40v8M19 58v8M19 76v8" stroke="${OPENING}" stroke-width="1.6"/>`,
    conicalRoof(8, 0, 30, 26, upgraded ? GOLD : BLUE),
    // A target leaning by the door, an arrow in it.
    `<circle cx="4" cy="84" r="5" fill="white" stroke="#c83a2a" stroke-width="2"/><circle cx="4" cy="84" r="1.6" fill="#c83a2a"/>`,
    upgraded ? banner(30, 6) : ''
  ].join('')
}

function griffinTower(upgraded) {
  return [
    polygon('0,140 8,104 22,92 40,96 60,86 82,98 94,108 100,140', '#c49a5e', OUTLINE),
    `<path d="M12 120l10-12M30 130l12-20M70 128l8-16" stroke="#8a6638" stroke-width="2"/>`,
    stoneTower(28, 18, 46, 76, { windows: 0 }),
    archedOpening(38, 40, 26, 54),
    stoneTower(20, 30, 12, 64, { windows: 1, crenellated: false }),
    conicalRoof(17, 14, 18, 16, upgraded ? GOLD : ROOF),
    stoneTower(70, 30, 12, 64, { windows: 1, crenellated: false }),
    conicalRoof(67, 14, 18, 16, upgraded ? GOLD : ROOF),
    // A griffin spreading its wings over its nest.
    `<path d="M42 12 q9 -3 18 0" stroke="${WOOD_DARK}" stroke-width="3" fill="none"/>`,
    `<path d="M51 10 l-14 -8 6 9 -10 -2 10 7z M51 10 l14 -8 -6 9 10 -2 -10 7z" fill="${GOLD}" ${OUTLINE}/>`,
    `<circle cx="51" cy="6" r="2.6" fill="white" ${OUTLINE}/>`,
    upgraded ? banner(46, -10, 12) : ''
  ].join('')
}

function griffinBastion() {
  return [
    `<path d="M10 60 V30 Q65 14 120 30 V60 Z" fill="${STONE}" ${OUTLINE}/>`,
    crenels(16, 28, 98),
    rect(10, 52, 110, 8, STONE_SHADE),
    stoneTower(0, 18, 18, 42, { windows: 1 }),
    stoneTower(112, 18, 18, 42, { windows: 1 }),
    archedOpening(56, 38, 16, 22),
    // The griffin on the gate's banner.
    polygon('58,22 70,22 70,36 64,32 58,36', GOLD, OUTLINE),
    `<path d="M60 26l4 3 4-3" stroke="${BLUE}" stroke-width="1.5" fill="none"/>`
  ].join('')
}

function barracks(upgraded) {
  const top = upgraded ? 6 : 22
  return [
    stoneTower(10, top, 52, 100 - top, { windows: 2 }),
    stoneTower(2, top - 8, 14, 108 - top, { windows: 2 }),
    stoneTower(56, top - 8, 14, 108 - top, { windows: 2 }),
    // A shield with a sword over the door.
    polygon(
      `28,${top + 20} 44,${top + 20} 44,${top + 34} 36,${top + 41} 28,${top + 34}`,
      BLUE,
      OUTLINE
    ),
    `<path d="M36 ${top + 22}v16M32 ${top + 26}h8" stroke="${GOLD}" stroke-width="2"/>`,
    archedOpening(28, 78, 16, 22),
    upgraded ? banner(6, top - 30) : '',
    upgraded ? banner(60, top - 30) : ''
  ].join('')
}

function monastery(upgraded) {
  return [
    rect(10, 44, 92, 40, STONE, OUTLINE),
    polygon('4,44 18,26 94,26 108,44', ROOF, OUTLINE),
    rect(40, 18, 32, 30, STONE, OUTLINE),
    `<path d="M36 18a20 18 0 0 1 40 0z" fill="${upgraded ? GOLD : '#4a8ab0'}" ${OUTLINE}/>`,
    `<path d="M56 0v8M52 3h8" stroke="${GOLD}" stroke-width="2"/>`,
    archedOpening(22, 56, 8, 14),
    archedOpening(82, 56, 8, 14),
    archedOpening(49, 60, 14, 24),
    upgraded ? stoneTower(92, 14, 16, 70, { windows: 2, crenellated: false }) : '',
    upgraded ? conicalRoof(90, 0, 20, 14, GOLD) : ''
  ].join('')
}

function portalOfGlory(upgraded) {
  return [
    cloud(80, 62, 2.2),
    cloud(30, 70, 1.2),
    cloud(130, 70, 1.2),
    rect(48, 22, 8, 44, STONE, OUTLINE),
    rect(104, 22, 8, 44, STONE, OUTLINE),
    `<path d="M58 66V34a22 20 0 0 1 44 0V66z" fill="${upgraded ? '#fff6c8' : '#d8e8ff'}" ${OUTLINE}/>`,
    `<path d="M62 66V36a18 16 0 0 1 36 0V66" fill="none" stroke="${GOLD}" stroke-width="3"/>`,
    banner(36, 26, 16),
    banner(116, 26, 16),
    upgraded
      ? `<path d="M80 14l-26 -12 8 10 -14 -2 32 12zM80 14l26 -12 -8 10 14 -2 -32 12z" fill="white" ${OUTLINE}/>`
      : '',
    `<circle cx="80" cy="16" r="5" fill="${GOLD}"/>`
  ].join('')
}

export const CASTLE_BUILDING_ART = {
  VILLAGE_HALL: villageHall,
  TOWN_HALL: townHall,
  CITY_HALL: cityHall,
  CAPITOL: capitol,
  FORT: fort,
  CITADEL: citadel,
  CASTLE: castle,
  TAVERN: tavern,
  BROTHERHOOD_OF_THE_SWORD: brotherhood,
  BLACKSMITH: blacksmith,
  MARKETPLACE: marketplace,
  RESOURCE_SILO: resourceSilo,
  MAGE_GUILD_1: () => mageGuild(1),
  MAGE_GUILD_2: () => mageGuild(2),
  MAGE_GUILD_3: () => mageGuild(3),
  MAGE_GUILD_4: () => mageGuild(4),
  MAGE_GUILD_5: () => mageGuild(5),
  SHIPYARD: shipyard,
  LIGHTHOUSE: lighthouse,
  STABLES: stables,
  TRAINING_GROUNDS: () => trainingGrounds(false),
  UPG_TRAINING_GROUNDS: () => trainingGrounds(true),
  GUARDHOUSE: () => guardhouse(false),
  UPG_GUARDHOUSE: () => guardhouse(true),
  ARCHERS_TOWER: () => archersTower(false),
  UPG_ARCHERS_TOWER: () => archersTower(true),
  GRIFFIN_TOWER: () => griffinTower(false),
  UPG_GRIFFIN_TOWER: () => griffinTower(true),
  GRIFFIN_BASTION: griffinBastion,
  BARRACKS: () => barracks(false),
  UPG_BARRACKS: () => barracks(true),
  MONASTERY: () => monastery(false),
  UPG_MONASTERY: () => monastery(true),
  PORTAL_OF_GLORY: () => portalOfGlory(false),
  UPG_PORTAL_OF_GLORY: () => portalOfGlory(true)
}

// Sky, distant mountains, the sea on the right, the cliff on the left and the green in front. It
// reaches past the 800x374 picture, so a town screen of another shape shows more of the land around
// the town rather than empty bars.
export function castleBackgroundArt() {
  return [
    `<defs><linearGradient id="castle-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f6fc4"/><stop offset="0.6" stop-color="#a9c8ee"/></linearGradient><linearGradient id="castle-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fa548"/><stop offset="1" stop-color="#5a7a32"/></linearGradient></defs>`,
    rect(-800, -600, 2400, 1000, 'url(#castle-sky)'),
    cloud(110, 40, 1.4),
    cloud(300, 30, 1),
    cloud(660, 22, 1.6),
    cloud(560, 70, 0.9),
    polygon('380,200 450,150 480,160 530,128 580,168 620,150 680,200', '#8e9cb4'),
    polygon('515,140 530,128 546,140 538,138 530,146 522,138', 'white'),
    rect(430, 180, 1170, 60, '#7fb3d8'),
    `<path d="M430 196h1170M450 214h1150" stroke="white" stroke-width="1" opacity="0.5"/>`,
    polygon(
      '-800,250 -800,150 -420,100 -160,124 0,110 30,90 70,120 110,70 170,110 200,96 260,140 330,170 360,215 300,250',
      '#c9a26a'
    ),
    `<path d="M40 120l20 30M120 90l10 40M200 120l20 40M260 160l20 30" stroke="#9a7442" stroke-width="3"/>`,
    `<path d="M-800 236 H0 Q200 190 420 214 T800 238 H1600 V1000 H-800 Z" fill="url(#castle-ground)"/>`,
    `<path d="M150 374 Q260 330 400 318 T800 300 H1600 V316 H800 Q600 322 430 336 T200 374 Z" fill="#c8b07a" opacity="0.8"/>`
  ].join('')
}
