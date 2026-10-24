import { sameTile } from '../../../engine/tile-utils.js'
import { findHero, isTown } from '../../../game/domain/entity-queries.js'
import { calendarDateOfTurn } from '../../../game/heroes/calendar.js'
import { getHeroArmy, getTownGarrison } from '../../../game/heroes/hero-army.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import {
  countTownsByHall,
  createTownBuildings,
  describeTownBox,
  townBuildingsCatalogue
} from '../../../game/heroes/town-buildings.js'
import { createOwnedTowns } from '../../../game/heroes/town-ownership.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_HERO_SCREEN_OPEN_REQUESTED,
  APP_UI_HERO_SELECTED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_NOTICE_OPENED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderDateBox } from '../presentation/date-box.js'
import { renderFoundResourcesBox } from '../presentation/found-resources-box.js'
import { renderHeroBox } from '../presentation/hero-box.js'
import {
  INFO_BOX_SELECTION,
  infoBoxTimeoutMs,
  nextInfoBoxState
} from '../presentation/info-box-states.js'
import { renderKingdomOverviewBox } from '../presentation/kingdom-overview-box.js'
import { renderTownBox } from '../presentation/town-box.js'

const DEFAULT_HERO_NAME = 'Hero'

// The hero list with its movement bar, the info box below it and the Next hero button. The hero is
// selected again on a new day and on leaving a town it is in.
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
    let townsById = new Map()
    const townBuildings = createTownBuildings()
    const ownedTowns = createOwnedTowns()
    let turnNumber = 1
    let selectedTown = null
    let isRestoring = false
    let infoBox = INFO_BOX_SELECTION
    let infoBoxTimer = null
    let openModalCount = 0

    function sendToInfoBox(event) {
      const next = nextInfoBoxState(infoBox, event)
      if (next === infoBox) {
        return
      }

      infoBox = next
      clearTimeout(infoBoxTimer)
      const timeoutMs = infoBoxTimeoutMs(infoBox)
      if (timeoutMs !== null) {
        infoBoxTimer = setTimeout(
          () => sendToInfoBox({ type: 'timedOut', isModalOpen: openModalCount > 0 }),
          timeoutMs
        )
      }
      renderInfoBox()
    }

    function onInfoBoxClicked(event) {
      sendToInfoBox({
        type: 'boxClicked',
        onArmySlot: Boolean(event.target.closest?.('.army-slot')),
        date: calendarDateOfTurn(turnNumber)
      })
    }

    function selectHero() {
      sendToInfoBox({ type: 'selectionChanged' })
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

    const INFO_BOX_RENDERERS = {
      resources: () => renderFoundResources(),
      date: () => renderDate(),
      kingdom: () => renderKingdomOverview(),
      selection: () => (isHeroSelected ? renderSelectedHero() : renderSelectedTown())
    }

    function renderInfoBox() {
      INFO_BOX_RENDERERS[infoBox.view]()
    }

    function renderFoundResources() {
      if (heroInfo) {
        heroInfo.setAttribute('aria-label', 'Resources found')
        renderFoundResourcesBox(heroInfo, env.document, infoBox.resources)
      }
    }

    function renderDate() {
      if (heroInfo) {
        heroInfo.setAttribute('aria-label', 'Date')
        renderDateBox(heroInfo, env.document, infoBox.date)
      }
    }

    function renderKingdomOverview() {
      if (heroInfo) {
        heroInfo.setAttribute('aria-label', 'Kingdom overview')
        renderKingdomOverviewBox(heroInfo, env.document, {
          halls: countTownsByHall({
            buildings: definitions?.buildings ?? {},
            builtInTowns: ownedTowns.ids().map((townId) => townBuildings.builtIn(townId))
          })
        })
      }
    }

    function renderSelectedHero() {
      if (heroInfo) {
        heroInfo.setAttribute('aria-label', 'Hero info')
        renderHeroBox(heroInfo, env.document, {
          name: heroName,
          skills: getHeroPrimarySkills({ entity: hero, definitions, levelUpSkills }),
          army: getHeroArmy({ entity: hero, definitions })
        })
      }
    }

    function renderSelectedTown() {
      if (!heroInfo || !selectedTown) {
        return
      }

      const town = townsById.get(selectedTown.entityId)
      heroInfo.setAttribute('aria-label', 'Town info')
      renderTownBox(heroInfo, env.document, {
        name: selectedTown.name,
        ...describeTownBox({
          catalogue: townBuildingsCatalogue(definitions, town?.type),
          built: townBuildings.builtIn(selectedTown.entityId)
        }),
        garrison: getTownGarrison({ entity: town, definitions })
      })
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
        { target: heroInfo, type: 'click', handler: onInfoBoxClicked },
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
            const towns = event.detail.scenario.entities.filter(isTown)
            townsById = new Map(towns.map((town) => [town.id, town]))
            townBuildings.onWorldReady(towns)
            ownedTowns.onWorldReady(event.detail.scenario.entities)
            turnNumber = 1
            selectedTown = null
            heroTile = hero?.tile ?? null
            heroName = event.detail.definitions?.hero?.name ?? DEFAULT_HERO_NAME
            definitions = event.detail.definitions
            levelUpSkills = []
            isHeroSelected = true
            sendToInfoBox({ type: 'selectionChanged' })
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
            selectedTown = { entityId: event.detail.entityId, name: event.detail.name }
            sendToInfoBox({ type: 'selectionChanged' })
            renderInfoBox()
          }
        },
        {
          type: APP_FACT_TOWN_CAPTURED,
          handler: (event) => {
            ownedTowns.onTownCaptured(event.detail.entityId)
          }
        },
        {
          type: APP_FACT_TOWN_GARRISON_CHANGED,
          handler: (event) => {
            const { entityId, garrison } = event.detail
            townsById.set(entityId, { ...townsById.get(entityId), garrison })
            if (!isHeroSelected && selectedTown?.entityId === entityId) {
              renderInfoBox()
            }
          }
        },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: (event) => {
            townBuildings.onBuildingBuilt(event.detail.entityId, event.detail.buildingId)
            if (!isHeroSelected && selectedTown?.entityId === event.detail.entityId) {
              renderInfoBox()
            }
          }
        },
        {
          type: APP_FACT_TURN_ENDED,
          handler: (event) => {
            turnNumber = event.detail.turnNumber
            selectAndCenterOnHero()
            if (!isRestoring) {
              sendToInfoBox({
                type: 'dayStarted',
                date: calendarDateOfTurn(event.detail.turnNumber)
              })
            }
          }
        },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: (event) => {
            const townTile = townsById.get(event.detail.entityId)?.tile
            if (heroTile && townTile && sameTile(heroTile, townTile)) {
              selectHero()
            }
          }
        },
        {
          type: APP_FACT_RESOURCE_COLLECTED,
          handler: (event) => {
            const { entityType, amount } = event.detail
            if (!isRestoring && entityType) {
              const name = definitions?.resources?.[entityType]?.name ?? entityType
              sendToInfoBox({
                type: 'resourceFound',
                resources: [{ type: entityType, name, amount }]
              })
            }
          }
        },
        {
          type: APP_FACT_MOVE_STARTED,
          handler: () => sendToInfoBox({ type: 'moveStarted' })
        },
        {
          type: APP_UI_NOTICE_OPENED,
          handler: () => {
            openModalCount += 1
          }
        },
        {
          type: APP_UI_INTERACTION_MODAL_OPENED,
          handler: () => {
            openModalCount += 1
          }
        },
        {
          type: APP_UI_INTERACTION_MODAL_CLOSED,
          handler: () => {
            openModalCount = Math.max(0, openModalCount - 1)
          }
        },
        {
          type: APP_UI_RESTORE_STARTED,
          handler: () => {
            isRestoring = true
          }
        },
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            isRestoring = false
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
      ],
      dispose: () => clearTimeout(infoBoxTimer)
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
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_FACT_TOWN_CAPTURED,
      APP_FACT_TOWN_GARRISON_CHANGED,
      APP_FACT_TURN_ENDED,
      APP_FACT_TOWN_LEFT,
      APP_FACT_RESOURCE_COLLECTED,
      APP_FACT_MOVE_STARTED,
      APP_UI_NOTICE_OPENED,
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_UI_INTERACTION_MODAL_CLOSED,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED
    ],
    produces: [
      APP_COMMAND_CAMERA_CENTER_ON_TILE,
      APP_UI_HERO_SELECTED,
      APP_UI_HERO_SCREEN_OPEN_REQUESTED
    ]
  }
)
