// CSS-only stand-ins for the Heroes 3 icons: crossed swords, shield, spell book and books.
const ICON_PATHS = {
  attack: 'M4 4l16 16M20 4L4 20M3 15l6 6M15 21l6-6',
  defense: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  power: 'M2 5c3-1 7-1 10 1 3-2 7-2 10-1v14c-3-1-7-1-10 1-3-2-7-2-10-1zM12 6v14',
  knowledge: 'M4 3h4v18H4zM10 3h4v18h-4zM16 4l3.5-1 2.5 17-3.5 1z'
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

// The four primary skills as Heroes 3 shows them: an icon each with the value under it and no
// text label. Screen readers get the skill's name from the icon, the mouse from a tooltip.
export function createPrimarySkillsList(document, skills) {
  const list = document.createElement('ul')
  list.className = 'primary-skills'
  list.setAttribute('aria-label', 'Primary skills')

  for (const { key, name, value } of skills) {
    const item = document.createElement('li')
    item.className = 'primary-skills__skill'
    item.title = name

    const icon = document.createElementNS(SVG_NAMESPACE, 'svg')
    icon.setAttribute('class', `primary-skills__icon primary-skills__icon--${key}`)
    icon.setAttribute('viewBox', '0 0 24 24')
    icon.setAttribute('role', 'img')
    icon.setAttribute('aria-label', name)
    const path = document.createElementNS(SVG_NAMESPACE, 'path')
    path.setAttribute('d', ICON_PATHS[key])
    icon.appendChild(path)

    const valueBox = document.createElement('span')
    valueBox.className = 'primary-skills__value'
    valueBox.textContent = String(value)

    item.append(icon, valueBox)
    list.appendChild(item)
  }

  return list
}
