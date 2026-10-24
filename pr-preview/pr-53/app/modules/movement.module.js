import { createEntityBehaviors } from '../../game/domain/entity-behaviors.js'
import { buildArrivalPlan } from '../../game/domain/movement/arrival-plan.js'
import { resolveMovementRules } from '../../game/domain/movement/movement-rules.js'
import { normalizeMovementPoints } from '../../game/domain/value-objects/movement-points.js'
import { createHeroRoutes } from '../../game/systems/hero-routes.js'
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

    const heroRoutes = createHeroRoutes({ entityBehaviors, movementRules })

    let movement = null
    let remainingMovementPoints = Number.POSITIVE_INFINITY
    let isMoveCommandInProgress = false

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const world = event.detail
            heroRoutes.onWorldReady(world)

            if (!heroRoutes.getHero()) {
              movement = null
              return
            }

            movement = heroRoutes.createMovementSystem({
              ...(movementSleep ? { sleep: movementSleep } : {}),
              stepDelayMs,
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
            heroRoutes.onHeroMoved(event.detail ?? {})
          }
        },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: (event) => {
            heroRoutes.onEntityRemoved(event.detail?.entityId)
            // A hero lost in battle moves no more.
            if (!heroRoutes.getHero()) {
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
            emit(APP_FACT_ROUTE_PLANNED, { tile, path })
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
              occupancy: heroRoutes.occupancy,
              entityBehaviors,
              targetTile,
              movingEntityId: heroRoutes.getHero()?.id
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
