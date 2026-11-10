import {
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_VIEW_WORLD_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerAdventureOptionsViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    const optionsButton = document?.getElementById('adventure-options-button')
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
      backdrop?.remove()
      backdrop = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    function onClick(event) {
      if (!backdrop?.contains(event.target)) {
        return
      }
      event.stopPropagation()
      const option = event.target.closest('[data-adventure-option]')
      if (!option || option.disabled) {
        return
      }
      close()
      if (option.dataset.adventureOption === 'View World') {
        emit(APP_UI_VIEW_WORLD_OPENED, { reveals: [], showsTerrain: false })
      }
    }

    return {
      domSubscriptions: [
        {
          target: optionsButton,
          type: 'click',
          handler: (event) => {
            event.stopPropagation()
            open()
          }
        },
        { target: gameShell, type: 'click', handler: onClick }
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
      APP_UI_VIEW_WORLD_OPENED
    ]
  }
)
