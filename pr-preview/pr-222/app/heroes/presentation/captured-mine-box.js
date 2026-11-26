import { showInfoBoxView } from './info-box-view.js'
import { renderResourceAmounts } from './resource-amounts.js'

export function renderCapturedMineBox(container, document, { name, income }) {
  const heading = document.createElement('h2')
  heading.className = 'mine-box__name'
  heading.textContent = name

  const list = renderResourceAmounts(document, [
    { type: income.type, name: income.name, amountText: `${income.amount} per day` }
  ])

  showInfoBoxView(container, 'mine-box', heading, list)
}
