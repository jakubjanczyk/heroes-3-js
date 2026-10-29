import { isHero } from '../domain/entity-queries.js'
import {
  normalizeMovementPoints,
  toMovementPointsOrNull
} from '../domain/value-objects/movement-points.js'

// The only player so far. Facts saved before they named a hero's or a town's owner were all red's.
export const DEFAULT_PLAYER = 'red'

const DEFAULT_MAX_MOVEMENT_POINTS = 1500

const entitiesOf = (scenario) => scenario?.entities ?? []

function maxMovementPointsOf(config) {
  return normalizeMovementPoints(config?.maxMovementPoints, {
    min: 1,
    fallback: DEFAULT_MAX_MOVEMENT_POINTS
  })
}

// Facts saved before they named their hero were all about the scenario's only hero.
export function updateHero(update) {
  return (heroes, detail) => {
    const heroId = detail.heroId ?? Object.keys(heroes)[0]
    const hero = heroes[heroId]
    return hero ? { ...heroes, [heroId]: { ...hero, ...update(hero, detail) } } : heroes
  }
}

function changeMovementPoints(hero, { value }) {
  const remaining = toMovementPointsOrNull(value)
  if (remaining === null) {
    return {}
  }

  const { max } = hero.movementPoints
  return { movementPoints: { value: Math.max(0, remaining), max } }
}

const playersSlice = {
  key: 'players',
  initial: ({ scenario }) => ({
    colors: [
      ...new Set([
        DEFAULT_PLAYER,
        ...entitiesOf(scenario)
          .map((entity) => entity.owner)
          .filter(Boolean)
      ])
    ],
    activePlayer: DEFAULT_PLAYER,
    selectedHeroIds: {}
  }),
  on: {
    'fact.hero.selected': (players, { heroId, player = DEFAULT_PLAYER }) => ({
      ...players,
      selectedHeroIds: { ...players.selectedHeroIds, [player]: heroId }
    }),
    'fact.turn.ended': (players) => ({ ...players, selectedHeroIds: {} })
  }
}

const heroesSlice = {
  key: 'heroes',
  initial: ({ scenario, config }) => {
    const max = maxMovementPointsOf(config)
    return Object.fromEntries(
      entitiesOf(scenario)
        .filter(isHero)
        .map((hero) => [
          hero.id,
          {
            owner: hero.owner ?? DEFAULT_PLAYER,
            tile: hero.tile,
            removed: false,
            movementPoints: { value: max, max }
          }
        ])
    )
  },
  on: {
    'fact.hero.moved': updateHero((_hero, { to }) => ({ tile: to })),
    'fact.hero.movementPoints.changed': updateHero(changeMovementPoints),
    'fact.hero.hired': (heroes, { heroId, player, tile }, { config }) => {
      const max = maxMovementPointsOf(config)
      return {
        ...heroes,
        [heroId]: { owner: player, tile, removed: false, movementPoints: { value: max, max } }
      }
    },
    'fact.entity.removed': (heroes, { entityId }) =>
      heroes[entityId] ? { ...heroes, [entityId]: { ...heroes[entityId], removed: true } } : heroes
  }
}

const mapObjectsSlice = {
  key: 'mapObjects',
  initial: () => ({ removedEntityIds: [] }),
  on: {
    'fact.entity.removed': (mapObjects, { entityId }) =>
      mapObjects.removedEntityIds.includes(entityId)
        ? mapObjects
        : { removedEntityIds: [...mapObjects.removedEntityIds, entityId] }
  }
}

const dateSlice = {
  key: 'date',
  initial: () => ({ turnNumber: 1 }),
  on: {
    'fact.turn.ended': (date, { turnNumber }) => ({ ...date, turnNumber })
  }
}

export const CORE_SLICES = Object.freeze([playersSlice, heroesSlice, mapObjectsSlice, dateSlice])
