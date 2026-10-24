import { showInfoBoxView } from './info-box-view.js'

// Fills a container with the Heroes 3 hero box from `#hero-box-template` in index.html: the
// portrait (the hero's initial until there are portraits), the name, the four primary skills
// (an icon each with the value under it, as in the game) and the seven army slots.
export function renderHeroBox(container, document, { name, skills, army }) {
  const box = document.getElementById('hero-box-template').content.cloneNode(true)

  const portrait = box.querySelector('.hero-box__portrait')
  portrait.setAttribute('aria-label', name)
  portrait.textContent = name.charAt(0)

  box.querySelector('.hero-box__name').textContent = name

  for (const { key, value } of skills) {
    box.querySelector(`[data-skill="${key}"] .primary-skills__value`).textContent = String(value)
  }

  const slots = box.querySelectorAll('.army-slot')
  army.forEach((stack, index) => {
    if (stack) {
      slots[index].append(renderArmyStack(document, stack))
    }
  })

  showInfoBoxView(container, 'hero-box', box)
}

// No creature portraits yet: the creature is pictured as monsters are drawn on the map.
export function renderArmyStack(document, { name, count }) {
  const stack = document.createDocumentFragment()

  const picture = document.createElement('div')
  picture.className = 'army-slot__creature entity--monster'
  picture.setAttribute('role', 'img')
  picture.setAttribute('aria-label', name)
  picture.title = name

  const countLabel = document.createElement('span')
  countLabel.className = 'army-slot__count'
  countLabel.textContent = String(count)

  stack.append(picture, countLabel)
  return stack
}
