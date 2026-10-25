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
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_MINE_CAPTURED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_HERO_SELECTED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_NOTICE_OPENED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderCapturedMineBox } from '../presentation/captured-mine-box.js'
import { renderDateBox } from '../presentation/date-box.js'
import { renderFoundResourcesBox } from '../presentation/found-resources-box.js'
import { renderHeroBox } from '../presentation/hero-box.js'
import { openInfoBoxHelpPopup } from '../presentation/info-box-help-popup.js'
import { infoBoxTimeoutMs, nextInfoBoxView } from '../presentation/info-box-states.js'
import { renderKingdomOverviewBox } from '../presentation/kingdom-overview-box.js'
import { renderTownBox } from '../presentation/town-box.js'

const DEFAULT_HERO_NAME = 'Hero'
const DEFAULT_LONG_PRESS_MS = 500

// Registered after the hero panel: on a new day the hero is selected again before the date shows.
export const registerInfoBoxModule = defineModule(
  ({ env, config }) => {
    const infoBox = env.document?.getElementById('hero-info')
    const longPressMs = config?.longPressMs ?? DEFAULT_LONG_PRESS_MS
    let hero = null
    let heroName = DEFAULT_HERO_NAME
    let definitions = {}
    let levelUpSkills = []
    let isHeroSelected = true
    let selectedTown = null
    let townsById = new Map()
    const townBuildings = createTownBuildings()
    const ownedTowns = createOwnedTowns()
    let turnNumber = 1
    let isRestoring = false
    let view = 'selection'
    let content = {}
    let timer = null
    let openModalCount = 0
    let helpPopup = null
    let longPressTimer = null
    let ignoreNextClick = false

    function send(eventType, nextContent = {}) {
      const next = nextInfoBoxView(view, eventType)
      if (!next) {
        return
      }

      view = next
      content = nextContent
      clearTimeout(timer)
      const timeoutMs = infoBoxTimeoutMs(view)
      if (timeoutMs !== null) {
        timer = setTimeout(onTimedOut, timeoutMs)
      }
      render()
    }

    // A view whose time runs out while a window is open stays until something else replaces it.
    function onTimedOut() {
      if (openModalCount === 0) {
        send('timedOut')
      }
    }

    function openHelp() {
      closeHelp()
      helpPopup = openInfoBoxHelpPopup(
        env.document,
        env.document.querySelector('.game-shell') ?? env.document.body
      )
    }

    function closeHelp() {
      clearTimeout(longPressTimer)
      longPressTimer = null
      helpPopup?.remove()
      helpPopup = null
    }

    // A held right button, or a finger held still, explains the box until it is let go.
    function onPointerDown(event) {
      ignoreNextClick = false
      if (event.pointerType === 'touch') {
        clearTimeout(longPressTimer)
        longPressTimer = setTimeout(() => {
          ignoreNextClick = true
          openHelp()
        }, longPressMs)
      } else if (event.button === 2) {
        openHelp()
      }
    }

    function onClicked(event) {
      // The browser still sends a click when the finger of a long press lifts.
      if (ignoreNextClick) {
        ignoreNextClick = false
        return
      }
      if (!event.target.closest?.('.army-slot')) {
        send('clicked', { date: calendarDateOfTurn(turnNumber) })
      }
    }

    function select(isHero, town = null) {
      isHeroSelected = isHero
      selectedTown = town
      send('selectionChanged')
    }

    function renderIfTownSelected(entityId) {
      if (!isHeroSelected && selectedTown?.entityId === entityId) {
        render()
      }
    }

    const RENDERERS = {
      resources: () => show('Resources found', renderFoundResourcesBox, content.resources),
      mine: () => show('Mine captured', renderCapturedMineBox, content.mine),
      date: () => show('Date', renderDateBox, content.date),
      kingdom: () => renderKingdomOverview(),
      selection: () => (isHeroSelected ? renderSelectedHero() : renderSelectedTown())
    }

    function render() {
      if (infoBox) {
        RENDERERS[view]()
      }
    }

    function show(label, renderBox, boxContent) {
      infoBox.setAttribute('aria-label', label)
      renderBox(infoBox, env.document, boxContent)
    }

    function renderKingdomOverview() {
      show('Kingdom overview', renderKingdomOverviewBox, {
        halls: countTownsByHall({
          buildings: definitions?.buildings ?? {},
          builtInTowns: ownedTowns.ids().map((townId) => townBuildings.builtIn(townId))
        })
      })
    }

    function renderSelectedHero() {
      show('Hero info', renderHeroBox, {
        name: heroName,
        skills: getHeroPrimarySkills({ entity: hero, definitions, levelUpSkills }),
        army: getHeroArmy({ entity: hero, definitions })
      })
    }

    function renderSelectedTown() {
      if (!selectedTown) {
        return
      }

      const town = townsById.get(selectedTown.entityId)
      show('Town info', renderTownBox, {
        name: selectedTown.name,
        ...describeTownBox({
          catalogue: townBuildingsCatalogue(definitions, town?.type),
          built: townBuildings.builtIn(selectedTown.entityId)
        }),
        garrison: getTownGarrison({ entity: town, definitions })
      })
    }

    function resourceName(type) {
      return definitions?.resources?.[type]?.name ?? type
    }

    return {
      domSubscriptions: [
        { target: infoBox, type: 'click', handler: onClicked },
        { target: infoBox, type: 'pointerdown', handler: onPointerDown },
        { target: infoBox, type: 'contextmenu', handler: (event) => event.preventDefault() },
        { target: env.window, type: 'pointerup', handler: closeHelp },
        { target: env.window, type: 'pointercancel', handler: closeHelp }
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
            heroName = event.detail.definitions?.hero?.name ?? DEFAULT_HERO_NAME
            definitions = event.detail.definitions
            levelUpSkills = []
            select(true)
          }
        },
        {
          type: APP_FACT_HERO_LEVELED_UP,
          handler: (event) => {
            levelUpSkills = [...levelUpSkills, event.detail.primarySkill]
            render()
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: (event) => {
            hero = { ...hero, army: event.detail.army }
            render()
          }
        },
        { type: APP_UI_HERO_SELECTED, handler: () => select(true) },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: (event) => {
            select(false, { entityId: event.detail.entityId, name: event.detail.name })
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
            renderIfTownSelected(entityId)
          }
        },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: (event) => {
            townBuildings.onBuildingBuilt(event.detail.entityId, event.detail.buildingId)
            renderIfTownSelected(event.detail.entityId)
          }
        },
        {
          type: APP_FACT_TURN_ENDED,
          handler: (event) => {
            turnNumber = event.detail.turnNumber
            if (!isRestoring) {
              send('dayStarted', { date: calendarDateOfTurn(turnNumber) })
            }
          }
        },
        {
          type: APP_FACT_RESOURCE_COLLECTED,
          handler: (event) => {
            const { entityType, amount } = event.detail
            if (!isRestoring && entityType) {
              send('resourcesFound', {
                resources: [{ type: entityType, name: resourceName(entityType), amount }]
              })
            }
          }
        },
        {
          type: APP_FACT_MINE_CAPTURED,
          handler: (event) => {
            const mine = definitions?.mines?.[event.detail.entityType]
            if (!isRestoring && mine) {
              const { resource, amount } = mine.income
              send('mineCaptured', {
                mine: {
                  name: mine.name,
                  income: { type: resource, name: resourceName(resource), amount }
                }
              })
            }
          }
        },
        { type: APP_FACT_MOVE_STARTED, handler: () => send('moveStarted') },
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
        }
      ],
      dispose: () => {
        clearTimeout(timer)
        closeHelp()
      }
    }
  },
  {
    id: 'info-box',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_LEVELED_UP,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_UI_HERO_SELECTED,
      APP_UI_TOWN_SELECTED,
      APP_FACT_TOWN_CAPTURED,
      APP_FACT_TOWN_GARRISON_CHANGED,
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_FACT_TURN_ENDED,
      APP_FACT_RESOURCE_COLLECTED,
      APP_FACT_MINE_CAPTURED,
      APP_FACT_MOVE_STARTED,
      APP_UI_NOTICE_OPENED,
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_UI_INTERACTION_MODAL_CLOSED,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED
    ],
    produces: []
  }
)
