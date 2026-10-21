import { renderArmyStack } from './hero-box.js'

// Fills a container with the Heroes 3 town box from `#town-box-template` in index.html: the
// town's name and the seven garrison slots.
export function renderTownBox(container, document, { name, garrison }) {
  const box = document.getElementById('town-box-template').content.cloneNode(true)

  box.querySelector('.town-box__name').textContent = name

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
