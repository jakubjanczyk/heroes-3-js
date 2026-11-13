import { createEntityBehaviors } from '../../game/domain/entity-behaviors.js'
import { buildArrivalPlan } from '../../game/domain/movement/arrival-plan.js'
import { resolveMovementRules } from '../../game/domain/movement/movement-rules.js'
import { activePlayer, heroOwner, heroTile } from '../../game/state/queries.js'
import { createHeroRoutes } from '../../game/systems/hero-routes.js'
import {
  APP_COMMAND_HERO_TELEPORT_REQUESTED,
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_ROUTE_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_ROUTE_PLANNED,
  APP_FACT_WORLD_READY
} from '../events.js'
import { defineModule } from './shared/module-runtime.js'

export const registerMovementModule = defineModule(
  ({ emit, config, state }) => {
    const stepDelayMs = config?.movementStepDelayMs ?? 220
    const movementSleep =
      typeof config?.movementSleep === 'function' ? config.movementSleep : undefined
    const entityBehaviors = createEntityBehaviors(config?.content?.entityBehaviors)
    const movementRules = resolveMovementRules(config?.content?.movementRules)

    const heroRoutes = createHeroRoutes({ entityBehaviors, movementRules, getState: state.get })

    let movement = null
    let isMoveCommandInProgress = false

    function teleport({ heroId, tile }) {
      const from = heroTile(state.get(), heroId)
      emit(APP_FACT_HERO_MOVED, { heroId, from, to: tile, teleported: true })
      const [interaction, ...queuedInteractions] = movement?.battlesOnArrivalAt(tile) ?? []
      if (interaction) {
        emit(APP_FACT_MOVE_FINISHED, {
          moved: true,
          heroId,
          targetTile: tile,
          reachedTile: tile,
          interaction,
          queuedInteractions
        })
      }
    }

    function isHeroOwnersTurn() {
      const current = state.get()
      return heroOwner(current, heroRoutes.getHero()?.id) === activePlayer(current)
    }

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
              spendMovementPoints: (amount) => {
                emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, {
                  heroId: heroRoutes.getHero()?.id,
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
          type: APP_FACT_ENTITY_REMOVED,
          handler: () => {
            // A hero lost in battle moves no more.
            if (!heroRoutes.getHero()) {
              movement = null
            }
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
          type: APP_COMMAND_HERO_TELEPORT_REQUESTED,
          handler: (event) => teleport(event.detail)
        },
        {
          type: APP_COMMAND_MOVE_REQUESTED,
          handler: (event) => {
            if (!movement || isMoveCommandInProgress || !isHeroOwnersTurn()) {
              return
            }

            const { targetTile, path } = event.detail
            const arrivalPlan = buildArrivalPlan({
              occupancy: heroRoutes.occupancy,
              entityBehaviors,
              targetTile,
              movingEntityId: heroRoutes.getHero()?.id,
              arrivalContext: heroRoutes.arrivalContext()
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
      APP_FACT_ENTITY_REMOVED,
      APP_COMMAND_ROUTE_REQUESTED,
      APP_COMMAND_MOVE_REQUESTED,
      APP_COMMAND_HERO_TELEPORT_REQUESTED
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
