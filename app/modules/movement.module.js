import { createEntityBehaviors } from '../../game/domain/entity-behaviors.js'
import { findHero } from '../../game/domain/entity-queries.js'
import { buildArrivalPlan } from '../../game/domain/movement/arrival-plan.js'
import { indexGuardedTiles } from '../../game/domain/movement/guards.js'
import { resolveMovementRules } from '../../game/domain/movement/movement-rules.js'
import { applyEntityRemoved, NO_REMOVED_ENTITIES } from '../../game/domain/removed-entities.js'
import { getOccupantAt } from '../../game/domain/tile-occupant.js'
import { normalizeMovementPoints } from '../../game/domain/value-objects/movement-points.js'
import { createMovementSystem } from '../../game/systems/movement-system.js'
import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_ROUTE_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_ROUTE_PLANNED,
  APP_FACT_WORLD_READY
} from '../events.js'
import { defineModule } from './shared/module-runtime.js'

export const registerMovementModule = defineModule(
  ({ emit, config }) => {
    const stepDelayMs = config?.movementStepDelayMs ?? 220
    const movementSleep =
      typeof config?.movementSleep === 'function' ? config.movementSleep : undefined
    const entityBehaviors = createEntityBehaviors(config?.content?.entityBehaviors)
    const movementRules = resolveMovementRules(config?.content?.movementRules)

    let movement = null
    let staticOccupancy = null
    let heroId = null
    let heroTile = null
    let removedIds = NO_REMOVED_ENTITIES
    let guards = []
    let guardedTiles = indexGuardedTiles([])
    let remainingMovementPoints = Number.POSITIVE_INFINITY
    let isMoveCommandInProgress = false

    const occupancy = {
      getAt: (tile) => getOccupantAt({ tile, staticOccupancy, removedIds })
    }

    function indexGuards() {
      guardedTiles = indexGuardedTiles(guards.filter((guard) => !removedIds.has(guard.id)))
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const world = event.detail
            staticOccupancy = world.staticOccupancy
            const hero = findHero(world.scenario.entities)
            heroId = hero?.id ?? null
            heroTile = hero?.tile ?? null
            removedIds = NO_REMOVED_ENTITIES
            guards = world.scenario.entities.filter(entityBehaviors.guardsSurroundings)
            indexGuards()

            if (!heroId) {
              movement = null
              return
            }

            movement = createMovementSystem({
              getHero: () => ({ id: heroId, tile: heroTile }),
              map: world.map,
              occupancy,
              entityBehaviors,
              getGuardsAt: (tile) => guardedTiles.getGuardsAt(tile),
              ...(movementSleep ? { sleep: movementSleep } : {}),
              stepDelayMs,
              getStepCost: (from, to) => movementRules.stepCost({ map: world.map, from, to }),
              getStepCharges: (path) =>
                movementRules.chargeSteps({
                  map: world.map,
                  path,
                  remainingMovementPoints
                }),
              spendMovementPoints: (amount) => {
                emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, {
                  amount
                })
              },
              onMoveStart: ({ hero, from, targetTile }) => {
                emit(APP_FACT_MOVE_STARTED, {
                  heroId: hero?.id,
                  from,
                  targetTile
                })
              },
              onMoveFinish: ({ hero, targetTile, reachedTile, interactions }) => {
                const detail = {
                  moved: true,
                  heroId: hero?.id,
                  targetTile,
                  reachedTile
                }
                // What the hero does where it stopped, and what follows once the first is over.
                const [interaction, ...queuedInteractions] = interactions
                if (interaction) {
                  detail.interaction = interaction
                  detail.queuedInteractions = queuedInteractions
                }

                emit(APP_FACT_MOVE_FINISHED, detail)
              },
              onStep: ({ hero: steppedHero, from, to }) => {
                const heroId = steppedHero?.id
                if (typeof heroId !== 'string' || heroId.length === 0) {
                  return
                }

                emit(APP_FACT_HERO_MOVED, {
                  heroId,
                  from,
                  to
                })
              }
            })
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            if (event.detail?.heroId === heroId && event.detail?.to) {
              heroTile = event.detail.to
            }
          }
        },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: (event) => {
            removedIds = applyEntityRemoved(removedIds, event.detail?.entityId)
            indexGuards()
            // A hero lost in battle moves no more.
            if (heroId && removedIds.has(heroId)) {
              movement = null
            }
          }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: (event) => {
            remainingMovementPoints =
              normalizeMovementPoints(event.detail?.value, {
                min: 0,
                fallback: Number.POSITIVE_INFINITY
              }) ?? Number.POSITIVE_INFINITY
          }
        },
        {
          type: APP_COMMAND_ROUTE_REQUESTED,
          handler: (event) => {
            const tile = event.detail?.tile
            const path = tile ? (movement?.planRoute(tile) ?? null) : null
            emit(APP_FACT_ROUTE_PLANNED, {
              tile,
              path,
              pathToBattle: path ? movement.getPathToBattle(path) : null
            })
          }
        },
        {
          type: APP_COMMAND_MOVE_REQUESTED,
          handler: (event) => {
            if (!movement || isMoveCommandInProgress) {
              return
            }

            const { targetTile, path } = event.detail
            const arrivalPlan = buildArrivalPlan({
              occupancy,
              entityBehaviors,
              targetTile,
              movingEntityId: heroId
            })

            isMoveCommandInProgress = true

            void (async () => {
              try {
                await movement.moveHeroTo(targetTile, { path, arrivalPlan })
              } finally {
                isMoveCommandInProgress = false
              }
            })()
          }
        }
      ]
    }
  },
  {
    id: 'movement',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_MOVED,
      APP_FACT_ENTITY_REMOVED,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_COMMAND_ROUTE_REQUESTED,
      APP_COMMAND_MOVE_REQUESTED
    ],
    produces: [
      APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
      APP_FACT_ROUTE_PLANNED,
      APP_FACT_MOVE_STARTED,
      APP_FACT_HERO_MOVED,
      APP_FACT_MOVE_FINISHED
    ]
  }
)
