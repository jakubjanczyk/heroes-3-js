import { isDwelling, isMine } from '../../domain/entity-queries.js'
import { DEFAULT_PLAYER } from '../../state/core-slices.js'
import { calendarDateOfTurn } from '../calendar.js'
import {
  flaggedDwellingCountsByCreature,
  guardsOfDwelling,
  weeklyGrowthOfDwelling
} from '../map-dwellings.js'

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

function updateDwelling(dwellings, dwellingId, update) {
  const dwelling = dwellings[dwellingId]
  return dwelling ? { ...dwellings, [dwellingId]: { ...dwelling, ...update(dwelling) } } : dwellings
}

function renewWeeklyGrowth(dwellings, { turnNumber }, { definitions }) {
  if (calendarDateOfTurn(turnNumber).day !== 1) {
    return dwellings
  }

  return Object.fromEntries(
    Object.entries(dwellings).map(([dwellingId, dwelling]) => [
      dwellingId,
      {
        ...dwelling,
        available: weeklyGrowthOfDwelling(dwelling.type, definitions),
        guards: guardsOfDwelling(dwelling.type, definitions)
      }
    ])
  )
}

export const dwellingsSlice = {
  key: 'dwellings',
  initial: ({ scenario, definitions }) =>
    Object.fromEntries(
      (scenario?.entities ?? []).filter(isDwelling).map((dwelling) => [
        dwelling.id,
        {
          type: dwelling.type,
          owner: dwelling.owner ?? null,
          available: weeklyGrowthOfDwelling(dwelling.type, definitions),
          guards: guardsOfDwelling(dwelling.type, definitions)
        }
      ])
    ),
  on: {
    'fact.dwelling.flagged': (dwellings, { entityId, owner = DEFAULT_PLAYER }) =>
      dwellings[entityId]?.owner === owner
        ? dwellings
        : updateDwelling(dwellings, entityId, () => ({ owner })),
    'fact.dwelling.creatures.recruited': (dwellings, { entityId, count }) =>
      updateDwelling(dwellings, entityId, (dwelling) => ({
        available: Math.max(0, dwelling.available - count)
      })),
    'fact.dwelling.guards.changed': (dwellings, { entityId, count }) =>
      updateDwelling(dwellings, entityId, () => ({ guards: count })),
    'fact.turn.ended': renewWeeklyGrowth
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

export function dwellingAvailable(state, dwellingId) {
  return state.dwellings[dwellingId]?.available ?? 0
}

// The guards never fight the player who owns the dwelling.
export function dwellingGuardsAgainst(state, dwellingId, player) {
  const dwelling = state.dwellings[dwellingId]
  return dwelling && dwelling.owner !== player ? (dwelling.guards ?? 0) : 0
}

export function flaggedDwellingsOf(state, player, definitions) {
  return flaggedDwellingCountsByCreature(Object.values(state.dwellings), player, definitions)
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
