import { showInfoBoxView } from './info-box-view.js'

function renderHallCounts(document, halls) {
  const list = document.createElement('ul')
  list.className = 'kingdom-box__halls'
  list.setAttribute('aria-label', 'Towns by hall')

  for (const { name, level, count } of halls) {
    const item = document.createElement('li')
    item.className = 'kingdom-box__hall'

    const icon = document.createElement('span')
    icon.className = 'hall-icon'
    icon.dataset.level = String(level)
    icon.setAttribute('role', 'img')
    icon.setAttribute('aria-label', name)
    icon.title = name

    const countLabel = document.createElement('span')
    countLabel.className = 'kingdom-box__count'
    countLabel.textContent = String(count)

    item.append(icon, countLabel)
    list.append(item)
  }
  return list
}

// No other players yet, so both rows stay empty.
function renderFlagRow(document, name) {
  const row = document.createElement('div')
  row.className = 'kingdom-box__players'

  const label = document.createElement('span')
  label.className = 'kingdom-box__label'
  label.textContent = `${name}:`

  const flags = document.createElement('ul')
  flags.className = 'kingdom-box__flags'
  flags.setAttribute('aria-label', name)

  row.append(label, flags)
  return row
}

export function renderKingdomOverviewBox(container, document, { halls }) {
  const overview = document.createDocumentFragment()
  overview.append(
    renderHallCounts(document, halls),
    renderFlagRow(document, 'Allies'),
    renderFlagRow(document, 'Enemies')
  )
  showInfoBoxView(container, 'kingdom-box', overview)
}
