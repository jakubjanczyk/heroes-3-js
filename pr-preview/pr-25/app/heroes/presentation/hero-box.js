// Fills a container with the Heroes 3 hero box from `#hero-box-template` in index.html: the
// portrait (the hero's initial until there are portraits), the name, the four primary skills
// (an icon each with the value under it, as in the game) and the seven army slots.
export function renderHeroBox(container, document, { name, skills }) {
  const box = document.getElementById('hero-box-template').content.cloneNode(true)

  const portrait = box.querySelector('.hero-box__portrait')
  portrait.setAttribute('aria-label', name)
  portrait.textContent = name.charAt(0)

  box.querySelector('.hero-box__name').textContent = name

  for (const { key, value } of skills) {
    box.querySelector(`[data-skill="${key}"] .primary-skills__value`).textContent = String(value)
  }

  container.classList.add('hero-box')
  container.replaceChildren(box)
}
