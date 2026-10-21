import { sameTile } from '../../../engine/tile-utils.js'
import { findHero, isTown } from '../../../game/domain/entity-queries.js'
import { ARMY_SLOT_COUNT, getHeroArmy } from '../../../game/heroes/hero-army.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_HERO_SELECTED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderHeroBox } from '../presentation/hero-box.js'
import { renderTownBox } from '../presentation/town-box.js'

const DEFAULT_HERO_NAME = 'Hero'

// The hero list with its movement bar, the info box below it and the Next hero button. The info
// box shows the selected hero, or the town selected in the town list. As in Heroes 3, the hero is
// selected again when a new day starts, and when the player leaves a town the hero is in.
export const registerHeroPanelModule = defineModule(
  ({ emit, env }) => {
    const heroList = env.document?.getElementById('hero-list')
    const heroInfo = env.document?.getElementById('hero-info')
    const nextHeroButton = env.document?.getElementById('next-hero-button')
    let heroTile = null
    let movementBar = null
    let movementPoints = null
    let hero = null
    let heroName = DEFAULT_HERO_NAME
    let definitions = {}
    let levelUpSkills = []
    let isHeroSelected = true
    let townTilesById = new Map()

    function selectHero() {
      if (!isHeroSelected) {
        isHeroSelected = true
        renderInfoBox()
        emit(APP_UI_HERO_SELECTED, {})
      }
    }

    function selectAndCenterOnHero() {
      selectHero()
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

    function renderInfoBox() {
      if (heroInfo && isHeroSelected) {
        heroInfo.setAttribute('aria-label', 'Hero info')
        renderHeroBox(heroInfo, env.document, {
          name: heroName,
          skills: getHeroPrimarySkills({ entity: hero, definitions, levelUpSkills }),
          army: getHeroArmy({ entity: hero, definitions })
        })
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
            selectAndCenterOnHero()
          }
        }
      ],
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            hero = findHero(event.detail.scenario.entities)
            townTilesById = new Map(
              event.detail.scenario.entities.filter(isTown).map((town) => [town.id, town.tile])
            )
            heroTile = hero?.tile ?? null
            heroName = event.detail.definitions?.hero?.name ?? DEFAULT_HERO_NAME
            definitions = event.detail.definitions
            levelUpSkills = []
            isHeroSelected = true
            renderHero(heroName)
            renderInfoBox()
          }
        },
        {
          type: APP_FACT_HERO_LEVELED_UP,
          handler: (event) => {
            levelUpSkills = [...levelUpSkills, event.detail.primarySkill]
            renderInfoBox()
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: (event) => {
            hero = { ...hero, army: event.detail.army }
            renderInfoBox()
          }
        },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: (event) => {
            isHeroSelected = false
            if (heroInfo) {
              heroInfo.setAttribute('aria-label', 'Town info')
              // Towns have no garrison yet.
              renderTownBox(heroInfo, env.document, {
                name: event.detail.name,
                garrison: new Array(ARMY_SLOT_COUNT).fill(null)
              })
            }
          }
        },
        { type: APP_FACT_TURN_ENDED, handler: selectAndCenterOnHero },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: (event) => {
            const townTile = townTilesById.get(event.detail.entityId)
            if (heroTile && townTile && sameTile(heroTile, townTile)) {
              selectHero()
            }
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
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_MOVED,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_FACT_HERO_LEVELED_UP,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_UI_TOWN_SELECTED,
      APP_FACT_TURN_ENDED,
      APP_FACT_TOWN_LEFT
    ],
    produces: [APP_COMMAND_CAMERA_CENTER_ON_TILE, APP_UI_HERO_SELECTED]
  }
)
