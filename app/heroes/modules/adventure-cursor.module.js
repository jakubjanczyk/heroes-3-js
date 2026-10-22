import { sameTile } from '../../../engine/tile-utils.js'
import { isTown } from '../../../game/domain/entity-queries.js'
import { resolveMovementRules } from '../../../game/domain/movement/movement-rules.js'
import { countTravelDays } from '../../../game/domain/movement/travel-days.js'
import {
  ADVENTURE_CURSOR,
  getAdventureCursor,
  getScrollCursor
} from '../../../game/heroes/adventure-cursor.js'
import { createOwnedTowns } from '../../../game/heroes/town-ownership.js'
import {
  APP_COMMAND_ROUTE_REQUESTED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_ROUTE_PLANNED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_WORLD_READY,
  APP_UI_HERO_SELECTED,
  APP_UI_MAP_EDGE_SCROLLED,
  APP_UI_TILE_HOVERED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapObjects } from '../map-objects.js'

// The Heroes 3 cursor over the adventure map: what clicking the tile under the mouse would do,
// and on which day the hero would get there. While the map scrolls from its edge, an arrow
// pointing the way it scrolls takes its place. The map shows it through `data-cursor`.
export const registerAdventureCursorModule = defineModule(
  ({ env, emit, config }) => {
    const viewport = env.document.querySelector('.viewport')
    const movementRules = resolveMovementRules(config?.content?.movementRules)
    const mapObjects = createMapObjects()
    const ownedTowns = createOwnedTowns()

    let map = null
    let hoveredTile = null
    let remainingMovementPoints = config.maxMovementPoints
    let maxMovementPoints = config.maxMovementPoints
    let tileCursor = ADVENTURE_CURSOR.ARROW
    let scrollDirection = null
    let isTownSelected = false

    function showCursor(cursor) {
      tileCursor = cursor
      render()
    }

    function render() {
      viewport.dataset.cursor = scrollDirection ? getScrollCursor(scrollDirection) : tileCursor
    }

    function opensTown(entity) {
      return (
        isTown(entity) &&
        ownedTowns.has(entity.id) &&
        (isTownSelected || !sameTile(hoveredTile, entity.tile))
      )
    }

    // The cursor follows once the route to the tile is planned, unless the hero stands on it.
    function updateCursor() {
      if (!hoveredTile) {
        showCursor(ADVENTURE_CURSOR.ARROW)
        return
      }

      const entity = mapObjects.getEntityAt(hoveredTile)
      if (entity?.kind === 'HERO') {
        showCursor(getAdventureCursor({ entity }))
        return
      }
      if (opensTown(entity)) {
        showCursor(ADVENTURE_CURSOR.CASTLE)
        return
      }
      if (isTownSelected) {
        showCursor(ADVENTURE_CURSOR.ARROW)
        return
      }

      emit(APP_COMMAND_ROUTE_REQUESTED, { tile: hoveredTile })
    }

    function showCursorForRoute(path) {
      const travelDays = path
        ? countTravelDays({
            map,
            path,
            chargeSteps: movementRules.chargeSteps,
            remainingMovementPoints,
            maxMovementPoints
          })
        : null
      showCursor(getAdventureCursor({ entity: mapObjects.getEntityAt(hoveredTile), travelDays }))
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            mapObjects.onWorldReady(event.detail)
            ownedTowns.onWorldReady(event.detail.scenario.entities)
            isTownSelected = false
            map = event.detail.map
            hoveredTile = null
            scrollDirection = null
            showCursor(ADVENTURE_CURSOR.ARROW)
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            mapObjects.onHeroMoved(event.detail.to)
            updateCursor()
          }
        },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: (event) => {
            mapObjects.onEntityRemoved(event.detail.entityId)
            updateCursor()
          }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: (event) => {
            remainingMovementPoints = event.detail.value
            maxMovementPoints = event.detail.max ?? maxMovementPoints
            updateCursor()
          }
        },
        {
          type: APP_UI_TILE_HOVERED,
          handler: (event) => {
            hoveredTile = event.detail.tile
            updateCursor()
          }
        },
        {
          type: APP_UI_MAP_EDGE_SCROLLED,
          handler: (event) => {
            scrollDirection = event.detail.direction
            render()
          }
        },
        {
          type: APP_FACT_ROUTE_PLANNED,
          // A click plans a route too, also on a town the click opens: that keeps its cursor.
          handler: (event) => {
            if (
              !hoveredTile ||
              !sameTile(event.detail.tile, hoveredTile) ||
              isTownSelected ||
              opensTown(mapObjects.getEntityAt(hoveredTile))
            ) {
              return
            }

            showCursorForRoute(event.detail.path)
          }
        },
        {
          type: APP_FACT_TOWN_CAPTURED,
          handler: (event) => {
            ownedTowns.onTownCaptured(event.detail.entityId)
            updateCursor()
          }
        },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: () => {
            isTownSelected = true
            updateCursor()
          }
        },
        {
          type: APP_UI_HERO_SELECTED,
          handler: () => {
            isTownSelected = false
            updateCursor()
          }
        }
      ]
    }
  },
  {
    id: 'adventure-cursor',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_MOVED,
      APP_FACT_ENTITY_REMOVED,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_UI_TILE_HOVERED,
      APP_UI_MAP_EDGE_SCROLLED,
      APP_FACT_ROUTE_PLANNED,
      APP_FACT_TOWN_CAPTURED,
      APP_UI_TOWN_SELECTED,
      APP_UI_HERO_SELECTED
    ],
    produces: [APP_COMMAND_ROUTE_REQUESTED]
  }
)
