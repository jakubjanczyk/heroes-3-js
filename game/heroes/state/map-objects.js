import {
  isBonusObject,
  isDwelling,
  isMine,
  isResourceGenerator
} from '../../domain/entity-queries.js'
import { DEFAULT_PLAYER } from '../../state/core-slices.js'
import { bonusObjectTaughtSkill } from '../bonus-objects.js'
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

function renewWeeklyVisits(generators, { turnNumber }) {
  if (calendarDateOfTurn(turnNumber).day !== 1) {
    return generators
  }

  return Object.fromEntries(
    Object.entries(generators).map(([generatorId, generator]) => [
      generatorId,
      { ...generator, visited: false }
    ])
  )
}

// Each generator gives once a week, to whichever hero enters it first.
export const resourceGeneratorsSlice = {
  key: 'resourceGenerators',
  initial: ({ scenario }) =>
    Object.fromEntries(
      (scenario?.entities ?? [])
        .filter(isResourceGenerator)
        .map((generator) => [generator.id, { type: generator.type, visited: false }])
    ),
  on: {
    'fact.resourceGenerator.visited': (generators, { entityId }) =>
      generators[entityId]
        ? { ...generators, [entityId]: { ...generators[entityId], visited: true } }
        : generators,
    'fact.turn.ended': renewWeeklyVisits
  }
}

// What each Tree of Knowledge asks for a level: set by the scenario, or rolled once per game.
export const bonusObjectPricesSlice = {
  key: 'bonusObjectPrices',
  initial: ({ scenario }) =>
    Object.fromEntries(
      (scenario?.entities ?? [])
        .filter((entity) => isBonusObject(entity) && entity.price)
        .map((bonusObject) => [bonusObject.id, bonusObject.price])
    ),
  on: {
    'fact.bonusObject.prices.rolled': (prices, { prices: rolled }) => ({ ...rolled, ...prices })
  }
}

function updateWitchHut(huts, hutId, update) {
  const hut = huts[hutId]
  return hut ? { ...huts, [hutId]: { ...hut, ...update(hut) } } : huts
}

// The skill each Witch Hut teaches, set by the scenario or rolled once per game, and the players
// whose heroes have been inside and so know it.
export const witchHutsSlice = {
  key: 'witchHuts',
  initial: ({ scenario, definitions }) =>
    Object.fromEntries(
      (scenario?.entities ?? [])
        .filter(
          (entity) => isBonusObject(entity) && bonusObjectTaughtSkill(definitions, entity.type)
        )
        .map((hut) => [hut.id, { skill: hut.skill ?? null, visitedBy: [] }])
    ),
  on: {
    'fact.witchHut.skills.rolled': (huts, { skills }) =>
      Object.entries(skills).reduce(
        (updated, [hutId, skill]) =>
          updateWitchHut(updated, hutId, (hut) => ({ skill: hut.skill ?? skill })),
        huts
      ),
    'fact.witchHut.visited': (huts, { entityId, player = DEFAULT_PLAYER }) =>
      updateWitchHut(huts, entityId, ({ visitedBy }) => ({
        visitedBy: visitedBy.includes(player) ? visitedBy : [...visitedBy, player]
      }))
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

export function isResourceGeneratorVisited(state, generatorId) {
  return state.resourceGenerators[generatorId]?.visited ?? false
}

export function bonusObjectPrice(state, entityId) {
  return state.bonusObjectPrices[entityId] ?? null
}

export function witchHutSkill(state, entityId) {
  return state.witchHuts[entityId]?.skill ?? null
}

export function monsterCount(state, entityId) {
  return state.monsterCounts[entityId] ?? null
}
