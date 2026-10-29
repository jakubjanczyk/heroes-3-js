const SVG_NS = 'http://www.w3.org/2000/svg'

// Stand-ins until there are pictures: a banner for morale, a clover for luck.
const ICON_PATHS = Object.freeze({
  morale: 'M6 2v20M6 3h13l-3.5 4.5L19 12H6',
  luck: 'M12 12a4 4 0 1 1 0-8 4 4 0 1 1 0 8zm0 0a4 4 0 1 1 8 0 4 4 0 1 1-8 0zm0 0a4 4 0 1 1 0 8 4 4 0 1 1 0-8zm0 0a4 4 0 1 1-8 0 4 4 0 1 1 8 0zm0 0l2 10'
})

const NAMES = Object.freeze({ morale: 'Morale', luck: 'Luck' })

// The icon as an image URL, for pictures drawn as a background, such as a message's rewards.
export function moraleOrLuckPictureUrl(kind) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f0cf6c" ' +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_PATHS[kind]}"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function renderMoraleOrLuckIcon(document, kind) {
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
  frame.replaceChildren(renderMoraleOrLuckIcon(document, kind), value)
}

function paragraph(document, className, text) {
  const line = document.createElement('p')
  line.className = className
  line.textContent = text
  return line
}

export function renderMoraleOrLuckPopup(
  document,
  { title, description, modifiersHeading, modifiers }
) {
  const popup = document.createElement('div')
  popup.className = 'info-popup info-popup--morale-luck message-box'
  popup.setAttribute('role', 'tooltip')
  const heading = document.createElement('h2')
  heading.className = 'info-popup__title'
  heading.textContent = title
  popup.append(
    heading,
    paragraph(document, 'info-popup__line', description),
    paragraph(document, 'info-popup__line info-popup__line--heading', modifiersHeading),
    ...(modifiers.length > 0 ? modifiers : ['None']).map((modifier) =>
      paragraph(document, 'info-popup__line', modifier)
    )
  )
  return popup
}
