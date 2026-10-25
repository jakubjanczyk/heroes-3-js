import { sameTile } from '../../../engine/tile-utils.js'
import { isTown } from '../../../game/domain/entity-queries.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import {
  firstHeroIdOf,
  heroMovementPoints,
  heroTile,
  viewingPlayer
} from '../../../game/state/queries.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_HERO_SCREEN_OPEN_REQUESTED,
  APP_UI_HERO_SELECTED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const DEFAULT_HERO_NAME = 'Hero'

// The hero list with its movement bar and the Next hero button. The hero is selected again on a
// new day and on leaving a town it is in; each of these announces the selection, even when the hero
// already was selected, so the info box shows the hero again.
export const registerHeroPanelModule = defineModule(
  ({ emit, env, state }) => {
    const heroList = env.document?.getElementById('hero-list')
    const nextHeroButton = env.document?.getElementById('next-hero-button')
    let heroId = null
    let movementBar = null
    let isHeroSelected = true
    let townTilesById = new Map()

    function selectHero() {
      isHeroSelected = true
      emit(APP_UI_HERO_SELECTED, { heroId })
    }

    function selectAndCenterOnHero() {
      selectHero()
      const tile = heroTile(state.get(), heroId)
      if (tile) {
        emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, { tile })
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
        if (isHeroSelected) {
          emit(APP_UI_HERO_SCREEN_OPEN_REQUESTED, {})
          return
        }
        selectAndCenterOnHero()
      })

      movementBar = env.document.createElement('div')
      movementBar.className = 'hero-list__movement'
      movementBar.setAttribute('role', 'progressbar')
      movementBar.setAttribute('aria-label', 'Movement points')
      movementBar.setAttribute('aria-valuemin', '0')

      item.append(movementBar, portrait)
      heroList.replaceChildren(item)
      renderMovementPoints()
    }

    function renderMovementPoints() {
      const movementPoints = heroMovementPoints(state.get(), heroId)
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
            selectAndCenterOnHero()
          }
        }
      ],
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const { entities } = event.detail.scenario
            heroId = firstHeroIdOf(state.get(), viewingPlayer(state.get()))
            townTilesById = new Map(entities.filter(isTown).map((town) => [town.id, town.tile]))
            isHeroSelected = true
            renderHero(heroById(state.get(), heroId)?.name ?? DEFAULT_HERO_NAME)
          }
        },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: () => {
            isHeroSelected = false
          }
        },
        {
          type: APP_FACT_TURN_ENDED,
          handler: () => selectAndCenterOnHero()
        },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: (event) => {
            const tile = heroTile(state.get(), heroId)
            const townTile = townTilesById.get(event.detail.entityId)
            if (tile && townTile && sameTile(tile, townTile)) {
              selectHero()
            }
          }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: renderMovementPoints
        }
      ]
    }
  },
  {
    id: 'hero-panel',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_UI_TOWN_SELECTED,
      APP_FACT_TURN_ENDED,
      APP_FACT_TOWN_LEFT
    ],
    produces: [
      APP_COMMAND_CAMERA_CENTER_ON_TILE,
      APP_UI_HERO_SELECTED,
      APP_UI_HERO_SCREEN_OPEN_REQUESTED
    ]
  }
)
