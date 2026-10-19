import { getHeroArmy } from '../../../game/heroes/hero-army.js'
import { getInfoPopupLines } from '../../../game/heroes/info-popup-text.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import { getEntityName } from '../../../game/heroes/status-bar-text.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MINE_CAPTURED,
  APP_FACT_WORLD_READY,
  APP_UI_TILE_INFO_DISMISSED,
  APP_UI_TILE_INFO_REQUESTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapObjects } from '../map-objects.js'
import { renderHeroBox } from '../presentation/hero-box.js'

const PLAYER_COLOR_NAME = 'Red'
const SCREEN_MARGIN_PX = 8
// Keeps a popup opened by a finger clear of the fingertip.
const FINGER_GAP_PX = 48

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

// The Heroes 3 right-click popup: shows what is on a tile while the right button (or a finger
// on a long press) is held, and closes on release.
export const registerInfoPopupModule = defineModule(
  ({ env }) => {
    const document = env.document
    const host = document.querySelector('.game-shell') ?? document.body
    const mapObjects = createMapObjects()
    const ownedMineIds = new Set()

    let definitions = {}
    let popup = null

    function close() {
      popup?.remove()
      popup = null
    }

    // Centred on the mouse as in Heroes 3; above a finger so the finger does not cover it.
    function place({ clientX, clientY, pointerType }) {
      const { width, height } = popup.getBoundingClientRect()
      const isTouch = pointerType === 'touch'
      let top = isTouch ? clientY - height - FINGER_GAP_PX : clientY - height / 2
      if (isTouch && top < SCREEN_MARGIN_PX) {
        top = clientY + FINGER_GAP_PX
      }
      const left = clientX - width / 2

      const window = env.window
      popup.style.left = `${clamp(left, SCREEN_MARGIN_PX, window.innerWidth - width - SCREEN_MARGIN_PX)}px`
      popup.style.top = `${clamp(top, SCREEN_MARGIN_PX, window.innerHeight - height - SCREEN_MARGIN_PX)}px`
    }

    // As in Heroes 3, a hero gets the same box as the info box.
    function fillHeroBox(entity) {
      popup.classList.add('info-popup--hero')
      const box = document.createElement('div')
      renderHeroBox(box, document, {
        name: getEntityName({ entity, definitions }),
        skills: getHeroPrimarySkills({ entity, definitions }),
        army: getHeroArmy({ entity, definitions })
      })
      popup.appendChild(box)
    }

    function fillLines(entity, tile) {
      // No creature portraits yet: the monster is pictured as it is drawn on the map.
      if (entity?.kind === 'MONSTER') {
        const picture = document.createElement('div')
        picture.className = 'info-popup__picture entity--monster'
        picture.setAttribute('role', 'img')
        picture.setAttribute('aria-label', getEntityName({ entity, definitions }))
        popup.appendChild(picture)
      }

      const lines = getInfoPopupLines({
        entity,
        terrainName: mapObjects.getTerrainName(tile),
        definitions,
        ownerColorName: entity && ownedMineIds.has(entity.id) ? PLAYER_COLOR_NAME : null
      })
      for (const line of lines) {
        const text = document.createElement('p')
        text.className = 'info-popup__line'
        text.textContent = line
        popup.appendChild(text)
      }
    }

    function open(tile, pointer) {
      close()
      const entity = mapObjects.getEntityAt(tile)

      popup = document.createElement('div')
      popup.className = 'info-popup'
      popup.setAttribute('role', 'tooltip')

      if (entity?.kind === 'HERO') {
        fillHeroBox(entity)
      } else {
        fillLines(entity, tile)
      }

      host.appendChild(popup)
      place(pointer ?? {})
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            mapObjects.onWorldReady(event.detail)
            definitions = event.detail.definitions
            ownedMineIds.clear()
            close()
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            mapObjects.onHeroMoved(event.detail.to)
          }
        },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: (event) => {
            mapObjects.onEntityRemoved(event.detail.entityId)
          }
        },
        {
          type: APP_FACT_MINE_CAPTURED,
          handler: (event) => {
            ownedMineIds.add(event.detail.entityId)
          }
        },
        {
          type: APP_UI_TILE_INFO_REQUESTED,
          handler: (event) => {
            open(event.detail.tile, event.detail.pointer)
          }
        },
        {
          type: APP_UI_TILE_INFO_DISMISSED,
          handler: close
        }
      ],
      dispose: close
    }
  },
  {
    id: 'info-popup',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_MOVED,
      APP_FACT_ENTITY_REMOVED,
      APP_FACT_MINE_CAPTURED,
      APP_UI_TILE_INFO_REQUESTED,
      APP_UI_TILE_INFO_DISMISSED
    ],
    produces: []
  }
)
