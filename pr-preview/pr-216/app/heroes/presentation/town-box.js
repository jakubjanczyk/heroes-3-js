import { renderArmyStack } from './hero-box.js'
import { showInfoBoxView } from './info-box-view.js'

const NO_FORT = 'No fort'

function showBuilding(icon, { name, level }) {
  icon.setAttribute('aria-label', name)
  icon.title = name
  icon.dataset.level = String(level)
}

function hideEmptyPlace(element) {
  element.removeAttribute('role')
  element.removeAttribute('aria-label')
  element.removeAttribute('title')
  element.setAttribute('aria-hidden', 'true')
  element.classList.remove('hall-icon')
}

// A town that isn't the player's has no `hall` or `goldIncome`: their places stay empty.
export function renderTownBox(container, document, { name, hall, fort, goldIncome, garrison }) {
  const box = document.getElementById('town-box-template').content.cloneNode(true)

  box.querySelector('.town-box__name').textContent = name
  const hallIcon = box.querySelector('.town-box__hall')
  const income = box.querySelector('.town-box__income')
  if (hall) {
    showBuilding(hallIcon, hall)
    income.textContent = String(goldIncome)
  } else {
    hideEmptyPlace(hallIcon)
    hideEmptyPlace(income)
  }
  showBuilding(box.querySelector('.town-box__fort'), { ...fort, name: fort.name ?? NO_FORT })

  const slots = box.querySelectorAll('.army-slot')
  garrison.forEach((stack, index) => {
    if (stack) {
      slots[index].append(renderArmyStack(document, stack))
    }
  })

  showInfoBoxView(container, 'town-box', box)
}
