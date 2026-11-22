const SVG = 'http://www.w3.org/2000/svg'

const WALL_LABELS = { standing: 'Wall', damaged: 'Damaged wall', destroyed: 'Destroyed wall' }

function drawbridgeLabel({ open, state }) {
  if (state === 'destroyed') {
    return 'Destroyed drawbridge'
  }
  const position = open ? 'open' : 'shut'
  return state === 'damaged' ? `Damaged drawbridge, ${position}` : `Drawbridge, ${position}`
}

const wallLabel = (wall) =>
  wall.part === 'drawbridge' ? drawbridgeLabel(wall) : WALL_LABELS[wall.state]

export function renderWall(document, wall) {
  const element = document.createElement('div')
  element.className = `battlefield__wall battlefield__wall--${wall.part} battlefield__wall--${wall.state}`
  element.classList.toggle('battlefield__wall--open', Boolean(wall.open))
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', wallLabel(wall))
  return element
}

export function renderMoat(document, name) {
  const element = document.createElement('div')
  element.className = 'battlefield__moat'
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', name)
  return element
}

const CATAPULT_SHAPES = [
  ['path', { class: 'battle-catapult__frame', d: 'M14 50 L86 50 L70 34 L30 34 Z' }],
  ['path', { class: 'battle-catapult__frame', d: 'M44 34 L52 14 L60 34' }],
  ['path', { class: 'battle-catapult__arm', d: 'M30 44 L78 8' }],
  ['circle', { class: 'battle-catapult__cup', cx: '80', cy: '7', r: '6' }],
  ['circle', { class: 'battle-catapult__wheel', cx: '26', cy: '54', r: '9' }],
  ['circle', { class: 'battle-catapult__wheel', cx: '74', cy: '54', r: '9' }]
]

export function renderCatapultPicture(document) {
  const element = document.createElement('div')
  element.className = 'battle-catapult'
  element.setAttribute('aria-hidden', 'true')
  const picture = document.createElementNS(SVG, 'svg')
  picture.setAttribute('viewBox', '0 0 100 66')
  picture.setAttribute('aria-hidden', 'true')
  for (const [tag, attributes] of CATAPULT_SHAPES) {
    const shape = document.createElementNS(SVG, tag)
    for (const [name, value] of Object.entries(attributes)) {
      shape.setAttribute(name, value)
    }
    picture.append(shape)
  }
  element.append(picture)
  return element
}

// The stone goes across at an even speed while it rises and falls, so it flies in an arc.
export function renderCatapultStone(document, { from, to, flightMs }) {
  const across = document.createElement('div')
  across.className = 'battle-catapult-stone'
  across.setAttribute('role', 'img')
  across.setAttribute('aria-label', 'Catapult stone')
  across.style.left = `${from.x}px`
  across.style.top = `${from.y}px`
  across.style.setProperty('--stone-across', `${to.x - from.x}px`)
  across.style.setProperty('--stone-down', `${to.y - from.y}px`)
  across.style.setProperty('--stone-flight-ms', `${flightMs}ms`)
  const stone = document.createElement('div')
  stone.className = 'battle-catapult-stone__stone'
  across.append(stone)
  return across
}

const HIT_LABELS = {
  damaged: 'hit: damaged',
  destroyed: 'hit: destroyed',
  none: 'hit: no damage'
}

const CAUSE_NAMES = { stone: 'Stone', earthquake: 'Earthquake' }

const RUBBLE_PIECES = 6

export function renderWallHit(document, { result, cause = 'stone' }, effectMs) {
  const element = document.createElement('div')
  element.className = `battle-effect battle-wall-hit battle-wall-hit--${result}`
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', `${CAUSE_NAMES[cause]} ${HIT_LABELS[result]}`)
  element.style.setProperty('--battle-effect-ms', `${effectMs}ms`)
  const dust = document.createElement('span')
  dust.className = 'battle-wall-hit__dust'
  element.append(dust)
  if (result === 'destroyed') {
    for (let piece = 0; piece < RUBBLE_PIECES; piece += 1) {
      const rubble = document.createElement('span')
      rubble.className = 'battle-wall-hit__rubble'
      rubble.style.setProperty('--rubble-piece', String(piece))
      element.append(rubble)
    }
  }
  return element
}

const TOWER_LABELS = { standing: '', damaged: 'Damaged ', destroyed: 'Destroyed ' }

// The game has no picture of a damaged tower: only a destroyed one looks different.
export function renderTower(document, { tower, name, stands, state = 'standing' }) {
  const element = document.createElement('div')
  element.dataset.tower = tower
  element.className = `battlefield__tower battlefield__tower--${stands} battlefield__tower--${state}`
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', `${TOWER_LABELS[state]}${name}`)
  if (state !== 'destroyed') {
    const battlements = document.createElement('span')
    battlements.className = 'battlefield__tower-battlements'
    element.append(battlements)
  }
  return element
}

// The arrow points the way it flies and goes straight at its target.
export function renderTowerArrow(document, { name, from, to, flightMs }) {
  const element = document.createElement('div')
  element.className = 'battle-tower-arrow'
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', `${name} arrow`)
  element.style.left = `${from.x}px`
  element.style.top = `${from.y}px`
  element.style.setProperty('--arrow-across', `${to.x - from.x}px`)
  element.style.setProperty('--arrow-down', `${to.y - from.y}px`)
  element.style.setProperty('--arrow-angle', `${Math.atan2(to.y - from.y, to.x - from.x)}rad`)
  element.style.setProperty('--arrow-flight-ms', `${flightMs}ms`)
  const arrow = document.createElement('div')
  arrow.className = 'battle-tower-arrow__arrow'
  element.append(arrow)
  return element
}
