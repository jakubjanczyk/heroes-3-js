export function renderResourceAmounts(document, resources) {
  const list = document.createElement('ul')
  list.className = 'resource-amounts'

  for (const { type, name, amountText } of resources) {
    const item = document.createElement('li')
    item.className = 'resource-amounts__item'
    item.dataset.resource = type

    const picture = document.createElement('span')
    picture.className = 'resource-icon'
    picture.setAttribute('role', 'img')
    picture.setAttribute('aria-label', name)

    const amountLabel = document.createElement('span')
    amountLabel.className = 'resource-amounts__amount'
    amountLabel.textContent = amountText

    item.append(picture, amountLabel)
    list.append(item)
  }

  return list
}
