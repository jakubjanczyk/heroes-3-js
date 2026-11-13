import { showInfoBoxView } from './info-box-view.js'
import { createPlayerFlag } from './player-flag.js'

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

function renderFlagRow(document, name, players) {
  const row = document.createElement('div')
  row.className = 'kingdom-box__players'

  const label = document.createElement('span')
  label.className = 'kingdom-box__label'
  label.textContent = `${name}:`

  const flags = document.createElement('ul')
  flags.className = 'kingdom-box__flags'
  flags.setAttribute('aria-label', name)
  for (const player of players) {
    const item = document.createElement('li')
    item.append(createPlayerFlag(document, player))
    flags.append(item)
  }

  row.append(label, flags)
  return row
}

export function renderKingdomOverviewBox(container, document, { halls, allies, enemies }) {
  const overview = document.createDocumentFragment()
  overview.append(
    renderHallCounts(document, halls),
    renderFlagRow(document, 'Allies', allies),
    renderFlagRow(document, 'Enemies', enemies)
  )
  showInfoBoxView(container, 'kingdom-box', overview)
}
