import { renderArmyStack } from './hero-box.js'

const NO_FORT = 'No fort'

function showBuilding(icon, { name, level }) {
  icon.setAttribute('aria-label', name)
  icon.title = name
  icon.dataset.level = String(level)
}

// Fills a container with the Heroes 3 town box from `#town-box-template` in index.html: the
// town's name, its hall and fort ({ name, level }, a fort of level 0 when it has none), its daily
// gold and the seven garrison slots.
export function renderTownBox(container, document, { name, hall, fort, goldIncome, garrison }) {
  const box = document.getElementById('town-box-template').content.cloneNode(true)

  box.querySelector('.town-box__name').textContent = name
  showBuilding(box.querySelector('.town-box__hall'), hall)
  showBuilding(box.querySelector('.town-box__fort'), { ...fort, name: fort.name ?? NO_FORT })
  box.querySelector('.town-box__income').textContent = String(goldIncome)

  const slots = box.querySelectorAll('.army-slot')
  garrison.forEach((stack, index) => {
    if (stack) {
      slots[index].append(renderArmyStack(document, stack))
    }
  })

  container.classList.remove('hero-box')
  container.classList.add('town-box')
  container.replaceChildren(box)
}
