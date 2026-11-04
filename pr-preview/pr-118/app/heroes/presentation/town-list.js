// Each town is shown by its initial until there are town pictures.
export function renderTownList(list, document, { towns, selectedTownId }) {
  list.replaceChildren(
    ...towns.map(({ entityId, name }) => {
      const item = document.createElement('li')
      item.className = 'town-list__item'

      const town = document.createElement('button')
      town.type = 'button'
      town.className = 'town-list__town'
      town.dataset.entityId = entityId
      town.setAttribute('aria-label', name)
      town.setAttribute('aria-pressed', String(entityId === selectedTownId))
      town.title = name
      town.textContent = name.charAt(0)

      item.append(town)
      return item
    })
  )
}

// Moves the selection frame without rebuilding the list, so a double click lands on the same button.
export function markSelectedTown(list, selectedTownId) {
  for (const town of list.querySelectorAll('.town-list__town')) {
    town.setAttribute('aria-pressed', String(town.dataset.entityId === selectedTownId))
  }
}
