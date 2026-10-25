export function activePlayer(state) {
  return state.players.activePlayer
}

// Whose screen this is. While only one player plays, that is the player whose turn it is.
export function viewingPlayer(state) {
  return activePlayer(state)
}

export function playerColors(state) {
  return state.players.colors
}

export function heroOwner(state, heroId) {
  return state.heroes[heroId]?.owner ?? null
}

export function heroTile(state, heroId) {
  return state.heroes[heroId]?.tile ?? null
}

export function heroMovementPoints(state, heroId) {
  return state.heroes[heroId]?.movementPoints ?? null
}

export function heroIdAt(state, tile) {
  return (
    Object.keys(state.heroes).find((heroId) => {
      const hero = state.heroes[heroId]
      return !hero.removed && hero.tile?.x === tile?.x && hero.tile?.y === tile?.y
    }) ?? null
  )
}

export function heroIdsOf(state, player) {
  return Object.keys(state.heroes).filter(
    (heroId) => state.heroes[heroId].owner === player && !state.heroes[heroId].removed
  )
}

// The hero the viewing player has selected until they select another: their first one.
export function firstHeroIdOf(state, player) {
  return Object.keys(state.heroes).find((heroId) => state.heroes[heroId].owner === player) ?? null
}

export function isRemoved(state, entityId) {
  return state.mapObjects.removedEntityIds.includes(entityId)
}

export function turnNumber(state) {
  return state.date.turnNumber
}
