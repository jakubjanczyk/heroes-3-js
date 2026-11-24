import { showInfoBoxView } from './info-box-view.js'
import { createPlayerFlag } from './player-flag.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

function svgElement(document, name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name)
  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, String(value))
  }
  return element
}

// A stand-in for the game's hourglass: the sand in the top bulb sinks while a stream runs down
// into the bottom one, over and over.
function renderHourglass(document) {
  const hourglass = svgElement(document, 'svg', {
    class: 'turn-box__hourglass',
    viewBox: '0 0 32 48',
    role: 'img',
    'aria-label': 'Hourglass'
  })
  const glass =
    'M6 4 H26 C26 16 18 20 18 24 C18 28 26 32 26 44 H6 C6 32 14 28 14 24 C14 20 6 16 6 4 Z'
  hourglass.append(
    svgElement(document, 'path', { class: 'turn-box__glass', d: glass }),
    svgElement(document, 'path', {
      class: 'turn-box__sand-top',
      d: 'M8 8 H24 C23 15 17 19 16 23 C15 19 9 15 8 8 Z'
    }),
    svgElement(document, 'rect', {
      class: 'turn-box__stream',
      x: 15.5,
      y: 23,
      width: 1,
      height: 18
    }),
    svgElement(document, 'path', {
      class: 'turn-box__sand-bottom',
      d: 'M8 42 C10 36 14 34 16 33 C18 34 22 36 24 42 Z'
    }),
    svgElement(document, 'rect', {
      class: 'turn-box__frame',
      x: 3,
      y: 1,
      width: 26,
      height: 4,
      rx: 1
    }),
    svgElement(document, 'rect', {
      class: 'turn-box__frame',
      x: 3,
      y: 43,
      width: 26,
      height: 4,
      rx: 1
    })
  )
  return hourglass
}

export function renderTurnBox(container, document, { player }) {
  const flag = createPlayerFlag(document, player)
  flag.classList.add('turn-box__crest')
  showInfoBoxView(container, 'turn-box', flag, renderHourglass(document))
}

export function turnBoxLabel(player) {
  return `${player.charAt(0).toUpperCase()}${player.slice(1)} player's turn`
}
