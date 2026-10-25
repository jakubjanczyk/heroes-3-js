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

// A hero as the map knows them, also one who came onto the map during play.
export function heroEntity(state, heroId) {
  const hero = state.heroes[heroId]
  return hero ? { id: heroId, kind: 'HERO', type: 'HERO', tile: hero.tile } : null
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

export function firstHeroIdOf(state, player) {
  return Object.keys(state.heroes).find((heroId) => state.heroes[heroId].owner === player) ?? null
}

// A player's first hero until they select another, and again on each new day.
export function selectedHeroIdOf(state, player) {
  const heroId = state.players.selectedHeroIds?.[player]
  return heroId && !state.heroes[heroId]?.removed ? heroId : (heroIdsOf(state, player)[0] ?? null)
}

export function isRemoved(state, entityId) {
  return state.mapObjects.removedEntityIds.includes(entityId)
}

export function turnNumber(state) {
  return state.date.turnNumber
}

// A game without fog of war has every tile explored.
export function isTileExplored(state, player, tile) {
  const fog = state.fog
  if (!fog?.enabled) {
    return true
  }

  return fog.explored[player]?.[tile.y * fog.width + tile.x] === 1
}

// The tiles explored since `before`, an earlier state.
export function tilesExploredSince(before, state, player) {
  const fog = state.fog
  const previous = before?.fog?.explored[player]
  const explored = fog?.explored[player]
  if (!fog?.enabled || !explored || explored === previous) {
    return []
  }

  const tiles = []
  for (let index = 0; index < explored.length; index += 1) {
    if (explored[index] === 1 && previous?.[index] !== 1) {
      tiles.push({ x: index % fog.width, y: Math.floor(index / fog.width) })
    }
  }
  return tiles
}
