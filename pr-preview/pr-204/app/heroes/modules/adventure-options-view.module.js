import {
  APP_COMMAND_SCENARIO_INFO_OPEN_REQUESTED,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerAdventureOptionsViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    const button = document?.getElementById('adventure-options-button')
    let backdrop = null

    function open() {
      if (!gameShell || backdrop) {
        return
      }
      backdrop = document
        .getElementById('adventure-options-template')
        .content.firstElementChild.cloneNode(true)
      gameShell.append(backdrop)
      backdrop.querySelector('.adventure-options').focus()
      emit(APP_UI_ADVENTURE_MAP_COVERED, {})
    }

    function close() {
      if (!backdrop) {
        return
      }
      backdrop.remove()
      backdrop = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    function onClick(event) {
      if (!backdrop?.contains(event.target)) {
        return
      }
      event.stopPropagation()
      const action = event.target.closest('[data-adventure-options-action]')?.dataset
        .adventureOptionsAction
      if (action === 'okay') {
        close()
      } else if (action === 'scenario-info') {
        emit(APP_COMMAND_SCENARIO_INFO_OPEN_REQUESTED, {})
      }
    }

    function onKeyDown(event) {
      if (backdrop && (event.key === 'Escape' || event.key === 'Enter')) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }

    return {
      domSubscriptions: [
        {
          target: button,
          type: 'click',
          handler: (event) => {
            event.stopPropagation()
            open()
          }
        },
        { target: gameShell, type: 'click', handler: onClick },
        { target: env.window, type: 'keydown', handler: onKeyDown }
      ],
      dispose: () => {
        backdrop?.remove()
        backdrop = null
      }
    }
  },
  {
    id: 'adventure-options-view',
    phase: 'view',
    consumes: [],
    produces: [
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_COMMAND_SCENARIO_INFO_OPEN_REQUESTED
    ]
  }
)
