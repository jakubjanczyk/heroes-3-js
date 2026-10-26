import { isDwelling, isMine } from '../../domain/entity-queries.js'
import { DEFAULT_PLAYER } from '../../state/core-slices.js'

export const minesSlice = {
  key: 'mines',
  initial: ({ scenario }) =>
    Object.fromEntries(
      (scenario?.entities ?? [])
        .filter(isMine)
        .map((mine) => [mine.id, { type: mine.type, owner: mine.owner ?? null }])
    ),
  on: {
    'fact.mine.captured': (mines, { entityId, owner = DEFAULT_PLAYER }) =>
      mines[entityId] && mines[entityId].owner !== owner
        ? { ...mines, [entityId]: { ...mines[entityId], owner } }
        : mines
  }
}

export const dwellingsSlice = {
  key: 'dwellings',
  initial: ({ scenario }) =>
    Object.fromEntries(
      (scenario?.entities ?? [])
        .filter(isDwelling)
        .map((dwelling) => [dwelling.id, { type: dwelling.type, owner: dwelling.owner ?? null }])
    ),
  on: {
    'fact.dwelling.flagged': (dwellings, { entityId, owner = DEFAULT_PLAYER }) =>
      dwellings[entityId] && dwellings[entityId].owner !== owner
        ? { ...dwellings, [entityId]: { ...dwellings[entityId], owner } }
        : dwellings
  }
}

// How many creatures a monster has left after a battle it won; the others keep the scenario's.
export const monsterCountsSlice = {
  key: 'monsterCounts',
  initial: () => ({}),
  on: {
    'fact.monster.count.changed': (counts, { entityId, count }) => ({
      ...counts,
      [entityId]: count
    })
  }
}

export function mineOwner(state, mineId) {
  return state.mines[mineId]?.owner ?? null
}

export function dwellingOwner(state, dwellingId) {
  return state.dwellings[dwellingId]?.owner ?? null
}

export function dwellingIdsOf(state, player) {
  return Object.keys(state.dwellings).filter(
    (dwellingId) => state.dwellings[dwellingId].owner === player
  )
}

// The owner of a mine or dwelling, the objects that fly a player's flag.
export function flaggedObjectOwner(state, entityId) {
  return mineOwner(state, entityId) ?? dwellingOwner(state, entityId)
}

export function mineIdsOf(state, player) {
  return Object.keys(state.mines).filter((mineId) => state.mines[mineId].owner === player)
}

export function monsterCount(state, entityId) {
  return state.monsterCounts[entityId] ?? null
}
