import {
  APP_COMMAND_TOWN_LEAVE_REQUESTED,
  APP_COMMAND_TOWN_OPEN_REQUESTED,
  APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
  APP_FACT_TOWN_LEFT,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { CASTLE_BUILDING_ART, castleBackgroundArt } from '../presentation/castle-town-art.js'
import { renderArmyStack } from '../presentation/hero-box.js'
import { renderTownList } from '../presentation/town-list.js'

const NO_ARMY = []
const SVG_NS = 'http://www.w3.org/2000/svg'
// The size of a Heroes 3 town picture, which the town's `picture` data places buildings on.
const PICTURE_VIEW_BOX = '0 0 800 374'

// For a building the art has no drawing of yet.
function placeholderArt() {
  return '<rect width="40" height="40" fill="#e6e2d6" stroke="#2a221c"/>'
}

function buildingAt(target) {
  return target?.closest?.('.town-building') ?? null
}

export const registerTownScreenViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let townScreen = null
    // The garrison or visiting hero stack framed for moving, as `{ army, slot }`.
    let selectedStack = null

    function fillSlots(list, army) {
      list.querySelectorAll('.army-slot').forEach((slot, index) => {
        const stack = army[index]
        slot.replaceChildren(...(stack ? [renderArmyStack(document, stack)] : []))
      })
    }

    // Each tier's creature and weekly growth; clicking it opens its recruit window.
    function showCreatures(creatures) {
      townScreen.querySelectorAll('.creature-growth').forEach((slot, index) => {
        const tier = creatures[index]
        if (!tier) {
          slot.replaceChildren()
          return
        }

        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'creature-growth__recruit'
        button.dataset.recruitTier = String(index + 1)
        button.setAttribute('aria-label', `Recruit ${tier.name}`)
        button.title = `Recruit ${tier.name}`
        button.append(renderArmyStack(document, { name: tier.name, count: `+${tier.growth}` }))
        slot.replaceChildren(button)
      })
    }

    // Named after the town's fort, as Heroes 3 draws its level; the frame stays empty without one.
    function showFortIcon(fort) {
      const icon = townScreen.querySelector('.town-panel__fort')
      icon.hidden = !fort
      icon.setAttribute('aria-label', fort?.name ?? '')
      icon.title = fort?.name ?? ''
      icon.dataset.level = String(fort?.level ?? 0)
    }

    function createPicture() {
      const picture = document.createElementNS(SVG_NS, 'svg')
      picture.setAttribute('class', 'town-screen__picture')
      picture.setAttribute('viewBox', PICTURE_VIEW_BOX)
      picture.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      picture.innerHTML = `<g aria-hidden="true">${castleBackgroundArt()}</g><g class="town-screen__buildings"></g>`
      return picture
    }

    // What a building opens is marked as on the panel's buttons, so the Hall, Fort and recruit
    // windows open from the picture as from the panel.
    function renderBuilding({ buildingId, name, x, y, action }) {
      const building = document.createElementNS(SVG_NS, 'g')
      building.setAttribute('class', 'town-building')
      building.setAttribute('role', 'button')
      building.setAttribute('tabindex', '0')
      building.setAttribute('aria-label', name)
      building.setAttribute('transform', `translate(${x} ${y})`)
      if (action?.opens === 'recruit') {
        building.setAttribute('data-recruit-tier', String(action.tier))
      } else if (action) {
        building.setAttribute('data-town-action', action.opens)
      }
      building.innerHTML = (CASTLE_BUILDING_ART[buildingId] ?? placeholderArt)()
      return building
    }

    function showPicture(picture) {
      const view = townScreen.querySelector('.town-screen__view')
      if (!view.firstElementChild) {
        view.append(createPicture())
      }
      view.querySelector('.town-screen__buildings').replaceChildren(...picture.map(renderBuilding))
    }

    function selectStack(stack) {
      selectedStack = stack
      for (const list of townScreen.querySelectorAll('.town-panel__slots')) {
        for (const [index, slot] of [...list.children].entries()) {
          if (list.dataset.army === stack?.army && index === stack?.slot) {
            slot.setAttribute('aria-current', 'true')
          } else {
            slot.removeAttribute('aria-current')
          }
        }
      }
    }

    // As in Heroes 3: the first click frames a stack, the second moves it onto the clicked slot
    // (or unframes it, clicked again). A move the town refuses leaves the stack framed.
    function clickArmySlot(slot) {
      const list = slot.parentElement
      const clicked = { army: list.dataset.army, slot: [...list.children].indexOf(slot) }
      if (!selectedStack) {
        if (slot.querySelector('.army-slot__creature')) {
          selectStack(clicked)
        }
        return
      }

      if (selectedStack.army === clicked.army && selectedStack.slot === clicked.slot) {
        selectStack(null)
        return
      }
      emit(APP_COMMAND_TOWN_STACK_MOVE_REQUESTED, { from: selectedStack, to: clicked })
    }

    function showStatus(text) {
      townScreen.querySelector('.town-screen__status-bar').textContent = text
    }

    function showVisitingHero(visitingHero) {
      const hero = townScreen.querySelector('.town-panel__hero--visiting')
      const name = visitingHero?.name ?? ''
      if (name) {
        hero.setAttribute('role', 'img')
        hero.setAttribute('aria-label', name)
      } else {
        hero.removeAttribute('role')
        hero.removeAttribute('aria-label')
      }
      hero.title = name
      hero.textContent = name.charAt(0)
      fillSlots(
        townScreen.querySelector('[aria-label="Visiting hero army"]'),
        visitingHero?.army ?? NO_ARMY
      )
    }

    function showTown({
      entityId,
      name,
      garrison,
      visitingHero,
      ownedTowns,
      goldIncome,
      creatures,
      fort,
      picture
    }) {
      if (!gameShell) {
        return
      }

      if (!townScreen) {
        townScreen = document
          .getElementById('town-screen-template')
          .content.firstElementChild.cloneNode(true)
        gameShell.append(townScreen)
        emit(APP_UI_ADVENTURE_MAP_COVERED, {})
      }

      townScreen.querySelector('.town-panel__name').textContent = name
      townScreen.querySelector('.town-panel__income').textContent = String(goldIncome)
      fillSlots(townScreen.querySelector('[aria-label="Garrison"]'), garrison)
      showPicture(picture)
      showCreatures(creatures)
      showFortIcon(fort)
      showVisitingHero(visitingHero)
      selectStack(null)
      renderTownList(townScreen.querySelector('.town-panel__town-list'), document, {
        towns: ownedTowns,
        selectedTownId: entityId
      })
    }

    function closeTown() {
      if (!townScreen) {
        return
      }

      townScreen.remove()
      townScreen = null
      selectedStack = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    return {
      subscriptions: [
        { type: APP_UI_TOWN_UPDATED, handler: (event) => showTown(event.detail) },
        { type: APP_FACT_TOWN_LEFT, handler: closeTown }
      ],
      domSubscriptions: [
        {
          target: gameShell,
          type: 'mouseover',
          handler: (event) => {
            if (townScreen?.contains(event.target)) {
              showStatus(buildingAt(event.target)?.getAttribute('aria-label') ?? '')
            }
          }
        },
        {
          target: gameShell,
          type: 'mouseout',
          handler: (event) => {
            const building = buildingAt(event.target)
            if (building && buildingAt(event.relatedTarget) !== building) {
              showStatus('')
            }
          }
        },
        {
          target: gameShell,
          type: 'focusin',
          handler: (event) => {
            const building = buildingAt(event.target)
            if (building && townScreen?.contains(building)) {
              showStatus(building.getAttribute('aria-label'))
            }
          }
        },
        {
          // The buildings are SVG, which Enter and Space don't press as they do a button.
          target: gameShell,
          type: 'keydown',
          handler: (event) => {
            const building = buildingAt(event.target)
            if (building && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              building.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true }))
            }
          }
        },
        {
          target: gameShell,
          type: 'click',
          handler: (event) => {
            if (!townScreen?.contains(event.target)) {
              return
            }

            event.stopPropagation()
            if (event.target.closest('[data-town-action="leave"]')) {
              emit(APP_COMMAND_TOWN_LEAVE_REQUESTED, {})
              return
            }

            const armySlot = event.target.closest('.town-panel__slots > .army-slot')
            if (armySlot) {
              clickArmySlot(armySlot)
              return
            }

            const town = event.target.closest('.town-list__town')
            if (town) {
              emit(APP_COMMAND_TOWN_OPEN_REQUESTED, { entityId: town.dataset.entityId })
            }
          }
        }
      ],
      dispose: () => {
        townScreen?.remove()
        townScreen = null
      }
    }
  },
  {
    id: 'town-screen-view',
    phase: 'view',
    consumes: [APP_UI_TOWN_UPDATED, APP_FACT_TOWN_LEFT],
    produces: [
      APP_COMMAND_TOWN_LEAVE_REQUESTED,
      APP_COMMAND_TOWN_OPEN_REQUESTED,
      APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ]
  }
)
