import { findHero } from '../../../game/domain/entity-queries.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_WORLD_READY
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const DEFAULT_HERO_NAME = 'Hero'

// The hero list with its movement bar, the info box below it and the Next hero button.
export const registerHeroPanelModule = defineModule(
  ({ emit, env }) => {
    const heroList = env.document?.getElementById('hero-list')
    const heroInfoName = env.document?.getElementById('hero-info-name')
    const nextHeroButton = env.document?.getElementById('next-hero-button')
    let heroTile = null
    let movementBar = null
    let movementPoints = null

    function centerOnHero() {
      if (heroTile) {
        emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, { tile: heroTile })
      }
    }

    function renderHero(name) {
      if (!heroList || !env.document) {
        return
      }

      const item = env.document.createElement('li')
      item.className = 'hero-list__item'

      const portrait = env.document.createElement('button')
      portrait.type = 'button'
      portrait.className = 'hero-list__portrait'
      portrait.setAttribute('aria-label', name)
      portrait.title = name
      portrait.textContent = name.charAt(0)
      portrait.addEventListener('click', (event) => {
        event.stopPropagation()
        centerOnHero()
      })

      movementBar = env.document.createElement('div')
      movementBar.className = 'hero-list__movement'
      movementBar.setAttribute('role', 'progressbar')
      movementBar.setAttribute('aria-label', 'Movement points')
      movementBar.setAttribute('aria-valuemin', '0')

      item.append(movementBar, portrait)
      heroList.replaceChildren(item)
      renderMovementPoints()

      if (heroInfoName) {
        heroInfoName.textContent = name
      }
    }

    function renderMovementPoints() {
      if (!movementPoints) {
        return
      }

      const { value, max } = movementPoints
      movementBar?.setAttribute('aria-valuenow', String(value))
      movementBar?.setAttribute('aria-valuemax', String(max))
      movementBar?.style.setProperty('--movement-fill', `${max > 0 ? (value / max) * 100 : 0}%`)

      if (nextHeroButton) {
        nextHeroButton.disabled = value <= 0
      }
    }

    return {
      domSubscriptions: [
        {
          target: nextHeroButton,
          type: 'click',
          handler: (event) => {
            event?.stopPropagation?.()
            centerOnHero()
          }
        }
      ],
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            heroTile = findHero(event.detail.scenario.entities)?.tile ?? null
            renderHero(event.detail.definitions?.hero?.name ?? DEFAULT_HERO_NAME)
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            heroTile = event.detail.to
          }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: (event) => {
            movementPoints = { value: event.detail.value, max: event.detail.max }
            renderMovementPoints()
          }
        }
      ]
    }
  },
  {
    id: 'hero-panel',
    phase: 'view',
    consumes: [APP_FACT_WORLD_READY, APP_FACT_HERO_MOVED, APP_FACT_MOVEMENT_POINTS_CHANGED],
    produces: [APP_COMMAND_CAMERA_CENTER_ON_TILE]
  }
)
