import { showInfoBoxView } from './info-box-view.js'

export function renderCapturedMineBox(container, document, { name, income }) {
  const heading = document.createElement('h2')
  heading.className = 'mine-box__name'
  heading.textContent = name

  const list = document.createElement('ul')
  list.className = 'mine-box__income'

  const item = document.createElement('li')
  item.className = 'mine-box__resource'
  item.dataset.resource = income.type

  const picture = document.createElement('span')
  picture.className = 'resource-icon'
  picture.setAttribute('role', 'img')
  picture.setAttribute('aria-label', income.name)

  const amountLabel = document.createElement('span')
  amountLabel.className = 'mine-box__amount'
  amountLabel.textContent = `${income.amount} per day`

  item.append(picture, amountLabel)
  list.append(item)

  showInfoBoxView(container, 'mine-box', heading, list)
}
