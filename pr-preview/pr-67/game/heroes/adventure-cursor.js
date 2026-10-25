// The Heroes 3 adventure map cursors.
export const ADVENTURE_CURSOR = Object.freeze({
  ARROW: 'arrow',
  HERO: 'hero',
  CASTLE: 'castle',
  MOVE: 'move',
  ATTACK: 'attack',
  VISIT: 'visit',
  EXCHANGE: 'exchange'
})

const COMPASS_ROWS = [
  ['nw', 'n', 'ne'],
  ['w', null, 'e'],
  ['sw', 's', 'se']
]

// The arrow shown while the map scrolls from its edge, pointing the way it scrolls
// ({ x, y }, each -1, 0 or 1; y -1 is up): 'scroll-n', 'scroll-ne', ... 'scroll-nw'.
export function getScrollCursor(direction) {
  return `scroll-${COMPASS_ROWS[direction.y + 1][direction.x + 1]}`
}

// Cursors from the 4th day on all show 4, as in Heroes 3.
const LAST_NUMBERED_DAY = 4

function cursorActionFor(entity, attacks) {
  if (attacks) {
    return ADVENTURE_CURSOR.ATTACK
  }
  if (!entity) {
    return ADVENTURE_CURSOR.MOVE
  }

  if (entity.kind === 'HERO') {
    return ADVENTURE_CURSOR.EXCHANGE
  }
  return entity.kind === 'MONSTER' ? ADVENTURE_CURSOR.ATTACK : ADVENTURE_CURSOR.VISIT
}

// The cursor over a map tile: the helmet over the selected hero; else, when the hero has a route
// there, the swords for a monster or when a battle on the way (`attacks`) stops it, the two
// heroes trading for another of the player's heroes, the rearing horse for anything else it can
// visit and the horse for an empty tile, numbered with the day it gets there, or to the battle,
// when that is not today; else the helmet over another hero and the arrow elsewhere.
export function getAdventureCursor({
  entity,
  travelDays,
  attacks = false,
  isSelectedHero = false
}) {
  if (entity?.kind === 'HERO' && (isSelectedHero || !travelDays)) {
    return ADVENTURE_CURSOR.HERO
  }
  if (!travelDays) {
    return ADVENTURE_CURSOR.ARROW
  }

  const action = cursorActionFor(entity, attacks)
  return travelDays === 1 ? action : `${action}-${Math.min(travelDays, LAST_NUMBERED_DAY)}`
}
