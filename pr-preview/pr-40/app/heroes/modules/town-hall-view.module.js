import {
  APP_COMMAND_TOWN_BUILD_REQUESTED,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_LEFT,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const STATUS_TEXT = {
  built: () => 'Built',
  buildable: () => 'Can be built',
  missingRequirements: () => 'Requirements not met',
  builtToday: () => 'Already built here today',
  needsWater: () => 'Needs water nearby',
  onePerPlayer: (buildingName) => `Only one ${buildingName} per player`
}

function statusText(slot) {
  return STATUS_TEXT[slot.status]?.(slot.name) ?? ''
}

// Under a building's name: what it still needs, or why it cannot be built.
function buildingNote(slot) {
  if (slot.missingRequirements.length > 0) {
    return `Requires: ${slot.missingRequirements.join(', ')}`
  }

  return slot.status === 'buildable' ? '' : statusText(slot)
}

// The Hall opens from the town screen's Hall icon. Picking a building opens its window, and
// building closes the Hall, back to the town screen, as in Heroes 3.
export const registerTownHallViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let town = null
    let hall = null
    let buildingWindow = null
    let openBuildingId = null

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    function renderSlot(slot) {
      const item = cloneTemplate('town-hall-slot-template')
      item.classList.add(`town-hall__slot--${slot.status}`)
      const building = item.querySelector('.town-hall__building')
      building.dataset.buildingId = slot.buildingId
      building.title = statusText(slot)
      item.querySelector('.town-hall__name').textContent = slot.name
      const status = item.querySelector('.town-hall__status')
      status.id = `town-hall-status-${slot.buildingId}`
      status.textContent = statusText(slot)
      building.setAttribute('aria-describedby', status.id)
      return item
    }

    function renderRow(row) {
      const list = document.createElement('ul')
      list.className = 'town-hall__row'
      list.append(...row.map(renderSlot))
      return list
    }

    function renderBuildingWindow() {
      const slot = town.hall.rows.flat().find(({ buildingId }) => buildingId === openBuildingId)
      if (!slot) {
        closeBuildingWindow()
        return
      }

      buildingWindow.setAttribute('aria-label', slot.name)
      buildingWindow.querySelector('.building-window__name').textContent = slot.name
      buildingWindow.querySelector('.building-window__note').textContent = buildingNote(slot)
      buildingWindow.querySelector('.building-window__cost').replaceChildren(
        ...slot.cost.map(({ resource, amount }) => {
          const item = document.createElement('li')
          item.textContent = `${amount} ${resource}`
          return item
        })
      )
      buildingWindow.querySelector('[data-building-action="build"]').disabled =
        slot.status !== 'buildable'
    }

    function renderHall() {
      hall.querySelector('.town-hall__title').textContent = town.hall.title
      hall.querySelector('.town-hall__rows').replaceChildren(...town.hall.rows.map(renderRow))
      if (buildingWindow) {
        renderBuildingWindow()
      }
    }

    function openHall() {
      const townScreen = gameShell.querySelector('.town-screen')
      if (!town || !townScreen || hall) {
        return
      }

      hall = cloneTemplate('town-hall-template')
      townScreen.append(hall)
      renderHall()
    }

    function openBuildingWindow(buildingId) {
      openBuildingId = buildingId
      if (!buildingWindow) {
        buildingWindow = cloneTemplate('building-window-template')
        hall.append(buildingWindow)
      }
      renderBuildingWindow()
    }

    function closeBuildingWindow() {
      buildingWindow?.remove()
      buildingWindow = null
      openBuildingId = null
    }

    function closeHall() {
      closeBuildingWindow()
      hall?.remove()
      hall = null
    }

    function onTownUpdated(update) {
      if (update.entityId !== town?.entityId) {
        closeHall()
      }

      town = update
      if (hall) {
        renderHall()
      }
    }

    function onClick(event) {
      const { target } = event
      if (target.closest('[data-town-action="hall"]')) {
        openHall()
      } else if (target.closest('[data-hall-action="close"]')) {
        closeHall()
      } else if (target.closest('[data-building-action="build"]')) {
        emit(APP_COMMAND_TOWN_BUILD_REQUESTED, {
          entityId: town.entityId,
          buildingId: openBuildingId
        })
      } else if (target.closest('[data-building-action="cancel"]')) {
        closeBuildingWindow()
      } else if (target.closest('.town-hall__building')) {
        openBuildingWindow(target.closest('.town-hall__building').dataset.buildingId)
      }
    }

    return {
      subscriptions: [
        { type: APP_UI_TOWN_UPDATED, handler: (event) => onTownUpdated(event.detail) },
        { type: APP_FACT_TOWN_BUILDING_BUILT, handler: closeHall },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: () => {
            closeHall()
            town = null
          }
        }
      ],
      domSubscriptions: [{ target: gameShell, type: 'click', handler: onClick }],
      dispose: closeHall
    }
  },
  {
    id: 'town-hall-view',
    phase: 'view',
    consumes: [APP_UI_TOWN_UPDATED, APP_FACT_TOWN_BUILDING_BUILT, APP_FACT_TOWN_LEFT],
    produces: [APP_COMMAND_TOWN_BUILD_REQUESTED]
  }
)
