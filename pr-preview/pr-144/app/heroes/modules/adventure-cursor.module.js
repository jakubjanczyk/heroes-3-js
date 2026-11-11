import { sameTile } from '../../../engine/tile-utils.js'
import { createEntityBehaviors } from '../../../game/domain/entity-behaviors.js'
import { isTown } from '../../../game/domain/entity-queries.js'
import { resolveMovementRules } from '../../../game/domain/movement/movement-rules.js'
import {
  ADVENTURE_CURSOR,
  getAdventureCursor,
  getScrollCursor
} from '../../../game/heroes/adventure-cursor.js'
import { dimensionDoorTargetAt } from '../../../game/heroes/adventure-spells.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { isDefendedAgainst, isViewingPlayersTown } from '../../../game/heroes/state/towns.js'
import { heroOwner, isTileExplored, viewingPlayer } from '../../../game/state/queries.js'
import { createHeroRoutes } from '../../../game/systems/hero-routes.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_WORLD_READY,
  APP_UI_HERO_SELECTED,
  APP_UI_MAP_AIMING_ENDED,
  APP_UI_MAP_AIMING_STARTED,
  APP_UI_MAP_EDGE_SCROLLED,
  APP_UI_TILE_HOVERED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapObjects } from '../map-objects.js'

// The Heroes 3 cursor over the adventure map: what clicking the tile under the mouse would do,
// and on which day the hero would get there. While the map scrolls from its edge, an arrow
// pointing the way it scrolls takes its place. The map shows it through `data-cursor`.
// It plans the route to the tile itself rather than asking the movement module, so moving the
// mouse over the map puts nothing on the bus but `ui.tile.hovered`.
export const registerAdventureCursorModule = defineModule(
  ({ env, config, state }) => {
    const viewport = env.document.querySelector('.viewport')
    const mapObjects = createMapObjects(state)
    const heroRoutes = createHeroRoutes({
      entityBehaviors: createEntityBehaviors(config?.content?.entityBehaviors),
      movementRules: resolveMovementRules(config?.content?.movementRules),
      getState: state.get
    })

    let map = null
    let routePlanner = null
    let hoveredTile = null
    let tileCursor = ADVENTURE_CURSOR.ARROW
    let scrollDirection = null
    let isTownSelected = false
    let spells = {}
    let aim = null

    function aimCursor() {
      const hero = heroById(state.get(), aim.heroId)
      const target = dimensionDoorTargetAt({
        state: state.get(),
        hero,
        spell: spells[aim.spellId],
        map,
        isTaken: (tile) => heroRoutes.occupancy.getAt(tile) !== null,
        tile: hoveredTile
      })
      return target ? ADVENTURE_CURSOR.DIMENSION_DOOR : ADVENTURE_CURSOR.ARROW
    }

    function showCursor(cursor) {
      tileCursor = cursor
      render()
    }

    function render() {
      viewport.dataset.cursor = scrollDirection ? getScrollCursor(scrollDirection) : tileCursor
    }

    function isOwnHero(entity) {
      return (
        entity?.kind === 'HERO' && heroOwner(state.get(), entity.id) === viewingPlayer(state.get())
      )
    }

    function opensTown(entity) {
      return (
        isTown(entity) &&
        isViewingPlayersTown(state.get(), entity.id) &&
        (isTownSelected || !sameTile(hoveredTile, entity.tile))
      )
    }

    function updateCursor() {
      if (aim && hoveredTile) {
        showCursor(aimCursor())
        return
      }
      if (!hoveredTile || !isTileExplored(state.get(), viewingPlayer(state.get()), hoveredTile)) {
        showCursor(ADVENTURE_CURSOR.ARROW)
        return
      }

      const entity = mapObjects.getEntityAt(hoveredTile)
      if (isOwnHero(entity) && (isTownSelected || entity.id === heroRoutes.getHero()?.id)) {
        showCursor(getAdventureCursor({ entity, isSelectedHero: true }))
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

      showCursorForRoute()
    }

    function isDefendedTown(entity) {
      const current = state.get()
      return isTown(entity) && isDefendedAgainst(current, entity.id, viewingPlayer(current))
    }

    function showCursorForRoute() {
      const path = routePlanner.planRoute(hoveredTile)
      const pathToBattle = path ? routePlanner.getPathToBattle(path) : null
      const travelDays = path
        ? heroRoutes.travelDays(pathToBattle ?? path, config.maxMovementPoints)
        : null
      const entity = mapObjects.getEntityAt(hoveredTile)
      showCursor(
        getAdventureCursor({
          entity,
          travelDays,
          attacks: Boolean(pathToBattle) || isDefendedTown(entity),
          isOwnHero: isOwnHero(entity)
        })
      )
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            mapObjects.onWorldReady(event.detail)
            heroRoutes.onWorldReady(event.detail)
            routePlanner = heroRoutes.createMovementSystem()
            spells = event.detail.definitions?.spells ?? {}
            aim = null
            isTownSelected = false
            map = event.detail.map
            hoveredTile = null
            scrollDirection = null
            showCursor(ADVENTURE_CURSOR.ARROW)
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: () => updateCursor()
        },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: () => updateCursor()
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: () => updateCursor()
        },
        {
          type: APP_UI_TILE_HOVERED,
          handler: (event) => {
            hoveredTile = event.detail.tile
            updateCursor()
          }
        },
        {
          type: APP_UI_MAP_AIMING_STARTED,
          handler: (event) => {
            aim = event.detail
            updateCursor()
          }
        },
        {
          type: APP_UI_MAP_AIMING_ENDED,
          handler: () => {
            aim = null
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
          type: APP_FACT_TOWN_CAPTURED,
          handler: () => updateCursor()
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
      APP_UI_MAP_AIMING_STARTED,
      APP_UI_MAP_AIMING_ENDED,
      APP_UI_MAP_EDGE_SCROLLED,
      APP_FACT_TOWN_CAPTURED,
      APP_UI_TOWN_SELECTED,
      APP_UI_HERO_SELECTED
    ],
    produces: []
  }
)
