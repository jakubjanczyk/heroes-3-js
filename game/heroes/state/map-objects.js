import { isDwelling, isMine } from '../../domain/entity-queries.js'
import { DEFAULT_PLAYER } from '../../state/core-slices.js'
import { calendarDateOfTurn } from '../calendar.js'
import {
  flaggedDwellingCountsByCreature,
  guardsOfDwelling,
  weeklyGrowthOfDwelling
} from '../map-dwellings.js'
import {
  isVisitableObject,
  rollsPer,
  scenarioValues,
  visitableDefinition
} from '../visitable-objects/definitions.js'

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

function forgetWeeklyVisits(objects, { turnNumber }, { definitions }) {
  if (calendarDateOfTurn(turnNumber).day !== 1) {
    return objects
  }

  return Object.fromEntries(
    Object.entries(objects).map(([entityId, object]) => {
      const weekly = rollsPer(visitableDefinition(definitions, object), 'week').map(
        ([name]) => name
      )
      const values = Object.fromEntries(
        Object.entries(object.values).filter(([name]) => !weekly.includes(name))
      )
      return [entityId, { ...object, values, visitedThisWeek: false }]
    })
  )
}

function updateObject(objects, entityId, update) {
  const object = objects[entityId]
  return object ? { ...objects, [entityId]: { ...object, ...update(object) } } : objects
}

// Each bonus object and resource generator: the values it rolled (a Tree of Knowledge's price,
// a Witch Hut's skill, this week's luck of a Fountain of Fortune), the players whose heroes have
// been inside and whether any hero has this week.
export const visitableObjectsSlice = {
  key: 'visitableObjects',
  initial: ({ scenario, definitions }) =>
    Object.fromEntries(
      (scenario?.entities ?? []).filter(isVisitableObject).map((entity) => [
        entity.id,
        {
          kind: entity.kind,
          type: entity.type,
          values: scenarioValues(definitions, entity),
          visitedBy: [],
          visitedThisWeek: false
        }
      ])
    ),
  on: {
    'fact.mapObject.values.rolled': (objects, { values }) =>
      Object.entries(values).reduce(
        (updated, [entityId, rolled]) =>
          updateObject(updated, entityId, (object) => ({
            values: { ...rolled, ...object.values }
          })),
        objects
      ),
    'fact.mapObject.visited': (objects, { entityId, player = DEFAULT_PLAYER }) =>
      updateObject(objects, entityId, ({ visitedBy }) => ({
        visitedBy: visitedBy.includes(player) ? visitedBy : [...visitedBy, player],
        visitedThisWeek: true
      })),
    'fact.turn.ended': forgetWeeklyVisits
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

export function visitableValues(state, entityId) {
  return state.visitableObjects?.[entityId]?.values ?? {}
}

export function wasVisitedThisWeek(state, entityId) {
  return state.visitableObjects?.[entityId]?.visitedThisWeek ?? false
}

export function hasBeenInside(state, entityId, player) {
  return state.visitableObjects?.[entityId]?.visitedBy.includes(player) ?? false
}

export function monsterCount(state, entityId) {
  return state.monsterCounts[entityId] ?? null
}
