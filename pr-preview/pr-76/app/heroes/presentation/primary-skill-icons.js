const PRIMARY_SKILL_ICON_PATHS = Object.freeze({
  attack: 'M4 4l16 16M20 4L4 20M3 15l6 6M15 21l6-6',
  defense: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  power: 'M2 5c3-1 7-1 10 1 3-2 7-2 10-1v14c-3-1-7-1-10 1-3-2-7-2-10-1zM12 6v14',
  knowledge: 'M4 3h4v18H4zM10 3h4v18h-4zM16 4l3.5-1 2.5 17-3.5 1z'
})

export function primarySkillPicture(key, name) {
  return { label: name, viewBox: '0 0 24 24', path: PRIMARY_SKILL_ICON_PATHS[key] }
}
