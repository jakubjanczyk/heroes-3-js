import { sameTile } from '../../engine/tile-utils.js'
import { resolveMovementRules } from '../../game/domain/movement/movement-rules.js'
import {
  heroIdAt,
  heroMovementPoints,
  heroOwner,
  heroTile,
  isTileExplored,
  selectedHeroIdOf,
  viewingPlayer
} from '../../game/state/queries.js'
import {
  APP_COMMAND_HERO_SELECT_REQUESTED,
  APP_COMMAND_MOVE_CONTINUE_REQUESTED,
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_ROUTE_REQUESTED,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_HERO_SELECTED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_ROUTE_PLANNED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_HERO_SELECTED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_PREVIEW_UPDATED,
  APP_UI_SELECTED_HERO_CLICKED,
  APP_UI_SYSTEM_OPTIONS_CLOSED,
  APP_UI_SYSTEM_OPTIONS_OPENED,
  APP_UI_TOWN_SELECTED
} from '../events.js'
import { defineModule } from './shared/module-runtime.js'

export const registerSelectionModule = defineModule(
  ({ emit, config, state }) => {
    const movementRules = resolveMovementRules(config?.content?.movementRules)
    let map = null
    let isWorldReady = false
    let requestedTile = null
    // Each hero keeps the route planned for them while another hero is selected.
    const routesByHeroId = new Map()
    let isMoving = false
    let isInteractionModalOpen = false
    let isSystemOptionsOpen = false
    let isMapCovered = false
    let isTownSelected = false

    function selectedHeroId() {
      return selectedHeroIdOf(state.get(), viewingPlayer(state.get()))
    }

    function selectedRoute() {
      return routesByHeroId.get(selectedHeroId()) ?? null
    }

    function affordableStepCount() {
      const path = selectedRoute()?.path
      if (!map || !path || path.length < 2) {
        return 0
      }

      const remainingMovementPoints =
        heroMovementPoints(state.get(), selectedHeroId())?.value ?? Number.POSITIVE_INFINITY
      return movementRules.chargeSteps({ map, path, remainingMovementPoints }).length
    }

    function isMapIdle() {
      return (
        isWorldReady &&
        !isMoving &&
        !isInteractionModalOpen &&
        !isSystemOptionsOpen &&
        !isMapCovered &&
        !isTownSelected
      )
    }

    function canMove() {
      return isMapIdle() && selectedRoute()?.path.length >= 2 && affordableStepCount() >= 1
    }

    function requestMove() {
      const route = selectedRoute()
      if (canMove()) {
        emit(APP_COMMAND_MOVE_REQUESTED, { targetTile: route.target, path: [...route.path] })
      }
    }

    function emitPreview() {
      const route = selectedRoute()
      emit(APP_UI_PREVIEW_UPDATED, {
        path: route?.path ?? null,
        targetTile: route?.target ?? null,
        maxAffordableSteps: affordableStepCount(),
        canMove: canMove()
      })
    }

    function emitPreviewOf(heroId) {
      if (heroId === selectedHeroId()) {
        emitPreview()
      }
    }

    // A route is only assigned in fact handlers (or derived from replayed move facts); commands
    // and reactions emit facts instead, so live play and replay share one code path.
    function clearRoute(heroId) {
      routesByHeroId.delete(heroId)
      emitPreviewOf(heroId)
    }

    function requestClearRoute(heroId = selectedHeroId()) {
      if (routesByHeroId.has(heroId)) {
        emit(APP_FACT_PREVIEW_CLEARED, { heroId })
      }
    }

    function requestSelectHero(heroId) {
      const player = viewingPlayer(state.get())
      if (heroId && heroId !== selectedHeroId() && heroOwner(state.get(), heroId) === player) {
        emit(APP_FACT_HERO_SELECTED, { heroId, player })
      }
    }

    function otherOwnHeroAt(tile) {
      const heroId = heroIdAt(state.get(), tile)
      return heroId !== selectedHeroId() &&
        heroOwner(state.get(), heroId) === viewingPlayer(state.get())
        ? heroId
        : null
    }

    function clickTile(tile) {
      const selectedHeroTile = heroTile(state.get(), selectedHeroId())
      if (selectedHeroTile && sameTile(selectedHeroTile, tile)) {
        emit(APP_UI_SELECTED_HERO_CLICKED, {})
      }
      const target = selectedRoute()?.target
      if (target && sameTile(target, tile)) {
        requestMove()
        return
      }

      requestedTile = tile
      emit(APP_COMMAND_ROUTE_REQUESTED, { tile })
    }

    function followStep(heroId, to) {
      const route = routesByHeroId.get(heroId)
      if (!route || route.path.length === 0) {
        return
      }

      while (route.path.length > 0 && !sameTile(route.path[0], to)) {
        route.path.shift()
      }

      if (sameTile(route.target, to)) {
        clearRoute(heroId)
        return
      }

      emitPreviewOf(heroId)
    }

    function finishMove({ heroId = selectedHeroId(), interaction, reachedTile }) {
      isMoving = false
      const target = routesByHeroId.get(heroId)?.target
      if (!interaction?.kind && target && reachedTile && !sameTile(reachedTile, target)) {
        emitPreviewOf(heroId)
        return
      }

      requestClearRoute(heroId)
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            map = event.detail.map
            isWorldReady = true
            isTownSelected = false
            routesByHeroId.clear()
            emitPreview()
          }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: () => {
            if (selectedRoute()) {
              emitPreview()
            }
          }
        },
        {
          type: APP_COMMAND_TILE_CLICKED,
          handler: (event) => {
            const { tile } = event.detail
            if (isMapIdle() && isTileExplored(state.get(), viewingPlayer(state.get()), tile)) {
              clickTile(tile)
            }
          }
        },
        {
          type: APP_COMMAND_HERO_SELECT_REQUESTED,
          handler: (event) => {
            if (isWorldReady && !isMoving) {
              requestSelectHero(event.detail.heroId)
            }
          }
        },
        {
          type: APP_COMMAND_MOVE_CONTINUE_REQUESTED,
          handler: () => {
            requestMove()
          }
        },
        {
          type: APP_FACT_ROUTE_PLANNED,
          handler: (event) => {
            const { tile, path } = event.detail ?? {}
            if (!requestedTile || !sameTile(requestedTile, tile)) {
              return
            }

            requestedTile = null
            // Another of the player's heroes the selected one can't get to is selected instead.
            const otherHeroId = path ? null : otherOwnHeroAt(tile)
            if (otherHeroId) {
              requestSelectHero(otherHeroId)
              return
            }
            if (!path) {
              requestClearRoute()
              return
            }

            emit(APP_FACT_PREVIEW_TARGET_SELECTED, { heroId: selectedHeroId(), tile, path })
          }
        },
        {
          type: APP_FACT_MOVE_STARTED,
          handler: () => {
            isMoving = true
            if (selectedRoute()) {
              emitPreview()
            }
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => followStep(event.detail.heroId ?? selectedHeroId(), event.detail.to)
        },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: (event) => finishMove(event.detail)
        },
        {
          type: APP_UI_INTERACTION_MODAL_OPENED,
          handler: () => {
            isInteractionModalOpen = true
            requestClearRoute()
          }
        },
        {
          type: APP_UI_INTERACTION_MODAL_CLOSED,
          handler: () => {
            isInteractionModalOpen = false
          }
        },
        {
          type: APP_UI_SYSTEM_OPTIONS_OPENED,
          handler: () => {
            isSystemOptionsOpen = true
          }
        },
        {
          type: APP_UI_SYSTEM_OPTIONS_CLOSED,
          handler: () => {
            isSystemOptionsOpen = false
          }
        },
        {
          type: APP_UI_ADVENTURE_MAP_COVERED,
          handler: () => {
            isMapCovered = true
          }
        },
        {
          type: APP_UI_ADVENTURE_MAP_UNCOVERED,
          handler: () => {
            isMapCovered = false
          }
        },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: () => {
            isTownSelected = true
            emitPreview()
          }
        },
        {
          type: APP_UI_HERO_SELECTED,
          handler: () => {
            isTownSelected = false
            emitPreview()
          }
        },
        {
          type: APP_FACT_HERO_SELECTED,
          handler: () => {
            isTownSelected = false
            emitPreview()
          }
        },
        {
          type: APP_FACT_PREVIEW_TARGET_SELECTED,
          handler: (event) => {
            const { heroId = selectedHeroId(), tile, path } = event.detail ?? {}
            // Saves from before routes were stored in this fact carry no path; drop those.
            if (!tile || !Array.isArray(path) || path.length < 2) {
              clearRoute(heroId)
              return
            }

            routesByHeroId.set(heroId, { target: tile, path: [...path] })
            emitPreviewOf(heroId)
          }
        },
        {
          type: APP_FACT_PREVIEW_CLEARED,
          handler: (event) => clearRoute(event.detail?.heroId ?? selectedHeroId())
        }
      ]
    }
  },
  {
    id: 'selection',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_COMMAND_TILE_CLICKED,
      APP_COMMAND_HERO_SELECT_REQUESTED,
      APP_COMMAND_MOVE_CONTINUE_REQUESTED,
      APP_FACT_ROUTE_PLANNED,
      APP_FACT_MOVE_STARTED,
      APP_FACT_HERO_MOVED,
      APP_FACT_MOVE_FINISHED,
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_UI_INTERACTION_MODAL_CLOSED,
      APP_UI_SYSTEM_OPTIONS_OPENED,
      APP_UI_SYSTEM_OPTIONS_CLOSED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_UI_TOWN_SELECTED,
      APP_UI_HERO_SELECTED,
      APP_FACT_HERO_SELECTED,
      APP_FACT_PREVIEW_TARGET_SELECTED,
      APP_FACT_PREVIEW_CLEARED
    ],
    produces: [
      APP_FACT_HERO_SELECTED,
      APP_COMMAND_MOVE_REQUESTED,
      APP_COMMAND_ROUTE_REQUESTED,
      APP_UI_PREVIEW_UPDATED,
      APP_UI_SELECTED_HERO_CLICKED,
      APP_FACT_PREVIEW_TARGET_SELECTED,
      APP_FACT_PREVIEW_CLEARED
    ]
  }
)
