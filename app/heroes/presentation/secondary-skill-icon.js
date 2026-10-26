function initialsOf(name) {
  const words = name.split(' ')
  return words.length > 1 ? words.map((word) => word.charAt(0)).join('') : name.slice(0, 2)
}

// Until there are skill pictures, the skill's initials stand in. They are drawn from
// `data-initials` by the stylesheet, so they aren't part of the text read out with the slot.
export function renderSecondarySkillIcon(document, { name }) {
  const icon = document.createElement('span')
  icon.className = 'secondary-skill-icon'
  icon.dataset.initials = initialsOf(name)
  return icon
}

export function secondarySkillStatusText({ title }) {
  return `View ${title} Info`
}
