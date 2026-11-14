import { createEntityBehaviors } from '../../game/domain/entity-behaviors.js'
import { buildArrivalPlan } from '../../game/domain/movement/arrival-plan.js'
import { resolveMovementRules } from '../../game/domain/movement/movement-rules.js'
import {
  activePlayer,
  heroOwner,
  heroTile,
  isTileExplored,
  viewingPlayer
} from '../../game/state/queries.js'
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
    // Another player's hero, moved when a move request names it.
    let otherHeroId = null
    const otherHeroRoutes = createHeroRoutes({
      entityBehaviors,
      movementRules,
      getState: state.get,
      getHeroId: () => otherHeroId
    })

    let movement = null
    let otherHeroMovement = null
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

    function isHeroOwnersTurn(heroId) {
      const current = state.get()
      return heroOwner(current, heroId) === activePlayer(current)
    }

    function sleepUnlessHidden(ms) {
      if (ms <= 0) {
        return Promise.resolve()
      }
      return movementSleep ? movementSleep(ms) : new Promise((resolve) => setTimeout(resolve, ms))
    }

    // Another player's step is walked when the player can see either end of it.
    function otherHeroStepDelayMs(from, to) {
      const current = state.get()
      const player = viewingPlayer(current)
      const isSeen = isTileExplored(current, player, from) || isTileExplored(current, player, to)
      return isSeen ? stepDelayMs : 0
    }

    function createMovement(routes, movementOptions) {
      return routes.createMovementSystem({
        ...movementOptions,
        spendMovementPoints: (amount) => {
          emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, {
            heroId: routes.getHero()?.id,
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

          // A module may ask for the next move as soon as it hears this one is over.
          isMoveCommandInProgress = false
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

    function movementOf(heroId) {
      if (!heroId || heroId === heroRoutes.getHero()?.id) {
        return { movement, routes: heroRoutes }
      }

      otherHeroId = heroId
      return { movement: otherHeroMovement, routes: otherHeroRoutes }
    }

    function move({ heroId, targetTile, path }) {
      const { movement: heroMovement, routes } = movementOf(heroId)
      const movingHeroId = routes.getHero()?.id
      if (!heroMovement || !movingHeroId || isMoveCommandInProgress) {
        return
      }
      if (!isHeroOwnersTurn(movingHeroId)) {
        return
      }

      const arrivalPlan = buildArrivalPlan({
        occupancy: routes.occupancy,
        entityBehaviors,
        targetTile,
        movingEntityId: movingHeroId,
        arrivalContext: routes.arrivalContext()
      })

      isMoveCommandInProgress = true

      void (async () => {
        try {
          await heroMovement.moveHeroTo(targetTile, { path, arrivalPlan })
        } finally {
          isMoveCommandInProgress = false
        }
      })()
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const world = event.detail
            heroRoutes.onWorldReady(world)
            otherHeroRoutes.onWorldReady(world)
            otherHeroId = null
            otherHeroMovement = createMovement(otherHeroRoutes, {
              sleep: sleepUnlessHidden,
              getStepDelayMs: otherHeroStepDelayMs
            })

            if (!heroRoutes.getHero()) {
              movement = null
              return
            }

            movement = createMovement(heroRoutes, {
              ...(movementSleep ? { sleep: movementSleep } : {}),
              stepDelayMs
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
          handler: (event) => move(event.detail)
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
