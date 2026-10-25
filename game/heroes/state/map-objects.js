import { isMine } from '../../domain/entity-queries.js'
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

export function mineIdsOf(state, player) {
  return Object.keys(state.mines).filter((mineId) => state.mines[mineId].owner === player)
}

export function monsterCount(state, entityId) {
  return state.monsterCounts[entityId] ?? null
}
