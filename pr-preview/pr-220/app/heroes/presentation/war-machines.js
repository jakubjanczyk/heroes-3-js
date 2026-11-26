const SVG = 'http://www.w3.org/2000/svg'

const WHEELS = [
  ['circle', { class: 'battle-war-machine__wheel', cx: '26', cy: '54', r: '9' }],
  ['circle', { class: 'battle-war-machine__wheel', cx: '74', cy: '54', r: '9' }]
]

// The catapult keeps its own class: its stone flies from it.
const PICTURES = {
  CATAPULT: {
    className: 'battle-catapult',
    shapes: [
      ['path', { class: 'battle-war-machine__wood', d: 'M14 50 L86 50 L70 34 L30 34 Z' }],
      ['path', { class: 'battle-war-machine__wood', d: 'M44 34 L52 14 L60 34' }],
      ['path', { class: 'battle-war-machine__arm', d: 'M30 44 L78 8' }],
      ['circle', { class: 'battle-war-machine__iron', cx: '80', cy: '7', r: '6' }],
      ...WHEELS
    ]
  },
  BALLISTA: {
    className: 'battle-war-machine battle-war-machine--ballista',
    shapes: [
      ['path', { class: 'battle-war-machine__wood', d: 'M16 50 L84 50 M32 50 L50 30 L68 50' }],
      ['path', { class: 'battle-war-machine__wood', d: 'M20 30 L76 30' }],
      ['path', { class: 'battle-war-machine__arm', d: 'M66 8 Q84 30 66 52' }],
      ['path', { class: 'battle-war-machine__string', d: 'M66 8 L40 30 L66 52' }],
      ['path', { class: 'battle-war-machine__bolt', d: 'M40 30 L96 30' }],
      ...WHEELS
    ]
  },
  AMMO_CART: {
    className: 'battle-war-machine battle-war-machine--ammo-cart',
    shapes: [
      ['circle', { class: 'battle-war-machine__iron', cx: '36', cy: '22', r: '6' }],
      ['circle', { class: 'battle-war-machine__iron', cx: '50', cy: '22', r: '6' }],
      ['circle', { class: 'battle-war-machine__iron', cx: '64', cy: '22', r: '6' }],
      ['path', { class: 'battle-war-machine__crate', d: 'M18 26 L82 26 L82 48 L18 48 Z' }],
      ['path', { class: 'battle-war-machine__wood', d: 'M82 38 L98 30' }],
      ...WHEELS
    ]
  },
  FIRST_AID_TENT: {
    className: 'battle-war-machine battle-war-machine--first-aid-tent',
    shapes: [
      ['path', { class: 'battle-war-machine__wood', d: 'M50 12 L50 -4' }],
      ['path', { class: 'battle-war-machine__canvas', d: 'M10 60 L50 12 L90 60 Z' }],
      ['path', { class: 'battle-war-machine__doorway', d: 'M42 60 L50 38 L58 60 Z' }],
      ['path', { class: 'battle-war-machine__cross', d: 'M50 -4 L50 8 M44 2 L56 2' }]
    ]
  }
}

function drawShapes(document, shapes) {
  const picture = document.createElementNS(SVG, 'svg')
  picture.setAttribute('viewBox', '0 0 100 66')
  picture.setAttribute('aria-hidden', 'true')
  for (const [tag, attributes] of shapes) {
    const shape = document.createElementNS(SVG, tag)
    for (const [name, value] of Object.entries(attributes)) {
      shape.setAttribute(name, value)
    }
    picture.append(shape)
  }
  return picture
}

// A war machine with no picture of its own is drawn with its name only, as creatures are.
export function renderWarMachinePicture(document, creature) {
  const picture = PICTURES[creature]
  if (!picture) {
    return null
  }
  const element = document.createElement('div')
  element.className = picture.className
  element.setAttribute('aria-hidden', 'true')
  element.append(drawShapes(document, picture.shapes))
  return element
}
