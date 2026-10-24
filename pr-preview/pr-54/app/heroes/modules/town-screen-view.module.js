import { describeAvailableCreatures } from '../../../game/heroes/creature-recruitment.js'
import {
  APP_COMMAND_TOWN_LEAVE_REQUESTED,
  APP_COMMAND_TOWN_OPEN_REQUESTED,
  APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
  APP_COMMAND_TOWN_STACK_SPLIT_REQUESTED,
  APP_FACT_TOWN_LEFT,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_HERO_SCREEN_OPEN_REQUESTED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createArmyRearranging } from '../presentation/army-rearranging.js'
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

// The panel's icons, buttons and creatures, which name themselves in the status bar.
function statusSourceAt(target) {
  return target?.closest?.('[data-status]') ?? null
}

function armySlotAt(target) {
  return target?.closest?.('.town-panel__slots > .army-slot') ?? null
}

export const registerTownScreenViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let townScreen = null
    let rearranging = null
    let isVisitingHeroFramed = false

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
          slot.removeAttribute('data-status')
          slot.replaceChildren()
          return
        }

        slot.dataset.status = describeAvailableCreatures(tier)
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
      icon.dataset.status = fort?.name ?? ''
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

    function frameVisitingHero(framed) {
      isVisitingHeroFramed = framed
      const hero = townScreen.querySelector('.town-panel__hero--visiting')
      if (framed) {
        hero.setAttribute('aria-current', 'true')
      } else {
        hero.removeAttribute('aria-current')
      }
    }

    // As in Heroes 3, the first click frames the visiting hero and the second opens the hero screen.
    function clickVisitingHero() {
      if (isVisitingHeroFramed) {
        frameVisitingHero(false)
        emit(APP_UI_HERO_SCREEN_OPEN_REQUESTED, {})
        return
      }
      rearranging.unselect()
      frameVisitingHero(true)
    }

    function showStatus(text) {
      townScreen.querySelector('.town-screen__status-bar').textContent = text
    }

    function showVisitingHero(visitingHero) {
      const hero = townScreen.querySelector('.town-panel__hero--visiting')
      const name = visitingHero?.name ?? ''
      hero.disabled = !name
      if (name) {
        hero.setAttribute('aria-label', name)
        hero.dataset.status = name
      } else {
        hero.removeAttribute('aria-label')
        hero.removeAttribute('data-status')
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
      hallName,
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
        rearranging = createArmyRearranging({
          document,
          container: townScreen,
          slotLists: townScreen.querySelectorAll('.town-panel__slots'),
          splitButton: townScreen.querySelector('.town-panel__split'),
          showStatus,
          onMove: (move) => emit(APP_COMMAND_TOWN_STACK_MOVE_REQUESTED, move),
          onSplit: (split) => emit(APP_COMMAND_TOWN_STACK_SPLIT_REQUESTED, split)
        })
        emit(APP_UI_ADVENTURE_MAP_COVERED, {})
      }

      townScreen.querySelector('.town-panel__name').textContent = name
      townScreen.querySelector('.town-panel__income').textContent = String(goldIncome)
      townScreen.querySelector('.town-panel__hall').dataset.status = hallName
      fillSlots(townScreen.querySelector('[aria-label="Garrison"]'), garrison)
      showPicture(picture)
      showCreatures(creatures)
      showFortIcon(fort)
      showVisitingHero(visitingHero)
      // No `hero` without a visiting hero.
      rearranging.showArmies(visitingHero ? { garrison, hero: visitingHero.army } : { garrison })
      frameVisitingHero(false)
      renderTownList(townScreen.querySelector('.town-panel__town-list'), document, {
        towns: ownedTowns,
        selectedTownId: entityId
      })
      for (const town of townScreen.querySelectorAll('.town-list__town')) {
        town.dataset.status = town.getAttribute('aria-label')
      }
    }

    function closeTown() {
      if (!townScreen) {
        return
      }

      townScreen.remove()
      townScreen = null
      rearranging = null
      isVisitingHeroFramed = false
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
            if (!townScreen?.contains(event.target)) {
              return
            }

            const slot = armySlotAt(event.target)
            if (slot) {
              rearranging.hoverSlot(slot)
              return
            }
            const named = buildingAt(event.target)?.getAttribute('aria-label')
            showStatus(named ?? statusSourceAt(event.target)?.dataset.status ?? '')
          }
        },
        {
          target: gameShell,
          type: 'mouseout',
          handler: (event) => {
            if (!townScreen?.contains(event.target)) {
              return
            }

            const building = buildingAt(event.target)
            if (building && buildingAt(event.relatedTarget) !== building) {
              showStatus('')
            }
            const slot = armySlotAt(event.target)
            if (slot && armySlotAt(event.relatedTarget) !== slot) {
              rearranging.leaveSlot()
            }
            const source = statusSourceAt(event.target)
            if (source && statusSourceAt(event.relatedTarget) !== source) {
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

            if (event.target.closest('.town-panel__split')) {
              rearranging.toggleSplitMode()
              return
            }

            if (event.target.closest('.town-panel__hero--visiting')) {
              clickVisitingHero()
              return
            }

            const armySlot = armySlotAt(event.target)
            if (armySlot) {
              frameVisitingHero(false)
              rearranging.clickSlot(armySlot, event)
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
      APP_COMMAND_TOWN_STACK_SPLIT_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_UI_HERO_SCREEN_OPEN_REQUESTED
    ]
  }
)
