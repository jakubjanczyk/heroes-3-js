import {
  APP_COMMAND_TOWN_LEAVE_REQUESTED,
  APP_FACT_TOWN_LEFT,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderArmyStack } from '../presentation/hero-box.js'

export const registerTownScreenViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let townScreen = null

    function fillSlots(list, army) {
      list.querySelectorAll('.army-slot').forEach((slot, index) => {
        const stack = army[index]
        slot.replaceChildren(...(stack ? [renderArmyStack(document, stack)] : []))
      })
    }

    function showTown({ name, garrison, visitingHero }) {
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
      const hero = townScreen.querySelector('.town-panel__hero--visiting')
      hero.setAttribute('aria-label', visitingHero.name)
      hero.title = visitingHero.name
      hero.textContent = visitingHero.name.charAt(0)
      fillSlots(townScreen.querySelector('[aria-label="Garrison"]'), garrison)
      fillSlots(townScreen.querySelector('[aria-label="Visiting hero army"]'), visitingHero.army)
    }

    function closeTown() {
      if (!townScreen) {
        return
      }

      townScreen.remove()
      townScreen = null
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
          type: 'click',
          handler: (event) => {
            if (!townScreen?.contains(event.target)) {
              return
            }

            event.stopPropagation()
            if (event.target.closest('[data-town-action="leave"]')) {
              emit(APP_COMMAND_TOWN_LEAVE_REQUESTED, {})
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
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ]
  }
)
