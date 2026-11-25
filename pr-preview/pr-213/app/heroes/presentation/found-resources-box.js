import { showInfoBoxView } from './info-box-view.js'
import { renderResourceAmounts } from './resource-amounts.js'

export function renderFoundResourcesBox(container, document, resources) {
  const list = renderResourceAmounts(
    document,
    resources.map(({ type, name, amount }) => ({ type, name, amountText: String(amount) }))
  )

  showInfoBoxView(container, 'found-box', list)
}
