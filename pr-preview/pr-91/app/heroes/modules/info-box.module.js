import { calendarDateOfTurn } from '../../../game/heroes/calendar.js'
import { getHeroArmy, getTownGarrison } from '../../../game/heroes/hero-army.js'
import { getHeroLuck, getHeroMorale } from '../../../game/heroes/morale-and-luck.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import {
  builtIn,
  townGarrison,
  townType,
  viewingPlayersTownIds
} from '../../../game/heroes/state/towns.js'
import {
  countTownsByHall,
  describeTownBox,
  townBuildingsCatalogue
} from '../../../game/heroes/town-buildings.js'
import { selectedHeroIdOf, turnNumber, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
  APP_COMMAND_TOWN_GARRISON_STACK_MOVE_REQUESTED,
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_BATTLE_BONUS_GAINED,
  APP_FACT_HERO_BONUS_OBJECT_VISITED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
  APP_FACT_MINE_CAPTURED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_BUILDING_BUILT,
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
import { createArmyRearranging } from '../presentation/army-rearranging.js'
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
const HOVER_TEXT = 'Status Window'
const SELECT_TEXT = { hero: 'Select %s', garrison: 'Select %s' }

function armySlotAt(target) {
  return target?.closest?.('.army-slot') ?? null
}

// Registered after the hero panel: on a new day the hero is selected again before the date shows.
export const registerInfoBoxModule = defineModule(
  ({ env, config, emit, state }) => {
    const infoBox = env.document?.getElementById('hero-info')
    const statusBar = env.document?.getElementById('status-bar')
    const longPressMs = config?.longPressMs ?? DEFAULT_LONG_PRESS_MS
    let definitions = {}
    let isHeroSelected = true
    let selectedTown = null
    let isRestoring = false
    let view = 'selection'
    let content = {}
    let timer = null
    let openModalCount = 0
    let helpPopup = null
    let longPressTimer = null
    let ignoreNextClick = false
    let rearranging = null
    let hoveredSlotIndex = null

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
      const document = env.document
      helpPopup = openInfoBoxHelpPopup(
        document,
        document.querySelector('.game-shell') ?? document.body,
        document.querySelector('.viewport')
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
      const slot = armySlotAt(event.target)
      if (slot) {
        rearranging?.clickSlot(slot, event)
        return
      }
      send('clicked', { date: calendarDateOfTurn(turnNumber(state.get())) })
    }

    function showStatus(text) {
      if (statusBar) {
        statusBar.textContent = text
      }
    }

    function armySlots() {
      return [...infoBox.querySelectorAll('.army-slot')]
    }

    function onMouseOver(event) {
      const slot = armySlotAt(event.target)
      if (!slot) {
        showStatus(HOVER_TEXT)
        return
      }
      hoveredSlotIndex = armySlots().indexOf(slot)
      rearranging?.hoverSlot(slot)
    }

    function onMouseOut(event) {
      const slot = armySlotAt(event.target)
      if (slot && armySlotAt(event.relatedTarget) !== slot) {
        hoveredSlotIndex = null
        rearranging?.leaveSlot()
      }
    }

    // The box is drawn anew for every change, so the framing starts over with the new slots.
    function startRearranging(armies, onMove) {
      rearranging = createArmyRearranging({
        document: env.document,
        container: infoBox,
        slotLists: infoBox.querySelectorAll('[data-army]'),
        splitButton: null,
        selectText: SELECT_TEXT,
        canSplit: false,
        showStatus,
        onMove,
        onSplit: () => {}
      })
      rearranging.showArmies(armies)
      const hoveredSlot = armySlots()[hoveredSlotIndex]
      if (hoveredSlot) {
        rearranging.hoverSlot(hoveredSlot)
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
        rearranging = null
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
          builtInTowns: viewingPlayersTownIds(state.get()).map((townId) =>
            builtIn(state.get(), townId)
          )
        })
      })
    }

    function renderSelectedHero() {
      const hero = heroById(state.get(), selectedHeroIdOf(state.get(), viewingPlayer(state.get())))
      const army = getHeroArmy({ entity: hero, definitions })
      show('Hero info', renderHeroBox, {
        name: hero?.name ?? DEFAULT_HERO_NAME,
        skills: getHeroPrimarySkills({ entity: hero, definitions }),
        morale: getHeroMorale({ entity: hero, definitions }),
        luck: getHeroLuck({ entity: hero, definitions }),
        army
      })
      startRearranging({ hero: army }, (move) => emit(APP_COMMAND_HERO_STACK_MOVE_REQUESTED, move))
    }

    function renderSelectedTown() {
      if (!selectedTown) {
        return
      }

      const { entityId, name } = selectedTown
      const current = state.get()
      const garrison = getTownGarrison({
        entity: { garrison: townGarrison(current, entityId) },
        definitions
      })
      show('Town info', renderTownBox, {
        name,
        ...describeTownBox({
          catalogue: townBuildingsCatalogue(definitions, townType(current, entityId)),
          built: builtIn(current, entityId)
        }),
        garrison
      })
      startRearranging({ garrison }, (move) =>
        emit(APP_COMMAND_TOWN_GARRISON_STACK_MOVE_REQUESTED, { entityId, ...move })
      )
    }

    function resourceName(type) {
      return definitions?.resources?.[type]?.name ?? type
    }

    return {
      domSubscriptions: [
        { target: infoBox, type: 'click', handler: onClicked },
        { target: infoBox, type: 'pointerdown', handler: onPointerDown },
        { target: infoBox, type: 'contextmenu', handler: (event) => event.preventDefault() },
        { target: infoBox, type: 'mouseover', handler: onMouseOver },
        { target: infoBox, type: 'mouseout', handler: onMouseOut },
        { target: infoBox, type: 'mouseleave', handler: () => showStatus('') },
        { target: env.window, type: 'pointerup', handler: closeHelp },
        { target: env.window, type: 'pointercancel', handler: closeHelp }
      ],
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions
            select(true)
          }
        },
        { type: APP_FACT_HERO_LEVELED_UP, handler: () => render() },
        { type: APP_FACT_HERO_SECONDARY_SKILL_LEARNED, handler: () => render() },
        { type: APP_FACT_HERO_BONUS_OBJECT_VISITED, handler: () => render() },
        { type: APP_FACT_ARTIFACT_PICKED_UP, handler: () => render() },
        { type: APP_FACT_HERO_BATTLE_BONUS_GAINED, handler: () => render() },
        { type: APP_FACT_HERO_ARMY_CHANGED, handler: () => render() },
        {
          type: APP_UI_HERO_SELECTED,
          handler: () => select(true)
        },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: (event) => {
            select(false, { entityId: event.detail.entityId, name: event.detail.name })
          }
        },
        {
          type: APP_FACT_TOWN_GARRISON_CHANGED,
          handler: (event) => renderIfTownSelected(event.detail.entityId)
        },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: (event) => renderIfTownSelected(event.detail.entityId)
        },
        {
          type: APP_FACT_TURN_ENDED,
          handler: (event) => {
            if (!isRestoring) {
              send('dayStarted', { date: calendarDateOfTurn(event.detail.turnNumber) })
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
      APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
      APP_FACT_HERO_BONUS_OBJECT_VISITED,
      APP_FACT_ARTIFACT_PICKED_UP,
      APP_FACT_HERO_BATTLE_BONUS_GAINED,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_UI_HERO_SELECTED,
      APP_UI_TOWN_SELECTED,
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
    produces: [
      APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
      APP_COMMAND_TOWN_GARRISON_STACK_MOVE_REQUESTED
    ]
  }
)
