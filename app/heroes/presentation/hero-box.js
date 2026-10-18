import { createPrimarySkillsList } from './primary-skills-list.js'

const ARMY_SLOT_COUNT = 7

// The Heroes 3 hero box, shared by the info box and the hero's right-click popup: the portrait
// (the hero's initial until there are portraits), the name over the primary skills, and the
// seven army slots.
export function renderHeroBox(container, document, { name, skills }) {
  const portrait = document.createElement('div')
  portrait.className = 'hero-box__portrait'
  portrait.setAttribute('role', 'img')
  portrait.setAttribute('aria-label', name)
  portrait.textContent = name.charAt(0)

  const heading = document.createElement('h2')
  heading.className = 'hero-box__name'
  heading.textContent = name

  const skillsList = createPrimarySkillsList(document, skills)
  skillsList.classList.add('hero-box__skills')

  const army = document.createElement('ul')
  army.className = 'hero-box__army'
  army.setAttribute('aria-label', 'Army')
  for (let slot = 0; slot < ARMY_SLOT_COUNT; slot += 1) {
    const armySlot = document.createElement('li')
    armySlot.className = 'army-slot'
    army.appendChild(armySlot)
  }

  container.classList.add('hero-box')
  container.replaceChildren(portrait, heading, skillsList, army)
}
