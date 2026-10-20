import { sameTile } from '../../../engine/tile-utils.js'
import { resolveMovementRules } from '../../../game/domain/movement/movement-rules.js'
import { countTravelDays } from '../../../game/domain/movement/travel-days.js'
import {
  ADVENTURE_CURSOR,
  getAdventureCursor,
  getScrollCursor
} from '../../../game/heroes/adventure-cursor.js'
import {
  APP_COMMAND_ROUTE_REQUESTED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_ROUTE_PLANNED,
  APP_FACT_WORLD_READY,
  APP_UI_MAP_EDGE_SCROLLED,
  APP_UI_TILE_HOVERED
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

    let map = null
    let hoveredTile = null
    let remainingMovementPoints = config.maxMovementPoints
    let maxMovementPoints = config.maxMovementPoints
    let tileCursor = ADVENTURE_CURSOR.ARROW
    let scrollDirection = null

    function showCursor(cursor) {
      tileCursor = cursor
      render()
    }

    function render() {
      viewport.dataset.cursor = scrollDirection ? getScrollCursor(scrollDirection) : tileCursor
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
          handler: (event) => {
            if (hoveredTile && sameTile(event.detail.tile, hoveredTile)) {
              showCursorForRoute(event.detail.path)
            }
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
      APP_FACT_ROUTE_PLANNED
    ],
    produces: [APP_COMMAND_ROUTE_REQUESTED]
  }
)
