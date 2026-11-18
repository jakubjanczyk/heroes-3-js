import { GAME_END_MESSAGES, playerName } from '../../../game/heroes/game-end.js'
import { viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_RESET_SESSION_REQUESTED,
  APP_FACT_WORLD_READY,
  APP_UI_GAME_ENDED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const TITLES = { victory: 'Victorious', defeat: 'Defeated' }

const BLOCKED_INPUTS = [
  'click',
  'dblclick',
  'auxclick',
  'contextmenu',
  'pointerdown',
  'mousedown',
  'keydown'
]

// Once the game has ended only the window it ended with answers: every click, press and key
// anywhere else is stopped before any part of the screen hears it.
export const registerGameEndViewModule = defineModule(
  ({ emit, env, state }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let endWindow = null

    function showEnd({ result }) {
      endWindow?.remove()
      const template = document?.getElementById('game-end-template')
      if (!gameShell || !template) {
        return
      }

      endWindow = template.content.firstElementChild.cloneNode(true)
      const player = viewingPlayer(state.get())
      const section = endWindow.querySelector('.game-end')
      section.dataset.result = result
      endWindow.querySelector('.window-title').textContent = TITLES[result]
      endWindow.querySelector('.game-end__text').textContent = GAME_END_MESSAGES[result]
      const flag = endWindow.querySelector('.game-end__flag')
      flag.setAttribute('aria-label', `${playerName(player)} player flag`)
      flag.style.setProperty('--flag-colour', `var(--player-${player})`)
      const restart = endWindow.querySelector('.game-end__restart')
      restart.addEventListener('click', () => emit(APP_COMMAND_RESET_SESSION_REQUESTED, {}))
      gameShell.append(endWindow)
      restart.focus?.()
    }

    function stopInput(event) {
      if (endWindow && !endWindow.contains(event.target)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: () => {
            endWindow?.remove()
            endWindow = null
          }
        },
        { type: APP_UI_GAME_ENDED, handler: (event) => showEnd(event.detail) }
      ],
      domSubscriptions: env.window
        ? BLOCKED_INPUTS.map((type) => ({
            target: env.window,
            type,
            handler: stopInput,
            options: { capture: true }
          }))
        : []
    }
  },
  {
    id: 'game-end-view',
    phase: 'view',
    consumes: [APP_FACT_WORLD_READY, APP_UI_GAME_ENDED],
    produces: [APP_COMMAND_RESET_SESSION_REQUESTED]
  }
)
