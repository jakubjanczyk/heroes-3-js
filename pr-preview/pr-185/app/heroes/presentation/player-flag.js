// A flag in the player's colour, named "Blue player flag" for the blue player.
export function createPlayerFlag(document, player) {
  const flag = document.createElement('div')
  flag.className = 'owner-flag'
  paintPlayerFlag(flag, player)
  return flag
}

export function paintPlayerFlag(flag, player) {
  flag.dataset.player = player
  flag.setAttribute('role', 'img')
  flag.setAttribute('aria-label', `${player.charAt(0).toUpperCase()}${player.slice(1)} player flag`)
}
