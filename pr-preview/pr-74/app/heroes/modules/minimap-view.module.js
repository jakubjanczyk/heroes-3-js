import { setStyleVar } from '../../../engine/layers/dom-layer-utils.js'
import { clamp } from '../../../engine/math-utils.js'
import { isDwelling, isMine, isTown } from '../../../game/domain/entity-queries.js'
import { FOOTPRINT_BLOCKER_KIND } from '../../../game/footprint-utils.js'
import { flaggedObjectOwner } from '../../../game/heroes/state/map-objects.js'
import { isViewingPlayersTown } from '../../../game/heroes/state/towns.js'
import {
  heroIdsOf,
  heroTile,
  isTileExplored,
  tilesExploredSince,
  viewingPlayer
} from '../../../game/state/queries.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_DWELLING_FLAGGED,
  APP_FACT_HERO_HIRED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MINE_CAPTURED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_WORLD_READY,
  APP_UI_CAMERA_UPDATED,
  APP_UI_DEV_FOG_OF_WAR_CHANGED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

function clearNode(node) {
  if (!node) {
    return
  }

  node.replaceChildren?.()
}

export const registerMinimapViewModule = defineModule(
  ({ emit, env, state }) => {
    const minimapMap = env.document?.getElementById('minimap-map')
    const minimapTerrain = env.document?.getElementById('minimap-terrain')
    const minimapTowns = env.document?.getElementById('minimap-towns')
    const minimapHeroes = env.document?.getElementById('minimap-heroes')
    const minimapViewport = env.document?.getElementById('minimap-viewport')
    const createElement = env.document?.createElement?.bind(env.document)

    let map = null
    let staticOccupancy = null
    let entitiesById = new Map()
    let flaggedObjectTilesById = new Map()
    let tileElements = []
    let shownState = null
    let towns = []
    const heroMarkersById = new Map()
    let isDragging = false
    let dragTile = null
    let lastCameraUpdate = null

    function getFlaggedObjectCovering(tile) {
      const occupant = staticOccupancy?.getAt(tile)
      const entity =
        occupant?.kind === FOOTPRINT_BLOCKER_KIND ? entitiesById.get(occupant.ownerId) : occupant
      return isMine(entity) || isDwelling(entity) ? entity : null
    }

    function isExplored(tile) {
      return isTileExplored(state.get(), viewingPlayer(state.get()), tile)
    }

    function getTileClassName(tile) {
      if (!isExplored(tile)) {
        return 'minimap-tile minimap-tile--unexplored'
      }

      const classNames = ['minimap-tile']
      const terrainName = map.getTerrainType(tile)?.name
      if (terrainName) {
        classNames.push(`terrain-tile--${terrainName}`)
      }
      // A tile covered by a mine or dwelling takes its owner's colour instead of the terrain's.
      const flaggedObject = getFlaggedObjectCovering(tile)
      if (flaggedObject) {
        classNames.push(
          flaggedObjectOwner(state.get(), flaggedObject.id) === viewingPlayer(state.get())
            ? 'minimap-tile--player'
            : 'minimap-tile--neutral'
        )
      }

      return classNames.join(' ')
    }

    function placeMarker(marker, tile) {
      setStyleVar(marker, '--minimap-marker-x', `${((tile.x + 0.5) / map.width) * 100}%`)
      setStyleVar(marker, '--minimap-marker-y', `${((tile.y + 0.5) / map.height) * 100}%`)
    }

    function renderTerrain() {
      if (!map || !minimapTerrain || typeof createElement !== 'function') {
        return
      }

      clearNode(minimapTerrain)
      flaggedObjectTilesById = new Map()
      tileElements = []

      for (let y = 0; y < map.height; y += 1) {
        for (let x = 0; x < map.width; x += 1) {
          const tile = createElement('div')
          tile.className = getTileClassName({ x, y })
          tile.dataset.x = String(x)
          tile.dataset.y = String(y)
          minimapTerrain.appendChild(tile)
          tileElements.push(tile)

          const flaggedObject = getFlaggedObjectCovering({ x, y })
          if (flaggedObject) {
            flaggedObjectTilesById.set(flaggedObject.id, [
              ...(flaggedObjectTilesById.get(flaggedObject.id) ?? []),
              tile
            ])
          }
        }
      }
    }

    // A capture changes only the tiles that object covers, so the rest of the minimap stays as is.
    function renderFlaggedObjectTiles(entityId) {
      for (const tile of flaggedObjectTilesById.get(entityId) ?? []) {
        tile.className = getTileClassName({ x: Number(tile.dataset.x), y: Number(tile.dataset.y) })
      }
    }

    // The towns are drawn again only when tiles were explored, since one may have come into view.
    function renderExplored() {
      const current = state.get()
      const explored = tilesExploredSince(shownState, current, viewingPlayer(current))
      shownState = current
      for (const tile of explored) {
        tileElements[tile.y * map.width + tile.x].className = getTileClassName(tile)
      }
      if (explored.length > 0) {
        renderTowns()
      }
    }

    function renderExploration() {
      renderTerrain()
      shownState = state.get()
      renderTowns()
    }

    function renderTowns() {
      if (!map || !minimapTowns || typeof createElement !== 'function') {
        return
      }

      clearNode(minimapTowns)

      for (const town of towns.filter((town) => isExplored(town.tile))) {
        const marker = createElement('div')
        marker.className = isViewingPlayersTown(state.get(), town.id)
          ? 'minimap-town-marker minimap-town-marker--player'
          : 'minimap-town-marker'
        marker.dataset.entityId = town.id
        placeMarker(marker, town.tile)
        minimapTowns.appendChild(marker)
      }
    }

    function renderHeroes(heroIds) {
      heroMarkersById.clear()
      if (!map || !minimapHeroes || typeof createElement !== 'function') {
        return
      }

      clearNode(minimapHeroes)
      for (const heroId of heroIds) {
        const marker = createElement('div')
        marker.className = 'minimap-hero-marker'
        marker.dataset.entityId = heroId
        placeMarker(marker, heroTile(state.get(), heroId))
        minimapHeroes.appendChild(marker)
        heroMarkersById.set(heroId, marker)
      }
    }

    function tileAtPoint(event) {
      const rect = minimapMap.getBoundingClientRect?.()
      const width = Number(rect?.width ?? 0)
      const height = Number(rect?.height ?? 0)
      if (!map || width <= 0 || height <= 0) {
        return null
      }

      const localX = clamp(Number(event.clientX) - rect.left, 0, Math.max(0, width - 1))
      const localY = clamp(Number(event.clientY) - rect.top, 0, Math.max(0, height - 1))
      const tileX = Math.min(map.width - 1, Math.floor((localX / width) * map.width))
      const tileY = Math.min(map.height - 1, Math.floor((localY / height) * map.height))
      const tile = { x: tileX, y: tileY }
      return map.inBounds(tile) ? tile : null
    }

    // Past the minimap edge every move lands on the same edge tile, so only a new tile moves the camera.
    function dragCameraTo(event) {
      const tile = tileAtPoint(event)
      if (!tile || (tile.x === dragTile?.x && tile.y === dragTile?.y)) {
        return
      }

      dragTile = tile
      emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, { tile })
    }

    function updateViewportBox(cameraUpdate) {
      if (!map || !minimapViewport || !cameraUpdate) {
        return
      }

      const viewportWidth = Number(cameraUpdate.viewportSize?.width ?? 0)
      const viewportHeight = Number(cameraUpdate.viewportSize?.height ?? 0)
      const offsetX = Number(cameraUpdate.offset?.x ?? 0)
      const offsetY = Number(cameraUpdate.offset?.y ?? 0)
      const mapPixelWidth = map.width * map.tileWidth
      const mapPixelHeight = map.height * map.tileHeight

      if (mapPixelWidth <= 0 || mapPixelHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
        setStyleVar(minimapViewport, '--minimap-viewport-width', '0%')
        setStyleVar(minimapViewport, '--minimap-viewport-height', '0%')
        return
      }

      const maxVisibleX = Math.max(0, mapPixelWidth - viewportWidth)
      const maxVisibleY = Math.max(0, mapPixelHeight - viewportHeight)
      const visibleStartX = clamp(-offsetX, 0, maxVisibleX)
      const visibleStartY = clamp(-offsetY, 0, maxVisibleY)

      setStyleVar(
        minimapViewport,
        '--minimap-viewport-left',
        `${(visibleStartX / mapPixelWidth) * 100}%`
      )
      setStyleVar(
        minimapViewport,
        '--minimap-viewport-top',
        `${(visibleStartY / mapPixelHeight) * 100}%`
      )
      setStyleVar(
        minimapViewport,
        '--minimap-viewport-width',
        `${clamp((viewportWidth / mapPixelWidth) * 100, 0, 100)}%`
      )
      setStyleVar(
        minimapViewport,
        '--minimap-viewport-height',
        `${clamp((viewportHeight / mapPixelHeight) * 100, 0, 100)}%`
      )
    }

    return {
      domSubscriptions: [
        {
          // Pointer events cover mouse, touch and pen alike.
          target: minimapMap,
          type: 'pointerdown',
          handler: (event) => {
            if (!event.isPrimary || event.button !== 0) {
              return
            }

            // Keeps the browser from selecting text or dragging an image while the player drags.
            event.preventDefault?.()
            isDragging = true
            dragTile = null
            dragCameraTo(event)
          }
        },
        {
          // The drag follows the pointer on the whole window, so it keeps going when the pointer
          // leaves the minimap.
          target: env.window,
          type: 'pointermove',
          handler: (event) => {
            // Checking the held button too ends a drag whose pointerup never arrived.
            if (isDragging && event.isPrimary && (event.buttons & 1) === 1) {
              dragCameraTo(event)
            }
          }
        },
        {
          target: env.window,
          type: 'pointerup',
          handler: () => {
            isDragging = false
          }
        },
        {
          target: env.window,
          type: 'pointercancel',
          handler: () => {
            isDragging = false
          }
        }
      ],
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const entities = event.detail.scenario?.entities ?? []
            map = event.detail.map
            staticOccupancy = event.detail.staticOccupancy ?? null
            entitiesById = new Map(entities.map((entity) => [entity.id, entity]))
            towns = entities.filter(isTown)

            if (minimapMap && map?.width > 0 && map?.height > 0) {
              setStyleVar(minimapMap, '--minimap-columns', String(map.width))
              setStyleVar(minimapMap, '--minimap-rows', String(map.height))
              setStyleVar(minimapMap, '--minimap-map-width', String(map.width))
              setStyleVar(minimapMap, '--minimap-map-height', String(map.height))
            }

            renderExploration()
            renderHeroes(heroIdsOf(state.get(), viewingPlayer(state.get())))
            updateViewportBox(lastCameraUpdate)
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            if (tileElements.length > 0) {
              renderExplored()
            }

            const tile = event.detail?.to
            const marker = heroMarkersById.get(event.detail?.heroId)
            if (map && marker && tile) {
              placeMarker(marker, tile)
            }
          }
        },
        {
          type: APP_FACT_HERO_HIRED,
          handler: () => renderHeroes(heroIdsOf(state.get(), viewingPlayer(state.get())))
        },
        {
          type: APP_FACT_MINE_CAPTURED,
          handler: (event) => renderFlaggedObjectTiles(event.detail.entityId)
        },
        {
          type: APP_FACT_DWELLING_FLAGGED,
          handler: (event) => renderFlaggedObjectTiles(event.detail.entityId)
        },
        {
          type: APP_FACT_TOWN_CAPTURED,
          handler: () => {
            renderTowns()
            if (tileElements.length > 0) {
              renderExplored()
            }
          }
        },
        { type: APP_UI_DEV_FOG_OF_WAR_CHANGED, handler: renderExploration },
        {
          type: APP_UI_CAMERA_UPDATED,
          handler: (event) => {
            lastCameraUpdate = event.detail
            updateViewportBox(lastCameraUpdate)
          }
        }
      ]
    }
  },
  {
    id: 'minimap-view',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_MOVED,
      APP_FACT_HERO_HIRED,
      APP_FACT_DWELLING_FLAGGED,
      APP_FACT_MINE_CAPTURED,
      APP_FACT_TOWN_CAPTURED,
      APP_UI_CAMERA_UPDATED,
      APP_UI_DEV_FOG_OF_WAR_CHANGED
    ],
    produces: [APP_COMMAND_CAMERA_CENTER_ON_TILE]
  }
)
