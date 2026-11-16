import { sameTile } from '../../../engine/tile-utils.js'
import { createEntityBehaviors } from '../../../game/domain/entity-behaviors.js'
import { isTown } from '../../../game/domain/entity-queries.js'
import { resolveMovementRules } from '../../../game/domain/movement/movement-rules.js'
import {
  COMPUTER_HERO_TARGET_KINDS,
  decideComputerHeroMove
} from '../../../game/heroes/computer-heroes.js'
import {
  decideGarrisonTaken,
  decideTownRecruits,
  dwellingRecruitCount
} from '../../../game/heroes/computer-recruiting.js'
import { decideTownBuilding } from '../../../game/heroes/computer-towns.js'
import { MOVEMENT_INTERACTION_KIND_DWELLING_VISIT } from '../../../game/heroes/interaction-kinds.js'
import { buildingContextOf } from '../../../game/heroes/state/building-context.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { dwellingOwner } from '../../../game/heroes/state/map-objects.js'
import {
  townGarrison,
  townIdAt,
  townIdsOf,
  townOwner,
  townType
} from '../../../game/heroes/state/towns.js'
import { isTownNextToWater, townBuildingsCatalogue } from '../../../game/heroes/town-buildings.js'
import {
  activePlayer,
  heroIdsOf,
  heroOwner,
  heroTile,
  viewingPlayer
} from '../../../game/state/queries.js'
import { createHeroRoutes } from '../../../game/systems/hero-routes.js'
import {
  APP_COMMAND_DWELLING_RECRUIT_REQUESTED,
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TOWN_BUILD_REQUESTED,
  APP_COMMAND_TOWN_RECRUIT_REQUESTED,
  APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_PLAYER_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_NOTICE_OPENED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerComputerPlayersModule = defineModule(
  ({ emit, config, state }) => {
    const entityBehaviors = createEntityBehaviors(config?.content?.entityBehaviors)
    const movementRules = resolveMovementRules(config?.content?.movementRules)
    let planningHeroId = null
    let absentHeroId = null
    const heroRoutes = createHeroRoutes({
      entityBehaviors,
      movementRules,
      getState: state.get,
      getHeroId: () => planningHeroId,
      getAbsentHeroId: () => absentHeroId
    })
    let routePlanner = null
    let map = null
    let targets = []
    let definitions = {}
    let townIdsNextToWater = new Set()
    let isRestoring = false
    // The computer player whose turn is being played, and its heroes still to move.
    let turn = null
    // The player fights a battle a computer hero started, then reads what it led to, before the
    // computer player's turn goes on. An unseen battle ends while its start is still being heard,
    // so the ends can be counted before the starts.
    let battlesStarted = 0
    let battlesEnded = 0
    let openWindowCount = 0
    let isWaitingForPlayer = false

    // The routes of `heroId`, with `absentHeroId` taken off the map.
    function routesOf(heroId, options = {}) {
      const forHero =
        (plan) =>
        (...args) => {
          planningHeroId = heroId
          absentHeroId = options.absentHeroId ?? null
          return plan(...args)
        }
      return {
        planRoutes: forHero(routePlanner.planRoutes),
        getPathToBattle: forHero(routePlanner.getPathToBattle),
        battlesOnArrivalAt: forHero(routePlanner.battlesOnArrivalAt),
        routeCost: forHero(heroRoutes.routeCost),
        chargeStepsToday: forHero(heroRoutes.chargeStepsToday),
        reachesOnNewDay: forHero(heroRoutes.reachesOnNewDay),
        isEmpty: forHero((tile) => heroRoutes.occupancy.getAt(tile) === null)
      }
    }

    function nextMove(heroId) {
      return decideComputerHeroMove({
        state: state.get(),
        map,
        heroId,
        targets,
        routesOf,
        definitions
      })
    }

    function recruitInTown(heroId, townId) {
      const { monsters } = definitions
      const { buildings } = townBuildingsCatalogue(definitions, townType(state.get(), townId))
      for (const recruit of decideTownRecruits({
        state: state.get(),
        townId,
        buildings,
        monsters
      })) {
        emit(APP_COMMAND_TOWN_RECRUIT_REQUESTED, { entityId: townId, ...recruit })
      }

      const moves = decideGarrisonTaken({
        garrison: townGarrison(state.get(), townId),
        army: heroById(state.get(), heroId).army,
        monsters
      })
      for (const move of moves) {
        emit(APP_COMMAND_TOWN_STACK_MOVE_REQUESTED, { entityId: townId, ...move })
      }
    }

    function recruitAtDwelling(heroId, dwellingId) {
      const count = dwellingRecruitCount({ state: state.get(), dwellingId, heroId, definitions })
      if (count > 0) {
        emit(APP_COMMAND_DWELLING_RECRUIT_REQUESTED, { heroId, entityId: dwellingId, count })
      }
    }

    function recruitWhereHeroStands(heroId) {
      const current = state.get()
      const player = heroOwner(current, heroId)
      const tile = heroTile(current, heroId)
      const townId = townIdAt(current, tile)
      if (townId !== null && townOwner(current, townId) === player) {
        recruitInTown(heroId, townId)
        return
      }

      const dwelling = targets.find(
        (target) =>
          target.kind === MOVEMENT_INTERACTION_KIND_DWELLING_VISIT && sameTile(target.tile, tile)
      )
      if (dwelling && dwellingOwner(current, dwelling.id) === player) {
        recruitAtDwelling(heroId, dwelling.id)
      }
    }

    function playNextMove() {
      while (turn.heroIds.length > 0) {
        const [heroId] = turn.heroIds
        // A hero beaten in battle is no longer on the map.
        if (!heroIdsOf(state.get(), turn.player).includes(heroId)) {
          turn.heroIds.shift()
          continue
        }
        recruitWhereHeroStands(heroId)
        const move = nextMove(heroId)
        if (move) {
          emit(APP_COMMAND_MOVE_REQUESTED, { heroId, ...move })
          return
        }
        turn.heroIds.shift()
      }

      const { player } = turn
      turn = null
      emit(APP_COMMAND_END_TURN_REQUESTED, { player })
    }

    function playNextMoveWhenFree() {
      isWaitingForPlayer = battlesStarted > battlesEnded || openWindowCount > 0
      if (turn && !isWaitingForPlayer) {
        playNextMove()
      }
    }

    function resumeOnceFree() {
      if (isWaitingForPlayer) {
        queueMicrotask(playNextMoveWhenFree)
      }
    }

    function buildInTowns(player) {
      for (const townId of townIdsOf(state.get(), player)) {
        const buildingId = decideTownBuilding({
          catalogue: townBuildingsCatalogue(definitions, townType(state.get(), townId)),
          context: buildingContextOf(state.get(), townId, {
            isNextToWater: townIdsNextToWater.has(townId)
          })
        })
        if (buildingId) {
          emit(APP_COMMAND_TOWN_BUILD_REQUESTED, { entityId: townId, buildingId })
        }
      }
    }

    function playIfComputersTurn() {
      const current = state.get()
      const player = activePlayer(current)
      if (isRestoring || turn || !routePlanner || !player || player === viewingPlayer(current)) {
        return
      }

      turn = { player, heroIds: heroIdsOf(current, player) }
      buildInTowns(player)
      playNextMoveWhenFree()
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const world = event.detail
            heroRoutes.onWorldReady(world)
            routePlanner = heroRoutes.createMovementSystem()
            map = world.map
            definitions = world.definitions ?? {}
            townIdsNextToWater = new Set(
              world.scenario.entities
                .filter((entity) => isTown(entity) && isTownNextToWater(entity, map))
                .map(({ id }) => id)
            )
            targets = world.scenario.entities.flatMap((entity) => {
              const kind = entityBehaviors.getArrivalInteraction(entity)?.movementInteractionKind
              return COMPUTER_HERO_TARGET_KINDS.includes(kind)
                ? [
                    {
                      id: entity.id,
                      tile: entity.tile,
                      kind,
                      type: entity.type,
                      count: entity.count
                    }
                  ]
                : []
            })
            turn = null
            battlesStarted = 0
            battlesEnded = 0
            openWindowCount = 0
            isWaitingForPlayer = false
          }
        },
        { type: APP_FACT_BATTLE_STARTED, handler: () => (battlesStarted += 1) },
        {
          type: APP_FACT_BATTLE_ENDED,
          handler: () => {
            battlesEnded += 1
            resumeOnceFree()
          }
        },
        { type: APP_UI_INTERACTION_MODAL_OPENED, handler: () => (openWindowCount += 1) },
        { type: APP_UI_NOTICE_OPENED, handler: () => (openWindowCount += 1) },
        {
          type: APP_UI_INTERACTION_MODAL_CLOSED,
          handler: () => {
            openWindowCount = Math.max(0, openWindowCount - 1)
            resumeOnceFree()
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            isRestoring = false
            playIfComputersTurn()
          }
        },
        { type: APP_FACT_PLAYER_TURN_ENDED, handler: () => queueMicrotask(playIfComputersTurn) },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: (event) => {
            if (turn && event.detail.heroId === turn.heroIds[0]) {
              // What the hero found where it stopped is settled before it moves on.
              queueMicrotask(playNextMoveWhenFree)
            }
          }
        }
      ]
    }
  },
  {
    id: 'computer-players',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED,
      APP_FACT_PLAYER_TURN_ENDED,
      APP_FACT_MOVE_FINISHED,
      APP_FACT_BATTLE_STARTED,
      APP_FACT_BATTLE_ENDED,
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_UI_NOTICE_OPENED,
      APP_UI_INTERACTION_MODAL_CLOSED
    ],
    produces: [
      APP_COMMAND_MOVE_REQUESTED,
      APP_COMMAND_TOWN_BUILD_REQUESTED,
      APP_COMMAND_TOWN_RECRUIT_REQUESTED,
      APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
      APP_COMMAND_DWELLING_RECRUIT_REQUESTED,
      APP_COMMAND_END_TURN_REQUESTED
    ]
  }
)
