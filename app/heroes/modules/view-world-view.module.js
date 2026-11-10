import { clamp } from '../../../engine/math-utils.js'
import { mineOwner } from '../../../game/heroes/state/map-objects.js'
import { townOwner } from '../../../game/heroes/state/towns.js'
import {
  heroIdsOf,
  heroOwner,
  heroTile,
  isRemoved,
  isTileExplored,
  playerColors,
  selectedHeroIdOf,
  viewingPlayer
} from '../../../game/state/queries.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_CAMERA_UPDATED,
  APP_UI_VIEW_WORLD_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapOverview } from '../presentation/map-overview.js'

const MIDDLE_ZOOM_TILE_SIZE = 11
const MARKED_KINDS = new Set(['TOWN', 'ARTIFACT', 'MINE', 'RESOURCE'])

// 'GOLD_PILE' is drawn as 'gold'.
const resourceLook = (resourceType) => resourceType?.replace(/_PILE$/, '').toLowerCase()

export const registerViewWorldViewModule = defineModule(
  ({ emit, env, state }) => {
    const document = env.document
    const screen = document?.querySelector('.view-world')
    const viewport = screen?.querySelector('.view-world__viewport')
    const mapElement = screen?.querySelector('.view-world__map')
    let map = null
    let overview = null
    let definitions = {}
    let entities = []
    let lastCameraUpdate = null
    let shown = null
    let tileSize = MIDDLE_ZOOM_TILE_SIZE
    let offset = { x: 0, y: 0 }
    let drag = null

    const ownerLook = (owner) => (owner === viewingPlayer(state.get()) ? 'player' : 'neutral')

    function resourceOf(entity) {
      return entity.kind === 'MINE'
        ? definitions.mines?.[entity.type]?.income?.resource
        : entity.type
    }

    function ownerOf(entity) {
      if (entity.kind === 'TOWN') {
        return townOwner(state.get(), entity.id)
      }
      return entity.kind === 'MINE' ? mineOwner(state.get(), entity.id) : null
    }

    function objectMark(entity) {
      const label = { TOWN: 'Town', ARTIFACT: 'Artifact', MINE: 'Mine', RESOURCE: 'Resource' }[
        entity.kind
      ]
      const resource =
        entity.kind === 'MINE' || entity.kind === 'RESOURCE' ? resourceOf(entity) : null
      const resourceName = resource && definitions.resources?.[resource]?.name
      return {
        kind: entity.kind,
        tile: entity.tile,
        label: resourceName ? `${label} (${resourceName})` : label,
        look: ownerLook(ownerOf(entity)),
        resource: resourceLook(resource)
      }
    }

    function heroMarks() {
      const current = state.get()
      return playerColors(current)
        .flatMap((player) => heroIdsOf(current, player))
        .map((heroId) => ({
          kind: 'HERO',
          tile: heroTile(current, heroId),
          label: 'Hero',
          look: ownerLook(heroOwner(current, heroId)),
          resource: null
        }))
    }

    function isExplored(tile) {
      return isTileExplored(state.get(), viewingPlayer(state.get()), tile)
    }

    function shownMarks() {
      const objects = entities
        .filter((entity) => MARKED_KINDS.has(entity.kind) && !isRemoved(state.get(), entity.id))
        .map(objectMark)
      return [...objects, ...heroMarks()].filter(
        (mark) => isExplored(mark.tile) || shown.reveals.includes(mark.kind)
      )
    }

    function renderIcon(mark) {
      const icon = document.createElement('span')
      icon.setAttribute('role', 'img')
      icon.setAttribute('aria-label', mark.label)
      icon.className = [
        'view-world-icon',
        `view-world-icon--${mark.kind.toLowerCase()}`,
        `view-world-icon--${mark.look}`,
        ...(mark.resource ? [`view-world-icon--${mark.resource}`] : [])
      ].join(' ')
      return icon
    }

    function renderMap() {
      const tiles = []
      for (let y = 0; y < map.height; y += 1) {
        for (let x = 0; x < map.width; x += 1) {
          const tile = document.createElement('div')
          tile.className = [
            'view-world-tile',
            ...overview.tileClassNames(
              state.get(),
              { x, y },
              { explored: isExplored({ x, y }), showsTerrain: shown.showsTerrain }
            )
          ].join(' ')
          tile.dataset.x = String(x)
          tile.dataset.y = String(y)
          tiles.push(tile)
        }
      }
      for (const mark of shownMarks()) {
        tiles[mark.tile.y * map.width + mark.tile.x].append(renderIcon(mark))
      }
      mapElement.style.setProperty('--view-world-columns', String(map.width))
      mapElement.replaceChildren(...tiles)
    }

    // A map smaller than the screen sits in its middle; a larger one never shows past its edges.
    function placedOffset(viewportSize, mapSize, centre) {
      if (mapSize <= viewportSize) {
        return (viewportSize - mapSize) / 2
      }
      return clamp(viewportSize / 2 - centre * tileSize, viewportSize - mapSize, 0)
    }

    function applyPlacement() {
      mapElement.style.setProperty('--view-world-tile-size', `${tileSize}px`)
      mapElement.style.setProperty('--view-world-offset-x', `${offset.x}px`)
      mapElement.style.setProperty('--view-world-offset-y', `${offset.y}px`)
    }

    function centreOn(centre) {
      offset = {
        x: placedOffset(viewport.clientWidth, map.width * tileSize, centre.x),
        y: placedOffset(viewport.clientHeight, map.height * tileSize, centre.y)
      }
      applyPlacement()
    }

    function shownCentre() {
      return {
        x: (viewport.clientWidth / 2 - offset.x) / tileSize,
        y: (viewport.clientHeight / 2 - offset.y) / tileSize
      }
    }

    // The tile at the middle of what the adventure map shows, in fractions of a tile.
    function cameraCentre() {
      const { offset: cameraOffset, viewportSize } = lastCameraUpdate ?? {}
      if (!cameraOffset || !viewportSize) {
        const heroId = selectedHeroIdOf(state.get(), viewingPlayer(state.get()))
        const tile = heroId ? heroTile(state.get(), heroId) : { x: 0, y: 0 }
        return { x: tile.x + 0.5, y: tile.y + 0.5 }
      }
      return {
        x: (viewportSize.width / 2 - cameraOffset.x) / map.tileWidth,
        y: (viewportSize.height / 2 - cameraOffset.y) / map.tileHeight
      }
    }

    function renderZoomButtons() {
      for (const button of screen.querySelectorAll('[data-view-world-zoom]')) {
        button.setAttribute(
          'aria-pressed',
          String(Number(button.dataset.viewWorldZoom) === tileSize)
        )
      }
    }

    function open(detail) {
      if (!map || !screen) {
        return
      }
      const wasOpen = shown !== null
      shown = { reveals: detail.reveals ?? [], showsTerrain: Boolean(detail.showsTerrain) }
      tileSize = MIDDLE_ZOOM_TILE_SIZE
      renderMap()
      renderZoomButtons()
      screen.hidden = false
      screen.setAttribute('aria-modal', 'true')
      centreOn(cameraCentre())
      screen.focus()
      if (!wasOpen) {
        emit(APP_UI_ADVENTURE_MAP_COVERED, {})
      }
    }

    function hide() {
      shown = null
      drag = null
      screen.hidden = true
      screen.removeAttribute('aria-modal')
      mapElement.replaceChildren()
    }

    function close() {
      if (!shown) {
        return
      }
      hide()
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
      const heroId = selectedHeroIdOf(state.get(), viewingPlayer(state.get()))
      if (heroId) {
        emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, { tile: heroTile(state.get(), heroId) })
      }
    }

    function zoomTo(size) {
      const centre = shownCentre()
      tileSize = size
      renderZoomButtons()
      centreOn(centre)
    }

    function onClick(event) {
      if (!shown || !screen.contains(event.target)) {
        return
      }
      event.stopPropagation()
      const zoom = event.target.closest('[data-view-world-zoom]')
      if (zoom) {
        zoomTo(Number(zoom.dataset.viewWorldZoom))
      } else if (event.target.closest('[data-view-world-action="ok"]')) {
        close()
      }
    }

    function dragTo(event) {
      const centre = {
        x: (viewport.clientWidth / 2 - (drag.offset.x + event.clientX - drag.from.x)) / tileSize,
        y: (viewport.clientHeight / 2 - (drag.offset.y + event.clientY - drag.from.y)) / tileSize
      }
      centreOn(centre)
    }

    return {
      domSubscriptions: [
        { target: screen, type: 'click', handler: onClick },
        {
          target: viewport,
          type: 'pointerdown',
          handler: (event) => {
            if (!shown || !event.isPrimary || event.button !== 0) {
              return
            }
            event.preventDefault?.()
            drag = { from: { x: event.clientX, y: event.clientY }, offset: { ...offset } }
          }
        },
        {
          target: env.window,
          type: 'pointermove',
          handler: (event) => {
            if (drag && event.isPrimary && (event.buttons & 1) === 1) {
              dragTo(event)
            }
          }
        },
        {
          target: env.window,
          type: 'pointerup',
          handler: () => {
            drag = null
          }
        },
        {
          target: env.window,
          type: 'pointercancel',
          handler: () => {
            drag = null
          }
        }
      ],
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            map = event.detail.map
            definitions = event.detail.definitions ?? {}
            entities = event.detail.scenario?.entities ?? []
            overview = createMapOverview({
              map,
              staticOccupancy: event.detail.staticOccupancy,
              entities
            })
          }
        },
        {
          type: APP_UI_CAMERA_UPDATED,
          handler: (event) => {
            lastCameraUpdate = event.detail
          }
        },
        { type: APP_UI_VIEW_WORLD_OPENED, handler: (event) => open(event.detail) }
      ],
      dispose: () => {
        if (screen && shown) {
          hide()
        }
      }
    }
  },
  {
    id: 'view-world-view',
    phase: 'view',
    consumes: [APP_FACT_WORLD_READY, APP_UI_CAMERA_UPDATED, APP_UI_VIEW_WORLD_OPENED],
    produces: [
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_COMMAND_CAMERA_CENTER_ON_TILE
    ]
  }
)
