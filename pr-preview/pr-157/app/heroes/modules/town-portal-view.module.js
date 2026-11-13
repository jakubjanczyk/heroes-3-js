import { TOWN_PORTAL_PROMPT } from '../../../game/heroes/adventure-spells.js'
import {
  APP_COMMAND_HERO_ADVENTURE_SPELL_CAST_REQUESTED,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_TOWN_PORTAL_TOWNS_OFFERED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerTownPortalViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let backdrop = null
    let offer = null
    let pickedTownId = null

    function part(selector) {
      return backdrop.querySelector(selector)
    }

    function renderTown({ id, name }) {
      const item = document.createElement('li')
      item.className = 'town-portal__town'
      item.setAttribute('role', 'option')
      item.setAttribute('aria-selected', 'false')
      item.dataset.town = id
      item.textContent = name
      return item
    }

    function open(detail) {
      if (!gameShell || backdrop) {
        return
      }
      offer = detail
      pickedTownId = null
      backdrop = document
        .getElementById('town-portal-template')
        .content.firstElementChild.cloneNode(true)
      part('.town-portal__prompt').textContent = TOWN_PORTAL_PROMPT
      part('.town-portal__towns').replaceChildren(...detail.towns.map(renderTown))
      gameShell.append(backdrop)
      part('.town-portal').focus()
      emit(APP_UI_ADVENTURE_MAP_COVERED, {})
    }

    function close() {
      backdrop?.remove()
      backdrop = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    function pick(townId) {
      pickedTownId = townId
      for (const town of backdrop.querySelectorAll('.town-portal__town')) {
        town.setAttribute('aria-selected', String(town.dataset.town === townId))
      }
      part('[data-town-portal-action="go"]').disabled = false
    }

    function go() {
      const { heroId, spellId } = offer
      const townId = pickedTownId
      close()
      emit(APP_COMMAND_HERO_ADVENTURE_SPELL_CAST_REQUESTED, { heroId, spellId, townId })
    }

    function onClick(event) {
      if (!backdrop?.contains(event.target)) {
        return
      }
      event.stopPropagation()
      const town = event.target.closest('.town-portal__town')
      const action = event.target.closest('[data-town-portal-action]')?.dataset.townPortalAction
      if (town) {
        pick(town.dataset.town)
      } else if (action === 'go' && pickedTownId) {
        go()
      } else if (action === 'cancel') {
        close()
      }
    }

    function onKeyDown(event) {
      if (!backdrop) {
        return
      }
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
      } else if (event.key === 'Enter' && pickedTownId) {
        event.stopPropagation()
        go()
      }
    }

    return {
      subscriptions: [
        { type: APP_UI_TOWN_PORTAL_TOWNS_OFFERED, handler: (event) => open(event.detail) }
      ],
      domSubscriptions: [
        { target: gameShell, type: 'click', handler: onClick },
        {
          target: gameShell,
          type: 'dblclick',
          handler: (event) => {
            if (backdrop?.contains(event.target) && event.target.closest('.town-portal__town')) {
              go()
            }
          }
        },
        { target: env.window, type: 'keydown', handler: onKeyDown }
      ],
      dispose: () => {
        backdrop?.remove()
        backdrop = null
      }
    }
  },
  {
    id: 'town-portal-view',
    phase: 'view',
    consumes: [APP_UI_TOWN_PORTAL_TOWNS_OFFERED],
    produces: [
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_COMMAND_HERO_ADVENTURE_SPELL_CAST_REQUESTED
    ]
  }
)
