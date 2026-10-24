export function renderFoundResourcesBox(container, document, resources) {
  const list = document.createElement('ul')
  list.className = 'found-box__resources'

  for (const { type, name, amount } of resources) {
    const item = document.createElement('li')
    item.className = 'found-box__resource'
    item.dataset.resource = type

    const picture = document.createElement('span')
    picture.className = 'resource-icon'
    picture.setAttribute('role', 'img')
    picture.setAttribute('aria-label', name)

    const amountLabel = document.createElement('span')
    amountLabel.className = 'found-box__amount'
    amountLabel.textContent = String(amount)

    item.append(picture, amountLabel)
    list.append(item)
  }

  container.classList.remove('hero-box', 'town-box')
  container.classList.add('found-box')
  container.replaceChildren(list)
}
