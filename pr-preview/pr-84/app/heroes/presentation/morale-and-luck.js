const SVG_NS = 'http://www.w3.org/2000/svg'

// Stand-ins until there are pictures: a banner for morale, a clover for luck.
const ICON_PATHS = Object.freeze({
  morale: 'M6 2v20M6 3h13l-3.5 4.5L19 12H6',
  luck: 'M12 12a4 4 0 1 1 0-8 4 4 0 1 1 0 8zm0 0a4 4 0 1 1 8 0 4 4 0 1 1-8 0zm0 0a4 4 0 1 1 0 8 4 4 0 1 1 0-8zm0 0a4 4 0 1 1-8 0 4 4 0 1 1 8 0zm0 0l2 10'
})

const NAMES = Object.freeze({ morale: 'Morale', luck: 'Luck' })

function renderIcon(document, kind) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('class', 'morale-luck__icon')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', ICON_PATHS[kind])
  svg.append(path)
  return svg
}

// Fills a frame with the icon and the value under it, named "Morale" or "Luck" for screen readers.
export function showMoraleOrLuck(frame, document, kind, { state, title, valueText }) {
  frame.setAttribute('role', 'group')
  frame.setAttribute('aria-label', NAMES[kind])
  frame.removeAttribute('aria-hidden')
  frame.classList.add('morale-luck')
  frame.dataset.moraleLuck = kind
  frame.dataset.state = state
  frame.dataset.status = title

  const value = document.createElement('span')
  value.className = 'morale-luck__value'
  value.textContent = valueText
  frame.replaceChildren(renderIcon(document, kind), value)
}

export function renderMoraleOrLuckPopup(document, { title, description }) {
  const popup = document.createElement('div')
  popup.className = 'info-popup info-popup--morale-luck message-box'
  popup.setAttribute('role', 'tooltip')
  const heading = document.createElement('h2')
  heading.className = 'info-popup__title'
  heading.textContent = title
  const text = document.createElement('p')
  text.className = 'info-popup__line'
  text.textContent = description
  popup.append(heading, text)
  return popup
}
